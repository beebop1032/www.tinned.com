"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Star, Trash2, X } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { deleteReview, fetchReviews, moderateReview, type AdminReview } from "@/lib/admin-api";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "pending", label: "En attente" },
  { key: "approved", label: "Publiés" },
  { key: "rejected", label: "Rejetés" },
  { key: "all", label: "Tous" }
];

function statusBadge(status: AdminReview["status"]) {
  if (status === "approved") return { cls: "is-published", label: "Publié" };
  if (status === "rejected") return { cls: "is-draft", label: "Rejeté" };
  return { cls: "is-draft", label: "En attente" };
}

export function ReviewsClient() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setReviews(await fetchReviews(session.token));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Impossible de charger les avis.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return reviews;
    return reviews.filter((review) => review.status === filter);
  }, [reviews, filter]);

  const setStatus = async (review: AdminReview, status: AdminReview["status"]) => {
    const session = readStoredSession();
    if (!session) return;
    setBusyId(review.id);
    setError("");
    try {
      const updated = await moderateReview(review.id, { status }, session.token);
      setReviews((list) => list.map((r) => (r.id === review.id ? { ...r, ...updated } : r)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (review: AdminReview) => {
    const session = readStoredSession();
    if (!session) return;
    setBusyId(review.id);
    setError("");
    try {
      await deleteReview(review.id, session.token);
      setReviews((list) => list.filter((r) => r.id !== review.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  };

  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Clients</p>
          <h1>Avis</h1>
          <p>Modérez les avis produits. Seuls les avis publiés sont visibles et comptent dans la note moyenne.</p>
        </div>
      </div>

      {error ? <div className="admin-alert is-error" role="status">{error}</div> : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Star size={18} aria-hidden /></span>
            <h2>Avis {filtered.length ? `(${filtered.length})` : ""}</h2>
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
            <p className="admin-empty-inline">Chargement des avis…</p>
          ) : filtered.length ? filtered.map((review) => {
            const badge = statusBadge(review.status);
            return (
              <article className="admin-list-item" key={review.id}>
                <span className="admin-thumb"><Star size={17} aria-hidden /></span>
                <div style={{ flex: 1 }}>
                  <strong>{review.title || `Avis de ${review.authorName}`}</strong>
                  <div className="admin-trip-meta">
                    <StarRating value={review.rating} size={14} />
                    <span className="admin-trip-slug">{review.productName ?? review.productSlug ?? "—"}</span>
                    <span className={`admin-badge ${badge.cls}`}>{badge.label}</span>
                    {review.verifiedPurchase ? <span className="admin-badge is-published">Achat vérifié</span> : null}
                    <span className="admin-trip-slug">{new Date(review.createdAt).toLocaleDateString("fr-BE")}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>{review.body}</p>
                  <div className="admin-trip-meta" style={{ marginTop: "10px", gap: "8px" }}>
                    {review.status !== "approved" ? (
                      <button type="button" className="button secondary" disabled={busyId === review.id} onClick={() => setStatus(review, "approved")}>
                        <Check size={15} aria-hidden /> Publier
                      </button>
                    ) : null}
                    {review.status !== "rejected" ? (
                      <button type="button" className="button secondary" disabled={busyId === review.id} onClick={() => setStatus(review, "rejected")}>
                        <X size={15} aria-hidden /> Rejeter
                      </button>
                    ) : null}
                    <button type="button" className="button secondary" disabled={busyId === review.id} onClick={() => remove(review)}>
                      <Trash2 size={15} aria-hidden /> Supprimer
                    </button>
                  </div>
                </div>
              </article>
            );
          }) : <p className="admin-empty-inline">Aucun avis pour ce filtre.</p>}
        </div>
      </section>
    </section>
  );
}
