"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, PackageCheck, Printer, RefreshCcw } from "lucide-react";
import { AUTH_STORAGE_KEY, readStoredSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import {
  createShippingLabel,
  fetchAdminShipping,
  generateShippingLabel,
  updateShippingLabel,
  type AdminStoreOrder,
  type ShippingLabel
} from "@/lib/admin-api";
import { money } from "@/lib/format";

type ShippingData = { storeOrders: AdminStoreOrder[]; labels: ShippingLabel[] };

const emptyData: ShippingData = { storeOrders: [], labels: [] };

function labelStatus(status: ShippingLabel["status"]) {
  return status === "pending" ? "A generer" : status === "ready" ? "Prete a imprimer" : status === "printed" ? "Imprimee" : "Erreur";
}

export function ShippingLabelsAdminClient() {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [data, setData] = useState<ShippingData>(emptyData);
  const [storeOrderId, setStoreOrderId] = useState("");
  const [format, setFormat] = useState("A6");
  const [copies, setCopies] = useState(1);
  const [weightGrams, setWeightGrams] = useState(1000);
  const [pickupPointId, setPickupPointId] = useState("");
  const [pickupPointName, setPickupPointName] = useState("");
  const [pickupPointStreet, setPickupPointStreet] = useState("");
  const [pickupPointPostalCode, setPickupPointPostalCode] = useState("");
  const [pickupPointCity, setPickupPointCity] = useState("");
  const [pickupPointCountryCode, setPickupPointCountryCode] = useState("BE");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async (current: TinnedSession) => {
    setLoading(true);
    try {
      const shipping = await fetchAdminShipping(current.token);
      setData(shipping);
      setStoreOrderId((selected) => selected || String(shipping.storeOrders[0]?.id ?? ""));
    } catch (caught) {
      const failure = caught instanceof Error ? caught.message : "Chargement impossible.";
      if (/jwt|token|authentication/i.test(failure)) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
        return;
      }
      setError(failure);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const current = readStoredSession();
    setSession(current);
    if (sessionHasRole(current, "ROLE_ADMIN")) void load(current!);
    else setLoading(false);
  }, []);

  const labelOrderIds = useMemo(() => new Set(data.labels.map((label) => label.storeOrder.id)), [data.labels]);
  const printableOrders = data.storeOrders.filter((order) => order.status !== "cancelled");
  const selectedOrder = printableOrders.find((order) => String(order.id) === storeOrderId);
  const needsPickupPoint = selectedOrder?.deliveryMode === "relay"
    || selectedOrder?.deliveryMode === "parcel_locker"
    || /mondial-relay|bpost/i.test(selectedOrder?.carrierCode ?? "");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || !storeOrderId) return;
    setBusy("new");
    setError("");
    setMessage("");
    try {
      await createShippingLabel({
        storeOrderId: Number(storeOrderId),
        format,
        copies,
        weightGrams,
        pickupPointId: needsPickupPoint ? pickupPointId : undefined,
        pickupPointName: needsPickupPoint ? pickupPointName : undefined,
        pickupPointStreet: needsPickupPoint ? pickupPointStreet : undefined,
        pickupPointPostalCode: needsPickupPoint ? pickupPointPostalCode : undefined,
        pickupPointCity: needsPickupPoint ? pickupPointCity : undefined,
        pickupPointCountryCode: needsPickupPoint ? pickupPointCountryCode : undefined
      }, session.token);
      setMessage("Demande d'etiquette ajoutee a la file d'impression.");
      await load(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Creation impossible.");
    } finally {
      setBusy(null);
    }
  };

  const generate = async (label: ShippingLabel) => {
    if (!session) return;
    setBusy(`generate-${label.id}`);
    setError("");
    setMessage("");
    try {
      await generateShippingLabel(label.id, session.token);
      setMessage("L'etiquette transporteur est prete a imprimer.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation impossible.");
    } finally {
      await load(session);
      setBusy(null);
    }
  };

  const markPrinted = async (label: ShippingLabel) => {
    if (!session) return;
    setBusy(String(label.id));
    setError("");
    try {
      await updateShippingLabel(label.id, { status: "printed" }, session.token);
      await load(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mise a jour impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
    return (
      <section className="container section cart-empty">
        <h1 className="page-title">Etiquettes d'expedition</h1>
        <p className="lead">Connectez-vous au backoffice pour gerer les impressions.</p>
        <Link className="button" href="/admin">Connexion admin</Link>
      </section>
    );
  }

  return (
    <section className="container section admin-shell">
      <div className="admin-header">
        <div>
          <span className="eyebrow">Back-office / Livraison</span>
          <h1>Impression des etiquettes</h1>
          <p>Une etiquette est rattachee a chaque expedition boutique et conserve son transporteur.</p>
        </div>
        <button className="button secondary admin-refresh" type="button" onClick={() => void load(session)} disabled={loading}>
          {loading ? <Loader2 className="spin" size={17} aria-hidden /> : <RefreshCcw size={17} aria-hidden />}
          Actualiser
        </button>
      </div>

      <nav className="admin-nav" aria-label="Navigation back-office">
        <Link href="/admin"><ArrowLeft size={17} aria-hidden />Dashboard</Link>
        <Link className="is-active" href="/admin/shipping-labels"><Printer size={17} aria-hidden />Etiquettes</Link>
      </nav>

      {message || error ? <div className={`admin-alert ${error ? "is-error" : "is-success"}`}>{error || message}</div> : null}

      <div className="shipping-admin-layout">
        <section className="admin-panel">
          <header className="admin-panel-header"><div><span className="admin-panel-icon"><Printer size={18} /></span><h2>Nouvelle impression</h2></div></header>
          <form className="shipping-label-form" onSubmit={submit}>
            <label className="field">
              <span>Expedition boutique</span>
              <select value={storeOrderId} onChange={(event) => setStoreOrderId(event.target.value)} required>
                <option value="">Selectionner...</option>
                {printableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.id} / {order.storeNameSnapshot} / {order.carrierNameSnapshot ?? "Transporteur a definir"}{labelOrderIds.has(order.id) ? " / deja imprimee" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-form-grid">
              <label className="field"><span>Format</span><select value={format} onChange={(event) => setFormat(event.target.value)}><option>A6</option><option>A4</option></select></label>
              <label className="field"><span>Copies</span><input type="number" min={1} max={20} value={copies} onChange={(event) => setCopies(Number(event.target.value))} /></label>
              <label className="field"><span>Poids (g)</span><input type="number" min={1} value={weightGrams} onChange={(event) => setWeightGrams(Number(event.target.value))} /></label>
            </div>
            {needsPickupPoint ? (
              <fieldset className="shipping-pickup-fields">
                <legend>Point de retrait requis par le transporteur</legend>
                <div className="admin-form-grid">
                  <label className="field"><span>Identifiant point</span><input value={pickupPointId} onChange={(event) => setPickupPointId(event.target.value)} required /></label>
                  <label className="field"><span>Nom du point</span><input value={pickupPointName} onChange={(event) => setPickupPointName(event.target.value)} required /></label>
                  <label className="field"><span>Pays</span><input maxLength={2} value={pickupPointCountryCode} onChange={(event) => setPickupPointCountryCode(event.target.value.toUpperCase())} required /></label>
                  <label className="field"><span>Adresse</span><input value={pickupPointStreet} onChange={(event) => setPickupPointStreet(event.target.value)} required /></label>
                  <label className="field"><span>Code postal</span><input value={pickupPointPostalCode} onChange={(event) => setPickupPointPostalCode(event.target.value)} required /></label>
                  <label className="field"><span>Ville</span><input value={pickupPointCity} onChange={(event) => setPickupPointCity(event.target.value)} required /></label>
                </div>
              </fieldset>
            ) : null}
            <button className="button admin-submit" type="submit" disabled={!storeOrderId || busy === "new"}>
              {busy === "new" ? <Loader2 className="spin" size={18} /> : <Printer size={18} />}
              Ajouter a la file
            </button>
          </form>
        </section>

        <section className="admin-panel shipping-label-list">
          <header className="admin-panel-header"><div><span className="admin-panel-icon"><PackageCheck size={18} /></span><h2>File d'impression</h2></div><span className="admin-panel-count">{data.labels.length}</span></header>
          {data.labels.length ? data.labels.map((label) => (
            <article className="shipping-label-row" key={label.id}>
              <div>
                <strong>#{label.storeOrder.id} / {label.storeOrder.storeNameSnapshot}</strong>
                <span>{label.carrierName} / {label.format} / {label.weightGrams} g / {money(label.storeOrder.totalCents, label.storeOrder.currency)}</span>
                {label.trackingNumber ? <span>Suivi : {label.trackingNumber}</span> : null}
                {label.errorMessage ? <span className="shipping-label-error">{label.errorMessage}</span> : null}
              </div>
              <span className={`shipping-status is-${label.status}`}>{labelStatus(label.status)}</span>
              {label.labelUrl ? <a className="admin-manage-button" target="_blank" rel="noreferrer" href={label.labelUrl}><ExternalLink size={14} />PDF</a> : null}
              {label.trackingUrl ? <a className="admin-manage-button" target="_blank" rel="noreferrer" href={label.trackingUrl}><ExternalLink size={14} />Suivi</a> : null}
              {label.status === "pending" || label.status === "error" ? (
                <button className="admin-manage-button" type="button" disabled={busy === `generate-${label.id}`} onClick={() => void generate(label)}>
                  {busy === `generate-${label.id}` ? <Loader2 className="spin" size={14} /> : <PackageCheck size={14} />}
                  Generer
                </button>
              ) : null}
              {label.status === "ready" ? (
                <button className="admin-manage-button" type="button" disabled={busy === String(label.id)} onClick={() => void markPrinted(label)}>
                  {busy === String(label.id) ? <Loader2 className="spin" size={14} /> : <Printer size={14} />}
                  Marquer imprimee
                </button>
              ) : null}
            </article>
          )) : <p className="admin-empty-inline">Aucune etiquette demandee.</p>}
        </section>
      </div>
    </section>
  );
}
