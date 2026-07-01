import type { Box, BoxType, Product, Article } from "./types";
import type { Trip } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

type HydraCollection<T> = { member?: T[]; "hydra:member"?: T[] };

function endpoint(path: string) {
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
  return `${apiUrl.replace(/\/$/, "")}/api${path}`;
}

function collection<T>(payload: T[] | HydraCollection<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.member ?? payload["hydra:member"] ?? [];
}

async function vendorFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (!headers.has("accept")) headers.set("accept", "application/ld+json, application/json");
  const res = await fetch(endpoint(path), { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; violations?: { message?: string }[] };
    throw new Error(err.violations?.[0]?.message ?? err.detail ?? "Erreur API");
  }
  return res.json() as Promise<T>;
}

function jsonBody(body: unknown): RequestInit {
  return { method: "POST", headers: { "content-type": "application/ld+json" }, body: JSON.stringify(body) };
}

function patchBody(body: unknown): RequestInit {
  return { method: "PATCH", headers: { "content-type": "application/merge-patch+json" }, body: JSON.stringify(body) };
}

function resourcePath(type: BoxType): string {
  return type === "store" ? "store_boxes" : type === "business" ? "business_boxes" : type === "travel" ? "travel_boxes" : "blog_boxes";
}

export type BoxInput = {
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

export type DashboardStats = {
  revenueCents: number;
  paidOrderCount: number;
  averageOrderValueCents: number;
  toPrepareCount: number;
  topProducts: { name: string; quantity: number; revenueCents: number }[];
  lowStock: { sku: string; productName: string; stock: number }[];
  revenueByDay: { date: string; revenueCents: number }[];
};

export async function fetchDashboardStats(token: string): Promise<DashboardStats> {
  return vendorFetch<DashboardStats>("/dashboard/stats", token);
}

export async function fetchMyBoxes(token: string, userId?: number): Promise<Box[]> {
  const [biz, store, blog, travel] = await Promise.all([
    vendorFetch<HydraCollection<Box>>("/business_boxes?order[createdAt]=desc", token).then(collection).then(b => b.map(x => ({ ...x, type: "business" as BoxType }))),
    vendorFetch<HydraCollection<Box>>("/store_boxes?order[createdAt]=desc", token).then(collection).then(b => b.map(x => ({ ...x, type: "store" as BoxType }))),
    vendorFetch<HydraCollection<Box>>("/blog_boxes?order[createdAt]=desc", token).then(collection).then(b => b.map(x => ({ ...x, type: "blog" as BoxType }))),
    vendorFetch<HydraCollection<Box>>("/travel_boxes?order[createdAt]=desc", token).then(collection).then(b => b.map(x => ({ ...x, type: "travel" as BoxType }))),
  ]);
  const all = [...biz, ...store, ...blog, ...travel];
  if (userId === undefined) return all;
  return all.filter(box => box.owner?.id === userId);
}

export async function createBox(input: BoxInput, token: string): Promise<Box> {
  const path = resourcePath(input.type);
  const base = {
    name: input.name, slug: input.slug,
    tagline: input.tagline ?? null, description: input.description ?? null,
    logoPath: input.logoPath ?? null, coverPath: input.coverPath ?? null,
    active: input.active,
  };
  let extra: Record<string, unknown> = {};
  if (input.type === "business") {
    extra = { companyName: input.companyName ?? input.name, website: input.website ?? null };
  } else if (input.type === "store") {
    extra = { businessBox: input.businessBoxId ? `/api/business_boxes/${input.businessBoxId}` : null };
  } else if (input.type === "blog") {
    extra = {
      businessBox: input.businessBoxId ? `/api/business_boxes/${input.businessBoxId}` : null,
      storeBox: input.storeBoxId ? `/api/store_boxes/${input.storeBoxId}` : null,
    };
  } else {
    // travel — no relations needed
    extra = {};
  }
  return vendorFetch<Box>(`/${path}`, token, jsonBody({ ...base, ...extra }));
}

export async function updateBox(id: number, type: BoxType, input: Partial<BoxInput>, token: string): Promise<Box> {
  return vendorFetch<Box>(`/${resourcePath(type)}/${id}`, token, patchBody(input));
}

export async function deleteBox(id: number, type: BoxType, token: string): Promise<void> {
  await vendorFetch<void>(`/${resourcePath(type)}/${id}`, token, { method: "DELETE" });
}

export type ProductInput = {
  storeBoxId: number;
  name: string;
  slug: string;
  description?: string;
  basePriceCents: number;
  currency: string;
  vatRatePercent?: number;
  active?: boolean;
  availability?: "available" | "coming_soon" | "preorder";
  releaseAt?: string | null;
  imagePath?: string;
};

export type VariantInput = {
  id?: number;
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  stock: number;
  active?: boolean;
  imagePath?: string;
};

export async function updateVariant(
  id: number,
  patch: { priceCents?: number; compareAtPriceCents?: number | null; stock?: number; active?: boolean },
  token: string,
): Promise<void> {
  await vendorFetch<void>(`/product_variants/${id}`, token, patchBody(patch));
}

export async function fetchMyProducts(storeBoxId: number, token: string): Promise<Product[]> {
  const r = await vendorFetch<HydraCollection<Product>>(`/products?storeBox.id=${storeBoxId}&order[createdAt]=desc`, token);
  return collection(r);
}

export async function createProduct(input: ProductInput, variants: VariantInput[], token: string): Promise<Product> {
  const product = await vendorFetch<Product>("/products", token, jsonBody({
    storeBox: `/api/store_boxes/${input.storeBoxId}`,
    name: input.name, slug: input.slug,
    description: input.description ?? null,
    basePriceCents: input.basePriceCents, currency: input.currency,
    active: true,
    images: input.imagePath ? [input.imagePath] : [],
  }));
  for (const v of variants) {
    await vendorFetch("/product_variants", token, jsonBody({
      product: `/api/products/${(product as { id: number }).id}`,
      sku: v.sku, priceCents: v.priceCents, stock: v.stock, active: true,
      images: v.imagePath ? [v.imagePath] : (input.imagePath ? [input.imagePath] : []),
    }));
  }
  return product;
}

export async function updateProduct(id: number, input: Partial<ProductInput>, token: string): Promise<Product> {
  const body: Record<string, unknown> = { ...input };
  if (input.imagePath !== undefined) { body.images = input.imagePath ? [input.imagePath] : []; delete body.imagePath; }
  return vendorFetch<Product>(`/products/${id}`, token, patchBody(body));
}

export async function deleteProduct(id: number, token: string): Promise<void> {
  await vendorFetch<void>(`/products/${id}`, token, { method: "DELETE" });
}

export type ArticleInput = {
  blogBoxId: number;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  imagePath?: string;
  published: boolean;
  publishedAt?: string;
};

export async function fetchMyArticles(blogBoxId: number, token: string): Promise<Article[]> {
  const r = await vendorFetch<HydraCollection<Article>>(`/articles?blogBox.id=${blogBoxId}&order[publishedAt]=desc`, token);
  return collection(r);
}

export async function createArticle(input: ArticleInput, token: string): Promise<Article> {
  return vendorFetch<Article>("/articles", token, jsonBody({
    blogBox: `/api/blog_boxes/${input.blogBoxId}`,
    title: input.title, slug: input.slug,
    excerpt: input.excerpt ?? null, body: input.body,
    imagePath: input.imagePath ?? null, published: input.published,
    publishedAt: input.publishedAt ?? null,
  }));
}

export async function updateArticle(id: number, input: Partial<ArticleInput>, token: string): Promise<Article> {
  return vendorFetch<Article>(`/articles/${id}`, token, patchBody(input));
}

export async function deleteArticle(id: number, token: string): Promise<void> {
  await vendorFetch<void>(`/articles/${id}`, token, { method: "DELETE" });
}

export type TripInput = {
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

export async function fetchMyTrips(travelBoxId: number, token: string): Promise<Trip[]> {
  const r = await vendorFetch<HydraCollection<Trip>>(`/trips?travelBox.id=${travelBoxId}&order[publishedAt]=desc`, token);
  return collection(r);
}

export async function createTrip(input: TripInput, token: string): Promise<Trip> {
  return vendorFetch<Trip>("/trips", token, jsonBody({
    travelBox: `/api/travel_boxes/${input.travelBoxId}`,
    title: input.title, slug: input.slug, locale: input.locale,
    excerpt: input.excerpt ?? null, body: input.body,
    imagePath: input.imagePath ?? null, published: input.published,
    publishedAt: input.publishedAt ?? null,
  }));
}

export async function updateTrip(id: number, input: Partial<TripInput>, token: string): Promise<Trip> {
  return vendorFetch<Trip>(`/trips/${id}`, token, patchBody(input));
}

export async function deleteTrip(id: number, token: string): Promise<void> {
  await vendorFetch<void>(`/trips/${id}`, token, { method: "DELETE" });
}

export type VendorStoreOrder = {
  id: number;
  storeNameSnapshot: string;
  status: string;
  carrierCode?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  totalCents: number;
  currency: string;
  createdAt: string;
};

export async function fetchMyVendorOrders(token: string): Promise<VendorStoreOrder[]> {
  const r = await vendorFetch<HydraCollection<VendorStoreOrder>>("/my_store_orders", token);
  return collection(r);
}

export type PayoutEntry = {
  id: number;
  storeReference: string;
  grossCents: number;
  commissionCents: number;
  netCents: number;
  commissionRatePercent: number;
  status: "pending" | "paid";
  createdAt: string;
  paidAt?: string | null;
};

export async function fetchMyPayouts(token: string): Promise<PayoutEntry[]> {
  const r = await vendorFetch<HydraCollection<PayoutEntry>>("/my_payouts", token);
  return collection(r);
}

export async function updateStoreOrder(
  id: number,
  patch: { status?: string; trackingNumber?: string; trackingUrl?: string },
  token: string,
): Promise<VendorStoreOrder> {
  return vendorFetch<VendorStoreOrder>(`/my_store_orders/${id}`, token, patchBody(patch));
}

export async function uploadMedia(file: File, token: string): Promise<{ path: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  return vendorFetch<{ path: string; url: string }>("/admin/media", token, { method: "POST", body: form });
}

export function slugify(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export function centsFromEuros(input: string): number {
  const val = parseFloat(input.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(val) ? Math.max(0, Math.round(val * 100)) : 0;
}

export function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
