"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing } from "lucide-react";
import { fetchSubscriptions, type AdminSubscription } from "@/lib/admin-api";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

type StatusFilter = "all" | "pending" | "confirmed" | "unsubscribed";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "confirmed", label: "Confirmés" },
  { key: "unsubscribed", label: "Désabonnés" }
];

function targetLabel(sub: AdminSubscription) {
  if (sub.targetType === "box") return `Box · ${sub.boxSlug ?? "—"}`;
  if (sub.targetType === "product") return `Produit · ${sub.productSlug ?? "—"}`;
  return "Tinned";
}

function statusBadgeClass(status: AdminSubscription["status"]) {
  return status === "confirmed" ? "is-published" : "is-draft";
}

function statusLabel(status: AdminSubscription["status"]) {
  if (status === "confirmed") return "Confirmé";
  if (status === "unsubscribed") return "Désabonné";
  return "En attente";
}

export function SubscriptionsClient() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setSubscriptions(await fetchSubscriptions(session.token));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Impossible de charger les abonnements.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return subscriptions;
    return subscriptions.filter((sub) => sub.status === filter);
  }, [subscriptions, filter]);

  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Clients</p>
          <h1>Abonnements</h1>
          <p>Suivez les inscriptions d&apos;intérêt (Tinned, box, produit) et leur statut de confirmation.</p>
        </div>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><BellRing size={18} aria-hidden /></span>
            <h2>Abonnements {filtered.length ? `(${filtered.length})` : ""}</h2>
          </div>
          <div className="admin-inline-action" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`admin-badge ${filter === item.key ? "is-published" : "is-draft"}`}
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des abonnements…</p>
          ) : filtered.length ? filtered.map((sub) => (
            <article className="admin-list-item" key={sub.id}>
              <span className="admin-thumb"><BellRing size={17} aria-hidden /></span>
              <div>
                <strong>{sub.email}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-trip-slug">{targetLabel(sub)}</span>
                  <span className={`admin-badge ${statusBadgeClass(sub.status)}`}>{statusLabel(sub.status)}</span>
                  {sub.consentTinned ? <span className="admin-badge is-published">Consent Tinned</span> : null}
                  <span className="admin-trip-slug">{new Date(sub.createdAt).toLocaleDateString("fr-BE")}</span>
                </div>
              </div>
            </article>
          )) : <p className="admin-empty-inline">Aucun abonnement pour ce filtre.</p>}
        </div>
      </section>
    </section>
  );
}
