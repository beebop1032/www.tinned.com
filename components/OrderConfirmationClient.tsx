"use client";

import Link from "next/link";
import { CheckCircle2, Mail, PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildStoreCartGroups,
  cartItemKey,
  normalizeOrder,
  ORDER_STORAGE_KEY,
  variantSummary,
  type CartProduct,
  type StoredOrder
} from "@/lib/cart";
import { readStoredSession } from "@/lib/auth";
import { downloadBuyerInvoice, fetchMyOrders } from "@/lib/customer-api";
import { carrierFor } from "@/lib/delivery";
import { money } from "@/lib/format";

function readOrder() {
  try {
    return normalizeOrder(JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function OrderConfirmationClient({ products }: { products: CartProduct[] }) {
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  async function handleInvoiceDownload() {
    const session = readStoredSession();
    if (!session || !order?.orderId) return;
    setInvoiceError(null);
    try {
      const blob = await downloadBuyerInvoice(order.orderId, session.token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tinned-invoice-${order.orderId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setInvoiceError(err instanceof Error ? err.message : "Impossible de télécharger la facture.");
    }
  }

  useEffect(() => {
    const localOrder = readOrder();
    setOrder(localOrder);

    const session = readStoredSession();
    const requestedOrder = new URLSearchParams(window.location.search).get("order");
    if (!session?.token) return;

    fetchMyOrders(session.token)
      .then((orders) => {
        const match = requestedOrder
          ? orders.find((candidate) => candidate.id === requestedOrder || candidate.reference === requestedOrder)
          : orders[0];
        if (match) setOrder(match);
      })
      .catch(() => {
        // The local confirmation remains available if the network fails.
      });
  }, []);

  const groups = useMemo(() => buildStoreCartGroups(products, order?.items ?? []), [order, products]);
  const currency = groups[0]?.currency ?? "EUR";

  if (!order) {
    return (
      <section className="container section cart-empty">
        <span className="eyebrow">Confirmation</span>
        <h1 className="page-title">Aucune commande récente.</h1>
        <p className="lead">Votre dernière commande apparaîtra ici après validation.</p>
        <Link className="button" href="/store-box">Continuer mes achats</Link>
      </section>
    );
  }

  return (
    <section className="container section">
      <div className="confirmation-hero">
        <div>
          <span className="confirmation-icon"><CheckCircle2 size={30} aria-hidden /></span>
          <span className="eyebrow">Commande enregistrée</span>
          <h1 className="page-title">Merci, c'est bien reçu.</h1>
          <p className="lead">La commande {order.id} est créée. Les paniers boutique sont enregistrés et prêts pour le suivi.</p>
        </div>
        <div className="confirmation-card">
          <div><Mail size={18} aria-hidden /><span>Email associé{order.email ? ` à ${order.email}` : ""}</span></div>
          <div><PackageCheck size={18} aria-hidden /><span>{groups.length} panier{groups.length > 1 ? "s" : ""} boutique à suivre</span></div>
          {order.address ? <div><span>{order.address.label}</span></div> : null}
          <strong>{money(order.totalCents, currency)}</strong>
        </div>
      </div>

      <div className="checkout-layout">
        <div className="store-cart-list">
          {groups.map((group) => (
            <section className="store-cart is-selected" key={group.storeSlug}>
              <header className="store-cart-header">
                <div>
                  <strong>Panier {group.storeName}</strong>
                  <small>{carrierFor(order.carrierSelections?.find((item) => item.storeSlug === group.storeSlug)?.carrierCode).name} / préparation par la boutique</small>
                </div>
                <span className="pill">{order.paymentStatus === "paid" ? "Paiement confirmé" : "Paiement en attente"}</span>
              </header>
              <div className="cart-lines">
                {group.lines.map((line) => (
                  <article className="confirmation-line" key={cartItemKey({ productSlug: line.product.slug, variantSku: line.variant.sku })}>
                    <div>
                      <h2>{line.product.name}</h2>
                      <p>{line.quantity} x {variantSummary(line.variant)}</p>
                    </div>
                    <strong>{money(line.lineTotalCents, line.currency)}</strong>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="order-summary">
          <h2>Résumé commande</h2>
          <div className="summary-row"><span>Sous-total</span><strong>{money(order.subtotalCents, currency)}</strong></div>
          <div className="summary-row"><span>Livraison</span><strong>{order.shippingCents ? money(order.shippingCents, currency) : "Offerte"}</strong></div>
          <div className="summary-row summary-total"><span>Total</span><strong>{money(order.totalCents, currency)}</strong></div>
          {order.orderId ? (
            <>
              <button
                onClick={handleInvoiceDownload}
                className="mt-4 border rounded px-4 py-2 text-sm hover:bg-gray-50"
              >
                Télécharger ma facture (PDF)
              </button>
              {invoiceError ? <p className="summary-note" role="alert">{invoiceError}</p> : null}
            </>
          ) : null}
          <Link className="button is-wide" href="/orders">Suivre ma commande</Link>
          <Link className="summary-link" href="/store-box">Continuer mes achats</Link>
        </aside>
      </div>
    </section>
  );
}
