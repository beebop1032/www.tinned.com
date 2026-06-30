"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { readStoredSession, sessionHasRole } from "@/lib/auth";
import { deleteLanding, listStandaloneLandings } from "@/lib/landing-api";
import type { LandingPage } from "@/lib/types";

type SlugGroup = {
  slug: string;
  title: string;
  locales: string[];
  ids: number[];
};

function groupBySlug(landings: LandingPage[]): SlugGroup[] {
  const map = new Map<string, SlugGroup>();
  for (const landing of landings) {
    const slug = landing.slug ?? "";
    if (!slug) continue;
    const existing = map.get(slug);
    if (existing) {
      existing.locales.push(landing.locale);
      existing.ids.push(landing.id);
    } else {
      map.set(slug, { slug, title: landing.title, locales: [landing.locale], ids: [landing.id] });
    }
  }
  return Array.from(map.values());
}

export function StandaloneLandingsClient() {
  const [groups, setGroups] = useState<SlugGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const landings = await listStandaloneLandings();
      setGroups(groupBySlug(landings));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les landing pages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    void load();
  }, []);

  const remove = async (group: SlugGroup) => {
    if (!window.confirm(`Supprimer la landing page « ${group.title} » (/p/${group.slug}) ? Cette action est définitive.`)) return;
    const session = readStoredSession();
    if (!session?.token) {
      setError("Non connecté");
      return;
    }
    setBusy(true);
    setError("");
    try {
      for (const id of group.ids) {
        await deleteLanding(id, session.token);
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Contenu</p>
          <h1>Landing pages</h1>
          <p>Composez des pages d&apos;atterrissage autonomes, accessibles via /p/&lt;slug&gt;.</p>
        </div>
        <Link className="button" href="/admin/landing-pages/new">
          <Plus size={16} aria-hidden />
          Créer une landing page
        </Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <section className="admin-panel">
        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des landing pages…</p>
          ) : groups.length ? groups.map((group) => (
            <article className="admin-list-item has-actions" key={group.slug}>
              <span className="admin-thumb"><LayoutTemplate size={17} aria-hidden /></span>
              <div>
                <strong>{group.title}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-trip-slug">/p/{group.slug}</span>
                  <span className="admin-trip-slug">{group.locales.map((l) => l.toUpperCase()).join(" · ")}</span>
                </div>
              </div>
              <Link className="admin-manage-button" href={`/admin/landing-pages/${group.slug}`}>
                <Pencil size={14} aria-hidden />
                Éditer
              </Link>
              <button className="icon-button danger" type="button" onClick={() => void remove(group)} disabled={busy} aria-label="Supprimer cette landing page">
                {busy ? <Loader2 className="spin" size={16} aria-hidden /> : <Trash2 size={16} aria-hidden />}
              </button>
            </article>
          )) : <p className="admin-empty-inline">Aucune landing page autonome. Créez la première.</p>}
        </div>
      </section>
    </section>
  );
}
