"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Building2,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  MapPin,
  PackagePlus,
  Pencil,
  Plane,
  Plus,
  RefreshCcw,
  Store,
  Tags,
  Trash2,
  UploadCloud
} from "lucide-react";
import {
  centsFromPrice,
  createAdminBox,
  createAdminProduct,
  fetchAdminData,
  slugify,
  updateAdminProduct,
  uploadAdminMedia,
  type AdminVariantInput
} from "@/lib/admin-api";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import { money } from "@/lib/format";
import type { Box, BoxType, Product } from "@/lib/types";
import { VendorPageCmsClient } from "@/components/VendorPageCmsClient";
import { NewsletterBlockCmsClient } from "@/components/NewsletterBlockCmsClient";
import { TravelTripsPanel } from "@/components/admin/TravelTripsPanel";

type AdminData = {
  businessBoxes: Box[];
  storeBoxes: Box[];
  blogBoxes: Box[];
  travelBoxes: Box[];
  products: Product[];
};

type BoxFormState = {
  type: BoxType;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoPath: string;
  coverPath: string;
  active: boolean;
  companyName: string;
  website: string;
  businessBoxId: string;
  storeBoxId: string;
};

type ProductFormState = {
  storeBoxId: string;
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

type AdminSection = "overview" | BoxType | "vendor-page" | "newsletter";

const emptyData: AdminData = {
  businessBoxes: [],
  storeBoxes: [],
  blogBoxes: [],
  travelBoxes: [],
  products: []
};

const initialBoxForm: BoxFormState = {
  type: "store",
  name: "",
  slug: "",
  tagline: "",
  description: "",
  logoPath: "",
  coverPath: "",
  active: true,
  companyName: "",
  website: "",
  businessBoxId: "",
  storeBoxId: ""
};

const initialProductForm: ProductFormState = {
  storeBoxId: "",
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

function boxFormForSection(section: AdminSection): BoxFormState {
  const type: BoxType =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
  return { ...initialBoxForm, type };
}

function sectionLabel(section: BoxType) {
  return section === "store"
    ? "Store Box"
    : section === "business"
      ? "Business Box"
      : section === "travel"
        ? "Travel Box"
        : "Blog Box";
}

export function AdminDashboardClient({ section = "overview" }: { section?: AdminSection }) {
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [data, setData] = useState<AdminData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"box" | "product" | "refresh" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [boxForm, setBoxForm] = useState<BoxFormState>(() => boxFormForSection(section));
  const [boxFormOpen, setBoxFormOpen] = useState(false);
  const [boxSlugTouched, setBoxSlugTouched] = useState(false);
  const [boxLogoFile, setBoxLogoFile] = useState<File | null>(null);
  const [boxLogoPreview, setBoxLogoPreview] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(initialProductForm);
  const [productSlugTouched, setProductSlugTouched] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([initialVariant()]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedTravelId, setSelectedTravelId] = useState<number | null>(null);

  const totalVariants = data.products.reduce((total, product) => total + product.variants.length, 0);
  const totalTrips = data.travelBoxes.reduce((total, box) => total + (box.trips?.length ?? 0), 0);

  const boxSection: BoxType =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
  const listedBoxes = section === "store"
    ? data.storeBoxes
    : section === "business"
      ? data.businessBoxes
      : section === "blog"
        ? data.blogBoxes
        : section === "travel"
          ? data.travelBoxes
          : [];
  const selectedTravel = data.travelBoxes.find((box) => box.id === selectedTravelId) ?? null;
  const selectedStore = data.storeBoxes.find((box) => box.id === selectedStoreId) ?? null;
  const selectedProducts = useMemo(
    () => selectedStore ? data.products.filter((product) => product.storeBox?.id === selectedStore.id) : [],
    [data.products, selectedStore]
  );
  const selectedVariants = selectedProducts.reduce((total, product) => total + product.variants.length, 0);
  const selectedStock = selectedProducts.reduce(
    (total, product) => total + product.variants.reduce((quantity, variant) => quantity + Math.max(0, variant.stock), 0),
    0
  );

  const loadData = async (mode: "initial" | "refresh" = "refresh") => {
    if (mode === "refresh") setBusy("refresh");
    setError("");
    try {
      const nextData = await fetchAdminData();
      setData(nextData);
      setProductForm((current) => ({
        ...current,
        storeBoxId: current.storeBoxId || String(nextData.storeBoxes[0]?.id ?? "")
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible de charger le dashboard.");
    } finally {
      setLoading(false);
      setBusy(null);
    }
  };

  useEffect(() => {
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    setSession(stored);
    if (isAdminSession(stored)) {
      void loadData("initial");
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setBoxForm(boxFormForSection(section));
    setBoxFormOpen(false);
    setSelectedStoreId(null);
    setSelectedTravelId(null);
    setProductFormOpen(false);
    setEditingProduct(null);
  }, [section]);

  useEffect(() => {
    if (!boxLogoFile) {
      setBoxLogoPreview("");
      return;
    }
    const preview = URL.createObjectURL(boxLogoFile);
    setBoxLogoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [boxLogoFile]);

  useEffect(() => {
    if (!productImageFile) {
      setProductImagePreview("");
      return;
    }
    const preview = URL.createObjectURL(productImageFile);
    setProductImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [productImageFile]);

  const updateBoxName = (name: string) => {
    setBoxForm((current) => ({
      ...current,
      name,
      companyName: current.companyName || name,
      slug: boxSlugTouched ? current.slug : slugify(name)
    }));
  };

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

  const chooseBoxLogo = (event: ChangeEvent<HTMLInputElement>) => {
    setBoxLogoFile(event.target.files?.[0] ?? null);
  };

  const chooseProductImage = (event: ChangeEvent<HTMLInputElement>) => {
    setProductImageFile(event.target.files?.[0] ?? null);
  };

  const submitBox = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.token) return;
    setBusy("box");
    setStatus("");
    setError("");
    try {
      const uploaded = boxLogoFile ? await uploadAdminMedia(boxLogoFile, session.token) : null;
      await createAdminBox({
        ...boxForm,
        logoPath: uploaded?.url ?? boxForm.logoPath,
        businessBoxId: boxForm.businessBoxId ? Number(boxForm.businessBoxId) : undefined,
        storeBoxId: boxForm.storeBoxId ? Number(boxForm.storeBoxId) : undefined
      }, session.token);
      setStatus(`${boxForm.name} est créée.`);
      setBoxForm(boxFormForSection(section));
      setBoxSlugTouched(false);
      setBoxLogoFile(null);
      setBoxFormOpen(false);
      await loadData("initial");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création de box impossible.");
    } finally {
      setBusy(null);
    }
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

  const manageStore = (box: Box) => {
    setSelectedStoreId(box.id);
    setProductFormOpen(false);
    setProductForm({ ...initialProductForm, storeBoxId: String(box.id) });
    setProductSlugTouched(false);
    setProductImageFile(null);
    setVariants([initialVariant()]);
    setEditingProduct(null);
  };

  const startProduct = () => {
    if (!selectedStore) return;
    setProductForm({ ...initialProductForm, storeBoxId: String(selectedStore.id) });
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
      storeBoxId: String(selectedStore?.id ?? product.storeBox?.id ?? ""),
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
    if (!session?.token || !productForm.storeBoxId) return;
    setBusy("product");
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
        storeBoxId: Number(productForm.storeBoxId),
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
      setProductForm({ ...initialProductForm, storeBoxId: productForm.storeBoxId });
      setProductSlugTouched(false);
      setProductImageFile(null);
      setVariants([initialVariant()]);
      setProductFormOpen(false);
      setEditingProduct(null);
      await loadData("initial");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enregistrement du produit impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="container admin-loading">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement du dashboard</span>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office</p>
          <h1>
            {section === "overview"
              ? "Dashboard Tinned"
              : section === "vendor-page"
                ? "Page Fournisseurs"
                : section === "newsletter"
                  ? "Newsletter"
                  : sectionLabel(boxSection)}
          </h1>
          <p>
            {section === "overview"
              ? "Pilotez chaque espace depuis sa page dédiée."
              : section === "vendor-page"
                ? "Contenu de la page publique /vendre."
                : section === "newsletter"
                  ? "Bloc d'inscription email affiché sur la home page."
                  : `Gérez vos ${sectionLabel(section as BoxType)} et leur contenu.`}
          </p>
        </div>
        <button className="button secondary admin-refresh" type="button" onClick={() => void loadData()} disabled={busy === "refresh"}>
          {busy === "refresh" ? <Loader2 className="spin" size={17} aria-hidden /> : <RefreshCcw size={17} aria-hidden />}
          Actualiser
        </button>
      </div>

      <div className="admin-kpis" aria-label="Indicateurs catalogue">
        <article>
          <Building2 size={21} aria-hidden />
          <span>Business Box</span>
          <strong>{data.businessBoxes.length}</strong>
        </article>
        <article>
          <Store size={21} aria-hidden />
          <span>Store Box</span>
          <strong>{data.storeBoxes.length}</strong>
        </article>
        <article>
          <Boxes size={21} aria-hidden />
          <span>Blog Box</span>
          <strong>{data.blogBoxes.length}</strong>
        </article>
        <article>
          <Plane size={21} aria-hidden />
          <span>Travel Box</span>
          <strong>{data.travelBoxes.length}</strong>
        </article>
        <article>
          <Tags size={21} aria-hidden />
          <span>Variantes</span>
          <strong>{totalVariants}</strong>
        </article>
        <article>
          <MapPin size={21} aria-hidden />
          <span>Voyages</span>
          <strong>{totalTrips}</strong>
        </article>
      </div>

      {status || error ? (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">
          {error || status}
        </div>
      ) : null}

      {section === "newsletter" ? (
        <NewsletterBlockCmsClient />
      ) : section === "vendor-page" ? (
        <VendorPageCmsClient />
      ) : section === "overview" ? (
        <>
          <div className="admin-section-head">
            <p className="admin-section-eyebrow">Catalogue</p>
            <h2>Vos espaces</h2>
          </div>
          <div className="admin-overview-lists">
            {([
              { title: "Store Box", boxes: data.storeBoxes, href: "/admin/store-box", icon: <Store size={18} aria-hidden /> },
              { title: "Business Box", boxes: data.businessBoxes, href: "/admin/business-box", icon: <Building2 size={18} aria-hidden /> },
              { title: "Blog Box", boxes: data.blogBoxes, href: "/admin/blog-box", icon: <Boxes size={18} aria-hidden /> },
              { title: "Travel Box", boxes: data.travelBoxes, href: "/admin/travel-box", icon: <Plane size={18} aria-hidden /> }
            ] as const).map((group) => (
              <section className="admin-panel admin-overview-panel" key={group.title}>
                <header className="admin-panel-header">
                  <div>
                    <span className="admin-panel-icon">{group.icon}</span>
                    <h2>{group.title}</h2>
                  </div>
                  <Link className="admin-overview-link" href={group.href}>Gérer</Link>
                </header>
                <div className="admin-list">
                  {group.boxes.length ? group.boxes.map((box) => (
                    <article className="admin-list-item" key={box.id}>
                      <span className="admin-thumb">{box.logoPath ? <img src={box.logoPath} alt="" /> : group.icon}</span>
                      <div>
                        <strong>{box.name}</strong>
                        <span>{box.slug}</span>
                      </div>
                    </article>
                  )) : <p className="admin-empty-inline">Aucune {group.title} pour le moment.</p>}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
      <div className={`admin-catalog-layout ${(section === "store" && selectedStore) || (section === "travel" && selectedTravel) ? "" : "is-single"}`}>
        <section className="admin-panel admin-box-catalog">
          <header className="admin-panel-header">
            <div>
              <span className="admin-panel-icon"><LayoutDashboard size={18} aria-hidden /></span>
              <h2>{sectionLabel(boxSection)}</h2>
            </div>
            <button className="button secondary admin-inline-action" type="button" onClick={() => setBoxFormOpen((open) => !open)}>
              <Plus size={16} aria-hidden />
              {boxFormOpen ? "Fermer" : `Ajouter une ${sectionLabel(boxSection)}`}
            </button>
          </header>
          {boxFormOpen ? (
            <form className="admin-box-form admin-inline-form" onSubmit={submitBox}>
              <header className="admin-inline-form-header">
                <h3>Nouvelle {sectionLabel(boxSection)}</h3>
                <button className="text-button" type="button" onClick={() => setBoxFormOpen(false)}>Annuler</button>
              </header>
              <div className="admin-form-grid">
                <label className="field"><span>Nom</span><input value={boxForm.name} onChange={(event) => updateBoxName(event.target.value)} required placeholder="Bellissimo" /></label>
                <label className="field"><span>Slug</span><input value={boxForm.slug} onChange={(event) => { setBoxSlugTouched(true); setBoxForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} required placeholder="bellissimo" /></label>
                <label className="field field-full"><span>Signature</span><input value={boxForm.tagline} onChange={(event) => setBoxForm((current) => ({ ...current, tagline: event.target.value }))} placeholder="Céramiques, table et objets à vivre" /></label>
                <label className="field field-full"><span>Description</span><textarea value={boxForm.description} onChange={(event) => setBoxForm((current) => ({ ...current, description: event.target.value }))} rows={3} /></label>
              </div>
              <div className="admin-media-row">
                <label className="admin-uploader">
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" onChange={chooseBoxLogo} />
                  <span className="admin-upload-preview">{boxLogoPreview || boxForm.logoPath ? <img src={boxLogoPreview || boxForm.logoPath} alt="" /> : <ImagePlus size={23} aria-hidden />}</span>
                  <span>{fileLabel(boxLogoFile, "Logo")}</span>
                </label>
                <label className="field"><span>Logo URL</span><input value={boxForm.logoPath} onChange={(event) => setBoxForm((current) => ({ ...current, logoPath: event.target.value }))} placeholder="https://..." /></label>
                <label className="field"><span>Cover URL</span><input value={boxForm.coverPath} onChange={(event) => setBoxForm((current) => ({ ...current, coverPath: event.target.value }))} placeholder="https://..." /></label>
              </div>
              {boxForm.type !== "business" ? (
                <label className="field">
                  <span>Business Box liée</span>
                  <select value={boxForm.businessBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, businessBoxId: event.target.value }))}>
                    <option value="">Aucune</option>
                    {data.businessBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
                  </select>
                </label>
              ) : (
                <div className="admin-form-grid">
                  <label className="field"><span>Nom légal</span><input value={boxForm.companyName} onChange={(event) => setBoxForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
                  <label className="field"><span>Site web</span><input value={boxForm.website} onChange={(event) => setBoxForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://..." /></label>
                </div>
              )}
              {boxForm.type === "blog" ? (
                <label className="field">
                  <span>Store Box liée</span>
                  <select value={boxForm.storeBoxId} onChange={(event) => setBoxForm((current) => ({ ...current, storeBoxId: event.target.value }))}>
                    <option value="">Aucune</option>
                    {data.storeBoxes.map((box) => <option key={box.id} value={box.id}>{box.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="admin-toggle"><input type="checkbox" checked={boxForm.active} onChange={(event) => setBoxForm((current) => ({ ...current, active: event.target.checked }))} /><span>Visible sur le site</span></label>
              <button className="button admin-submit" type="submit" disabled={busy === "box"}>
                {busy === "box" ? <Loader2 className="spin" size={18} aria-hidden /> : <Plus size={18} aria-hidden />}
                Créer la box
              </button>
            </form>
          ) : null}
          <div className="admin-list">
            {listedBoxes.length ? listedBoxes.map((box) => (
              <article className="admin-list-item" key={`${box.type}-${box.id}`}>
                <span className="admin-thumb">{box.logoPath ? <img src={box.logoPath} alt="" /> : <Boxes size={17} aria-hidden />}</span>
                <div>
                  <strong>{box.name}</strong>
                  <span>{box.type === "store" ? "Store Box" : box.type === "business" ? "Business Box" : box.type === "travel" ? "Travel Box" : "Blog Box"} / {box.slug}</span>
                </div>
                <a href={`/admin/landing/${box.id}`} style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>Landing</a>
                {section === "store" ? (
                  <button className={`admin-manage-button ${selectedStoreId === box.id ? "is-active" : ""}`} type="button" onClick={() => manageStore(box)}>
                    Gérer
                  </button>
                ) : section === "travel" ? (
                  <button className={`admin-manage-button ${selectedTravelId === box.id ? "is-active" : ""}`} type="button" onClick={() => setSelectedTravelId(box.id)}>
                    Gérer
                  </button>
                ) : null}
              </article>
            )) : <p className="admin-empty-inline">Aucune {sectionLabel(boxSection)} pour le moment.</p>}
          </div>
        </section>

        {section === "store" && selectedStore ? (
        <section className="admin-panel admin-store-management">
          <header className="admin-panel-header">
            <div>
              <span className="admin-panel-icon"><Store size={18} aria-hidden /></span>
              <h2>{selectedStore.name}</h2>
            </div>
            <button className="button secondary admin-inline-action" type="button" onClick={startProduct}>
              <PackagePlus size={16} aria-hidden />
              Ajouter un produit
            </button>
          </header>
            <>
              <div className="admin-store-overview">
                <div className="admin-store-identity">
                  <span className="admin-store-logo">{selectedStore.logoPath ? <img src={selectedStore.logoPath} alt="" /> : <Store size={22} aria-hidden />}</span>
                  <div><strong>{selectedStore.name}</strong><span>{selectedStore.tagline ?? selectedStore.slug}</span></div>
                </div>
                <div className="admin-store-stats">
                  <article><strong>{selectedProducts.length}</strong><span>Produits</span></article>
                  <article><strong>{selectedVariants}</strong><span>Références</span></article>
                  <article><strong>{selectedStock}</strong><span>En stock</span></article>
                </div>
              </div>

              {productFormOpen ? (
                <form className="admin-product-form admin-inline-form" onSubmit={submitProduct}>
                  <header className="admin-inline-form-header">
                    <h3>{editingProduct ? `Modifier ${editingProduct.name}` : `Nouveau produit pour ${selectedStore.name}`}</h3>
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
                  <button className="button admin-submit" type="submit" disabled={busy === "product"}>
                    {busy === "product" ? <Loader2 className="spin" size={18} aria-hidden /> : <PackagePlus size={18} aria-hidden />}
                    {editingProduct ? "Enregistrer les modifications" : "Ajouter le produit"}
                  </button>
                </form>
              ) : null}

              <div className="admin-product-list">
                <h3>Produits de la boutique</h3>
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
            </>
        </section>
        ) : null}

        {section === "travel" && selectedTravel && session?.token ? (
          <TravelTripsPanel
            travelBox={selectedTravel}
            token={session.token}
            onChange={() => void loadData("initial")}
          />
        ) : null}
      </div>
      )}
    </section>
  );
}
