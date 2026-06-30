"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Boxes, Loader2 } from "lucide-react";
import { fetchAdminData } from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import type { Box } from "@/lib/types";
import { BoxEditPanel } from "@/components/admin/BoxEditPanel";
import { BlogArticlesPanel } from "@/components/admin/BlogArticlesPanel";

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
}

export function BlogBoxDetailClient({ blogBoxId }: { blogBoxId: number }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [blogBox, setBlogBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const data = await fetchAdminData();
      const box = data.blogBoxes.find((candidate) => candidate.id === blogBoxId) ?? null;
      setBlogBox(box);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger la Blog Box.");
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
  }, [blogBoxId]);

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement de la Blog Box</span>
      </section>
    );
  }

  if (denied) {
    return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  }

  if (!blogBox) {
    return (
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Back-office</p>
            <h1>Blog Box introuvable</h1>
            <p>Cette Blog Box n'existe pas ou a été supprimée.</p>
          </div>
          <Link className="button secondary admin-refresh" href="/admin/blog-box">
            <ArrowLeft size={17} aria-hidden />
            Retour aux Blog Box
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Blog Box</p>
          <h1>{blogBox.name}</h1>
          <p>{blogBox.tagline ?? "Gérez les articles de cette box."}</p>
        </div>
        <Link className="button secondary admin-refresh" href="/admin/blog-box">
          <ArrowLeft size={17} aria-hidden />
          Retour aux Blog Box
        </Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <div className="admin-store-overview">
        <div className="admin-store-identity">
          <span className="admin-store-logo">{blogBox.logoPath ? <img src={blogBox.logoPath} alt="" /> : <Boxes size={22} aria-hidden />}</span>
          <div><strong>{blogBox.name}</strong><span>{blogBox.tagline ?? blogBox.slug}</span></div>
        </div>
      </div>

      {session?.token ? (
        <>
          <BoxEditPanel box={blogBox} type="blog" token={session.token} onChange={loadData} />
          <BlogArticlesPanel blogBox={blogBox} token={session.token} onChange={loadData} />
        </>
      ) : null}
    </section>
  );
}
