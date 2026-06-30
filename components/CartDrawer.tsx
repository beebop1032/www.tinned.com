"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProducts } from "@/lib/api";
import {
  buildStoreCartGroups,
  cartItemKey,
  cartSubtotal,
  normalizeCartItems,
  toCartProduct,
  type CartItem,
  type CartProduct,
} from "@/lib/cart";
import { CART_STORAGE_KEY, upsertCartItem } from "@/lib/cart";
import { money } from "@/lib/format";

const FREE_SHIPPING_CENTS = 9000;

function persistCart(next: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("tinned-cart-updated"));
}

function drawerProductHref(product: CartProduct): string {
  const storeSlug = product.storeBox?.slug ?? "store";
  const variantSlug = (product.variants.find((variant) => variant.stock > 0) ?? product.variants[0])?.sku.toLowerCase() ?? "variant";
  return `/store-box/${storeSlug}/${product.slug}/${variantSlug}`;
}

function readCart(): CartItem[] {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<CartProduct[]>([]);
  const loadedRef = useRef(false);

  const ensureProducts = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const list = await getProducts();
      setProducts(list.map(toCartProduct));
    } catch {
      loadedRef.current = false;
    }
  }, []);

  useEffect(() => {
    const refresh = () => setItems(readCart());
    const onOpen = () => {
      refresh();
      void ensureProducts();
      setOpen(true);
    };
    refresh();
    window.addEventListener("tinned-cart-updated", refresh);
    window.addEventListener("tinned-cart-open", onOpen);
    return () => {
      window.removeEventListener("tinned-cart-updated", refresh);
      window.removeEventListener("tinned-cart-open", onOpen);
    };
  }, [ensureProducts]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const groups = useMemo(() => buildStoreCartGroups(products, items), [products, items]);
  const subtotalCents = cartSubtotal(groups);
  const remainingForFree = Math.max(0, FREE_SHIPPING_CENTS - subtotalCents);
  const freePct = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_CENTS) * 100));
  const currency = groups[0]?.currency ?? "EUR";
  const lineCount = items.reduce((total, item) => total + item.quantity, 0);

  const suggestions = useMemo(() => {
    const inCart = new Set(items.map((item) => item.productSlug));
    const cartStores = new Set(groups.map((group) => group.storeSlug));
    const available = products.filter(
      (product) => !inCart.has(product.slug) && product.variants.some((variant) => variant.stock > 0)
    );
    const sameStore = available.filter((product) => cartStores.has(product.storeBox?.slug ?? "boutique"));
    const others = available.filter((product) => !sameStore.includes(product));
    return [...sameStore, ...others].slice(0, 3);
  }, [products, items, groups]);

  const removeLine = (key: string) => {
    const next = items.filter((item) => cartItemKey(item) !== key);
    setItems(next);
    persistCart(next);
  };

  const addSuggestion = (product: CartProduct) => {
    const variant = product.variants.find((candidate) => candidate.stock > 0);
    if (!variant) return;
    const next = upsertCartItem(readCart(), { productSlug: product.slug, variantSku: variant.sku, quantity: 1 });
    setItems(next);
    persistCart(next);
  };

  if (!open) return null;

  return (
    <div className="cart-drawer-overlay" onClick={() => setOpen(false)} role="presentation">
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()} aria-label="Aperçu du panier">
        <header className="cart-drawer-head">
          <strong>Mon panier {lineCount > 0 ? `(${lineCount})` : ""}</strong>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
        </header>

        {subtotalCents > 0 ? (
          <div className="cart-drawer-franco">
            {remainingForFree > 0 ? (
              <span>Plus que <strong>{money(remainingForFree, currency)}</strong> pour la livraison offerte 🎉</span>
            ) : (
              <span>Livraison offerte débloquée ✅</span>
            )}
            <div className="cart-drawer-franco-bar"><span style={{ width: `${freePct}%` }} /></div>
          </div>
        ) : null}

        <div className="cart-drawer-lines">
          {groups.length === 0 ? (
            <p className="cart-drawer-empty">Votre panier est vide.</p>
          ) : (
            groups.flatMap((group) =>
              group.lines.map((line) => {
                const key = cartItemKey({ productSlug: line.product.slug, variantSku: line.variant.sku });
                return (
                  <div className="cart-drawer-line" key={key}>
                    <Image src={line.product.images[0] ?? "/tinned-assets/box-store.svg"} alt={line.product.name} width={56} height={56} />
                    <div className="cart-drawer-line-body">
                      <span className="cart-drawer-line-name">{line.product.name}</span>
                      <span className="cart-drawer-line-meta">× {line.quantity} · {money(line.lineTotalCents, line.currency)}</span>
                    </div>
                    <button type="button" className="cart-drawer-remove" onClick={() => removeLine(key)} aria-label="Retirer">✕</button>
                  </div>
                );
              })
            )
          )}
        </div>

        {suggestions.length > 0 ? (
          <div className="cart-drawer-cross">
            <span className="cart-drawer-cross-title">On y ajoute ?</span>
            {suggestions.map((product) => {
              const price = Math.min(...product.variants.map((variant) => variant.priceCents));
              return (
                <div className="cart-drawer-cross-item" key={product.slug}>
                  <Link href={drawerProductHref(product)} onClick={() => setOpen(false)}>{product.name}</Link>
                  <button type="button" onClick={() => addSuggestion(product)}>+ {money(price, product.currency)}</button>
                </div>
              );
            })}
          </div>
        ) : null}

        {groups.length > 0 ? (
          <footer className="cart-drawer-foot">
            <div className="cart-drawer-subtotal">
              <span>Sous-total</span>
              <strong>{money(subtotalCents, currency)}</strong>
            </div>
            <Link className="button cart-drawer-checkout" href="/checkout" onClick={() => setOpen(false)}>Commander</Link>
            <Link className="cart-drawer-view" href="/cart" onClick={() => setOpen(false)}>Voir le panier</Link>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
