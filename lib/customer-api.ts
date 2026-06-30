import type { StoredOrder } from "./cart";
import type { TinnedSession } from "./auth";
import type { CarrierOption } from "./delivery";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

type ApiErrorPayload = {
  detail?: string;
  title?: string;
  message?: string;
  violations?: Array<{ propertyPath?: string; message?: string }>;
};

type AuthResponse = {
  id?: number;
  email?: string;
  token: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};

type LoginResponse = {
  token: string;
};

type ActionResponse = {
  message: string;
};

type MeResponse = {
  logged: boolean;
  email?: string | null;
  active?: boolean | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  marketingConsent?: boolean | null;
};

type HydraCollection<T> = {
  member?: T[];
  "hydra:member"?: T[];
};

export type CustomerAddress = {
  id: number;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone?: string | null;
};

export type CheckoutPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  items: Array<{
    productSlug: string;
    variantSku: string;
    quantity: number;
  }>;
  selectedStoreSlugs: string[];
  carrierSelections: Array<{
    storeSlug: string;
    carrierCode: string;
  }>;
  paymentMethod: string;
  couponCode?: string;
};

export type CouponValidation = {
  valid: boolean;
  discountCents: number;
  type: "percent" | "fixed" | null;
  value: number | null;
  message: string;
};

function endpoint(path: string) {
  if (!apiUrl) {
    throw new Error("Le backend API n'est pas configure.");
  }
  return `${apiUrl.replace(/\/$/, "")}/api${path}`;
}

async function parseApiError(response: Response) {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Keep the generic message below.
  }

  const violation = payload?.violations?.find((item) => item.message)?.message;
  return violation ?? payload?.detail ?? payload?.message ?? payload?.title ?? "La requête a échoué.";
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) {
    headers.set("accept", "application/ld+json, application/json");
  }

  const response = await fetch(endpoint(path), {
    ...init,
    headers
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return (await response.json()) as T;
}

function collection<T>(payload: T[] | HydraCollection<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.member ?? payload["hydra:member"] ?? [];
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  acceptedTerms: boolean;
  marketingConsent: boolean;
}): Promise<TinnedSession> {
  const payload = await apiFetch<AuthResponse>("/register", {
    method: "POST",
    headers: { "content-type": "application/ld+json" },
    body: JSON.stringify(input)
  });

  return {
    id: payload.id,
    email: payload.email ?? input.email,
    token: payload.token,
    firstName: payload.firstName ?? input.firstName,
    lastName: payload.lastName ?? input.lastName,
    phone: payload.phone ?? input.phone
  };
}

export async function loginCustomer(input: {
  email: string;
  password: string;
  phone?: string;
}): Promise<TinnedSession> {
  const payload = await apiFetch<LoginResponse>("/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: input.email, password: input.password })
  });

  const profile = await fetchCustomerProfile(payload.token);
  return { ...profile, token: payload.token };
}

export async function requestPasswordReset(email: string): Promise<ActionResponse> {
  return apiFetch<ActionResponse>("/request_password_reset", {
    method: "POST",
    headers: { "content-type": "application/ld+json" },
    body: JSON.stringify({ email })
  });
}

export async function resetPassword(input: { token: string; password: string }): Promise<ActionResponse> {
  return apiFetch<ActionResponse>("/reset_password", {
    method: "POST",
    headers: { "content-type": "application/ld+json" },
    body: JSON.stringify(input)
  });
}

export async function createCheckoutOrder(payload: CheckoutPayload, token: string): Promise<StoredOrder> {
  return apiFetch<StoredOrder>("/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/ld+json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export async function validateCoupon(code: string, subtotalCents: number): Promise<CouponValidation> {
  return apiFetch<CouponValidation>("/coupons/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: code.trim().toUpperCase(), subtotalCents })
  });
}

export type SubscribeInput = {
  email: string;
  targetType: "tinned" | "box" | "product";
  boxIri?: string;
  productIri?: string;
  consentTinned?: boolean;
  locale?: string;
};

export type SubscriptionResult = {
  id: number;
  email: string;
  targetType: string;
  status: "pending" | "confirmed" | "unsubscribed";
};

