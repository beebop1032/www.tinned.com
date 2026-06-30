"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MapPin, Save, UserCog } from "lucide-react";
import {
  fetchAdminUser,
  fetchUserAddresses,
  updateAdminUser,
  type AdminAddress,
  type AdminUser
} from "@/lib/admin-api";
import { readStoredSession, sessionHasRole, type TinnedSession } from "@/lib/auth";

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  active: boolean;
  marketingConsent: boolean;
  isAdmin: boolean;
};

function toForm(user: AdminUser): FormState {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    active: user.active,
    marketingConsent: user.marketingConsent,
    isAdmin: user.roles.includes("ROLE_ADMIN")
  };
}

export function AccountDetailClient({ userId }: { userId: number }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [addresses, setAddresses] = useState<AdminAddress[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    if (!stored || !sessionHasRole(stored, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const loaded = await fetchAdminUser(userId, stored.token);
        setUser(loaded);
        setForm(toForm(loaded));
        try {
          setAddresses(await fetchUserAddresses(loaded.email, stored.token));
        } catch {
          setAddresses([]);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Impossible de charger le compte.");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.token || !user || !form) return;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const roles = form.isAdmin ? ["ROLE_USER", "ROLE_ADMIN"] : ["ROLE_USER"];
      const updated = await updateAdminUser(user.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        roles,
        active: form.active,
        marketingConsent: form.marketingConsent
      }, session.token);
      setUser(updated);
      setForm(toForm(updated));
      setStatus("Le compte est mis à jour.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement du compte</span>
      </section>
    );
  }

  if (denied) return <p className="admin-shell admin-inline-state">Accès refusé.</p>;

  if (!user || !form) {
    return (
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Back-office / Clients</p>
            <h1>Compte introuvable</h1>
            <p>Ce compte n&apos;existe pas ou a été supprimé.</p>
          </div>
          <Link className="button secondary admin-refresh" href="/admin/accounts">
            <ArrowLeft size={17} aria-hidden />
            Retour aux comptes
          </Link>
        </div>
      </section>
    );
  }

  const title = `${form.firstName} ${form.lastName}`.trim() || user.email;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Clients</p>
          <h1>{title}</h1>
          <p>{user.email}</p>
        </div>
        <Link className="button secondary admin-refresh" href="/admin/accounts">
          <ArrowLeft size={17} aria-hidden />
          Retour aux comptes
        </Link>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><UserCog size={18} aria-hidden /></span>
            <h2>Compte</h2>
          </div>
        </header>

        <form onSubmit={submit}>
          <div className="admin-form-grid">
            <label className="field">
              <span>Email</span>
              <input value={user.email} readOnly disabled />
            </label>
            <label className="field">
              <span>Téléphone</span>
              <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </label>
            <label className="field">
              <span>Prénom</span>
              <input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            </label>
            <label className="field">
              <span>Nom</span>
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            </label>
          </div>

          <label className="admin-toggle">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            <span>Actif</span>
          </label>
          <label className="admin-toggle">
            <input type="checkbox" checked={form.marketingConsent} onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })} />
            <span>Consentement marketing</span>
          </label>
          <label className="admin-toggle">
            <input type="checkbox" checked={form.isAdmin} onChange={(event) => setForm({ ...form, isAdmin: event.target.checked })} />
            <span>Administrateur (ROLE_ADMIN)</span>
          </label>

          <button className="button admin-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
            Enregistrer les modifications
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><MapPin size={18} aria-hidden /></span>
            <h2>Adresses</h2>
          </div>
        </header>

        <div className="admin-list">
          {addresses.length ? addresses.map((address) => (
            <article className="admin-list-item" key={address.id}>
              <span className="admin-thumb"><MapPin size={17} aria-hidden /></span>
              <div>
                <strong>{`${address.firstName} ${address.lastName}`.trim() || "—"}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-trip-slug">{address.street}</span>
                  <span className="admin-trip-slug">{address.postalCode} {address.city}</span>
                  <span className="admin-trip-slug">{address.countryCode}</span>
                  {address.phone ? <span className="admin-trip-slug">{address.phone}</span> : null}
                </div>
              </div>
            </article>
          )) : <p className="admin-empty-inline">Aucune adresse enregistrée pour ce compte.</p>}
        </div>
      </section>
    </section>
  );
}
