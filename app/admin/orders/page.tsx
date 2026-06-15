"use client";
import { useEffect, useState } from "react";
import { readStoredSession } from "@/lib/auth";
import { fetchAdminShipping } from "@/lib/admin-api";
import type { AdminStoreOrder } from "@/lib/admin-api";

const STATUS_FLOW = ["open", "waiting_store", "preparing", "shipped", "completed"] as const;

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  waiting_store: "En attente vendeur",
  preparing: "En préparation",
  shipped: "Expédié",
  completed: "Terminé",
  cancelled: "Annulé",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminStoreOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchAdminShipping(session.token)
      .then(d => setOrders(d.storeOrders))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  async function advanceStatus(order: AdminStoreOrder) {
    const session = readStoredSession();
    if (!session) return;
    const currentIdx = STATUS_FLOW.indexOf(order.status as typeof STATUS_FLOW[number]);
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[currentIdx + 1];
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/api/store_orders/${order.id}`, {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${session.token}`,
          "content-type": "application/merge-patch+json",
        },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
      } else {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        setError(err.detail ?? "Impossible de changer le statut.");
      }
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Commandes vendeurs</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {orders.length === 0 && <p className="text-gray-500">Aucune commande.</p>}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Boutique</th>
            <th className="p-2 text-left">Statut</th>
            <th className="p-2 text-left">Total</th>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const currentIdx = STATUS_FLOW.indexOf(o.status as typeof STATUS_FLOW[number]);
            const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
            return (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.storeNameSnapshot}</td>
                <td className="p-2">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{STATUS_LABELS[o.status] ?? o.status}</span>
                </td>
                <td className="p-2">{(o.totalCents / 100).toFixed(2)} {o.currency}</td>
                <td className="p-2">{new Date(o.createdAt).toLocaleDateString("fr-BE")}</td>
                <td className="p-2">
                  {nextStatus && (
                    <button
                      onClick={() => advanceStatus(o)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      → {STATUS_LABELS[nextStatus]}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
