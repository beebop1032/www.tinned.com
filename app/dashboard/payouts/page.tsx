"use client";
import { useEffect, useMemo, useState } from "react";
import { readStoredSession } from "@/lib/auth";
import { fetchMyPayouts, eurosFromCents } from "@/lib/vendor-api";
import type { PayoutEntry } from "@/lib/vendor-api";

export default function PayoutsPage() {
  const [entries, setEntries] = useState<PayoutEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyPayouts(session.token).then(setEntries).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const totals = useMemo(() => {
    const pending = entries.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.netCents, 0);
    const paid = entries.filter((e) => e.status === "paid").reduce((sum, e) => sum + e.netCents, 0);
    const commission = entries.reduce((sum, e) => sum + e.commissionCents, 0);
    return { pending, paid, commission };
  }, [entries]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Mes revenus</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "À recevoir (net)", value: totals.pending },
          { label: "Déjà versé", value: totals.paid },
          { label: "Commission plateforme", value: totals.commission },
        ].map(({ label, value }) => (
          <div key={label} className="border rounded p-4">
            <div className="text-2xl font-bold">{eurosFromCents(value)} €</div>
            <div className="text-gray-500 text-sm">{label}</div>
          </div>
        ))}
      </div>

      {entries.length === 0 ? (
        <p className="text-gray-500">Aucun relevé pour le moment.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Commande</th>
              <th className="p-2 text-right">Brut</th>
              <th className="p-2 text-right">Commission</th>
              <th className="p-2 text-right">Net</th>
              <th className="p-2 text-left">Statut</th>
              <th className="p-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.storeReference}</td>
                <td className="p-2 text-right">{eurosFromCents(e.grossCents)} €</td>
                <td className="p-2 text-right">-{eurosFromCents(e.commissionCents)} € <span className="text-gray-400 text-xs">({e.commissionRatePercent}%)</span></td>
                <td className="p-2 text-right font-semibold">{eurosFromCents(e.netCents)} €</td>
                <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${e.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{e.status === "paid" ? "Versé" : "En attente"}</span></td>
                <td className="p-2">{new Date(e.createdAt).toLocaleDateString("fr-BE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
