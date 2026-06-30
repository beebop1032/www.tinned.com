"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, PackagePlus, Pencil, Plus, Store, Trash2, UploadCloud } from "lucide-react";
import {
  centsFromPrice,
  createAdminProduct,
  fetchAdminData,
  slugify,
  updateAdminProduct,
  uploadAdminMedia,
  type AdminVariantInput
} from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Box, Product } from "@/lib/types";

type ProductFormState = {
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  currency: string;
  imagePath: string;
};

type VariantDraft = {
  id?: number;
  sku: string;
  price: string;
  stock: string;
  colorLabel: string;
  hexColor: string;
  sizeLabel: string;
  imagePath: string;
};

const initialProductForm: ProductFormState = {
  name: "",
  slug: "",
  description: "",
  basePrice: "29,00",
  currency: "EUR",
  imagePath: ""
};

function initialVariant(sku = "", price = initialProductForm.basePrice, id?: number): VariantDraft {
  return {
    id,
    sku,
    price,
    stock: "10",
    colorLabel: "",
    hexColor: "#02a29d",
    sizeLabel: "",
    imagePath: ""
  };
}

function isAdminSession(session: TinnedSession | null) {
  return sessionHasRole(session, "ROLE_ADMIN");
}

function fileLabel(file: File | null, fallback: string) {
  return file ? file.name : fallback;
}

