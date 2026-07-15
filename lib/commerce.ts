import type { Product } from "./types";

export function productHref(product: Product) {
  const storeSlug = product.storeBox?.slug ?? "store";
  const variantSlug = product.variants.find((variant) => variant.stock > 0)?.sku.toLowerCase() ?? product.variants[0]?.sku.toLowerCase() ?? "variant";
  return `/store-box/${storeSlug}/${product.slug}/${variantSlug}`;
}

export function productStockLabel(product: Product) {
  const totalStock = product.variants.reduce((total, variant) => total + Math.max(0, variant.stock), 0);
  if (totalStock <= 0) return "Rupture";
  if (totalStock <= 3) return "Dernières pièces";
  return "En stock";
}

export function productVariantLabel(product: Product) {
  const count = product.variants.length;
  return count > 1 ? `${count} options` : "Disponible directement";
}

/**
 * Returns the product's name/description for a locale, falling back to the base
 * (French) fields when no translation exists. Ready for [locale] routing activation.
 */
export function localizedProduct(product: Product, locale: string): { name: string; description?: string | null } {
  const translation = product.translations?.find((entry) => entry.locale === locale);
  return translation
    ? { name: translation.name || product.name, description: translation.description ?? product.description }
    : { name: product.name, description: product.description };
}

export function productPriceCents(product: Product) {
  return product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.priceCents))
    : product.basePriceCents;
}

/**
 * Reference ("was") price of the cheapest variant, returned only when it is a
 * genuine markdown (strictly higher than the price actually charged). Used to
 * render a struck-through price; never affects what the buyer pays.
 */
export function productCompareAtCents(product: Product): number | null {
  if (!product.variants.length) return null;
  const cheapest = product.variants.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));
  const compareAt = cheapest.compareAtPriceCents ?? null;
  return compareAt && compareAt > cheapest.priceCents ? compareAt : null;
}

/** Discount percentage (rounded) between a charged price and its reference price. */
export function discountPct(priceCents: number, compareAtCents: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}

/**
 * Réduction accordée pour une pré-commande d'un produit pas encore sorti.
 * Doit rester alignée avec CheckoutProcessor::PREORDER_DISCOUNT_PERCENT (api).
 */
export const PREORDER_DISCOUNT_PCT = 15;

/**
 * Un produit « à venir » (coming_soon/preorder) est pré-commandable quand son prix
 * est connu, non masqué par le vendeur, et qu'il a au moins une variante à commander.
 */
export function isPreorderable(product: Product): boolean {
  const preLaunch = product.availability === "coming_soon" || product.availability === "preorder";
  return preLaunch && !product.hidePriceWhenUnavailable && productPriceCents(product) > 0 && product.variants.length > 0;
}

/** Prix pré-commande (−15 %) réellement facturé via Mollie. */
export function preorderPriceCents(product: Product): number {
  return Math.round((productPriceCents(product) * (100 - PREORDER_DISCOUNT_PCT)) / 100);
}

/** Variante utilisée pour une pré-commande : la première disponible (le stock est ignoré). */
export function preorderVariant(product: Product) {
  return product.variants[0] ?? null;
}
