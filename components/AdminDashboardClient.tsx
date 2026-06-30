"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  MapPin,
  Plane,
  Plus,
  RefreshCcw,
  Store,
  Tags
} from "lucide-react";
import { fetchAdminData } from "@/lib/admin-api";
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

type AdminSection = "overview" | BoxType | "vendor-page" | "newsletter";

const emptyData: AdminData = {
  businessBoxes: [],
  storeBoxes: [],
  blogBoxes: [],
  travelBoxes: [],
  products: []
};

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
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
  const [busy, setBusy] = useState<"refresh" | null>(null);
  const [status] = useState("");
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement du dashboard</span>
      </section>
    );
  }

  const pageTone =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "" : `tone-${section}`;

  return (
    <section className={`admin-shell ${pageTone}`}>
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
        <Link className="admin-kpi tone-business" href="/admin/business-box">
          <Building2 size={21} aria-hidden />
          <span>Business Box</span>
          <strong>{data.businessBoxes.length}</strong>
        </Link>
        <Link className="admin-kpi tone-store" href="/admin/store-box">
          <Store size={21} aria-hidden />
          <span>Store Box</span>
          <strong>{data.storeBoxes.length}</strong>
        </Link>
        <Link className="admin-kpi tone-blog" href="/admin/blog-box">
          <Boxes size={21} aria-hidden />
          <span>Blog Box</span>
          <strong>{data.blogBoxes.length}</strong>
        </Link>
        <Link className="admin-kpi tone-travel" href="/admin/travel-box">
          <Plane size={21} aria-hidden />
          <span>Travel Box</span>
          <strong>{data.travelBoxes.length}</strong>
        </Link>
        <Link className="admin-kpi tone-store" href="/admin/store-box">
          <Tags size={21} aria-hidden />
          <span>Variantes</span>
          <strong>{totalVariants}</strong>
        </Link>
        <Link className="admin-kpi tone-travel" href="/admin/travel-box">
          <MapPin size={21} aria-hidden />
          <span>Voyages</span>
          <strong>{totalTrips}</strong>
        </Link>
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
            <Link className="button secondary admin-inline-action" href={`/admin/${boxSection}-box/new`}>
              <Plus size={16} aria-hidden />
              {`Ajouter une ${sectionLabel(boxSection)}`}
            </Link>
          </header>
          <div className="admin-list">
            {listedBoxes.length ? listedBoxes.map((box) => (
              <article className="admin-list-item" key={`${box.type}-${box.id}`}>
                <span className="admin-thumb">{box.logoPath ? <img src={box.logoPath} alt="" /> : <Boxes size={17} aria-hidden />}</span>
                <div>
                  <strong>{box.name}</strong>
                  <span>{box.type === "store" ? "Store Box" : box.type === "business" ? "Business Box" : box.type === "travel" ? "Travel Box" : "Blog Box"} / {box.slug}</span>
                </div>
                <Link className="admin-ghost-button" href={`/admin/landing/${box.id}`}>
                  <LayoutTemplate size={14} aria-hidden />
                  Landing
                </Link>
                {section === "store" ? (
                  <Link className="admin-manage-button" href={`/admin/store-box/${box.id}`}>
                    Gérer
                  </Link>
                ) : section === "business" ? (
                  <Link className="admin-manage-button" href={`/admin/business-box/${box.id}`}>
                    Gérer
                  </Link>
                ) : section === "blog" ? (
                  <Link className="admin-manage-button" href={`/admin/blog-box/${box.id}`}>
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