export function StoreBoxDetailClient({ storeBoxId }: { storeBoxId: number }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [storeBox, setStoreBox] = useState<Box | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(initialProductForm);
  const [productSlugTouched, setProductSlugTouched] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([initialVariant()]);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const selectedVariants = products.reduce((total, product) => total + product.variants.length, 0);
  const selectedStock = products.reduce(
    (total, product) => total + product.variants.reduce((quantity, variant) => quantity + Math.max(0, variant.stock), 0),
    0
  );

  const loadData = async () => {
    setError("");
    try {
      const data = await fetchAdminData();
      const box = data.storeBoxes.find((candidate) => candidate.id === storeBoxId) ?? null;
      setStoreBox(box);
      setProducts(data.products.filter((product) => product.storeBox?.id === storeBoxId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger la boutique.");
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
  }, [storeBoxId]);

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreview("");
      return;
    }
    const preview = URL.createObjectURL(productImageFile);
    setProductImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [productImageFile]);

  const selectedProducts = useMemo(() => products, [products]);

  const updateProductName = (name: string) => {
    const nextSlug = slugify(name);
    setProductForm((current) => ({
      ...current,
      name,
      slug: productSlugTouched ? current.slug : nextSlug
    }));
    setVariants((current) => current.map((variant, index) => index === 0 && !variant.sku ? { ...variant, sku: `${nextSlug.toUpperCase()}-001` } : variant));
  };

  const updateProductPrice = (price: string) => {
    setProductForm((current) => ({ ...current, basePrice: price }));
    setVariants((current) => current.length === 1
      ? current.map((variant) => ({ ...variant, price }))
      : current);
  };

  const chooseProductImage = (event: ChangeEvent<HTMLInputElement>) => {
    setProductImageFile(event.target.files?.[0] ?? null);
  };

  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((variant, currentIndex) => currentIndex === index ? { ...variant, ...patch } : variant));
  };

  const addVariant = () => {
    const base = productForm.slug ? productForm.slug.toUpperCase() : "SKU";
    setVariants((current) => [...current, initialVariant(`${base}-${String(current.length + 1).padStart(3, "0")}`, productForm.basePrice)]);
  };

  const removeVariant = (index: number) => {
    setVariants((current) => current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index));
  };

  const startProduct = () => {
    setProductForm(initialProductForm);
    setProductSlugTouched(false);
    setProductImageFile(null);
    setVariants([initialVariant()]);
    setEditingProduct(null);
    setProductFormOpen(true);
  };

  const editProduct = (product: Product) => {
    const drafts = product.variants.map((variant) => {
      const color = variant.attributeValues.find((value) => value.attribute?.code === "color");
      const size = variant.attributeValues.find((value) => value.attribute?.code === "size");
      return {
        id: variant.id,
        sku: variant.sku,
        price: (variant.priceCents / 100).toFixed(2).replace(".", ","),
        stock: String(variant.stock),
        colorLabel: color?.label ?? "",
        hexColor: color?.hexColor ?? "#02a29d",
        sizeLabel: size?.label ?? "",
        imagePath: variant.images?.[0] ?? ""
      };
    });

    setEditingProduct(product);
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      basePrice: (product.basePriceCents / 100).toFixed(2).replace(".", ","),
      currency: product.currency,
      imagePath: product.images[0] ?? ""
    });
    setProductSlugTouched(true);
    setProductImageFile(null);
    setVariants(drafts.length ? drafts : [initialVariant("", (product.basePriceCents / 100).toFixed(2).replace(".", ","))]);
    setProductFormOpen(true);
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.token || !storeBox) return;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const uploaded = productImageFile ? await uploadAdminMedia(productImageFile, session.token) : null;
      const imagePath = uploaded?.url ?? productForm.imagePath;
      const cleanVariants: AdminVariantInput[] = variants.map((variant, index) => ({
        id: variant.id,
        sku: variant.sku.trim() || `${productForm.slug.toUpperCase()}-${String(index + 1).padStart(3, "0")}`,
        priceCents: centsFromPrice(variant.price),
        stock: Math.max(0, Number.parseInt(variant.stock, 10) || 0),
        colorLabel: variant.colorLabel,
        hexColor: variant.hexColor,
        sizeLabel: variant.sizeLabel,
        imagePath: variant.imagePath
      }));

      const productInput = {
        storeBoxId: storeBox.id,
        name: productForm.name,
        slug: productForm.slug,
        description: productForm.description,
        basePriceCents: cleanVariants.length > 1
          ? Math.min(...cleanVariants.map((variant) => variant.priceCents))
          : centsFromPrice(productForm.basePrice),
        currency: productForm.currency || "EUR",
        imagePath,
        variants: cleanVariants
      };

      if (editingProduct) {
        await updateAdminProduct(productInput, editingProduct, session.token);
      } else {
        await createAdminProduct(productInput, session.token);
      }

      setStatus(editingProduct ? `${productForm.name} est mis à jour.` : `${productForm.name} est ajouté au catalogue.`);
      setProductForm(initialProductForm);
      setProductSlugTouched(false);
      setProductImageFile(null);
      setVariants([initialVariant()]);
      setProductFormOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement du produit impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement de la boutique</span>
      </section>
    );
  }

  if (denied) {
    return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  }

  if (!storeBox) {
    return (
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Back-office</p>
            <h1>Store Box introuvable</h1>
            <p>Cette boutique n'existe pas ou a été supprimée.</p>
          </div>
          <Link className="button secondary admin-refresh" href="/admin/store-box">
            <ArrowLeft size={17} aria-hidden />
            Retour aux Store Box
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Store Box</p>
          <h1>{storeBox.name}</h1>
          <p>{storeBox.tagline ?? "Gérez les produits et références de cette boutique."}</p>
        </div>
        <Link className="button secondary admin-refresh" href="/admin/store-box">
          <ArrowLeft size={17} aria-hidden />
          Retour aux Store Box
        </Link>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">{error || status}</div>
      ) : null}

      <div className="admin-store-overview">
        <div className="admin-store-identity">
          <span className="admin-store-logo">{storeBox.logoPath ? <img src={storeBox.logoPath} alt="" /> : <Store size={22} aria-hidden />}</span>
          <div><strong>{storeBox.name}</strong><span>{storeBox.tagline ?? storeBox.slug}</span></div>
        </div>
        <div className="admin-store-stats">
          <article><strong>{selectedProducts.length}</strong><span>Produits</span></article>
          <article><strong>{selectedVariants}</strong><span>Références</span></article>
          <article><strong>{selectedStock}</strong><span>En stock</span></article>
        </div>
      </div>

      <section className="admin-panel admin-store-management">
        <header className="admin-panel-header">
          <div>
            <span className="admin-panel-icon"><Store size={18} aria-hidden /></span>
            <h2>Produits de la boutique</h2>
          </div>
          <button className="button secondary admin-inline-action" type="button" onClick={startProduct}>
            <PackagePlus size={16} aria-hidden />
            Ajouter un produit
          </button>
        </header>

        {productFormOpen ? (
          <form className="admin-product-form admin-inline-form" onSubmit={submitProduct}>
            <header className="admin-inline-form-header">
              <h3>{editingProduct ? `Modifier ${editingProduct.name}` : `Nouveau produit pour ${storeBox.name}`}</h3>
              <button className="text-button" type="button" onClick={() => { setProductFormOpen(false); setEditingProduct(null); }}>Annuler</button>
            </header>
            <div className="admin-form-grid">
              <label className="field"><span>Nom produit</span><input value={productForm.name} onChange={(event) => updateProductName(event.target.value)} required placeholder="Assiette plate" /></label>
              <label className="field"><span>Slug</span><input value={productForm.slug} onChange={(event) => { setProductSlugTouched(true); setProductForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required /></label>
              <label className="field"><span>Prix</span><input value={productForm.basePrice} onChange={(event) => updateProductPrice(event.target.value)} required inputMode="decimal" /></label>
              <label className="field"><span>Devise</span><input value={productForm.currency} onChange={(event) => setProductForm((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))} required /></label>
              <label className="field field-full"><span>Description</span><textarea value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
            </div>
            <div className="admin-media-row">
              <label className="admin-uploader">
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={chooseProductImage} />
                <span className="admin-upload-preview">{productImagePreview || productForm.imagePath ? <img src={productImagePreview || productForm.imagePath} alt="" /> : <UploadCloud size={23} aria-hidden />}</span>
                <span>{fileLabel(productImageFile, "Image produit")}</span>
              </label>
              <label className="field field-grow"><span>Image URL</span><input value={productForm.imagePath} onChange={(event) => setProductForm((current) => ({ ...current, imagePath: event.target.value }))} placeholder="https://..." /></label>
            </div>
            <div className="admin-variants">
              <div className="admin-variants-head">
                <div><h3>{variants.length > 1 ? "Options du produit" : "Stock et référence"}</h3><p>{variants.length > 1 ? "Le client choisira une option avant l'achat." : "Produit achetable directement, sans choix d'option."}</p></div>
                <button className="button secondary" type="button" onClick={addVariant}><Plus size={16} aria-hidden />Ajouter des options</button>
              </div>
              {variants.length === 1 ? (
                <div className="admin-single-reference">
                  <label className="field"><span>Référence / SKU</span><input value={variants[0].sku} onChange={(event) => updateVariant(0, { sku: event.target.value.toUpperCase() })} required /></label>
                  <label className="field"><span>Stock disponible</span><input value={variants[0].stock} onChange={(event) => updateVariant(0, { stock: event.target.value })} inputMode="numeric" required /></label>
                  <p>Le prix de la référence suivra automatiquement le prix du produit.</p>
                </div>
              ) : variants.map((variant, index) => (
                <div className="admin-variant-row" key={index}>
                  <label className="field"><span>SKU</span><input value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value.toUpperCase() })} required /></label>
                  <label className="field"><span>Prix</span><input value={variant.price} onChange={(event) => updateVariant(index, { price: event.target.value })} inputMode="decimal" required /></label>
                  <label className="field"><span>Stock</span><input value={variant.stock} onChange={(event) => updateVariant(index, { stock: event.target.value })} inputMode="numeric" required /></label>
                  <label className="field"><span>Couleur</span><input value={variant.colorLabel} onChange={(event) => updateVariant(index, { colorLabel: event.target.value })} placeholder="Ivoire" /></label>
                  <label className="field admin-color-field"><span>Code</span><input type="color" value={variant.hexColor} onChange={(event) => updateVariant(index, { hexColor: event.target.value })} /></label>
                  <label className="field"><span>Option</span><input value={variant.sizeLabel} onChange={(event) => updateVariant(index, { sizeLabel: event.target.value })} placeholder="S, M, 30 cm..." /></label>
                  <button className="icon-button danger" type="button" onClick={() => removeVariant(index)} disabled={variants.length === 1 || Boolean(variant.id)} aria-label="Supprimer cette variante" title={variant.id ? "Une référence existante ne peut pas être supprimée ici." : undefined}><Trash2 size={16} aria-hidden /></button>
                </div>
              ))}
            </div>
            <button className="button admin-submit" type="submit" disabled={busy}>
              {busy ? <Loader2 className="spin" size={18} aria-hidden /> : <PackagePlus size={18} aria-hidden />}
              {editingProduct ? "Enregistrer les modifications" : "Ajouter le produit"}
            </button>
          </form>
        ) : null}

        <div className="admin-product-list">
          <div className="admin-list">
            {selectedProducts.length ? selectedProducts.map((product) => (
              <article className="admin-list-item" key={product.id}>
                <span className="admin-thumb">{product.images[0] ? <img src={product.images[0]} alt="" /> : <PackagePlus size={17} aria-hidden />}</span>
                <div>
                  <strong>{product.name}</strong>
                  <span>{money(product.basePriceCents, product.currency)} / {product.variants.length} référence{product.variants.length > 1 ? "s" : ""}</span>
                </div>
                <button className="admin-manage-button" type="button" onClick={() => editProduct(product)}>
                  <Pencil size={14} aria-hidden />
                  Modifier
                </button>
              </article>
            )) : <p className="admin-empty-inline">Aucun produit. Ajoutez le premier produit de cette boutique.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
