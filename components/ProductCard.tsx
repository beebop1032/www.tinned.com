"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { CART_STORAGE_KEY, normalizeCartItems, upsertCartItem } from "@/lib/cart";
import { productHref, productPriceCents, productStockLabel, productVariantLabel } from "@/lib/commerce";
import { money } from "@/lib/format";
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
  const soleVariant = product.variants.length === 1 ? product.variants[0] : null;
  const directPurchase = Boolean(soleVariant);
  const available = Boolean(soleVariant && soleVariant.stock > 0);
  const priceCents = productPriceCents(product);

  const addDirectlyToCart = () => {
    if (!soleVariant || soleVariant.stock < 1) return;
    const next = upsertCartItem(readStoredCart(), {
      productSlug: product.slug,
      variantSku: soleVariant.sku,
      quantity: 1
    });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("tinned-cart-updated"));
    setAdded(true);
  };

  return (
    <article className="card product-card">
      <Link className="product-card-main" href={productHref(product)}>
        <div className="card-media">
          <span className="product-card-tag">{productStockLabel(product)}</span>
          <Image src={product.images[0] ?? "/tinned-assets/box-store.svg"} alt={product.name} width={112} height={112} />
        </div>
        <div className="product-card-body">
          <span className="seller">
            <Image src="/tinned-assets/picto-box-store.svg" alt="" width={28} height={28} />
            {product.storeBox?.name ?? "Boutique"}
          </span>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="product-card-meta">
            <span>{productVariantLabel(product)}</span>
            <span>{productStockLabel(product)}</span>
          </div>
        </div>
      </Link>
      <div className="product-card-purchase">
        <strong>
          {product.variants.length > 1 ? <small>Prix à partir de</small> : null}
          {money(priceCents, product.currency)}
        </strong>
        {directPurchase ? (
          <button className="button product-card-add" type="button" onClick={addDirectlyToCart} disabled={!available}>
            <ShoppingCart size={16} aria-hidden />
            {available ? "Ajouter" : "Indisponible"}
          </button>
        ) : (
          <Link href={productHref(product)}>Voir les options</Link>
        )}
      </div>
      {added ? <p className="product-card-feedback" role="status">Ajouté au panier</p> : null}
    </article>
  );
}
