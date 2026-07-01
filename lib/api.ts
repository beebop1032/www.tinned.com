import { cache } from "react";
import type { Article, Box, BoxType, LandingPage, Product, ProductBundle, StaticPage, Trip } from "./types";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

type HydraCollection<T> = {
  member?: T[];
  "hydra:member"?: T[];
};

function collection<T>(payload: T[] | HydraCollection<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.member ?? payload["hydra:member"] ?? [];
}

function requireApiUrl(): string {
  if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set.");
  return apiUrl.replace(/\/$/, "");
}

async function fetchApi<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${requireApiUrl()}/api${path}`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/ld+json, application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const getBoxes = cache(async function getBoxes(type: BoxType): Promise<Box[]> {
  const resource =
    type === "store" ? "store_boxes"
    : type === "business" ? "business_boxes"
    : type === "travel" ? "travel_boxes"
    : "blog_boxes";
  const remote = await fetchApi<HydraCollection<Box>>(`/${resource}?active=true`);
  return remote ? collection(remote).map((box) => ({ ...box, type })) : [];
});

export const getBox = cache(async function getBox(type: BoxType, slug: string): Promise<Box | null> {
  const list = await getBoxes(type);
  return list.find((box) => box.slug === slug) ?? null;
});

export async function getBoxesForBusiness(type: "store" | "blog", businessSlug: string): Promise<Box[]> {
  const resource = type === "store" ? "store_boxes" : "blog_boxes";
  const remote = await fetchApi<HydraCollection<Box>>(`/${resource}?businessBox.slug=${encodeURIComponent(businessSlug)}&active=true`);
  return remote ? collection(remote).map((box) => ({ ...box, type })) : [];
}

export async function getBoxesForTravel(type: "business" | "blog", travelSlug: string): Promise<Box[]> {
  const resource = type === "business" ? "business_boxes" : "blog_boxes";
  const remote = await fetchApi<HydraCollection<Box>>(`/${resource}?travelBox.slug=${encodeURIComponent(travelSlug)}&active=true`);
  return remote ? collection(remote).map((box) => ({ ...box, type })) : [];
}

export async function getBlogsForStore(storeSlug: string): Promise<Box[]> {
  const remote = await fetchApi<HydraCollection<Box>>(`/blog_boxes?storeBox.slug=${encodeURIComponent(storeSlug)}&active=true`);
  return remote ? collection(remote).map((box) => ({ ...box, type: "blog" as const })) : [];
}

export async function getProducts(storeSlug?: string): Promise<Product[]> {
  const query = storeSlug ? `?storeBox.slug=${storeSlug}&active=true` : "?active=true";
  const remote = await fetchApi<HydraCollection<Product>>(`/products${query}`);
  return remote ? collection(remote) : [];
}

export const getProduct = cache(async function getProduct(slug: string): Promise<Product | null> {
  const remote = await fetchApi<HydraCollection<Product>>(`/products?slug=${slug}&active=true`);
  return remote ? (collection(remote)[0] ?? null) : null;
});

export async function getBundles(storeSlug?: string): Promise<ProductBundle[]> {
  const query = storeSlug ? `?storeBox.slug=${storeSlug}&active=true` : "?active=true";
  const remote = await fetchApi<HydraCollection<ProductBundle>>(`/product_bundles${query}`);
  return remote ? collection(remote) : [];
}

export const getBundle = cache(async function getBundle(slug: string): Promise<ProductBundle | null> {
  const remote = await fetchApi<HydraCollection<ProductBundle>>(`/product_bundles?slug=${slug}&active=true`);
  return remote ? (collection(remote)[0] ?? null) : null;
});

export async function getArticles(blogSlug?: string): Promise<Article[]> {
  const query = blogSlug ? `?blogBox.slug=${blogSlug}&published=true` : "?published=true";
  const remote = await fetchApi<HydraCollection<Article>>(`/articles${query}`);
  return remote ? collection(remote) : [];
}

export const getArticle = cache(async function getArticle(slug: string): Promise<Article | null> {
  const remote = await fetchApi<HydraCollection<Article>>(`/articles?slug=${slug}&published=true`);
  return remote ? (collection(remote)[0] ?? null) : null;
});

export async function getTrips(travelBoxSlug?: string, locale = "fr"): Promise<Trip[]> {
  const query = travelBoxSlug
    ? `?travelBox.slug=${encodeURIComponent(travelBoxSlug)}&published=true&locale=${locale}`
    : `?published=true&locale=${locale}`;
  const remote = await fetchApi<HydraCollection<Trip>>(`/trips${query}`);
  return remote ? collection(remote) : [];
}

export const getTrip = cache(async function getTrip(slug: string, locale = "fr"): Promise<Trip | null> {
  const remote = await fetchApi<HydraCollection<Trip>>(`/trips?slug=${slug}&published=true&locale=${locale}`);
  return remote ? (collection(remote)[0] ?? null) : null;
});

export const getFaq = cache(async function getFaq(locale = "fr"): Promise<StaticPage | null> {
  const remote = await fetchApi<HydraCollection<StaticPage>>(`/static_pages?slug=faq&locale=${locale}`);
  return remote ? (collection(remote)[0] ?? null) : null;
});

export async function getLanding(boxSlug: string, locale = "fr"): Promise<LandingPage | null> {
  const remote = await fetchApi<HydraCollection<LandingPage>>(
    `/landing_pages?box.slug=${encodeURIComponent(boxSlug)}&locale=${locale}`
  );
  return remote ? (collection(remote)[0] ?? null) : null;
}
