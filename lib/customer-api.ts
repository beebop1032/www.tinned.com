import type { StoredOrder } from "./cart";
import { AUTH_STORAGE_KEY, refreshAccessToken, type TinnedSession } from "./auth";
import type { CarrierOption } from "./delivery";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

/** Session expirée / invalide : purge la session et prévient l'app (les shells
 *  écoutent `tinned-auth-updated` et rebasculent sur le login). */
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event("tinned-auth-updated"));
}

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
  refresh_token?: string;
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
  isDefault?: boolean;
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

async function apiFetch<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) {
    headers.set("accept", "application/ld+json, application/json");
  }

  const response = await fetch(endpoint(path), {
    ...init,
    headers
  });

  // A 401 on an authenticated request means the access token expired: try once to mint
  // a fresh one from the refresh token and replay the request. If that fails, clear the
  // session (returns to login) instead of surfacing "Expired JWT Token". A 401 without a
  // token (e.g. wrong credentials on login) is a normal error left untouched.
  if (response.status === 401 && headers.has("authorization")) {
    if (!retried) {
      const refreshed = await refreshAccessToken();
      if (refreshed?.token) {
        const retryHeaders = new Headers(init.headers);
        retryHeaders.set("authorization", `Bearer ${refreshed.token}`);
        return apiFetch<T>(path, { ...init, headers: retryHeaders }, true);
      }
    }
    handleUnauthorized();
    throw new Error("Session expirée. Reconnecte-toi pour continuer.");
  }

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
  await apiFetch<AuthResponse>("/register", {
    method: "POST",
    headers: { "content-type": "application/ld+json" },
    body: JSON.stringify(input)
  });

  // Register doesn't issue a refresh token (only the json_login firewall does), so log
  // in right away to obtain a session with both an access and a refresh token.
  return loginCustomer({ email: input.email, password: input.password });
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
  return { ...profile, token: payload.token, refreshToken: payload.refresh_token };
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

export async function createCheckoutOrder(payload: CheckoutPayload, token?: string): Promise<StoredOrder> {
  return apiFetch<StoredOrder>("/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/ld+json",
      // Guest checkout: send the token only when the buyer is logged in.
      ...(token ? { authorization: `Bearer ${token}` } : {})
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

export type ReviewInput = {
  productIri: string;
  rating: number;
  title?: string;
  body: string;
  authorName?: string;
};

export type ReviewResult = {
  id: number;
  status: "pending" | "approved" | "rejected";
};

export async function submitReview(input: ReviewInput, token: string): Promise<ReviewResult> {
  return apiFetch<ReviewResult>("/reviews", {
    method: "POST",
    headers: { "content-type": "application/ld+json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      product: input.productIri,
      rating: input.rating,
      title: input.title?.trim() ? input.title.trim() : null,
      body: input.body.trim(),
      authorName: input.authorName?.trim() ?? ""
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

export type BoxSubscription = {
  id: number;
  frequency: "monthly" | "quarterly";
  status: "active" | "paused" | "cancelled";
  nextRenewalAt?: string | null;
  createdAt: string;
  variant?: { sku: string } | null;
  storeBox?: { name?: string; slug?: string } | null;
};

export async function createSubscription(variantId: number, frequency: "monthly" | "quarterly", token: string): Promise<BoxSubscription> {
  return apiFetch<BoxSubscription>("/box_subscriptions", {
    method: "POST",
    headers: { "content-type": "application/ld+json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ variant: `/api/product_variants/${variantId}`, frequency }),
  });
}

export async function fetchMySubscriptions(token: string): Promise<BoxSubscription[]> {
  const payload = await apiFetch<HydraCollection<BoxSubscription> | BoxSubscription[]>("/my_subscriptions", {
    headers: { authorization: `Bearer ${token}` },
  });
  return collection(payload);
}

export async function updateSubscription(id: number, status: "active" | "paused" | "cancelled", token: string): Promise<BoxSubscription> {
  return apiFetch<BoxSubscription>(`/my_subscriptions/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/merge-patch+json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
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
    phone: address.phone ?? null,
    isDefault: address.isDefault ?? false
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
