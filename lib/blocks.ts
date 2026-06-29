export type Cta = { label: string; href: string };

export type Block =
  | { id: string; type: "hero"; title: string; subtitle?: string; imagePath?: string; cta?: Cta }
  | { id: string; type: "richText"; markdown: string }
  | { id: string; type: "gallery"; images: { path: string; caption?: string }[] }
  | { id: string; type: "cta"; heading: string; text?: string; button: Cta }
  | { id: string; type: "collection"; source: "products" | "articles" | "trips" | "childBoxes"; title?: string; limit?: number }
  | { id: string; type: "features"; title?: string; items: { icon?: string; title: string; text: string }[] }
  | { id: string; type: "stats"; items: { value: string; label: string }[] }
  | { id: string; type: "testimonial"; quote: string; author?: string; role?: string }
  | { id: string; type: "faq"; title?: string; items: { question: string; answer: string }[] }
  | { id: string; type: "video"; url: string; title?: string }
  | { id: string; type: "newsletter"; eyebrow?: string; title: string; body?: string; cta?: Cta };

export type BlockType = Block["type"];

export type BlockCatalog = {
  types: Record<string, string[]>;
  collectionSources: string[];
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero", richText: "Texte riche", gallery: "Galerie", cta: "Bandeau CTA",
  collection: "Collection", features: "Atouts", stats: "Chiffres",
  testimonial: "Témoignage", faq: "FAQ", video: "Vidéo", newsletter: "Newsletter",
};

export async function fetchBlockCatalog(apiBase: string): Promise<BlockCatalog | null> {
  try {
    const r = await fetch(`${apiBase}/api/block_catalog`, { headers: { Accept: "application/ld+json, application/json" } });
    if (!r.ok) return null;
    const d = await r.json();
    return { types: d.types ?? {}, collectionSources: d.collectionSources ?? [] };
  } catch {
    return null;
  }
}
