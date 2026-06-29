"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { readStoredSession, sessionHasRole } from "@/lib/auth";
import { fetchBoxes } from "@/lib/admin-api";
import { LandingEditor } from "@/components/landing/LandingEditor";
import type { Box, BoxType } from "@/lib/types";

const RESOURCE_PATH: Record<BoxType, string> = {
  store: "store_boxes",
  business: "business_boxes",
  blog: "blog_boxes",
  travel: "travel_boxes",
};

export default function AdminLandingPage() {
  const { boxId } = useParams<{ boxId: string }>();
  const [box, setBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    Promise.all([
      fetchBoxes("business"),
      fetchBoxes("store"),
      fetchBoxes("blog"),
    ])
      .then(([biz, store, blog]) => {
        const all: Box[] = [...biz, ...store, ...blog];
        const found = all.find((b) => b.id === Number(boxId));
        if (found) {
          setBox(found);
        } else {
          setError("Box introuvable.");
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [boxId]);

  if (loading) return <p className="admin-shell admin-inline-state">Chargement…</p>;
  if (denied) return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  if (error || !box) return <p className="admin-shell admin-inline-state">{error ?? "Box introuvable."}</p>;

  const boxType = box.type ?? "store";
  const boxIri = `/api/${RESOURCE_PATH[boxType]}/${box.id}`;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Contenu</p>
          <h1>Landing — {box.name}</h1>
          <p>Composez la page d'atterrissage publique de cette box, bloc par bloc.</p>
        </div>
      </div>
      <LandingEditor boxIri={boxIri} boxSlug={box.slug} />
    </section>
  );
}
