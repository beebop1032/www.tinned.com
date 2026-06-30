"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plane } from "lucide-react";
import { fetchAdminData } from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import type { Box } from "@/lib/types";
import { BoxEditPanel } from "@/components/admin/BoxEditPanel";
import { TravelTripsPanel } from "@/components/admin/TravelTripsPanel";

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
}

export function TravelBoxDetailClient({ travelBoxId }: { travelBoxId: number }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [travelBox, setTravelBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const data = await fetchAdminData();
      const box = data.travelBoxes.find((candidate) => candidate.id === travelBoxId) ?? null;
      setTravelBox(box);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger la Travel Box.");
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
  }, [travelBoxId]);

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement de la Travel Box</span>
      </section>
    );
  }

  if (denied) {
    return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  }

  if (!travelBox) {
    return (
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Back-office</p>
            <h1>Travel Box introuvable</h1>
            <p>Cette Travel Box n'existe pas ou a été supprimée.</p>
          </div>
          <Link className="button secondary admin-refresh" href="/admin/travel-box">
            <ArrowLeft size={17} aria-hidden />
            Retour aux Travel Box
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell tone-travel">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Travel Box</p>
          <h1>{travelBox.name}</h1>
          <p>{travelBox.tagline ?? "Gérez les carnets de voyage de cette box."}</p>
        </div>
        <Link className="button secondary admin-refresh" href="/admin/travel-box">
          <ArrowLeft size={17} aria-hidden />
          Retour aux Travel Box
        </Link>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <div className="admin-store-overview">
        <div className="admin-store-identity">
          <span className="admin-store-logo">{travelBox.logoPath ? <img src={travelBox.logoPath} alt="" /> : <Plane size={22} aria-hidden />}</span>
          <div><strong>{travelBox.name}</strong><span>{travelBox.tagline ?? travelBox.slug}</span></div>
        </div>
      </div>

      {session?.token ? (
        <>
          <BoxEditPanel box={travelBox} type="travel" token={session.token} onChange={loadData} />
          <TravelTripsPanel travelBox={travelBox} token={session.token} onChange={loadData} />
        </>
      ) : null}
    </section>
  );
}
