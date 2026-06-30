"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ImagePlus, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminTrip,
  deleteAdminTrip,
  fetchAdminTrips,
  slugify,
  updateAdminTrip,
  uploadAdminMedia,
  type AdminTripInput
} from "@/lib/admin-api";
import type { Box, Trip } from "@/lib/types";

type TripFormState = {
  title: string;
  slug: string;
  locale: string;
  excerpt: string;
  body: string;
  imagePath: string;
  published: boolean;
  publishedAt: string;
};

const initialTripForm: TripFormState = {
  title: "",
  slug: "",
  locale: "fr",
  excerpt: "",
  body: "",
  imagePath: "",
  published: false,
  publishedAt: ""
};

const LOCALES = ["fr", "nl", "en", "it", "es", "de"] as const;
const LOCALE_LABELS: Record<(typeof LOCALES)[number], string> = {
  fr: "Français",
  nl: "Nederlands",
  en: "English",
  it: "Italiano",
  es: "Español",
  de: "Deutsch"
};

export function TravelTripsPanel({ travelBox, token, onChange }: { travelBox: Box; token: string; onChange?: () => void }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripFormState>(initialTripForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const loadTrips = async () => {
    setError("");
    try {
      const next = await fetchAdminTrips(travelBox.id, token);
      setTrips(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les voyages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setFormOpen(false);
    setEditingTrip(null);
    setStatus("");
    setError("");
    void loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelBox.id]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const preview = URL.createObjectURL(imageFile);
    setImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [imageFile]);

  const updateTitle = (title: string) => {
    setForm((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  };

  const startCreate = () => {
    setEditingTrip(null);
    setForm(initialTripForm);
    setSlugTouched(false);
    setImageFile(null);
    setFormOpen(true);
  };

  const startEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setForm({
      title: trip.title,
      slug: trip.slug,
      locale: trip.locale ?? "fr",
      excerpt: trip.excerpt ?? "",
      body: trip.body ?? "",
      imagePath: trip.imagePath ?? "",
      published: trip.published ?? false,
      publishedAt: trip.publishedAt ? trip.publishedAt.slice(0, 10) : ""
    });
    setSlugTouched(true);
    setImageFile(null);
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const uploaded = imageFile ? await uploadAdminMedia(imageFile, token) : null;
      const input: AdminTripInput = {
        travelBoxId: travelBox.id,
        title: form.title,
        slug: form.slug,
        locale: form.locale || "fr",
        excerpt: form.excerpt,
        body: form.body,
        imagePath: uploaded?.url ?? form.imagePath,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined
      };
      if (editingTrip) {
        await updateAdminTrip(editingTrip.id, input, token);
        setStatus(`${form.title} est mis à jour.`);
      } else {
        await createAdminTrip(input, token);
        setStatus(`${form.title} est créé.`);
      }
      setFormOpen(false);
      setEditingTrip(null);
      setForm(initialTripForm);
      setImageFile(null);
      await loadTrips();
      onChange?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement du voyage impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (trip: Trip) => {
    if (!window.confirm(`Supprimer le voyage « ${trip.title} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminTrip(trip.id, token);
      setStatus(`${trip.title} est supprimé.`);
      await loadTrips();
      onChange?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel admin-store-management">
      <header className="admin-panel-header">
        <div>
          <span className="admin-panel-icon"><MapPin size={18} aria-hidden /></span>
          <h2>{travelBox.name}</h2>
        </div>
        <button className="button secondary admin-inline-action" type="button" onClick={startCreate}>
          <Plus size={16} aria-hidden />
          Ajouter un voyage
        </button>
      </header>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      {formOpen ? (
        <form className="admin-product-form admin-inline-form" onSubmit={submit}>
          <header className="admin-inline-form-header">
            <h3>{editingTrip ? `Modifier ${editingTrip.title}` : `Nouveau voyage pour ${travelBox.name}`}</h3>
            <button className="text-button" type="button" onClick={() => { setFormOpen(false); setEditingTrip(null); }}>Annuler</button>
          </header>
          <div className="admin-form-grid">
            <label className="field"><span>Titre</span><input value={form.title} onChange={(event) => updateTitle(event.target.value)} required placeholder="Week-end à Lisbonne" /></label>
            <label className="field"><span>Slug</span><input value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required /></label>
            <label className="field"><span>Langue</span>
              <select value={form.locale} onChange={(event) => setForm((current) => ({ ...current, locale: event.target.value }))} required>
                {LOCALES.map((code) => <option key={code} value={code}>{LOCALE_LABELS[code]}</option>)}
              </select>
            </label>
            <label className="field"><span>Date de publication</span><input type="date" value={form.publishedAt} onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))} /></label>
            <label className="field field-full"><span>Extrait</span><input value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Résumé court du carnet" /></label>
            <label className="field field-full"><span>Contenu</span><textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={6} required /></label>
          </div>
          <div className="admin-media-row">
            <label className="admin-uploader">
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={(event: ChangeEvent<HTMLInputElement>) => setImageFile(event.target.files?.[0] ?? null)} />
              <span className="admin-upload-preview">{imagePreview || form.imagePath ? <img src={imagePreview || form.imagePath} alt="" /> : <ImagePlus size={23} aria-hidden />}</span>
              <span>{imageFile ? imageFile.name : "Image"}</span>
            </label>
            <label className="field field-grow"><span>Image URL</span><input value={form.imagePath} onChange={(event) => setForm((current) => ({ ...current, imagePath: event.target.value }))} placeholder="https://..." /></label>
          </div>
          <label className="admin-toggle"><input type="checkbox" checked={form.published} onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))} /><span>Publié</span></label>
          <button className="button admin-submit" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
            {editingTrip ? "Enregistrer les modifications" : "Ajouter le voyage"}
          </button>
        </form>
      ) : null}

      <div className="admin-product-list">
        <h3>Voyages de la box</h3>
        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des voyages…</p>
          ) : trips.length ? trips.map((trip) => (
            <article className="admin-list-item" key={trip.id}>
              <span className="admin-thumb">{trip.imagePath ? <img src={trip.imagePath} alt="" /> : <MapPin size={17} aria-hidden />}</span>
              <div>
                <strong>{trip.title}</strong>
                <div className="admin-trip-meta">
                  <span className={`admin-badge ${trip.published ? "is-published" : "is-draft"}`}>{trip.published ? "Publié" : "Brouillon"}</span>
                  <span className="admin-trip-slug">{trip.slug}</span>
                </div>
              </div>
              <button className="admin-manage-button" type="button" onClick={() => startEdit(trip)}>
                <Pencil size={14} aria-hidden />
                Modifier
              </button>
              <button className="icon-button danger" type="button" onClick={() => void remove(trip)} disabled={busy} aria-label="Supprimer ce voyage">
                <Trash2 size={16} aria-hidden />
              </button>
            </article>
          )) : <p className="admin-empty-inline">Aucun voyage. Ajoutez le premier carnet de cette box.</p>}
        </div>
      </div>
    </section>
  );
}
