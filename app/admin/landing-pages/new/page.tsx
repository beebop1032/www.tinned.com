"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { readStoredSession, sessionHasRole } from "@/lib/auth";
import { slugify } from "@/lib/admin-api";
import { saveLanding } from "@/lib/landing-api";

const LOCALES = ["fr", "nl", "en", "it", "es", "de"] as const;

export default function NewStandaloneLandingPage() {
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [locale, setLocale] = useState<(typeof LOCALES)[number]>("fr");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) setDenied(true);
  }, []);

  const updateName = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const session = readStoredSession();
    if (!session?.token) {
      setError("Non connecté");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveLanding({ slug, locale, title, blocks: [] }, session.token);
      router.push("/admin/landing-pages/" + slug);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création impossible.");
      setBusy(false);
    }
  };

  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Contenu</p>
          <h1>Nouvelle landing page</h1>
          <p>Créez une page d&apos;atterrissage autonome, accessible via /p/&lt;slug&gt;.</p>
        </div>
        <Link className="admin-ghost-button" href="/admin/landing-pages">Retour aux landing pages</Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <section className="admin-panel">
        <form className="admin-product-form" onSubmit={submit}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Nom</span>
              <input value={name} onChange={(event) => updateName(event.target.value)} required placeholder="Campagne de printemps" />
            </label>
            <label className="field">
              <span>Slug</span>
              <input value={slug} onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} required />
            </label>
            <label className="field">
              <span>Langue</span>
              <select value={locale} onChange={(event) => setLocale(event.target.value as (typeof LOCALES)[number])}>
                {LOCALES.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="field field-full">
              <span>Titre de la page</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Découvrez notre sélection" />
            </label>
          </div>
          <button className="button admin-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
            Créer la landing page
          </button>
        </form>
      </section>
    </section>
  );
}
