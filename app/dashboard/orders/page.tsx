"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredSession } from "@/lib/auth";
import { fetchMyVendorOrders, eurosFromCents } from "@/lib/vendor-api";
import type { VendorStoreOrder } from "@/lib/vendor-api";

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert", waiting_store: "En attente vendeur", preparing: "En préparation",
  shipped: "Expédié", completed: "Terminé", cancelled: "Annulé",
};

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorStoreOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyVendorOrders(session.token).then(setOrders).catch((e: unknown) => setError(String(e)));
  }, []);

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
            <th className="p-2 text-left">Date</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="border-t">
              <td className="p-2">{o.storeNameSnapshot}</td>
              <td className="p-2">
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{STATUS_LABELS[o.status] ?? o.status}</span>
              </td>
              <td className="p-2">{eurosFromCents(o.totalCents)} {o.currency}</td>
              <td className="p-2">{new Date(o.createdAt).toLocaleDateString("fr-BE")}</td>
              <td className="p-2">
                <Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline text-xs">Voir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
