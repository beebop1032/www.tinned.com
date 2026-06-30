"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ImagePlus, Loader2, Save } from "lucide-react";
import { slugify, updateAdminBox, uploadAdminMedia, type AdminBoxInput } from "@/lib/admin-api";
import type { Box, BoxType } from "@/lib/types";

type BoxEditFormState = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  companyName: string;
  website: string;
  logoPath: string;
  coverPath: string;
  active: boolean;
};

function formFromBox(box: Box): BoxEditFormState {
  return {
    name: box.name,
    slug: box.slug,
    tagline: box.tagline ?? "",
    description: box.description ?? "",
    companyName: box.companyName ?? "",
    website: box.website ?? "",
    logoPath: box.logoPath ?? "",
    coverPath: box.coverPath ?? "",
    active: box.active ?? true
  };
}

export function BoxEditPanel({ box, type, token, onChange }: { box: Box; type: BoxType; token: string; onChange?: () => void }) {
  const [form, setForm] = useState<BoxEditFormState>(() => formFromBox(box));
  const [slugTouched, setSlugTouched] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(formFromBox(box));
    setSlugTouched(true);
    setLogoFile(null);
    setStatus("");
    setError("");
  }, [box]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const preview = URL.createObjectURL(logoFile);
    setLogoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [logoFile]);

  const updateName = (name: string) => {
    setForm((current) => ({ ...current, name, slug: slugTouched ? current.slug : slugify(name) }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const uploaded = logoFile ? await uploadAdminMedia(logoFile, token) : null;
      const input: AdminBoxInput = {
        type,
        name: form.name,
        slug: form.slug,
        tagline: form.tagline,
        description: form.description,
        logoPath: uploaded?.url ?? form.logoPath,
        coverPath: form.coverPath,
        active: form.active,
        companyName: form.companyName,
        website: form.website,
        businessBoxId: box.businessBox?.id,
        storeBoxId: box.storeBox?.id
      };
      await updateAdminBox(type, box.id, input, token);
      setStatus(`${form.name} est mis à jour.`);
      setLogoFile(null);
      onChange?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement de la box impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel admin-store-management">
      <header className="admin-panel-header">
        <div>
          <span className="admin-panel-icon"><Save size={18} aria-hidden /></span>
          <h2>Édition de la box</h2>
        </div>
      </header>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      <form className="admin-box-form admin-inline-form" onSubmit={submit}>
        <div className="admin-form-grid">
          <label className="field"><span>Nom</span><input value={form.name} onChange={(event) => updateName(event.target.value)} required /></label>
          <label className="field"><span>Slug</span><input value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required /></label>
          {type === "business" ? (
            <>
              <label className="field"><span>Nom légal</span><input value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
              <label className="field"><span>Site web</span><input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
            </>
          ) : null}
          <label className="field field-full"><span>Signature</span><input value={form.tagline} onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))} /></label>
          <label className="field field-full"><span>Description</span><textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
        </div>
        <div className="admin-media-row">
          <label className="admin-uploader">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={(event: ChangeEvent<HTMLInputElement>) => setLogoFile(event.target.files?.[0] ?? null)} />
            <span className="admin-upload-preview">{logoPreview || form.logoPath ? <img src={logoPreview || form.logoPath} alt="" /> : <ImagePlus size={23} aria-hidden />}</span>
            <span>{logoFile ? logoFile.name : "Logo"}</span>
          </label>
          <label className="field"><span>Logo URL</span><input value={form.logoPath} onChange={(event) => setForm((current) => ({ ...current, logoPath: event.target.value }))} placeholder="https://..." /></label>
          <label className="field"><span>Cover URL</span><input value={form.coverPath} onChange={(event) => setForm((current) => ({ ...current, coverPath: event.target.value }))} placeholder="https://..." /></label>
        </div>
        <label className="admin-toggle"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><span>Visible sur le site</span></label>
        <button className="button admin-submit" type="submit" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
          Enregistrer la box
        </button>
      </form>
    </section>
  );
}
