"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { fetchMyVendorOrders, eurosFromCents } from "@/lib/vendor-api";
import { createShippingLabel, generateShippingLabel } from "@/lib/admin-api";
import { downloadSupplierInvoice } from "@/lib/customer-api";
import type { VendorStoreOrder } from "@/lib/vendor-api";

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<VendorStoreOrder | null>(null);
  const [weight, setWeight] = useState("500");
  const [carrier, setCarrier] = useState("bpost");
  const [labelStatus, setLabelStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyVendorOrders(session.token).then(orders => {
      setOrder(orders.find(o => o.id === Number(id)) ?? null);
    });
  }, [id]);

  async function handleCreateLabel(e: React.FormEvent) {
    e.preventDefault();
    const session = readStoredSession();
    if (!session || !order) return;
    setError(null);
    try {
      const label = await createShippingLabel(
        { storeOrderId: order.id, format: "A6", copies: 1, weightGrams: Number(weight) },
        session.token
      );
      const generated = await generateShippingLabel(label.id, session.token);
      setLabelStatus(generated.trackingNumber ? `Label créé — tracking: ${generated.trackingNumber}` : "Label créé avec succès.");
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  async function handleInvoiceDownload() {
    const session = readStoredSession();
    if (!session || !order) return;
    try {
      const blob = await downloadSupplierInvoice(order.id, session.token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-fournisseur-${order.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(String(err));
    }
  }

  if (!order) return <p className="text-gray-500 p-4">Chargement…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-xl font-bold mb-1">Commande #{order.id}</h1>
      <p className="text-sm text-gray-500 mb-6">{order.storeNameSnapshot} · {eurosFromCents(order.totalCents)} {order.currency}</p>

      <section className="border rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-3">Créer une étiquette d&apos;expédition</h2>
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        {labelStatus && <p className="text-green-700 text-sm mb-2">{labelStatus}</p>}
        <form onSubmit={handleCreateLabel} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">Transporteur</label>
            <select value={carrier} onChange={e => setCarrier(e.target.value)} className="border rounded px-3 py-2 text-sm w-full">
              <option value="bpost">BPost</option>
              <option value="dpd">DPD</option>
              <option value="mondial_relay">Mondial Relay</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Poids (grammes)</label>
            <input type="number" min="1" value={weight} onChange={e => setWeight(e.target.value)}
              className="border rounded px-3 py-2 text-sm w-full" />
          </div>
          <button type="submit" className="bg-black text-white px-4 py-2 rounded text-sm">
            Générer l&apos;étiquette
          </button>
        </form>
      </section>

      <button onClick={handleInvoiceDownload} className="border rounded px-4 py-2 text-sm hover:bg-gray-50">
        Télécharger la facture fournisseur (PDF)
      </button>
    </div>
  );
}
