"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Users } from "lucide-react";
import { fetchAdminUsers, type AdminUser } from "@/lib/admin-api";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

function fullName(user: AdminUser) {
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || "—";
}

export function AccountsClient() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setUsers(await fetchAdminUsers(session.token));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Impossible de charger les comptes.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => user.email.toLowerCase().includes(query));
  }, [users, search]);

  if (denied) return <p className="admin-inline-state">Accès refusé.</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Clients</p>
          <h1>Comptes</h1>
          <p>Gérez les comptes clients et administrateurs, leurs rôles et leurs adresses.</p>
        </div>
      </div>

      {error ? (
        <div className="admin-alert is-error" role="status">{error}</div>
      ) : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Users size={18} aria-hidden /></span>
            <h2>Comptes {filtered.length ? `(${filtered.length})` : ""}</h2>
          </div>
          <label className="field admin-inline-action" style={{ minWidth: "240px" }}>
            <input
              type="search"
              aria-label="Rechercher par email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par email…"
            />
          </label>
        </header>

        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des comptes…</p>
          ) : filtered.length ? filtered.map((user) => (
            <article className="admin-list-item has-actions" key={user.id}>
              <span className="admin-thumb"><Users size={17} aria-hidden /></span>
              <div>
                <strong>{user.email}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-trip-slug">{fullName(user)}</span>
                  <span className={`admin-badge ${user.roles.includes("ROLE_ADMIN") ? "is-published" : "is-draft"}`}>
                    {user.roles.includes("ROLE_ADMIN") ? "ROLE_ADMIN" : "ROLE_USER"}
                  </span>
                  <span className={`admin-badge ${user.active ? "is-published" : "is-draft"}`}>
                    {user.active ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
              <Link className="admin-manage-button" href={`/admin/accounts/${user.id}`}>
                <Pencil size={14} aria-hidden />
                Gérer
              </Link>
            </article>
          )) : <p className="admin-empty-inline">Aucun compte ne correspond à cette recherche.</p>}
        </div>
      </section>
    </section>
  );
}
