"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { History, Loader2, Save, Warehouse } from "lucide-react";
import {
  createStockMovement,
  fetchProducts,
  fetchStockMovements,
  type AdminVariantStockRow,
  type StockMovement,
  type StockMovementInput,
  type StockReason
} from "@/lib/admin-api";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

const REASON_LABELS: Record<StockReason, string> = {
  sale: "Vente",
  restock: "Réapprovisionnement",
  adjustment: "Ajustement",
  return: "Retour",
  initial: "Stock initial"
};

const ADJUST_REASONS: StockReason[] = ["restock", "adjustment", "return", "initial"];

type AdjustFormState = {
  reason: StockReason;
  delta: string;
  note: string;
};

const initialAdjustForm: AdjustFormState = { reason: "restock", delta: "", note: "" };

function deltaLabel(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

export function StockClient() {
  const [token, setToken] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [rows, setRows] = useState<AdminVariantStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [adjustVariantId, setAdjustVariantId] = useState<number | null>(null);
  const [adjustForm, setAdjustForm] = useState<AdjustFormState>(initialAdjustForm);

  const [historyVariantId, setHistoryVariantId] = useState<number | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setError("");
    try {
      const products = await fetchProducts();
      const flattened: AdminVariantStockRow[] = products.flatMap((product) =>
        (product.variants ?? []).map((variant) => ({
          variantId: variant.id,
          sku: variant.sku,
          stock: variant.stock,
          productId: product.id,
          productName: product.name
        }))
      );
      setRows(flattened);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger le stock.");
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
    void load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) => row.sku.toLowerCase().includes(term) || row.productName.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const startAdjust = (variantId: number) => {
    setAdjustVariantId((current) => (current === variantId ? null : variantId));
    setAdjustForm(initialAdjustForm);
    setStatus("");
  };

  const toggleHistory = async (variantId: number) => {
    if (historyVariantId === variantId) {
      setHistoryVariantId(null);
      setHistory([]);
      return;
    }
    if (!token) return;
    setHistoryVariantId(variantId);
    setHistory([]);
    setHistoryLoading(true);
    setError("");
    try {
      setHistory(await fetchStockMovements(variantId, token));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitAdjust = async (event: FormEvent<HTMLFormElement>, row: AdminVariantStockRow) => {
    event.preventDefault();
    if (!token) return;
    const delta = Math.trunc(Number(adjustForm.delta));
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Indiquez une quantité non nulle (positive pour une entrée, négative pour une sortie).");
      return;
    }
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const input: StockMovementInput = {
        variantId: row.variantId,
        delta,
        reason: adjustForm.reason,
        note: adjustForm.note
      };
      const movement = await createStockMovement(input, token);
      setStatus(`Stock de ${row.sku} ajusté à ${movement.resultingStock}.`);
      setAdjustVariantId(null);
      setAdjustForm(initialAdjustForm);
      setRows((current) =>
        current.map((item) =>
          item.variantId === row.variantId ? { ...item, stock: movement.resultingStock } : item
        )
      );
      if (historyVariantId === row.variantId) {
        setHistory(await fetchStockMovements(row.variantId, token));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ajustement impossible.");
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
          <h1>Stock</h1>
          <p>Suivez le stock de chaque variante, ajustez-le et consultez l'historique des mouvements.</p>
        </div>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      <section className="admin-panel">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Warehouse size={18} aria-hidden /></span>
            <h2>Variantes {rows.length ? `(${rows.length})` : ""}</h2>
          </div>
          <input
            className="field"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par SKU ou produit"
            aria-label="Rechercher une variante"
          />
        </header>

        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement du stock…</p>
          ) : filteredRows.length ? filteredRows.map((row) => (
            <article className="admin-list-item has-actions" key={row.variantId}>
              <span className="admin-thumb"><Warehouse size={17} aria-hidden /></span>
              <div>
                <strong>{row.productName}</strong>
                <div className="admin-trip-meta">
                  <span className="admin-trip-slug">{row.sku}</span>
                  <span className={`admin-badge ${row.stock > 0 ? "is-published" : "is-draft"}`}>Stock {row.stock}</span>
                </div>

                {adjustVariantId === row.variantId ? (
                  <form className="admin-inline-form" onSubmit={(event) => submitAdjust(event, row)}>
                    <div className="admin-form-grid">
                      <label className="field">
                        <span>Motif</span>
                        <select
                          value={adjustForm.reason}
                          onChange={(event) => setAdjustForm((current) => ({ ...current, reason: event.target.value as StockReason }))}
                        >
                          {ADJUST_REASONS.map((reason) => (
                            <option key={reason} value={reason}>{REASON_LABELS[reason]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>Quantité (+ entrée / − sortie)</span>
                        <input
                          value={adjustForm.delta}
                          onChange={(event) => setAdjustForm((current) => ({ ...current, delta: event.target.value }))}
                          inputMode="numeric"
                          placeholder="ex. 10 ou -3"
                          required
                        />
                      </label>
                      <label className="field field-full">
                        <span>Note (optionnelle)</span>
                        <input
                          value={adjustForm.note}
                          onChange={(event) => setAdjustForm((current) => ({ ...current, note: event.target.value }))}
                          placeholder="Réception fournisseur, inventaire…"
                        />
                      </label>
                    </div>
                    <button className="button admin-submit" type="submit" disabled={busy}>
                      {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Save size={18} aria-hidden />}
                      Enregistrer le mouvement
                    </button>
                  </form>
                ) : null}

                {historyVariantId === row.variantId ? (
                  <div className="admin-list">
                    {historyLoading ? (
                      <p className="admin-empty-inline">Chargement de l'historique…</p>
                    ) : history.length ? history.map((movement) => (
                      <div className="admin-trip-meta" key={movement.id}>
                        <span className="admin-trip-slug">{new Date(movement.createdAt).toLocaleString("fr-BE")}</span>
                        <span className="admin-badge is-published">{REASON_LABELS[movement.reason] ?? movement.reason}</span>
                        <span className={`admin-badge ${movement.delta >= 0 ? "is-published" : "is-draft"}`}>{deltaLabel(movement.delta)}</span>
                        <span className="admin-trip-slug">→ stock {movement.resultingStock}</span>
                        {movement.note ? <span className="admin-trip-slug">{movement.note}</span> : null}
                      </div>
                    )) : <p className="admin-empty-inline">Aucun mouvement pour cette variante.</p>}
                  </div>
                ) : null}
              </div>

              <button className="admin-manage-button" type="button" onClick={() => startAdjust(row.variantId)}>
                <Save size={14} aria-hidden />
                Ajuster
              </button>
              <button className="admin-manage-button" type="button" onClick={() => void toggleHistory(row.variantId)}>
                <History size={14} aria-hidden />
                Historique
              </button>
            </article>
          )) : <p className="admin-empty-inline">Aucune variante ne correspond à cette recherche.</p>}
        </div>
      </section>
    </section>
  );
}
