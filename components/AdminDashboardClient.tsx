"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  MapPin,
  Plane,
  Plus,
  RefreshCcw,
  Store,
  Tags
} from "lucide-react";
import {
  createAdminBox,
  fetchAdminData,
  slugify,
  uploadAdminMedia
} from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import type { Box, BoxType, Product } from "@/lib/types";
import { VendorPageCmsClient } from "@/components/VendorPageCmsClient";
import { NewsletterBlockCmsClient } from "@/components/NewsletterBlockCmsClient";

type AdminData = {
  businessBoxes: Box[];
  storeBoxes: Box[];
  blogBoxes: Box[];
  travelBoxes: Box[];
  products: Product[];
};

type BoxFormState = {
  type: BoxType;
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

type AdminSection = "overview" | BoxType | "vendor-page" | "newsletter";

const emptyData: AdminData = {
  businessBoxes: [],
  storeBoxes: [],
  blogBoxes: [],
  travelBoxes: [],
  products: []
};

const initialBoxForm: BoxFormState = {
  type: "store",
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

function boxFormForSection(section: AdminSection): BoxFormState {
  const type: BoxType =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
  return { ...initialBoxForm, type };
}

function sectionLabel(section: BoxType) {
  return section === "store"
    ? "Store Box"
    : section === "business"
      ? "Business Box"
      : section === "travel"
        ? "Travel Box"
        : "Blog Box";
}

export function AdminDashboardClient({ section = "overview" }: { section?: AdminSection }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [data, setData] = useState<AdminData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"box" | "refresh" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [boxForm, setBoxForm] = useState<BoxFormState>(() => boxFormForSection(section));
  const [boxFormOpen, setBoxFormOpen] = useState(false);
  const [boxSlugTouched, setBoxSlugTouched] = useState(false);
  const [boxLogoFile, setBoxLogoFile] = useState<File | null>(null);
  const [boxLogoPreview, setBoxLogoPreview] = useState("");

  const totalVariants = data.products.reduce((total, product) => total + product.variants.length, 0);
  const totalTrips = data.travelBoxes.reduce((total, box) => total + (box.trips?.length ?? 0), 0);

  const boxSection: BoxType =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
  const listedBoxes = section === "store"
    ? data.storeBoxes
    : section === "business"
      ? data.businessBoxes
      : section === "blog"
        ? data.blogBoxes
        : section === "travel"
          ? data.travelBoxes
          : [];

  const loadData = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "refresh") setBusy("refresh");
    setError("");
    try {
      const nextData = await fetchAdminData();
      setData(nextData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger le dashboard.");
    } finally {
      setLoading(false);
      setBusy(null);
    }
  };

  useEffect(() => {
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    setSession(stored);
    if (isAdminSession(stored)) {
      void loadData("initial");
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBoxForm(boxFormForSection(section));
    setBoxFormOpen(false);
  }, [section]);

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
    setBusy("box");
    setStatus("");
    setError("");
    try {
      const uploaded = boxLogoFile ? await uploadAdminMedia(boxLogoFile, session.token) : null;
      await createAdminBox({
        ...boxForm,
        logoPath: uploaded?.url ?? boxForm.logoPath,
        businessBoxId: boxForm.businessBoxId ? Number(boxForm.businessBoxId) : undefined,
        storeBoxId: boxForm.storeBoxId ? Number(boxForm.storeBoxId) : undefined
      }, session.token);
      setStatus(`${boxForm.name} est créée.`);
      setBoxForm(boxFormForSection(section));
      setBoxSlugTouched(false);
      setBoxLogoFile(null);
      setBoxFormOpen(false);
      await loadData("initial");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création de box impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement du dashboard</span>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office</p>
          <h1>
            {section === "overview"
              ? "Dashboard Tinned"
              : section === "vendor-page"
                ? "Page Fournisseurs"
                : section === "newsletter"
                  ? "Newsletter"
                  : sectionLabel(boxSection)}
          </h1>
          <p>
            {section === "overview"
              ? "Pilotez chaque espace depuis sa page dédiée."
              : section === "vendor-page"
                ? "Contenu de la page publique /vendre."
                : section === "newsletter"
                  ? "Bloc d'inscription email affiché sur la home page."
                  : `Gérez vos ${sectionLabel(section as BoxType)} et leur contenu.`}
          </p>
        </div>
        <button className="button secondary admin-refresh" type="button" onClick={() => void loadData()} disabled={busy === "refresh"}>
          {busy === "refresh" ? <Loader2 className="spin" size={17} aria-hidden /> : <RefreshCcw size={17} aria-hidden />}
          Actualiser
        </button>
      </div>

      <div className="admin-kpis" aria-label="Indicateurs catalogue">
        <article className="tone-business">
          <Building2 size={21} aria-hidden />
          <span>Business Box</span>
          <strong>{data.businessBoxes.length}</strong>
        </article>
        <article className="tone-store">
          <Store size={21} aria-hidden />
          <span>Store Box</span>
          <strong>{data.storeBoxes.length}</strong>
        </article>
        <article className="tone-blog">
          <Boxes size={21} aria-hidden />
          <span>Blog Box</span>
          <strong>{data.blogBoxes.length}</strong>
        </article>
        <article className="tone-travel">
          <Plane size={21} aria-hidden />
          <span>Travel Box</span>
          <strong>{data.travelBoxes.length}</strong>
        </article>
        <article>
          <Tags size={21} aria-hidden />
          <span>Variantes</span>
          <strong>{totalVariants}</strong>
        </article>
        <article className="tone-travel">
          <MapPin size={21} aria-hidden />
          <span>Voyages</span>
          <strong>{totalTrips}</strong>
        </article>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">
          {error || status}
        </div>
      ) : null}

      {section === "newsletter" ? (
        <NewsletterBlockCmsClient />
      ) : section === "vendor-page" ? (
        <VendorPageCmsClient />
      ) : section === "overview" ? (
        <>
          <div className="admin-section-head">
            <p className="admin-section-eyebrow">Catalogue</p>
            <h2>Vos espaces</h2>
          </div>
          <div className="admin-overview-lists">
            {([
              { title: "Store Box", boxes: data.storeBoxes, href: "/admin/store-box", icon: <Store size={18} aria-hidden />, tone: "tone-store" },
              { title: "Business Box", boxes: data.businessBoxes, href: "/admin/business-box", icon: <Building2 size={18} aria-hidden />, tone: "tone-business" },
              { title: "Blog Box", boxes: data.blogBoxes, href: "/admin/blog-box", icon: <Boxes size={18} aria-hidden />, tone: "tone-blog" },
              { title: "Travel Box", boxes: data.travelBoxes, href: "/admin/travel-box", icon: <Plane size={18} aria-hidden />, tone: "tone-travel" }
            ] as const).map((group) => (
              <section className={`admin-panel admin-overview-panel ${group.tone}`} key={group.title}>
                <header className="admin-panel-header">
                  <div>
                    <span className="admin-panel-icon">{group.icon}</span>
                    <h2>{group.title}</h2>
                  </div>
                  <Link className="admin-overview-link" href={group.href}>Gérer</Link>
                </header>
                <div className="admin-list">
                  {group.boxes.length ? group.boxes.map((box) => (
                    <article className="admin-list-item" key={box.id}>
                      <span className="admin-thumb">{box.logoPath ? <img src={box.logoPath} alt="" /> : group.icon}</span>
                      <div>
                        <strong>{box.name}</strong>
                        <span>{box.slug}</span>
                      </div>
                    </article>
                  )) : <p className="admin-empty-inline">Aucune {group.title} pour le moment.</p>}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
      <div className="admin-catalog-layout is-single">
        <section className="admin-panel admin-box-catalog">
          <header className="admin-panel-header">
            <div>
              <span className="admin-panel-icon"><LayoutDashboard size={18} aria-hidden /></span>
              <h2>{sectionLabel(boxSection)}</h2>
            </div>
            <button className="button secondary admin-inline-action" type="button" onClick={() => setBoxFormOpen((open) => !open)}>
              <Plus size={16} aria-hidden />
              {boxFormOpen ? "Fermer" : `Ajouter une ${sectionLabel(boxSection)}`}
            </button>
          </header>
          {boxFormOpen ? (
            <form className="admin-box-form admin-inline-form" onSubmit={submitBox}>
              <header className="admin-inline-form-header">
                <h3>Nouvelle {sectionLabel(boxSection)}</h3>
                <button className="text-button" type="button" onClick={() => setBoxFormOpen(false)}>Annuler</button>
              </header>
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
              {boxForm.type !== "business" ? (
                <label className="field">
                  <span>Business Box liée</span>
                  <select value={boxForm.businessBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, businessBoxId: event.target.value }))}>
                    <option value="">Aucune</option>
                    {data.businessBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
                  </select>
                </label>
              ) : (
                <div className="admin-form-grid">
                  <label className="field"><span>Nom légal</span><input value={boxForm.companyName} onChange={(event) => setBoxForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
                  <label className="field"><span>Site web</span><input value={boxForm.website} onChange={(event) => setBoxForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
                </div>
              )}
              {boxForm.type === "blog" ? (
                <label className="field">
                  <span>Store Box liée</span>
                  <select value={boxForm.storeBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, storeBoxId: event.target.value }))}>
                    <option value="">Aucune</option>
                    {data.storeBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="admin-toggle"><input type="checkbox" checked={boxForm.active} onChange={(event) => setBoxForm((current) => ({ ...current, active: event.target.checked }))} /><span>Visible sur le site</span></label>
              <button className="button admin-submit" type="submit" disabled={busy === "box"}>
                {busy === "box" ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
                Créer la box
              </button>
            </form>
          ) : null}
          <div className="admin-list">
            {listedBoxes.length ? listedBoxes.map((box) => (
              <article className="admin-list-item" key={`${box.type}-${box.id}`}>
                <span className="admin-thumb">{box.logoPath ? <img src={box.logoPath} alt="" /> : <Boxes size={17} aria-hidden />}</span>
                <div>
                  <strong>{box.name}</strong>
                  <span>{box.type === "store" ? "Store Box" : box.type === "business" ? "Business Box" : box.type === "travel" ? "Travel Box" : "Blog Box"} / {box.slug}</span>
                </div>
                <a href={`/admin/landing/${box.id}`} style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>Landing</a>
                {section === "store" ? (
                  <Link className="admin-manage-button" href={`/admin/store-box/${box.id}`}>
                    Gérer
                  </Link>
                ) : section === "travel" ? (
                  <Link className="admin-manage-button" href={`/admin/travel-box/${box.id}`}>
                    Gérer
                  </Link>
                ) : null}
              </article>
            )) : <p className="admin-empty-inline">Aucune {sectionLabel(boxSection)} pour le moment.</p>}
          </div>
        </section>
      </div>
      )}
    </section>
  );
}
