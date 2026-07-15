"use client";

import { ArrowRight, BellRing, Check, Loader2, PackageX } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { subscribe } from "@/lib/customer-api";
import { readStoredSession } from "@/lib/auth";
import { isPreorderable } from "@/lib/commerce";
import type { Product } from "@/lib/types";

type Kind = "coming_soon" | "sold_out";

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

function countdownTo(target: number): Countdown | null {
  const distance = target - Date.now();
  if (distance <= 0) return null;
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor(distance / 3_600_000) % 24,
    minutes: Math.floor(distance / 60_000) % 60,
    seconds: Math.floor(distance / 1_000) % 60
  };
}

function LaunchCountdown({ releaseAt }: { releaseAt: string }) {
  const target = new Date(releaseAt).getTime();
  // null avant montage : le serveur et le premier rendu client affichent "--" (pas de mismatch d'hydratation).
  const [remaining, setRemaining] = useState<Countdown | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemaining(countdownTo(target));
    const timer = window.setInterval(() => setRemaining(countdownTo(target)), 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  if (mounted && !remaining) return null;

  const cells: Array<[string, number | null]> = [
    ["jours", remaining?.days ?? null],
    ["heures", remaining?.hours ?? null],
    ["min", remaining?.minutes ?? null],
    ["sec", remaining?.seconds ?? null]
  ];

  return (
    <div className="launch-countdown" role="timer" aria-label="Temps restant avant le lancement">
      {cells.map(([label, value]) => (
        <div className="launch-countdown-cell" key={label}>
          <span className="launch-countdown-value">
            {value === null ? "--" : String(value).padStart(2, "0")}
          </span>
          <span className="launch-countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function LaunchNotifyForm({ product }: { product: Product }) {
  const [token, setToken] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = readStoredSession();
    setToken(session?.token ?? null);
    setSessionEmail(session?.email ?? "");
    setReady(true);
  }, []);

  const loggedIn = Boolean(token);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await subscribe(
        {
          email: loggedIn ? sessionEmail : email,
          targetType: "product",
          productIri: `/api/products/${product.id}`,
          consentTinned: true
        },
        token ?? undefined
      );
      setMessage(
        loggedIn
          ? "C'est noté. Tu seras prévenu·e avant tout le monde."
          : "Vérifie ta boîte mail pour confirmer ton inscription."
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  if (message) {
    return (
      <p className="launch-success" role="status">
        <Check size={16} aria-hidden />
        {message}
      </p>
    );
  }

  return (
    <form className="launch-form" onSubmit={submit}>
      <div className="launch-form-row">
        {loggedIn ? (
          <span className="launch-form-email">{sessionEmail}</span>
        ) : (
          <input
            className="launch-form-input"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="votre@email.com"
            aria-label="Votre email"
          />
        )}
        <button className="launch-form-submit" type="submit" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" aria-hidden /> : null}
          Me prévenir
          {busy ? null : <ArrowRight size={16} aria-hidden />}
        </button>
      </div>
      {error ? <p className="launch-form-error">{error}</p> : null}
    </form>
  );
}

export function ProductLaunch({
  product,
  kind,
  releaseLabel
}: {
  product: Product;
  kind: Kind;
  releaseLabel?: string | null;
}) {
  const releaseAt = kind === "coming_soon" ? product.releaseAt : null;
  // Quand le produit est pré-commandable, le prix est déjà affiché : on ne prétend pas qu'il est caché.
  const priceRevealed = kind === "coming_soon" && isPreorderable(product);

  return (
    <section className={`launch launch--${kind}`} aria-label={kind === "coming_soon" ? "Lancement à venir" : "Produit épuisé"}>
      {kind === "coming_soon" ? (
        <>
          <p className="launch-pill launch-pill--soon">
            <BellRing size={13} aria-hidden />
            {releaseLabel ? `Lancement le ${releaseLabel}` : "Bientôt disponible"}
          </p>
          {releaseAt ? <LaunchCountdown releaseAt={releaseAt} /> : null}
          <p className="launch-body">
            Laisse ton email&nbsp;: tu seras prévenu·e dès la mise en ligne, avant tout le monde.
          </p>
        </>
      ) : (
        <>
          <p className="launch-pill launch-pill--soldout">
            <PackageX size={13} aria-hidden />
            Épuisé
          </p>
          <h2 className="launch-title">Victime de son succès</h2>
          <p className="launch-body">
            Laisse ton email&nbsp;: tu seras prévenu·e dès le retour en stock.
          </p>
        </>
      )}
      <LaunchNotifyForm product={product} />
      <p className="launch-footnote">
        {kind === "coming_soon" && !priceRevealed ? "Prix dévoilé au lancement. " : ""}Un seul email, rien d&apos;autre.
      </p>
    </section>
  );
}
