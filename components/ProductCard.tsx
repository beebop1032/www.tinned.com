"use client";

import Image from "next/image";
import Link from "next/link";
import { Bell, CalendarClock, ShoppingCart, Sparkles } from "lucide-react";
import { useState } from "react";
import { CART_STORAGE_KEY, normalizeCartItems, upsertCartItem } from "@/lib/cart";
import { discountPct, productCompareAtCents, productHref, productPriceCents, productStockLabel, productVariantLabel } from "@/lib/commerce";
import { formatReleaseDate, money } from "@/lib/format";
import { StarRating } from "@/components/StarRating";
import type { Product } from "@/lib/types";

function readStoredCart() {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const comingSoon = product.availability === "coming_soon";
  const soldOut = !comingSoon && product.variants.length > 0 && product.variants.every((variant) => variant.stock <= 0);
  const releaseLabel = comingSoon ? formatReleaseDate(product.releaseAt) : null;
  const soleVariant = product.variants.length === 1 ? product.variants[0] : null;
  const directPurchase = Boolean(soleVariant) && !comingSoon && !soldOut;
  const priceCents = productPriceCents(product);
  const compareAtCents = comingSoon ? null : productCompareAtCents(product);
  const discount = discountPct(priceCents, compareAtCents);

  const addDirectlyToCart = () => {
    if (!soleVariant || soleVariant.stock < 1) return;
    const next = upsertCartItem(readStoredCart(), {
      productSlug: product.slug,
      variantSku: soleVariant.sku,
      quantity: 1
    });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tinned-cart-updated"));
    window.dispatchEvent(new CustomEvent("tinned-cart-toast", { detail: { name: product.name } }));
    window.dispatchEvent(new Event("tinned-cart-open"));
    setAdded(true);
  };

  return (
    <article className={`card product-card${comingSoon ? " product-card--soon" : ""}`}>
      <Link className="product-card-main" href={productHref(product)}>
        <div className="card-media">
          {comingSoon ? (
            <span className="product-card-tag product-card-tag--soon">
              <Sparkles size={13} aria-hidden />
              Bientôt
            </span>
          ) : (
            <span className={`product-card-tag${soldOut ? " product-card-tag--soldout" : ""}`}>
              {product.availability === "preorder" ? "Pré-vente" : soldOut ? "Épuisé" : productStockLabel(product)}
            </span>
          )}
          {discount ? <span className="product-card-discount">-{discount}%</span> : null}
          <Image src={product.images[0] ?? "/tinned-assets/box-store.svg"} alt={product.name} width={112} height={112} />
        </div>
        <div className="product-card-body">
          <span className="seller">
            <Image src="/tinned-assets/picto-box-store.svg" alt="" width={28} height={28} />
            {product.storeBox?.name ?? "Boutique"}
          </span>
          <h3>{product.name}</h3>
          {product.ratingCount ? (
            <span className="product-card-rating">
              <StarRating value={product.ratingAverage ?? 0} size={14} />
              <span>({product.ratingCount})</span>
            </span>
          ) : null}
          <p className="product-card-desc">{product.description}</p>
          {comingSoon ? (
            releaseLabel ? (
              <div className="product-card-meta">
                <span className="product-card-meta-soon">
                  <CalendarClock size={13} aria-hidden />
                  Lancement le {releaseLabel}
                </span>
              </div>
            ) : null
          ) : (
            <div className="product-card-meta">
              {!soldOut || product.variants.length > 1 ? <span>{productVariantLabel(product)}</span> : null}
              <span>{soldOut ? "Épuisé" : productStockLabel(product)}</span>
            </div>
          )}
        </div>
      </Link>
      {comingSoon ? (
        <div className="product-card-purchase product-card-purchase--soon">
          <span className="product-card-soon-price">Prix dévoilé au lancement</span>
          <Link className="button product-card-add" href={productHref(product)}>
            <Bell size={16} aria-hidden />
            Me prévenir
          </Link>
        </div>
      ) : (
        <div className="product-card-purchase">
          <strong>
            {product.variants.length > 1 ? <small>Prix à partir de</small> : null}
            {money(priceCents, product.currency)}
            {compareAtCents ? <s className="product-card-compare">{money(compareAtCents, product.currency)}</s> : null}
          </strong>
          {directPurchase ? (
            <button className="button product-card-add" type="button" onClick={addDirectlyToCart} disabled={soleVariant!.stock < 1}>
              <ShoppingCart size={16} aria-hidden />
              Ajouter
            </button>
          ) : soldOut ? (
            <Link className="product-card-notify" href={productHref(product)}>
              <Bell size={15} aria-hidden />
              Me prévenir
            </Link>
          ) : (
            <Link href={productHref(product)}>Voir les options</Link>
          )}
        </div>
      )}
      {added ? <p className="product-card-feedback" role="status">Ajouté au panier</p> : null}
    </article>
  );
}
