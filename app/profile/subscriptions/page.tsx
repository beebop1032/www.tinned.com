"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readStoredSession } from "@/lib/auth";
import { fetchMySubscriptions, updateSubscription, type BoxSubscription } from "@/lib/customer-api";

const FREQ_LABELS: Record<string, string> = { monthly: "Mensuel", quarterly: "Trimestriel" };
const STATUS_LABELS: Record<string, string> = { active: "Actif", paused: "En pause", cancelled: "Résilié" };

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<BoxSubscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session?.token) return;
    fetchMySubscriptions(session.token).then(setSubs).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const change = async (id: number, status: "active" | "paused" | "cancelled") => {
    const session = readStoredSession();
    if (!session?.token) return;
    setBusy(id);
    try {
      const updated = await updateSubscription(id, status, session.token);
      setSubs((current) => current.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="container section">
      <div className="funnel-heading">
        <div>
          <span className="eyebrow">Mon compte</span>
          <h1 className="page-title">Mes abonnements</h1>
          <p className="lead">Gérez vos box récurrentes : mettez en pause, reprenez ou résiliez à tout moment.</p>
        </div>
      </div>

      {error ? <p className="lead" style={{ color: "var(--coral, #e4572e)" }}>{error}</p> : null}

      {subs.length === 0 ? (
        <div className="cart-empty">
          <p className="lead">Vous n'avez pas encore d'abonnement.</p>
          <Link className="button" href="/store-box">Découvrir les boutiques</Link>
        </div>
      ) : (
        <div className="store-cart-list">
          {subs.map((sub) => (
            <article className="store-cart is-selected" key={sub.id}>
              <header className="store-cart-header">
                <div>
                  <strong>{sub.storeBox?.name ?? "Box"} — {FREQ_LABELS[sub.frequency] ?? sub.frequency}</strong>
                  <small>
                    {STATUS_LABELS[sub.status] ?? sub.status}
                    {sub.nextRenewalAt && sub.status === "active" ? ` · prochaine livraison le ${new Date(sub.nextRenewalAt).toLocaleDateString("fr-BE")}` : ""}
                  </small>
                </div>
                <span className="pill">{STATUS_LABELS[sub.status] ?? sub.status}</span>
              </header>
              {sub.status !== "cancelled" ? (
                <div className="order-card-actions">
                  {sub.status === "active" ? (
                    <button type="button" className="button secondary-on-light order-card-action" disabled={busy === sub.id} onClick={() => change(sub.id, "paused")}>Mettre en pause</button>
                  ) : (
                    <button type="button" className="button order-card-action" disabled={busy === sub.id} onClick={() => change(sub.id, "active")}>Reprendre</button>
                  )}
                  <button type="button" className="button secondary-on-light order-card-action" disabled={busy === sub.id} onClick={() => change(sub.id, "cancelled")}>Résilier</button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
