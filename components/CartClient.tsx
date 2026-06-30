"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Minus, Plus, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { readStoredSession, type TinnedSession } from "@/lib/auth";
import {
  buildStoreCartGroups,
  cartItemKey,
  cartSubtotal,
  CART_STORAGE_KEY,
  CHECKOUT_STORAGE_KEY,
  normalizeCartItems,
  shippingFor,
  variantSummary,
  type CartItem,
  type CartProduct
} from "@/lib/cart";
import { money } from "@/lib/format";

function readCart() {
  try {
    return normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

function persistCart(items: CartItem[]) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("tinned-cart-updated"));
}

export function CartClient({ products }: { products: CartProduct[] }) {
  const [items, setItems] = useState<CartItem[] | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [session, setSession] = useState<TinnedSession | null>(null);
  const previousGroupKey = useRef("");

  useEffect(() => {
    setItems(readCart());
    setSession(readStoredSession());
  }, []);

  const groups = useMemo(() => buildStoreCartGroups(products, items ?? []), [items, products]);
  const groupKey = groups.map((group) => group.storeSlug).join("|");

  useEffect(() => {
    if (items === null) return;
    if (groupKey !== previousGroupKey.current) {
      setSelectedStores(groups.map((group) => group.storeSlug));
      previousGroupKey.current = groupKey;
    }
  }, [groupKey, groups, items]);

  const selectedGroups = groups.filter((group) => selectedStores.includes(group.storeSlug));
  const subtotalCents = cartSubtotal(selectedGroups);
  const shippingCents = shippingFor(selectedGroups, subtotalCents);
  const totalCents = subtotalCents + shippingCents;
  const currency = selectedGroups[0]?.currency ?? "EUR";

  const FREE_SHIPPING_CENTS = 9000;
  const remainingForFree = Math.max(0, FREE_SHIPPING_CENTS - subtotalCents);
  const freeShippingPct = Math.min(100, Math.round((subtotalCents / FREE_SHIPPING_CENTS) * 100));

  const updateItems = (updater: (current: CartItem[]) => CartItem[]) => {
    setItems((current) => {
      const next = updater(current ?? []);
      persistCart(next);
      return next;
    });
  };

  const updateQuantity = (lineKey: string, quantity: number) => {
    updateItems((current) =>
      current
        .map((item) => (cartItemKey(item) === lineKey ? { ...item, quantity: Math.max(1, Math.min(99, quantity)) } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeLine = (lineKey: string) => {
    updateItems((current) => current.filter((item) => cartItemKey(item) !== lineKey));
  };

  const toggleStore = (storeSlug: string) => {
    setSelectedStores((current) =>
      current.includes(storeSlug) ? current.filter((slug) => slug !== storeSlug) : [...current, storeSlug]
    );
  };

  const goToCheckout = () => {
    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify({ selectedStoreSlugs: selectedStores }));
    window.location.href = session ? "/checkout" : "/auth?redirect=/checkout";
  };

  if (items === null) {
    return (
      <section className="container section">
        <h1 className="page-title">Panier</h1>
        <p className="lead">Chargement de votre panier.</p>
      </section>
    );
  }

  if (!groups.length) {
    return (
      <section className="container section cart-empty">
        <span className="eyebrow">Panier</span>
        <h1 className="page-title">Votre panier est vide.</h1>
        <p className="lead">Explorez les boutiques et ajoutez une sélection pour démarrer votre commande.</p>
        <Link className="button" href="/store-box">Voir les boutiques</Link>
      </section>
    );
  }

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Panier</span>
          <h1 className="page-title">Un panier par boutique.</h1>
          <p className="lead">Tous les paniers boutique sont sélectionnés par défaut. Vous pouvez finaliser une ou plusieurs boutiques.</p>
        </div>
        <div className="checkout-steps" aria-label="Étapes de commande">
          <span className="is-active">Panier</span>
          <span>Compte</span>
          <span>Livraison</span>
          <span>Paiement</span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="cart-layout">
        <div className="store-cart-list">
          {groups.map((group) => {
            const checked = selectedStores.includes(group.storeSlug);
            return (
              <section className={`store-cart ${checked ? "is-selected" : ""}`} key={group.storeSlug}>
                <header className="store-cart-header">
                  <label className="store-selector">
                    <input type="checkbox" checked={checked} onChange={() => toggleStore(group.storeSlug)} />
                    <span>
                      <strong>Panier {group.storeName}</strong>
                      <small>{group.lines.length} article{group.lines.length > 1 ? "s" : ""} / {money(group.subtotalCents, group.currency)}</small>
                    </span>
                  </label>
                  <span className="pill">{checked ? "Sélectionné" : "En pause"}</span>
                </header>

                <div className="cart-lines">
                  {group.lines.map((line) => {
                    const lineKey = cartItemKey({ productSlug: line.product.slug, variantSku: line.variant.sku });
                    return (
                      <article className="cart-line" key={lineKey}>
                        <div className="cart-line-media">
                          <Image src={line.product.images[0] ?? "/tinned-assets/box-store.svg"} alt="" width={84} height={84} />
                        </div>
                        <div>
                          <h2>{line.product.name}</h2>
                          <p>{variantSummary(line.variant)}</p>
                          <button className="text-button" type="button" onClick={() => removeLine(lineKey)}>
                            <Trash2 size={15} aria-hidden />
                            Retirer
                          </button>
                        </div>
                        <div className="cart-line-actions">
                          <div className="quantity-stepper" aria-label={`Quantité ${line.product.name}`}>
                            <button type="button" onClick={() => updateQuantity(lineKey, line.quantity - 1)} aria-label="Retirer une unité">
                              <Minus size={14} aria-hidden />
                            </button>
                            <span>{line.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(lineKey, line.quantity + 1)} aria-label="Ajouter une unité">
                              <Plus size={14} aria-hidden />
                            </button>
                          </div>
                          <div className="cart-line-price">
                            <strong>{money(line.lineTotalCents, line.currency)}</strong>
                            {line.quantity > 1 ? <small>{money(line.variant.priceCents, line.currency)} / unité</small> : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="order-summary">
          <div className="summary-trust">
            <ShieldCheck size={18} aria-hidden />
            Panier conservé et commande suivie
          </div>
          {subtotalCents > 0 ? (
            <div className={`ship-progress ${remainingForFree === 0 ? "is-complete" : ""}`}>
              <p>
                {remainingForFree === 0 ? (
                  <>🎉 Vous bénéficiez de la <strong>livraison offerte</strong>&nbsp;!</>
                ) : (
                  <>Plus que <strong>{money(remainingForFree, currency)}</strong> pour la livraison offerte</>
                )}
              </p>
              <div className="ship-progress-track">
                <span style={{ width: `${freeShippingPct}%` }} />
              </div>
            </div>
          ) : null}
          <h2>Résumé</h2>
          <div className="summary-row"><span>Paniers sélectionnés</span><strong>{selectedGroups.length}</strong></div>
          <div className="summary-row"><span>Sous-total</span><strong>{money(subtotalCents, currency)}</strong></div>
          <div className="summary-row"><span>Livraison estimée</span><strong>{shippingCents ? money(shippingCents, currency) : "Offerte"}</strong></div>
          <div className="summary-row summary-total"><span>Total</span><strong>{money(totalCents, currency)}</strong></div>
          <button className="button is-wide" type="button" disabled={!selectedGroups.length} onClick={goToCheckout}>
            {session ? "Commander les paniers sélectionnés" : "Se connecter pour commander"}
          </button>
          {!session ? <p className="summary-note">Connexion obligatoire pour garder les adresses, choisir la livraison et suivre la commande.</p> : null}
          <ul className="summary-reassurance">
            <li><ShieldCheck size={15} aria-hidden /> Paiement sécurisé</li>
            <li><RotateCcw size={15} aria-hidden /> Retours sous 14 jours</li>
            <li><BadgeCheck size={15} aria-hidden /> Boutiques vérifiées</li>
          </ul>
          <Link className="summary-link" href="/store-box">Continuer mes achats</Link>
        </aside>
      </div>

      <div className="cart-mobile-bar">
        <div>
          <span>Total</span>
          <strong>{money(totalCents, currency)}</strong>
        </div>
        <button className="button" type="button" disabled={!selectedGroups.length} onClick={goToCheckout}>
          {session ? "Commander" : "Se connecter"}
        </button>
      </div>
    </section>
  );
}
