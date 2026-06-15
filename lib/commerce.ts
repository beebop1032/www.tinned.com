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

export function productPriceCents(product: Product) {
  return product.variants.length
    ? Math.min(...product.variants.map((variant) => variant.priceCents))
    : product.basePriceCents;
}
