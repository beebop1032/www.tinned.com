import type { Box, BoxType, Product, Trip } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

type HydraCollection<T> = {
  member?: T[];
  "hydra:member"?: T[];
};

type ApiErrorPayload = {
  detail?: string;
  title?: string;
  message?: string;
  errorMessage?: string;
  violations?: Array<{ propertyPath?: string; message?: string }>;
};

export type AdminBoxInput = {
  type: BoxType;
  name: string;
  slug: string;
  tagline?: string;
  description?: string;
  logoPath?: string;
  coverPath?: string;
  active: boolean;
  companyName?: string;
  website?: string;
  businessBoxId?: number;
  storeBoxId?: number;
};

export type ProductAttribute = {
  "@id"?: string;
  id: number;
  code: string;
  name: string;
  type: "select" | "color" | "number" | "text" | "boolean";
};

export type ProductAttributeValue = {
  "@id"?: string;
  id: number;
  label: string;
  value: string;
  hexColor?: string | null;
  attribute?: ProductAttribute;
};

export type AdminVariantInput = {
  id?: number;
  sku: string;
  priceCents: number;
  stock: number;
  colorLabel?: string;
  hexColor?: string;
  sizeLabel?: string;
  imagePath?: string;
};

export type AdminProductInput = {
  storeBoxId: number;
  name: string;
  slug: string;
  description?: string;
  basePriceCents: number;
  currency: string;
  imagePath?: string;
  variants: AdminVariantInput[];
};

export type UploadResponse = {
  path: string;
  url: string;
};

export type AdminStoreOrder = {
  "@id"?: string;
  id: number;
  storeNameSnapshot: string;
  carrierCode?: string | null;
  carrierNameSnapshot?: string | null;
  deliveryMode?: string | null;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
};

export type ShippingLabel = {
  id: number;
  storeOrder: AdminStoreOrder;
  carrierCode: string;
  carrierName: string;
  format: string;
  copies: number;
  weightGrams: number;
  status: "pending" | "ready" | "printed" | "error";
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  labelUrl?: string | null;
  pickupPointId?: string | null;
  pickupPointName?: string | null;
  pickupPointStreet?: string | null;
  pickupPointPostalCode?: string | null;
  pickupPointCity?: string | null;
  pickupPointCountryCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  printedAt?: string | null;
};

function endpoint(path: string) {
  if (!apiUrl) {
    throw new Error("Le backend API n'est pas configuré.");
  }
  return `${apiUrl.replace(/\/$/, "")}/api${path}`;
}

function collection<T>(payload: T[] | HydraCollection<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.member ?? payload["hydra:member"] ?? [];
}

async function parseApiError(response: Response) {
  let payload: ApiErrorPayload | null = null;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    // Keep the generic message below.
  }

  const violation = payload?.violations?.find((item) => item.message)?.message;
  return violation ?? payload?.detail ?? payload?.errorMessage ?? payload?.message ?? payload?.title ?? "L'action admin a échoué.";
}

