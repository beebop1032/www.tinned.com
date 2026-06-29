"use client";
import { useEffect, useState } from "react";
import { ClipboardList, MoveRight } from "lucide-react";
import { readStoredSession } from "@/lib/auth";
import { fetchAdminShipping } from "@/lib/admin-api";
import { money } from "@/lib/format";
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
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Ventes</p>
          <h1>Commandes vendeurs</h1>
          <p>Suivez l'avancement de chaque expédition boutique et faites-la progresser dans le flux.</p>
        </div>
      </div>

      {error ? <div className="admin-alert is-error" role="status">{error}</div> : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><ClipboardList size={18} aria-hidden /></span>
            <h2>Expéditions boutiques</h2>
          </div>
          <span className="admin-panel-count">{orders.length}</span>
        </header>

        {orders.length === 0 ? (
          <p className="admin-empty-inline">Aucune commande pour le moment.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Boutique</th>
                  <th>Statut</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const currentIdx = STATUS_FLOW.indexOf(o.status as typeof STATUS_FLOW[number]);
                  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.storeNameSnapshot}</strong></td>
                      <td><span className={`admin-status is-${o.status}`}>{STATUS_LABELS[o.status] ?? o.status}</span></td>
                      <td>{money(o.totalCents, o.currency)}</td>
                      <td>{new Date(o.createdAt).toLocaleDateString("fr-BE")}</td>
                      <td>
                        {nextStatus ? (
                          <button className="admin-manage-button" type="button" onClick={() => advanceStatus(o)}>
                            <MoveRight size={14} aria-hidden />
                            {STATUS_LABELS[nextStatus]}
                          </button>
                        ) : <span className="admin-table-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
