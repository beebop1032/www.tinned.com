"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import {
  centsFromPrice,
  createCoupon,
  deleteCoupon,
  fetchCoupons,
  priceFromCents,
  updateCoupon,
  type AdminCoupon,
  type AdminCouponInput
} from "@/lib/admin-api";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

type CouponFormState = {
  code: string;
  type: "percent" | "fixed";
  value: string;
  active: boolean;
  validFrom: string;
  validUntil: string;
  maxUses: string;
  minSubtotal: string;
};

const initialForm: CouponFormState = {
  code: "",
  type: "percent",
  value: "",
  active: true,
  validFrom: "",
  validUntil: "",
  maxUses: "",
  minSubtotal: ""
};

function discountLabel(coupon: Pick<AdminCoupon, "type" | "value">) {
  return coupon.type === "percent" ? `−${coupon.value} %` : `−${priceFromCents(coupon.value)} €`;
}

function validityLabel(coupon: AdminCoupon) {
  const from = coupon.validFrom ? coupon.validFrom.slice(0, 10) : null;
  const until = coupon.validUntil ? coupon.validUntil.slice(0, 10) : null;
  if (from && until) return `${from} → ${until}`;
  if (from) return `dès le ${from}`;
  if (until) return `jusqu'au ${until}`;
  return "sans limite de date";
}

function usesLabel(coupon: AdminCoupon) {
  return `${coupon.usedCount}/${coupon.maxUses ?? "∞"}`;
}

export function CouponsClient() {
  const [token, setToken] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<CouponFormState>(initialForm);

  const load = async (authToken: string) => {
    setError("");
    try {
      setCoupons(await fetchCoupons(authToken));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les codes promo.");
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
    setToken(session.token);
    void load(session.token);
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setStatus("");
    setFormOpen(true);
  };

  const startEdit = (coupon: AdminCoupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === "percent" ? String(coupon.value) : priceFromCents(coupon.value),
      active: coupon.active,
      validFrom: coupon.validFrom ? coupon.validFrom.slice(0, 10) : "",
      validUntil: coupon.validUntil ? coupon.validUntil.slice(0, 10) : "",
      maxUses: coupon.maxUses != null ? String(coupon.maxUses) : "",
      minSubtotal: coupon.minSubtotalCents ? priceFromCents(coupon.minSubtotalCents) : ""
    });
    setStatus("");
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const input: AdminCouponInput = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: form.type === "percent" ? Math.round(Number(form.value) || 0) : centsFromPrice(form.value),
        active: form.active,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        maxUses: form.maxUses.trim() ? Math.max(0, Math.round(Number(form.maxUses) || 0)) : null,
        minSubtotalCents: form.minSubtotal.trim() ? centsFromPrice(form.minSubtotal) : 0
      };
      if (editing) {
        await updateCoupon(editing.id, input, token);
        setStatus(`${input.code} est mis à jour.`);
      } else {
        await createCoupon(input, token);
        setStatus(`${input.code} est créé.`);
      }
      setFormOpen(false);
      setEditing(null);
      setForm(initialForm);
      await load(token);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement du code promo impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (coupon: AdminCoupon) => {
    if (!token) return;
    if (!window.confirm(`Supprimer le code « ${coupon.code} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteCoupon(coupon.id, token);
      setStatus(`${coupon.code} est supprimé.`);
      await load(token);
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
          <p className="eyebrow">Back-office / Ventes</p>
          <h1>Codes promo</h1>
          <p>Créez et gérez les codes de réduction appliqués au checkout.</p>
        </div>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Ticket size={18} aria-hidden /></span>
            <h2>Codes promo {coupons.length ? `(${coupons.length})` : ""}</h2>
          </div>
          <button className="button secondary admin-inline-action" type="button" onClick={startCreate}>
            <Plus size={16} aria-hidden />
            Ajouter un code
          </button>
        </header>

        {formOpen ? (
          <form className="admin-inline-form" onSubmit={submit}>
            <header className="admin-inline-form-header">
              <h3>{editing ? `Modifier ${editing.code}` : "Nouveau code promo"}</h3>
              <button className="text-button" type="button" onClick={() => { setFormOpen(false); setEditing(null); }}>Annuler</button>
            </header>
            <div className="admin-form-grid">
              <label className="field">
                <span>Code</span>
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} required placeholder="ETE2026" />
              </label>
              <label className="field">
                <span>Type</span>
                <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as "percent" | "fixed" }))}>
                  <option value="percent">Pourcentage</option>
                  <option value="fixed">Montant fixe</option>
                </select>
              </label>
              <label className="field">
                <span>{form.type === "percent" ? "Valeur (%)" : "Valeur (€)"}</span>
                <input value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} required inputMode="decimal" placeholder={form.type === "percent" ? "20" : "10,00"} />
              </label>
              <label className="field">
                <span>Sous-total minimum (€)</span>
                <input value={form.minSubtotal} onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))} inputMode="decimal" placeholder="0,00" />
              </label>
              <label className="field">
                <span>Valide à partir du</span>
                <input type="date" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} />
              </label>
              <label className="field">
                <span>Valide jusqu'au</span>
                <input type="date" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} />
              </label>
              <label className="field">
                <span>Utilisations max (vide = illimité)</span>
                <input value={form.maxUses} onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))} inputMode="numeric" placeholder="∞" />
              </label>
            </div>
            <label className="admin-toggle">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
              <span>Actif</span>
            </label>
            <button className="button admin-submit" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
              {editing ? "Enregistrer les modifications" : "Ajouter le code"}
            </button>
          </form>
        ) : null}

        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des codes promo…</p>
          ) : coupons.length ? coupons.map((coupon) => (
            <article className="admin-list-item has-actions" key={coupon.id}>
              <span className="admin-thumb"><Ticket size={17} aria-hidden /></span>
              <div>
                <strong>{coupon.code}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-badge is-published">{discountLabel(coupon)}</span>
                  <span className={`admin-badge ${coupon.active ? "is-published" : "is-draft"}`}>{coupon.active ? "Actif" : "Inactif"}</span>
                  <span className="admin-trip-slug">{validityLabel(coupon)}</span>
                  <span className="admin-trip-slug">Utilisations {usesLabel(coupon)}</span>
                </div>
              </div>
              <button className="admin-manage-button" type="button" onClick={() => startEdit(coupon)}>
                <Pencil size={14} aria-hidden />
                Modifier
              </button>
              <button className="icon-button danger" type="button" onClick={() => void remove(coupon)} disabled={busy} aria-label="Supprimer ce code promo">
                <Trash2 size={16} aria-hidden />
              </button>
            </article>
          )) : <p className="admin-empty-inline">Aucun code promo. Ajoutez le premier code.</p>}
        </div>
      </section>
    </section>
  );
}