async function adminFetch<T>(path: string, token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/ld+json, application/json");
  headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(endpoint(path), { ...init, headers });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function publicFetch<T>(path: string) {
  const response = await fetch(endpoint(path), {
    headers: { accept: "application/ld+json, application/json" }
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return (await response.json()) as T;
}

function jsonInit(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/ld+json" },
    body: JSON.stringify(body)
  };
}

function patchInit(body: unknown): RequestInit {
  return {
    method: "PATCH",
    headers: { "content-type": "application/merge-patch+json" },
    body: JSON.stringify(body)
  };
}

function resourceIri(resource: string, item: { "@id"?: string; id?: number }) {
  return item["@id"] ?? `/api/${resource}/${item.id}`;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function centsFromPrice(input: string) {
  const normalized = input.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
}

export function priceFromCents(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export async function fetchAdminData() {
  const [businessBoxes, storeBoxes, blogBoxes, travelBoxes, products] = await Promise.all([
    fetchBoxes("business"),
    fetchBoxes("store"),
    fetchBoxes("blog"),
    fetchBoxes("travel"),
    fetchProducts()
  ]);

  return { businessBoxes, storeBoxes, blogBoxes, travelBoxes, products };
}

export async function fetchBoxes(type: BoxType) {
  const resource =
    type === "business" ? "business_boxes"
      : type === "store" ? "store_boxes"
        : type === "travel" ? "travel_boxes"
          : "blog_boxes";
  const payload = await publicFetch<HydraCollection<Box>>(`/${resource}?order[createdAt]=desc`);
  return collection(payload).map((box) => ({ ...box, type }));
}

export async function fetchProducts() {
  const payload = await publicFetch<HydraCollection<Product>>("/products?order[createdAt]=desc");
  return collection(payload);
}

export async function fetchAdminShipping(token: string) {
  const [ordersPayload, labelsPayload] = await Promise.all([
    adminFetch<HydraCollection<AdminStoreOrder>>("/store_orders", token),
    adminFetch<HydraCollection<ShippingLabel>>("/shipping_labels?order[createdAt]=desc", token)
  ]);
  return {
    storeOrders: collection(ordersPayload),
    labels: collection(labelsPayload)
  };
}

export async function createShippingLabel(input: {
  storeOrderId: number;
  format: string;
  copies: number;
  weightGrams: number;
  pickupPointId?: string;
  pickupPointName?: string;
  pickupPointStreet?: string;
  pickupPointPostalCode?: string;
  pickupPointCity?: string;
  pickupPointCountryCode?: string;
}, token: string) {
  return adminFetch<ShippingLabel>("/shipping_labels", token, jsonInit({
    storeOrder: `/api/store_orders/${input.storeOrderId}`,
    format: input.format,
    copies: input.copies,
    weightGrams: input.weightGrams,
    pickupPointId: input.pickupPointId || null,
    pickupPointName: input.pickupPointName || null,
    pickupPointStreet: input.pickupPointStreet || null,
    pickupPointPostalCode: input.pickupPointPostalCode || null,
    pickupPointCity: input.pickupPointCity || null,
    pickupPointCountryCode: input.pickupPointCountryCode || null,
    status: "pending"
  }));
}

export async function generateShippingLabel(id: number, token: string) {
  return adminFetch<ShippingLabel>(`/admin/shipping_labels/${id}/generate`, token, { method: "POST" });
}

export async function updateShippingLabel(id: number, input: Partial<Pick<ShippingLabel, "status">>, token: string) {
  return adminFetch<ShippingLabel>(`/shipping_labels/${id}`, token, patchInit(input));
}

export async function uploadAdminMedia(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);
  return adminFetch<UploadResponse>("/admin/media", token, {
    method: "POST",
    body: formData
  });
}

export async function createAdminBox(input: AdminBoxInput, token: string) {
  const basePayload = {
    name: input.name,
    slug: input.slug,
    tagline: input.tagline || null,
    description: input.description || null,
    logoPath: input.logoPath || null,
    coverPath: input.coverPath || null,
    active: input.active
  };

  if (input.type === "business") {
    return adminFetch<Box>("/business_boxes", token, jsonInit({
      ...basePayload,
      companyName: input.companyName || input.name,
      website: input.website || null
    }));
  }

  if (input.type === "store") {
    return adminFetch<Box>("/store_boxes", token, jsonInit({
      ...basePayload,
      businessBox: input.businessBoxId ? `/api/business_boxes/${input.businessBoxId}` : null
    }));
  }

  if (input.type === "travel") {
    return adminFetch<Box>("/travel_boxes", token, jsonInit({
      ...basePayload,
      businessBox: input.businessBoxId ? `/api/business_boxes/${input.businessBoxId}` : null
    }));
  }

  return adminFetch<Box>("/blog_boxes", token, jsonInit({
    ...basePayload,
    businessBox: input.businessBoxId ? `/api/business_boxes/${input.businessBoxId}` : null,
    storeBox: input.storeBoxId ? `/api/store_boxes/${input.storeBoxId}` : null
  }));
}

async function findAttribute(code: string) {
  const payload = await publicFetch<HydraCollection<ProductAttribute>>(`/product_attributes?code=${encodeURIComponent(code)}`);
  return collection(payload)[0] ?? null;
}

async function ensureAttribute(input: Pick<ProductAttribute, "code" | "name" | "type">, token: string) {
  const current = await findAttribute(input.code);
  if (current) return current;
  return adminFetch<ProductAttribute>("/product_attributes", token, jsonInit(input));
}

async function findAttributeValue(code: string, value: string) {
  const payload = await publicFetch<HydraCollection<ProductAttributeValue>>(`/product_attribute_values?attribute.code=${encodeURIComponent(code)}&value=${encodeURIComponent(value)}`);
  return collection(payload)[0] ?? null;
}

async function ensureAttributeValue(input: {
  attribute: ProductAttribute;
  code: string;
  label: string;
  value: string;
  hexColor?: string;
  position: number;
}, token: string) {
  const current = await findAttributeValue(input.code, input.value);
  if (current) return current;
  return adminFetch<ProductAttributeValue>("/product_attribute_values", token, jsonInit({
    attribute: resourceIri("product_attributes", input.attribute),
    label: input.label,
    value: input.value,
    hexColor: input.hexColor || null,
    position: input.position
  }));
}

async function attributeValueIris(variant: AdminVariantInput, index: number, token: string) {
  const iris: string[] = [];

  if (variant.colorLabel?.trim()) {
    const attribute = await ensureAttribute({ code: "color", name: "Couleur", type: "color" }, token);
    const value = await ensureAttributeValue({
      attribute,
      code: "color",
      label: variant.colorLabel.trim(),
      value: slugify(variant.colorLabel),
      hexColor: variant.hexColor,
      position: index
    }, token);
    iris.push(resourceIri("product_attribute_values", value));
  }

  if (variant.sizeLabel?.trim()) {
    const attribute = await ensureAttribute({ code: "size", name: "Taille", type: "select" }, token);
    const value = await ensureAttributeValue({
      attribute,
      code: "size",
      label: variant.sizeLabel.trim(),
      value: slugify(variant.sizeLabel),
      position: index
    }, token);
    iris.push(resourceIri("product_attribute_values", value));
  }

  return iris;
}

export async function createAdminProduct(input: AdminProductInput, token: string) {
  const product = await adminFetch<Product>("/products", token, jsonInit({
    storeBox: `/api/store_boxes/${input.storeBoxId}`,
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    basePriceCents: input.basePriceCents,
    currency: input.currency,
    active: true,
    images: input.imagePath ? [input.imagePath] : []
  }));

  const productIri = resourceIri("products", product);
  for (const [index, variant] of input.variants.entries()) {
    const attributeValues = await attributeValueIris(variant, index, token);
    await adminFetch("/product_variants", token, jsonInit({
      product: productIri,
      sku: variant.sku,
      priceCents: variant.priceCents,
      stock: variant.stock,
      active: true,
      images: variant.imagePath ? [variant.imagePath] : input.imagePath ? [input.imagePath] : [],
      attributeValues
    }));
  }

  return product;
}

export async function updateAdminProduct(input: AdminProductInput, product: Product, token: string) {
  await adminFetch<Product>(`/products/${product.id}`, token, patchInit({
    storeBox: `/api/store_boxes/${input.storeBoxId}`,
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    basePriceCents: input.basePriceCents,
    currency: input.currency,
    images: input.imagePath ? [input.imagePath] : []
  }));

  const productIri = resourceIri("products", product);

  for (const [index, variant] of input.variants.entries()) {
    const attributeValues = await attributeValueIris(variant, index, token);
    const payload = {
      product: productIri,
      sku: variant.sku,
      priceCents: variant.priceCents,
      stock: variant.stock,
      active: true,
      images: variant.imagePath ? [variant.imagePath] : input.imagePath ? [input.imagePath] : [],
      attributeValues
    };

    if (variant.id) {
      await adminFetch(`/product_variants/${variant.id}`, token, patchInit(payload));
    } else {
      await adminFetch("/product_variants", token, jsonInit(payload));
    }
  }
}

export type AdminTripInput = {
  travelBoxId: number;
  title: string;
  slug: string;
  locale: string;
  excerpt?: string;
  body: string;
  imagePath?: string;
  published: boolean;
  publishedAt?: string;
};

export async function fetchAdminTrips(travelBoxId: number, token: string) {
  const payload = await adminFetch<HydraCollection<Trip>>(
    `/trips?travelBox.id=${travelBoxId}&order[publishedAt]=desc`,
    token
  );
  return collection(payload);
}

export async function createAdminTrip(input: AdminTripInput, token: string) {
  return adminFetch<Trip>("/trips", token, jsonInit({
    travelBox: `/api/travel_boxes/${input.travelBoxId}`,
    title: input.title,
    slug: input.slug,
    locale: input.locale,
    excerpt: input.excerpt || null,
    body: input.body,
    imagePath: input.imagePath || null,
    published: input.published,
    publishedAt: input.publishedAt || null
  }));
}

export async function updateAdminTrip(id: number, input: AdminTripInput, token: string) {
  return adminFetch<Trip>(`/trips/${id}`, token, patchInit({
    title: input.title,
    slug: input.slug,
    locale: input.locale,
    excerpt: input.excerpt || null,
    body: input.body,
    imagePath: input.imagePath || null,
    published: input.published,
    publishedAt: input.publishedAt || null
  }));
}

export async function deleteAdminTrip(id: number, token: string) {
  await adminFetch<undefined>(`/trips/${id}`, token, { method: "DELETE" });
}
