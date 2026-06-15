"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { NewsletterBlockData } from "@/lib/newsletter-block";

export function NewsletterBlock({ data }: { data: NewsletterBlockData }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erreur lors de l'inscription.");
      }
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)",
      alignItems: "center",
      gap: "clamp(24px, 4vw, 48px)",
      padding: "clamp(32px, 5vw, 56px)",
      background: "var(--forest)",
      borderRadius: "2px",
      color: "#fff",
    }}>
      <div>
        <span style={{
          display: "inline-block",
          marginBottom: "12px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}>
          {data.eyebrow}
        </span>
        <h2 style={{
          fontFamily: "var(--font-brand)",
          fontSize: "clamp(22px, 3.5vw, 36px)",
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: "-0.015em",
          margin: "0 0 12px",
          color: "#fff",
        }}>
          {data.title}
        </h2>
        <p style={{
          margin: 0,
          color: "rgba(255,255,255,0.75)",
          fontSize: "15px",
          lineHeight: 1.55,
        }}>
          {data.body}
        </p>
      </div>

      <div>
        {success ? (
          <p style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "15px",
            fontWeight: 500,
            textAlign: "center",
          }}>
            ✓ Vérifiez votre boîte email.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={data.placeholder}
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {error && (
              <p style={{ color: "#FCA5A5", fontSize: "13px", margin: 0 }}>{error}</p>
            )}
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
                width: "100%",
                fontFamily: "var(--font-body)",
              }}
            >
              {busy && <Loader2 size={16} aria-hidden className="spin" />}
              {data.cta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
