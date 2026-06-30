"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { FileText, ImagePlus, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createAdminArticle,
  deleteAdminArticle,
  fetchAdminArticles,
  slugify,
  updateAdminArticle,
  uploadAdminMedia,
  type AdminArticleInput
} from "@/lib/admin-api";
import type { Article, Box } from "@/lib/types";

type ArticleFormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imagePath: string;
  published: boolean;
  publishedAt: string;
};

const initialArticleForm: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  imagePath: "",
  published: false,
  publishedAt: ""
};

export function BlogArticlesPanel({ blogBox, token, onChange }: { blogBox: Box; token: string; onChange?: () => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [form, setForm] = useState<ArticleFormState>(initialArticleForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const loadArticles = async () => {
    setError("");
    try {
      const next = await fetchAdminArticles(blogBox.id, token);
      setArticles(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger les articles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setFormOpen(false);
    setEditingArticle(null);
    setStatus("");
    setError("");
    void loadArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogBox.id]);

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
    setEditingArticle(null);
    setForm(initialArticleForm);
    setSlugTouched(false);
    setImageFile(null);
    setFormOpen(true);
  };

  const startEdit = (article: Article) => {
    setEditingArticle(article);
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt ?? "",
      body: article.body ?? "",
      imagePath: article.imagePath ?? "",
      published: article.published ?? false,
      publishedAt: article.publishedAt ? article.publishedAt.slice(0, 10) : ""
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
      const input: AdminArticleInput = {
        blogBoxId: blogBox.id,
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        body: form.body,
        imagePath: uploaded?.url ?? form.imagePath,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined
      };
      if (editingArticle) {
        await updateAdminArticle(editingArticle.id, input, token);
        setStatus(`${form.title} est mis à jour.`);
      } else {
        await createAdminArticle(input, token);
        setStatus(`${form.title} est créé.`);
      }
      setFormOpen(false);
      setEditingArticle(null);
      setForm(initialArticleForm);
      setImageFile(null);
      await loadArticles();
      onChange?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement de l'article impossible.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (article: Article) => {
    if (!window.confirm(`Supprimer l'article « ${article.title} » ? Cette action est définitive.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteAdminArticle(article.id, token);
      setStatus(`${article.title} est supprimé.`);
      await loadArticles();
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
          <span className="admin-panel-icon"><FileText size={18} aria-hidden /></span>
          <h2>Articles de {blogBox.name}</h2>
        </div>
        <button className="button secondary admin-inline-action" type="button" onClick={startCreate}>
          <Plus size={16} aria-hidden />
          Ajouter un article
        </button>
      </header>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      {formOpen ? (
        <form className="admin-product-form admin-inline-form" onSubmit={submit}>
          <header className="admin-inline-form-header">
            <h3>{editingArticle ? `Modifier ${editingArticle.title}` : `Nouvel article pour ${blogBox.name}`}</h3>
            <button className="text-button" type="button" onClick={() => { setFormOpen(false); setEditingArticle(null); }}>Annuler</button>
          </header>
          <div className="admin-form-grid">
            <label className="field"><span>Titre</span><input value={form.title} onChange={(event) => updateTitle(event.target.value)} required placeholder="Notre sélection de l'été" /></label>
            <label className="field"><span>Slug</span><input value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required /></label>
            <label className="field"><span>Date de publication</span><input type="date" value={form.publishedAt} onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))} /></label>
            <label className="field field-full"><span>Extrait</span><input value={form.excerpt} onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))} placeholder="Résumé court de l'article" /></label>
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
            {editingArticle ? "Enregistrer les modifications" : "Ajouter l'article"}
          </button>
        </form>
      ) : null}

      <div className="admin-product-list">
        <h3>Articles de la box</h3>
        <div className="admin-list">
          {loading ? (
            <p className="admin-empty-inline">Chargement des articles…</p>
          ) : articles.length ? articles.map((article) => (
            <article className="admin-list-item" key={article.id}>
              <span className="admin-thumb">{article.imagePath ? <img src={article.imagePath} alt="" /> : <FileText size={17} aria-hidden />}</span>
              <div>
                <strong>{article.title}</strong>
                <div className="admin-trip-meta">
                  <span className={`admin-badge ${article.published ? "is-published" : "is-draft"}`}>{article.published ? "Publié" : "Brouillon"}</span>
                  <span className="admin-trip-slug">{article.slug}</span>
                </div>
              </div>
              <button className="admin-manage-button" type="button" onClick={() => startEdit(article)}>
                <Pencil size={14} aria-hidden />
                Modifier
              </button>
              <button className="icon-button danger" type="button" onClick={() => void remove(article)} disabled={busy} aria-label="Supprimer cet article">
                <Trash2 size={16} aria-hidden />
              </button>
            </article>
          )) : <p className="admin-empty-inline">Aucun article. Ajoutez le premier article de cette box.</p>}
        </div>
      </div>
    </section>
  );
}
