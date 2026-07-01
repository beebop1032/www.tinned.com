"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buildStoreCartGroups, CART_STORAGE_KEY, normalizeCartItems, normalizeOrder, ORDER_STORAGE_KEY, upsertCartItem, type CartItem, type CartProduct, type StoredOrder } from "@/lib/cart";
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

const SHIPMENT_LABELS: Record<string, string> = {
  open: "En attente de paiement", waiting_store: "En attente de préparation", preparing: "En préparation",
  shipped: "Expédié", completed: "Livré", cancelled: "Annulé",
};

const TIMELINE_STEPS = [
  { key: "pending_payment", label: "Commande" },
  { key: "paid", label: "Payée" },
  { key: "processing", label: "Préparation" },
  { key: "shipped", label: "Expédiée" },
  { key: "completed", label: "Livrée" },
];

function OrderTimeline({ status, paymentStatus }: { status?: string; paymentStatus?: string }) {
  if (status === "cancelled") {
    return <p className="order-timeline-cancelled">Commande annulée</p>;
  }
  const effective = status === "pending_payment" && paymentStatus === "paid" ? "paid" : status ?? "pending_payment";
  const currentIndex = Math.max(0, TIMELINE_STEPS.findIndex((step) => step.key === effective));
  return (
    <ol className="order-timeline">
      {TIMELINE_STEPS.map((step, index) => (
        <li key={step.key} className={index <= currentIndex ? "is-done" : ""}>
          <span className="order-timeline-dot" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

export function OrdersClient({ products }: { products: CartProduct[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  // Re-add an order's lines to the cart, dropping items that are no longer
  // buyable and clamping each quantity to the stock currently on hand.
  const reorder = (order: StoredOrder) => {
    const productBySlug = new Map(products.map((product) => [product.slug, product]));
    let cart: CartItem[];
    try {
      cart = normalizeCartItems(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"));
    } catch {
      cart = [];
    }

    let added = 0;
    let skipped = 0;
    for (const item of order.items) {
      const product = productBySlug.get(item.productSlug);
      const variant = product?.variants.find((candidate) => candidate.sku === item.variantSku);
      if (!product || !variant || product.availability === "coming_soon") {
        skipped += 1;
        continue;
      }
      const stock = Math.max(0, variant.stock);
      const quantity = product.availability === "preorder" ? item.quantity : Math.min(item.quantity, stock);
      if (quantity < 1) {
        skipped += 1;
        continue;
      }
      cart = upsertCartItem(cart, { productSlug: item.productSlug, variantSku: item.variantSku, quantity });
      added += 1;
    }

    if (added === 0) {
      window.dispatchEvent(new CustomEvent("tinned-cart-toast", { detail: { name: "Aucun article de cette commande n'est disponible" } }));
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("tinned-cart-updated"));
    window.dispatchEvent(new CustomEvent("tinned-cart-toast", {
      detail: { name: `${added} article${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au panier${skipped ? ` / ${skipped} indisponible${skipped > 1 ? "s" : ""}` : ""}` },
    }));
    router.push("/cart");
  };

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
            <OrderTimeline status={order.status} paymentStatus={order.paymentStatus} />
            <div className="order-store-status">
              {(order.storeOrders?.length
                ? order.storeOrders.map((shipment) => (
                    <div key={shipment.id}>
                      <strong>{shipment.storeNameSnapshot ?? "Boutique"}</strong>
                      <span>
                        {SHIPMENT_LABELS[shipment.status] ?? shipment.status}
                        {shipment.carrierNameSnapshot ? ` / ${shipment.carrierNameSnapshot}` : ""}
                        {shipment.trackingUrl ? (
                          <> · <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Suivre mon colis</a></>
                        ) : null}
                      </span>
                    </div>
                  ))
                : groups.map((group) => (
                    <div key={group.storeSlug}>
                      <strong>{group.storeName}</strong>
                      <span>{carrierFor(order.carrierSelections?.find((item) => item.storeSlug === group.storeSlug)?.carrierCode).name} / préparation par la boutique</span>
                    </div>
                  )))}
            </div>
            <div className="order-card-actions">
              <Link className="button secondary-on-light order-card-action" href={`/checkout/confirmation?order=${order.id}`}>Voir la confirmation</Link>
              {order.items.length ? (
                <button type="button" className="button order-card-action" onClick={() => reorder(order)}>Tout recommander</button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
