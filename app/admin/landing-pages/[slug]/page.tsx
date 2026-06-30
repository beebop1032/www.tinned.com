"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { readStoredSession, sessionHasRole } from "@/lib/auth";
import { LandingEditor } from "@/components/landing/LandingEditor";

export default function AdminStandaloneLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [denied, setDenied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) setDenied(true);
    setReady(true);
  }, []);

  if (!ready) return <p className="admin-inline-state">Chargement…</p>;
  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Contenu</p>
          <h1>Landing — {slug}</h1>
          <p>Composez cette page d&apos;atterrissage autonome, bloc par bloc.</p>
        </div>
        <Link className="admin-ghost-button" href="/admin/landing-pages">Retour aux landing pages</Link>
      </div>
      <LandingEditor standaloneSlug={slug} />
    </section>
  );
}
