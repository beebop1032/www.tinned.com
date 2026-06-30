import type { Block } from "./blocks";
import type { LandingPage } from "./types";
import { AUTH_STORAGE_KEY } from "./auth";

function apiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL manquant");
  return url;
}

export async function loadLanding(boxSlug: string, locale: string): Promise<LandingPage | null> {
  const r = await fetch(
    `${apiBase()}/api/landing_pages?box.slug=${encodeURIComponent(boxSlug)}&locale=${locale}`,
    { headers: { Accept: "application/ld+json, application/json" }, cache: "no-store" }
  );
  if (!r.ok) return null;
  const d = await r.json();
  const list = Array.isArray(d) ? d : (d.member ?? d["hydra:member"] ?? []);
  return list[0] ?? null;
}

export type LandingInput = {
  id?: number;
  boxIri?: string;
  slug?: string;
  locale: string;
  title: string;
  metaDescription?: string;
  blocks: Block[];
};

export async function saveLanding(input: LandingInput, token: string): Promise<LandingPage> {
  const isUpdate = typeof input.id === "number";
  const url = isUpdate
    ? `${apiBase()}/api/landing_pages/${input.id}`
    : `${apiBase()}/api/landing_pages`;
  const body = {
    box: input.boxIri ?? null,
    slug: input.slug ?? null,
    locale: input.locale,
    title: input.title,
    metaDescription: input.metaDescription ?? null,
    blocks: input.blocks,
  };
  const r = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      "Content-Type": isUpdate ? "application/merge-patch+json" : "application/ld+json",
      Accept: "application/ld+json, application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (r.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event("tinned-auth-updated"));
    }
    throw new Error("Session expirée. Reconnecte-toi pour continuer.");
  }
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as Record<string, unknown>));
    const violations = (err.violations as { propertyPath: string; message: string }[] | undefined) ?? [];
    const msg = violations.length
      ? violations.map((v) => `${v.propertyPath} : ${v.message}`).join("\n")
      : ((err.detail as string) ?? (err["hydra:description"] as string) ?? `Erreur ${r.status}`);
    throw new Error(msg);
  }
  return r.json();
}

export async function loadStandaloneLanding(slug: string, locale: string): Promise<LandingPage | null> {
  const r = await fetch(
    `${apiBase()}/api/landing_pages?slug=${encodeURIComponent(slug)}&locale=${locale}`,
    { headers: { Accept: "application/ld+json, application/json" }, cache: "no-store" }
  );
  if (!r.ok) return null;
  const d = await r.json();
  const list = Array.isArray(d) ? d : (d.member ?? d["hydra:member"] ?? []);
  return list[0] ?? null;
}

export async function listStandaloneLandings(): Promise<LandingPage[]> {
  const r = await fetch(
    `${apiBase()}/api/landing_pages?exists[box]=false&order[id]=desc`,
    { headers: { Accept: "application/ld+json, application/json" }, cache: "no-store" }
  );
  if (!r.ok) return [];
  const d = await r.json();
  return Array.isArray(d) ? d : (d.member ?? d["hydra:member"] ?? []);
}

export async function deleteLanding(id: number, token: string): Promise<void> {
  const r = await fetch(`${apiBase()}/api/landing_pages/${id}`, {
    method: "DELETE",
    headers: {
      Accept: "application/ld+json, application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (r.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event("tinned-auth-updated"));
    }
    throw new Error("Session expirée. Reconnecte-toi pour continuer.");
  }
  if (!r.ok && r.status !== 204) {
    const err = await r.json().catch(() => ({} as Record<string, unknown>));
    const msg = (err.detail as string) ?? (err["hydra:description"] as string) ?? `Erreur ${r.status}`;
    throw new Error(msg);
  }
}
