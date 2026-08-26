"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { verifyEmail, setAccountPassword } from "@/lib/customer-api";
import { writeStoredSession } from "@/lib/auth";

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [jwt, setJwt] = useState("");

  // Formulaire de définition de mot de passe.
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await verifyEmail(token);
        if (cancelled) return;
        if (result.verified) {
          setState("ok");
          setNeedsPassword(result.hasPassword === false);
          if (result.token && result.email) {
            setJwt(result.token);
            writeStoredSession({ email: result.email, token: result.token }, true);
          }
        } else {
          setState("error");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setPwError("Au moins 8 caractères.");
      return;
    }
    setBusy(true);
    setPwError("");
    try {
      await setAccountPassword(password, jwt);
      setPwDone(true);
    } catch (caught) {
      setPwError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container section" style={{ maxWidth: "480px", minHeight: "50vh", textAlign: "center" }}>
      {state === "loading" && (
        <p style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <Loader2 className="spin" size={18} aria-hidden /> Vérification en cours…
        </p>
      )}

      {state === "error" && (
        <div>
          <XCircle size={40} aria-hidden style={{ color: "#C4882A", marginBottom: "12px" }} />
          <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>Lien invalide ou expiré</h1>
          <p style={{ color: "var(--text-faint)", marginBottom: "20px" }}>
            Ce lien de vérification n&apos;est plus valide. Il a peut-être déjà été utilisé.
          </p>
          <Link className="pill" href="/">Retour à l&apos;accueil</Link>
        </div>
      )}

      {state === "ok" && (
        <div>
          <CheckCircle2 size={40} aria-hidden style={{ color: "var(--forest)", marginBottom: "12px" }} />
          <h1 style={{ fontSize: "26px", marginBottom: "8px" }}>Email confirmé&nbsp;✓</h1>
          <p style={{ color: "var(--text-faint)", marginBottom: "24px" }}>
            Ton compte est actif. On te préviendra pour tout ce que tu suis.
          </p>

          {needsPassword && !pwDone && (
            <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: "10px", textAlign: "left" }}>
              <label style={{ fontSize: "14px", fontWeight: 600 }}>
                Définis un mot de passe pour accéder à ton compte
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Au moins 8 caractères"
                style={{ padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--border, #e4dcc8)" }}
              />
              {pwError && <p style={{ color: "#C4882A", fontSize: "13px", margin: 0 }}>{pwError}</p>}
              <button className="pill" type="submit" disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" aria-hidden /> : null} Définir mon mot de passe
              </button>
            </form>
          )}

          {pwDone && (
            <p style={{ color: "var(--forest)", fontWeight: 600 }}>
              Mot de passe défini ✓ — tu peux maintenant te connecter à tout moment.
            </p>
          )}

          {!needsPassword && (
            <Link className="pill" href="/">Explorer les box</Link>
          )}
        </div>
      )}
    </section>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
