"use client";

import Link from "next/link";
import { BadgeCheck, Star } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { StarRating } from "@/components/StarRating";
import { submitReview } from "@/lib/customer-api";
import { readStoredSession } from "@/lib/auth";
import type { Review } from "@/lib/types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function ProductReviews({
  productId,
  productName,
  reviews,
  ratingAverage,
  ratingCount,
}: {
  productId: number;
  productName: string;
  reviews: Review[];
  ratingAverage: number;
  ratingCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Histogram from the loaded (approved) reviews — the average/count come from the
  // authoritative product aggregate so they stay correct beyond the fetched page.
  const breakdown = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      const idx = Math.min(5, Math.max(1, Math.round(r.rating))) - 1;
      buckets[idx] += 1;
    });
    return buckets;
  }, [reviews]);
  const loaded = reviews.length;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const session = readStoredSession();
    if (!session?.token) {
      window.location.href = "/auth?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submitReview(
        { productIri: `/api/products/${productId}`, rating, title, body },
        session.token
      );
      setDone(true);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="product-reviews" id="avis">
      <div className="section-header">
        <div>
          <span className="eyebrow">Avis clients</span>
          <h2>Ce qu'en pensent les acheteurs</h2>
        </div>
        {!done ? (
          <button type="button" className="button secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Annuler" : "Écrire un avis"}
          </button>
        ) : null}
      </div>

      {ratingCount > 0 ? (
        <div className="review-summary">
          <div className="review-summary-score">
            <strong>{ratingAverage.toFixed(1)}</strong>
            <StarRating value={ratingAverage} size={20} />
            <span className="muted">{ratingCount} avis</span>
          </div>
          <div className="review-summary-bars">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = breakdown[star - 1];
              const pct = loaded > 0 ? Math.round((n / loaded) * 100) : 0;
              return (
                <div key={star} className="review-bar">
                  <span className="review-bar-label">{star}★</span>
                  <span className="review-bar-track">
                    <span className="review-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="review-bar-count">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="muted">Aucun avis pour le moment. Soyez le·la premier·ère à donner votre avis sur {productName}.</p>
      )}

      {done ? (
        <p className="review-thanks" role="status">
          ✓ Merci ! Votre avis a bien été envoyé. Il sera publié après validation.
        </p>
      ) : null}

      {open ? (
        <form className="review-form" onSubmit={submit}>
          <div className="review-form-stars" role="radiogroup" aria-label="Note">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="review-star-button"
                aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                aria-pressed={rating === star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
              >
                <Star size={28} strokeWidth={1.5} fill={(hover || rating) >= star ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={120}
            placeholder="Titre (facultatif)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            required
            minLength={3}
            rows={4}
            placeholder="Partagez votre expérience avec ce produit…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error ? <p className="review-error">{error}</p> : null}
          <div className="review-form-actions">
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Envoi…" : "Publier mon avis"}
            </button>
            <span className="muted">Vous devez être connecté·e. <Link href="/auth">Se connecter</Link></span>
          </div>
        </form>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id} className="review-item">
              <div className="review-item-head">
                <StarRating value={review.rating} size={15} />
                {review.verifiedPurchase ? (
                  <span className="review-verified">
                    <BadgeCheck size={14} aria-hidden /> Achat vérifié
                  </span>
                ) : null}
              </div>
              {review.title ? <strong className="review-item-title">{review.title}</strong> : null}
              <p className="review-item-body">{review.body}</p>
              <p className="review-item-meta">
                {review.authorName} · {formatDate(review.createdAt)}
              </p>
              {review.merchantResponse ? (
                <div className="review-response">
                  <strong>Réponse du vendeur</strong>
                  <p>{review.merchantResponse}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
