"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { getUnsubscribeState, applyUnsubscribe } from "@/lib/customer-api";

function UnsubInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ready" | "error" | "saved">("loading");
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const s = await getUnsubscribeState(token);
        if (cancelled) return;
        if (!s.found) {
          setState("error");
          return;
        }
        setEmail(s.email ?? "");
        setMarketing(s.marketing ?? true);
        setNotifications(s.notifications ?? true);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const save = async (next: { marketing: boolean; notifications: boolean }) => {
    if (!token) return;
    setBusy(true);
    try {
      await applyUnsubscribe(token, next);
      setMarketing(next.marketing);
      setNotifications(next.notifications);
      setState("saved");
    } catch {
      /* silencieux : on laisse l'état courant */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container section" style={{ maxWidth: "520px", minHeight: "50vh" }}>
      {state === "loading" && (
        <p style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <Loader2 className="spin" size={18} aria-hidden /> Chargement…
        </p>
      )}

      {state === "error" && (
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Lien invalide</h1>
          <p style={{ color: "var(--text-faint)", marginBottom: "20px" }}>Ce lien de désinscription n&apos;est plus valide.</p>
          <Link className="pill" href="/">Retour à l&apos;accueil</Link>
        </div>
      )}

      {(state === "ready" || state === "saved") && (
        <div>
          <h1 style={{ fontSize: "26px", marginBottom: "6px" }}>Tes préférences email</h1>
          <p style={{ color: "var(--text-faint)", marginBottom: "24px" }}>{email}</p>

          {state === "saved" && (
            <p style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--forest)", fontWeight: 600, marginBottom: "16px" }}>
              <CheckCircle2 size={16} aria-hidden /> Préférences enregistrées.
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
            <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={marketing}
                disabled={busy}
                onChange={(e) => save({ marketing: e.target.checked, notifications })}
                style={{ marginTop: "3px", accentColor: "var(--forest)" }}
              />
              <span>
                <strong>Emails Tinned</strong><br />
                <span style={{ fontSize: "13px", color: "var(--text-faint)" }}>Nouvelles box, coups de cœur, avant-premières.</span>
              </span>
            </label>

            <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={notifications}
                disabled={busy}
                onChange={(e) => save({ marketing, notifications: e.target.checked })}
                style={{ marginTop: "3px", accentColor: "var(--forest)" }}
              />
              <span>
                <strong>Notifications produits</strong><br />
                <span style={{ fontSize: "13px", color: "var(--text-faint)" }}>« Préviens-moi » : mises en ligne et retours en stock que tu suis.</span>
              </span>
            </label>
          </div>

          <button
            className="pill"
            type="button"
            disabled={busy || (!marketing && !notifications)}
            onClick={() => save({ marketing: false, notifications: false })}
          >
            {busy ? <Loader2 size={16} className="spin" aria-hidden /> : null} Tout couper
          </button>
          <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "16px" }}>
            Les emails liés à tes commandes (confirmation, livraison) continueront d&apos;être envoyés.
          </p>
        </div>
      )}
    </section>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <UnsubInner />
    </Suspense>
  );
}
