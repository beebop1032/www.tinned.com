"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildStoreCartGroups, normalizeOrder, ORDER_STORAGE_KEY, type CartProduct, type StoredOrder } from "@/lib/cart";
import { readStoredSession } from "@/lib/auth";
import { fetchMyOrders } from "@/lib/customer-api";
import { carrierFor } from "@/lib/delivery";
import { money } from "@/lib/format";

function readOrder() {
  try {
    return normalizeOrder(JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function OrdersClient({ products }: { products: CartProduct[] }) {
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    const localOrder = readOrder();
    if (localOrder) setOrders([localOrder]);

    const session = readStoredSession();
    if (!session?.token) return;

    fetchMyOrders(session.token)
      .then((nextOrders) => {
        if (nextOrders.length) setOrders(nextOrders);
      })
      .catch(() => {
        // The latest locally confirmed order remains visible if the API is unavailable.
      });
  }, []);

  const orderSummaries = useMemo(() => orders.map((order) => {
    const groups = buildStoreCartGroups(products, order.items);
    return { order, groups, currency: groups[0]?.currency ?? order.currency ?? "EUR" };
  }), [orders, products]);

  if (!orderSummaries.length) {
    return (
      <section className="container section cart-empty">
          <span className="eyebrow">Commandes</span>
          <h1 className="page-title">Aucune commande pour le moment.</h1>
          <p className="lead">Vos commandes validées apparaîtront ici.</p>
        <Link className="button" href="/store-box">Explorer les boutiques</Link>
      </section>
    );
  }

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Commandes</span>
          <h1 className="page-title">Mes commandes</h1>
          <p className="lead">Suivez chaque panier boutique depuis une seule commande.</p>
        </div>
      </div>

      <div className="store-cart-list">
        {orderSummaries.map(({ order, groups, currency }) => (
          <article className="store-cart is-selected" key={order.id}>
            <header className="store-cart-header">
              <div>
                <strong>Commande {order.reference ?? order.id}</strong>
                <small>{groups.length} panier{groups.length > 1 ? "s" : ""} boutique / {money(order.totalCents, currency)}</small>
              </div>
              <span className="pill">{order.paymentStatus === "paid" ? "Paiement confirmé" : "Paiement en attente"}</span>
            </header>
            <div className="order-store-status">
              {groups.map((group) => (
                <div key={group.storeSlug}>
                  <strong>{group.storeName}</strong>
                  <span>{carrierFor(order.carrierSelections?.find((item) => item.storeSlug === group.storeSlug)?.carrierCode).name} / préparation par la boutique</span>
                </div>
              ))}
            </div>
            <Link className="button secondary-on-light order-card-action" href={`/checkout/confirmation?order=${order.id}`}>Voir la confirmation</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
