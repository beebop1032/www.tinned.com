"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Plus } from "lucide-react";
import { createAdminBox, fetchBoxes, slugify, uploadAdminMedia } from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import type { Box, BoxType } from "@/lib/types";

type BoxFormState = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoPath: string;
  coverPath: string;
  active: boolean;
  companyName: string;
  website: string;
  businessBoxId: string;
  storeBoxId: string;
};

const initialBoxForm: BoxFormState = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  logoPath: "",
  coverPath: "",
  active: true,
  companyName: "",
  website: "",
  businessBoxId: "",
  storeBoxId: ""
};

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
}

function fileLabel(file: File | null, fallback: string) {
  return file ? file.name : fallback;
}

function sectionLabel(type: BoxType) {
  return type === "store"
    ? "Store Box"
    : type === "business"
      ? "Business Box"
      : type === "travel"
        ? "Travel Box"
        : "Blog Box";
}

export function BoxCreateClient({ type }: { type: BoxType }) {
  const router = useRouter();
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [businessBoxes, setBusinessBoxes] = useState<Box[]>([]);
  const [storeBoxes, setStoreBoxes] = useState<Box[]>([]);
  const [boxForm, setBoxForm] = useState<BoxFormState>(initialBoxForm);
  const [boxSlugTouched, setBoxSlugTouched] = useState(false);
  const [boxLogoFile, setBoxLogoFile] = useState<File | null>(null);
  const [boxLogoPreview, setBoxLogoPreview] = useState("");

  useEffect(() => {
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    setSession(stored);
    if (isAdminSession(stored)) {
      void (async () => {
        try {
          if (type !== "business") setBusinessBoxes(await fetchBoxes("business"));
          if (type === "blog") setStoreBoxes(await fetchBoxes("store"));
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Impossible de charger les données.");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setDenied(true);
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (!boxLogoFile) {
      setBoxLogoPreview("");
      return;
    }
    const preview = URL.createObjectURL(boxLogoFile);
    setBoxLogoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [boxLogoFile]);

  const updateBoxName = (name: string) => {
    setBoxForm((current) => ({
      ...current,
      name,
      companyName: current.companyName || name,
      slug: boxSlugTouched ? current.slug : slugify(name)
    }));
  };

  const chooseBoxLogo = (event: ChangeEvent<HTMLInputElement>) => {
    setBoxLogoFile(event.target.files?.[0] ?? null);
  };

  const submitBox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.token) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = boxLogoFile ? await uploadAdminMedia(boxLogoFile, session.token) : null;
      await createAdminBox({
        ...boxForm,
        type,
        logoPath: uploaded?.url ?? boxForm.logoPath,
        businessBoxId: boxForm.businessBoxId ? Number(boxForm.businessBoxId) : undefined,
        storeBoxId: boxForm.storeBoxId ? Number(boxForm.storeBoxId) : undefined
      }, session.token);
      router.push(`/admin/${type}-box`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création de box impossible.");
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement</span>
      </section>
    );
  }

  if (denied) {
    return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  }

  return (
    <section className={`admin-shell tone-${type}`}>
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / {sectionLabel(type)}</p>
          <h1>Nouvelle {sectionLabel(type)}</h1>
          <p>Créez une nouvelle {sectionLabel(type)} et son contenu.</p>
        </div>
        <Link className="button secondary admin-refresh" href={`/admin/${type}-box`}>
          <ArrowLeft size={17} aria-hidden />
          Retour
        </Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <section className="admin-panel">
        <form className="admin-box-form" onSubmit={submitBox}>
          <div className="admin-form-grid">
            <label className="field"><span>Nom</span><input value={boxForm.name} onChange={(event) => updateBoxName(event.target.value)} required placeholder="Bellissimo" /></label>
            <label className="field"><span>Slug</span><input value={boxForm.slug} onChange={(event) => { setBoxSlugTouched(true); setBoxForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required placeholder="bellissimo" /></label>
            <label className="field field-full"><span>Signature</span><input value={boxForm.tagline} onChange={(event) => setBoxForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="Céramiques, table et objets à vivre" /></label>
            <label className="field field-full"><span>Description</span><textarea value={boxForm.description} onChange={(event) => setBoxForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
          </div>
          <div className="admin-media-row">
            <label className="admin-uploader">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={chooseBoxLogo} />
              <span className="admin-upload-preview">{boxLogoPreview || boxForm.logoPath ? <img src={boxLogoPreview || boxForm.logoPath} alt="" /> : <ImagePlus size={23} aria-hidden />}</span>
              <span>{fileLabel(boxLogoFile, "Logo")}</span>
            </label>
            <label className="field"><span>Logo URL</span><input value={boxForm.logoPath} onChange={(event) => setBoxForm((current) => ({ ...current, logoPath: event.target.value }))} placeholder="https://..." /></label>
            <label className="field"><span>Cover URL</span><input value={boxForm.coverPath} onChange={(event) => setBoxForm((current) => ({ ...current, coverPath: event.target.value }))} placeholder="https://..." /></label>
          </div>
          {type !== "business" ? (
            <label className="field">
              <span>Business Box liée</span>
              <select value={boxForm.businessBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, businessBoxId: event.target.value }))}>
                <option value="">Aucune</option>
                {businessBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
              </select>
            </label>
          ) : (
            <div className="admin-form-grid">
              <label className="field"><span>Nom légal</span><input value={boxForm.companyName} onChange={(event) => setBoxForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
              <label className="field"><span>Site web</span><input value={boxForm.website} onChange={(event) => setBoxForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
            </div>
          )}
          {type === "blog" ? (
            <label className="field">
              <span>Store Box liée</span>
              <select value={boxForm.storeBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, storeBoxId: event.target.value }))}>
                <option value="">Aucune</option>
                {storeBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="admin-toggle"><input type="checkbox" checked={boxForm.active} onChange={(event) => setBoxForm((current) => ({ ...current, active: event.target.checked }))} /><span>Visible sur le site</span></label>
          <button className="button admin-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
            Créer la box
          </button>
        </form>
      </section>
    </section>
  );
}
