"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredSession } from "@/lib/auth";
import { fetchMyVendorOrders, updateStoreOrder, eurosFromCents } from "@/lib/vendor-api";
import type { VendorStoreOrder } from "@/lib/vendor-api";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert", waiting_store: "En attente vendeur", preparing: "En préparation",
  shipped: "Expédié", completed: "Terminé", cancelled: "Annulé",
};

// Statuses a vendor can move an order to, given its current status.
const NEXT_STATUSES: Record<string, string[]> = {
  waiting_store: ["preparing"],
  preparing: ["shipped"],
  shipped: ["completed"],
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorStoreOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<number, { number: string; url: string }>>({});
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyVendorOrders(session.token).then(setOrders).catch((e: unknown) => setError(String(e)));
  }, []);

  const patchOrder = async (id: number, patch: { status?: string; trackingNumber?: string; trackingUrl?: string }) => {
    const session = readStoredSession();
    if (!session) return;
    setBusy(id);
    setError(null);
    try {
      const updated = await updateStoreOrder(id, patch, session.token);
      setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...updated } : order)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const markShipped = (order: VendorStoreOrder) => {
    const entry = tracking[order.id] ?? { number: "", url: "" };
    void patchOrder(order.id, { status: "shipped", trackingNumber: entry.number || undefined, trackingUrl: entry.url || undefined });
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Mes commandes</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {orders.length === 0 && <p className="text-gray-500">Aucune commande pour le moment.</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Boutique</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Expédition</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const nexts = NEXT_STATUSES[o.status] ?? [];
            const entry = tracking[o.id] ?? { number: o.trackingNumber ?? "", url: o.trackingUrl ?? "" };
            return (
              <tr key={o.id} className="border-t align-top">
                <td className="p-2">{o.storeNameSnapshot}</td>
                <td className="p-2">
                  <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{STATUS_LABELS[o.status] ?? o.status}</span>
                </td>
                <td className="p-2">{eurosFromCents(o.totalCents)} {o.currency}</td>
                <td className="p-2">
                  {o.status === "preparing" ? (
                    <div className="flex flex-col gap-1">
                      <input
                        className="border rounded px-2 py-1 text-xs" placeholder="N° de suivi"
                        value={entry.number}
                        onChange={(e) => setTracking((t) => ({ ...t, [o.id]: { ...entry, number: e.target.value } }))}
                      />
                      <input
                        className="border rounded px-2 py-1 text-xs" placeholder="URL de suivi"
                        value={entry.url}
                        onChange={(e) => setTracking((t) => ({ ...t, [o.id]: { ...entry, url: e.target.value } }))}
                      />
                    </div>
                  ) : o.trackingUrl ? (
                    <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">{o.trackingNumber ?? "Suivre"}</a>
                  ) : o.trackingNumber ? (
                    <span className="text-xs">{o.trackingNumber}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {nexts.map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={busy === o.id}
                        onClick={() => (next === "shipped" ? markShipped(o) : patchOrder(o.id, { status: next }))}
                        className="px-2 py-1 rounded text-xs bg-gray-900 text-white disabled:opacity-50"
                      >
                        {next === "preparing" ? "Préparer" : next === "shipped" ? "Marquer expédié" : "Terminer"}
                      </button>
                    ))}
                    <Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline text-xs">Voir</Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
