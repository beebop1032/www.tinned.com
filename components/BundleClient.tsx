"use client";

import Image from "next/image";
import { useState } from "react";
import { CART_STORAGE_KEY, normalizeCartItems, upsertCartItem, type CartItem } from "@/lib/cart";
import { money } from "@/lib/format";
import type { ProductBundle } from "@/lib/types";

function readCart(): CartItem[] {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function BundleClient({ bundle }: { bundle: ProductBundle }) {
  const [added, setAdded] = useState(false);
  const currency = "EUR";
  const savings = Math.max(0, bundle.componentsTotalCents - bundle.priceCents);
  const savingsPct = bundle.componentsTotalCents > 0 ? Math.round((savings / bundle.componentsTotalCents) * 100) : 0;

  const addToCart = () => {
    let cart = readCart();
    for (const item of bundle.items) {
      const productSlug = item.variant.product?.slug;
      if (!productSlug) continue;
      cart = upsertCartItem(cart, { productSlug, variantSku: item.variant.sku, quantity: item.quantity });
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("tinned-cart-updated"));
    window.dispatchEvent(new CustomEvent("tinned-cart-toast", { detail: { name: bundle.name } }));
    window.dispatchEvent(new Event("tinned-cart-open"));
    setAdded(true);
  };

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Composez votre box</span>
          <h1 className="page-title">{bundle.name}</h1>
          {bundle.description ? <p className="lead">{bundle.description}</p> : null}
        </div>
      </div>

      <div className="bundle-layout">
        <div className="bundle-items">
          {bundle.items.map((item) => (
            <div className="bundle-item" key={item.id}>
              <Image src={item.variant.images?.[0] ?? "/tinned-assets/box-store.svg"} alt={item.variant.product?.name ?? item.variant.sku} width={64} height={64} />
              <div className="bundle-item-body">
                <span className="bundle-item-name">{item.variant.product?.name ?? item.variant.sku}</span>
                <span className="bundle-item-meta">× {item.quantity} · {money(item.variant.priceCents, currency)}</span>
              </div>
            </div>
          ))}
        </div>

        <aside className="bundle-purchase">
          <div className="bundle-price">
            <strong>{money(bundle.priceCents, currency)}</strong>
            {savings > 0 ? (
              <>
                <s>{money(bundle.componentsTotalCents, currency)}</s>
                <span className="bundle-badge">-{savingsPct}%</span>
              </>
            ) : null}
          </div>
          {savings > 0 ? <p className="bundle-savings">Vous économisez {money(savings, currency)} sur cette box.</p> : null}
          <button className="button bundle-add" type="button" onClick={addToCart}>Ajouter la box au panier</button>
          {added ? <p className="bundle-feedback" role="status">Composants ajoutés au panier ✓</p> : null}
        </aside>
      </div>
    </section>
  );
}