export async function subscribe(input: SubscribeInput, token?: string): Promise<SubscriptionResult> {
  const headers: Record<string, string> = { "content-type": "application/ld+json" };
  if (token) headers.authorization = `Bearer ${token}`;

  return apiFetch<SubscriptionResult>("/subscriptions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      targetType: input.targetType,
      box: input.boxIri ?? null,
      product: input.productIri ?? null,
      consentTinned: input.consentTinned ?? false,
      locale: input.locale ?? "fr"
    })
  });
}

export async function confirmSubscription(token: string): Promise<{ confirmed: boolean }> {
  return apiFetch<{ confirmed: boolean }>(`/subscriptions/confirm/${encodeURIComponent(token)}`, {
    method: "GET"
  });
}

export async function fetchDeliveryMethods(countryCode: string): Promise<CarrierOption[]> {
  const payload = await apiFetch<HydraCollection<CarrierOption> | CarrierOption[]>(
    `/delivery_methods?active=true&countryCode=${encodeURIComponent(countryCode)}&order[position]=asc`
  );
  return collection(payload);
}

export async function fetchMyOrders(token: string): Promise<StoredOrder[]> {
  const payload = await apiFetch<HydraCollection<StoredOrder> | StoredOrder[]>("/my_orders", {
    headers: { authorization: `Bearer ${token}` }
  });

  return collection(payload);
}

export async function fetchCustomerProfile(token: string): Promise<Omit<TinnedSession, "token">> {
  const payload = await apiFetch<MeResponse>("/me", {
    method: "POST",
    headers: {
      "content-type": "application/ld+json",
      authorization: `Bearer ${token}`
    },
    body: "{}"
  });

  if (!payload.logged || !payload.email) {
    throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
  }

  return {
    email: payload.email,
    firstName: payload.firstName ?? undefined,
    lastName: payload.lastName ?? undefined,
    phone: payload.phone ?? undefined,
    marketingConsent: payload.marketingConsent ?? false
  };
}

export async function updateCustomerProfile(
  token: string,
  input: { firstName: string; lastName: string; phone: string; marketingConsent: boolean }
): Promise<Omit<TinnedSession, "token">> {
  const payload = await apiFetch<MeResponse>("/my_profile", {
    method: "PUT",
    headers: {
      "content-type": "application/ld+json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  return {
    email: payload.email ?? "",
    firstName: payload.firstName ?? undefined,
    lastName: payload.lastName ?? undefined,
    phone: payload.phone ?? undefined,
    marketingConsent: payload.marketingConsent ?? false
  };
}

export async function fetchMyAddresses(token: string): Promise<CustomerAddress[]> {
  const payload = await apiFetch<HydraCollection<CustomerAddress> | CustomerAddress[]>("/my_addresses", {
    headers: { authorization: `Bearer ${token}` }
  });

  return collection(payload);
}

function editableAddress(address: CustomerAddress) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    street: address.street,
    postalCode: address.postalCode,
    city: address.city,
    countryCode: address.countryCode,
    phone: address.phone ?? null
  };
}

export async function createMyAddress(token: string, address: CustomerAddress): Promise<CustomerAddress> {
  return apiFetch<CustomerAddress>("/my_addresses", {
    method: "POST",
    headers: {
      "content-type": "application/ld+json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(editableAddress(address))
  });
}

export async function updateMyAddress(token: string, address: CustomerAddress): Promise<CustomerAddress> {
  return apiFetch<CustomerAddress>(`/my_addresses/${address.id}`, {
    method: "PUT",
    headers: {
      "content-type": "application/ld+json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify(editableAddress(address))
  });
}

export async function downloadBuyerInvoice(orderId: number, token: string): Promise<Blob> {
  const response = await fetch(endpoint(`/my_orders/${orderId}/invoice`), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Impossible de télécharger la facture.");
  return response.blob();
}

export async function downloadSupplierInvoice(storeOrderId: number, token: string): Promise<Blob> {
  const response = await fetch(endpoint(`/my_store_orders/${storeOrderId}/supplier-invoice`), {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Impossible de télécharger la facture fournisseur.");
  return response.blob();
}
