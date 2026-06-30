"use client";

import { BellRing, Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { subscribe } from "@/lib/customer-api";
import { readStoredSession } from "@/lib/auth";

type Props = {
  targetType: "tinned" | "box" | "product";
  boxIri?: string;
  boxName?: string;
  productIri?: string;
  productName?: string;
};

function targetLabel({ targetType, boxName, productName }: Props) {
  if (targetType === "box") return boxName ? `de ${boxName}` : "de cette box";
  if (targetType === "product") return productName ? `de ${productName}` : "de ce produit";
  return "de Tinned";
}

function consentLabel({ targetType }: Props) {
  if (targetType === "box") return "Restez au courant de Tinned et de cette box.";
  if (targetType === "product") return "Restez au courant de Tinned et de ce produit.";
  return "Restez au courant de Tinned.";
}

export function NotifyMeForm(props: Props) {
  const { targetType, boxIri, productIri } = props;
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(readStoredSession()?.token ?? null);
    setReady(true);
  }, []);

  const loggedIn = Boolean(token);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await subscribe(
        {
          email: loggedIn ? "placeholder@tinned.com" : email,
          targetType,
          boxIri,
          productIri,
          consentTinned: loggedIn ? true : consent
        },
        token ?? undefined
      );
      if (loggedIn) {
        setMessage(result.status === "confirmed" ? "On vous préviendra !" : "On vous préviendra !");
      } else {
        setMessage("Vérifiez votre email pour confirmer.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  const eyebrow = `Tenez-moi informé ${targetLabel(props)}`;

  return (
    <div
      style={{
        display: "grid",
        gap: "16px",
        padding: "clamp(24px, 4vw, 36px)",
        background: "var(--forest)",
        borderRadius: "2px",
        color: "#fff",
        maxWidth: "560px"
      }}
    >
      <div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "8px",
            color: "rgba(255,255,255,0.65)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)"
          }}
        >
          <BellRing size={14} aria-hidden /> Alerte
        </span>
        <h2
          style={{
            fontFamily: "var(--font-brand)",
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 700,
            lineHeight: 1.15,
            margin: 0,
            color: "#fff"
          }}
        >
          {eyebrow}
        </h2>
      </div>

      {message ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.9)", fontSize: "15px", fontWeight: 500 }}>
          ✓ {message}
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {!loggedIn && (
            <>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="votre@email.com"
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: "14px",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: "13px",
                  lineHeight: 1.4,
                  cursor: "pointer"
                }}
              >
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  style={{ marginTop: "2px" }}
                />
                <span>{consentLabel(props)}</span>
              </label>
            </>
          )}

          {error && <p style={{ color: "#FCA5A5", fontSize: "13px", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "var(--amber)",
              color: "#fff",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
              fontFamily: "var(--font-body)"
            }}
          >
            {busy && <Loader2 size={16} aria-hidden className="spin" />}
            Tenez-moi informé
          </button>
        </form>
      )}
    </div>
  );
}
