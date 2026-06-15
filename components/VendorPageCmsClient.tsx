"use client";

import { ExternalLink, Loader2, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, normalizeSession } from "@/lib/auth";
import type { VendorPageData } from "@/lib/vendor-page";

export function VendorPageCmsClient() {
  const [form, setForm] = useState<VendorPageData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/vendor-page")
      .then((r) => r.json())
      .then((data) => setForm(data as VendorPageData))
      .catch(() => setError("Impossible de charger le contenu."));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    if (!stored?.token) { setError("Session expirée."); return; }
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const res = await fetch("/api/admin/vendor-page", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${stored.token}`
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erreur lors de la sauvegarde.");
      }
      setStatus("Contenu enregistré.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  };

  const patch = (patch: Partial<VendorPageData>) =>
    setForm((f) => f ? { ...f, ...patch } : f);

  if (!form) {
    return (
      <p style={{ padding: "24px", color: "var(--text-soft)" }}>
        {error || "Chargement…"}
      </p>
    );
  }

  return (
    <div>
      {(status || error) && (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">
          {error || status}
        </div>
      )}

      {form.published && (
        <div style={{ marginBottom: "16px" }}>
          <a
            className="button secondary"
            href="/vendre"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
          >
            <ExternalLink size={15} aria-hidden />
            Voir la page /vendre
          </a>
        </div>
      )}

      <form className="admin-panel" style={{ padding: "24px" }} onSubmit={submit}>
        <div className="admin-form-grid">
          <label className="field">
            <span>Eyebrow</span>
            <input
              value={form.eyebrow}
              onChange={(e) => patch({ eyebrow: e.target.value })}
              placeholder="Devenir fournisseur"
            />
          </label>
          <label className="field">
            <span>Titre</span>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              required
              placeholder="Vendez sur Tinned.com"
            />
          </label>
          <label className="field field-full">
            <span>Tagline</span>
            <input
              value={form.tagline}
              onChange={(e) => patch({ tagline: e.target.value })}
              placeholder="Rejoignez les marques artisanales belges…"
            />
          </label>
          <label className="field field-full">
            <span>Corps du texte</span>
            <textarea
              rows={8}
              value={form.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </label>
          <label className="field">
            <span>CTA — Libellé</span>
            <input
              value={form.cta.label}
              onChange={(e) => patch({ cta: { ...form.cta, label: e.target.value } })}
              placeholder="Nous contacter"
            />
          </label>
          <label className="field">
            <span>CTA — URL</span>
            <input
              value={form.cta.url}
              onChange={(e) => patch({ cta: { ...form.cta, url: e.target.value } })}
              placeholder="mailto:fournisseurs@tinned.com"
            />
          </label>
        </div>

        <label className="admin-toggle" style={{ marginTop: "16px" }}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>Page visible sur le site</span>
        </label>

        <button
          className="button admin-submit"
          type="submit"
          disabled={busy}
          style={{ marginTop: "24px" }}
        >
          {busy ? <Loader2 size={18} aria-hidden className="spin" /> : <Save size={18} aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
