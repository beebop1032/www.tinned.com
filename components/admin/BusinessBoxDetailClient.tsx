"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Boxes, Building2, Link2, Loader2, Plane, Store } from "lucide-react";
import { fetchAdminData } from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import type { Box } from "@/lib/types";
import { BoxEditPanel } from "@/components/admin/BoxEditPanel";

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
}

type AttachedBox = {
  box: Box;
  label: string;
  tone: string;
  href: string;
  icon: React.ReactNode;
};

export function BusinessBoxDetailClient({ businessBoxId }: { businessBoxId: number }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [businessBox, setBusinessBox] = useState<Box | null>(null);
  const [attached, setAttached] = useState<AttachedBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const data = await fetchAdminData();
      const box = data.businessBoxes.find((candidate) => candidate.id === businessBoxId) ?? null;
      setBusinessBox(box);

      const linked: AttachedBox[] = [
        ...data.storeBoxes
          .filter((candidate) => candidate.businessBox?.id === businessBoxId)
          .map((candidate) => ({ box: candidate, label: "Store Box", tone: "tone-store", href: `/admin/store-box/${candidate.id}`, icon: <Store size={17} aria-hidden /> })),
        ...data.blogBoxes
          .filter((candidate) => candidate.businessBox?.id === businessBoxId)
          .map((candidate) => ({ box: candidate, label: "Blog Box", tone: "tone-blog", href: `/admin/blog-box/${candidate.id}`, icon: <Boxes size={17} aria-hidden /> })),
        ...data.travelBoxes
          .filter((candidate) => candidate.businessBox?.id === businessBoxId)
          .map((candidate) => ({ box: candidate, label: "Travel Box", tone: "tone-travel", href: `/admin/travel-box/${candidate.id}`, icon: <Plane size={17} aria-hidden /> }))
      ];
      setAttached(linked);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger la Business Box.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    setSession(stored);
    if (isAdminSession(stored)) {
      void loadData();
    } else {
      setDenied(true);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessBoxId]);

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement de la Business Box</span>
      </section>
    );
  }

  if (denied) {
    return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  }

  if (!businessBox) {
    return (
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Back-office</p>
            <h1>Business Box introuvable</h1>
            <p>Cette Business Box n'existe pas ou a été supprimée.</p>
          </div>
          <Link className="button secondary admin-refresh" href="/admin/business-box">
            <ArrowLeft size={17} aria-hidden />
            Retour aux Business Box
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell tone-business">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Business Box</p>
          <h1>{businessBox.name}</h1>
          <p>{businessBox.tagline ?? "Gérez cette entreprise et ses box rattachées."}</p>
        </div>
        <Link className="button secondary admin-refresh" href="/admin/business-box">
          <ArrowLeft size={17} aria-hidden />
          Retour aux Business Box
        </Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <div className="admin-store-overview">
        <div className="admin-store-identity">
          <span className="admin-store-logo">{businessBox.logoPath ? <img src={businessBox.logoPath} alt="" /> : <Building2 size={22} aria-hidden />}</span>
          <div><strong>{businessBox.name}</strong><span>{businessBox.tagline ?? businessBox.slug}</span></div>
        </div>
      </div>

      {session?.token ? (
        <BoxEditPanel box={businessBox} type="business" token={session.token} onChange={loadData} />
      ) : null}

      <section className="admin-panel admin-store-management">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Link2 size={18} aria-hidden /></span>
            <h2>Box rattachées</h2>
          </div>
        </header>
        <div className="admin-product-list">
          <div className="admin-list">
            {attached.length ? attached.map((item) => (
              <article className="admin-list-item" key={`${item.label}-${item.box.id}`}>
                <span className={`admin-thumb ${item.tone}`}>{item.box.logoPath ? <img src={item.box.logoPath} alt="" /> : item.icon}</span>
                <div>
                  <strong>{item.box.name}</strong>
                  <span>{item.label} / {item.box.slug}</span>
                </div>
                <Link className="admin-manage-button" href={item.href}>
                  Gérer
                </Link>
              </article>
            )) : <p className="admin-empty-inline">Aucune box rattachée à cette entreprise.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
