"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { fetchMyProducts, updateProduct, updateVariant } from "@/lib/vendor-api";
import type { Product, ProductVariant } from "@/lib/types";

type VariantDraft = {
  id: number;
  sku: string;
  priceEuros: string;
  compareAtEuros: string;
  stock: string;
  active: boolean;
};

function toEuros(cents?: number | null): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}
function toCents(euros: string): number {
  return Math.round(parseFloat(euros.replace(",", ".")) * 100) || 0;
}

export default function EditProductPage() {
  const { id, productId } = useParams<{ id: string; productId: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePriceEuros, setBasePriceEuros] = useState("");
  const [vatRate, setVatRate] = useState(21);
  const [active, setActive] = useState(true);
  const [availability, setAvailability] = useState<"available" | "coming_soon" | "preorder">("available");
  const [releaseAt, setReleaseAt] = useState("");
  const [hidePriceWhenUnavailable, setHidePriceWhenUnavailable] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyProducts(Number(id), session.token)
      .then((products) => {
        const found = products.find((p) => p.id === Number(productId));
        if (!found) { setError("Produit introuvable."); return; }
        setProduct(found);
        setName(found.name);
        setDescription(found.description ?? "");
        setBasePriceEuros(toEuros(found.basePriceCents));
        setVatRate(found.vatRatePercent ?? 21);
        setActive(found.variants.length ? true : true);
        setAvailability(found.availability ?? "available");
        setReleaseAt(found.releaseAt ? found.releaseAt.slice(0, 10) : "");
        setHidePriceWhenUnavailable(found.hidePriceWhenUnavailable ?? false);
        setVariants(found.variants.map((v: ProductVariant) => ({
          id: v.id,
          sku: v.sku,
          priceEuros: toEuros(v.priceCents),
          compareAtEuros: toEuros(v.compareAtPriceCents ?? null),
          stock: String(v.stock),
          active: true,
        })));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id, productId]);

  const updateVariantDraft = (variantId: number, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((v) => (v.id === variantId ? { ...v, ...patch } : v)));
  };

  async function save() {
    const session = readStoredSession();
    if (!session || !product) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateProduct(product.id, {
        name,
        description,
        basePriceCents: toCents(basePriceEuros),
        vatRatePercent: vatRate,
        active,
        availability,
        releaseAt: availability === "available" ? null : (releaseAt ? `${releaseAt}T00:00:00+00:00` : null),
        hidePriceWhenUnavailable: availability === "available" ? false : hidePriceWhenUnavailable,
      }, session.token);

      for (const v of variants) {
        await updateVariant(v.id, {
          priceCents: toCents(v.priceEuros),
          compareAtPriceCents: v.compareAtEuros ? toCents(v.compareAtEuros) : null,
          stock: parseInt(v.stock, 10) || 0,
          active: v.active,
        }, session.token);
      }
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (error && !product) return <p className="text-red-600">{error}</p>;
  if (!product) return <p className="text-gray-500">Chargement…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-4">Éditer « {product.name} »</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      {saved && <p className="text-green-700 mb-3">Modifications enregistrées ✅</p>}

      <div className="grid gap-4">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Nom</span>
          <input className="border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Description</span>
          <textarea className="border rounded px-3 py-2" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Prix de base (€)</span>
            <input className="border rounded px-3 py-2" value={basePriceEuros} onChange={(e) => setBasePriceEuros(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Disponibilité</span>
            <select className="border rounded px-3 py-2" value={availability} onChange={(e) => setAvailability(e.target.value as typeof availability)}>
              <option value="available">Disponible</option>
              <option value="coming_soon">Bientôt</option>
              <option value="preorder">Pré-vente</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm max-w-xs">
          <span className="font-medium">Taux de TVA</span>
          <select className="border rounded px-3 py-2" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
            <option value={21}>21 % (standard)</option>
            <option value={12}>12 %</option>
            <option value={6}>6 % (alimentation, livres…)</option>
            <option value={0}>0 %</option>
          </select>
        </label>
        {availability !== "available" ? (
          <>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Date de sortie</span>
              <input type="date" className="border rounded px-3 py-2" value={releaseAt} onChange={(e) => setReleaseAt(e.target.value)} />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={hidePriceWhenUnavailable} onChange={(e) => setHidePriceWhenUnavailable(e.target.checked)} />
              <span>
                Ne pas afficher le prix tant que le produit n&apos;est pas disponible
                <span className="block text-gray-500">
                  Coché : seulement « Me prévenir ». Décoché : le prix s&apos;affiche et le produit est pré-commandable (−15 %, payé tout de suite).
                </span>
              </span>
            </label>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>Produit actif (visible en boutique)</span>
        </label>

        <div className="mt-2">
          <h2 className="font-semibold mb-2">Variantes</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Prix (€)</th>
                <th className="p-2 text-left">Prix barré (€)</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="p-2">{v.sku}</td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-20" value={v.priceEuros} onChange={(e) => updateVariantDraft(v.id, { priceEuros: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-20" placeholder="—" value={v.compareAtEuros} onChange={(e) => updateVariantDraft(v.id, { compareAtEuros: e.target.value })} /></td>
                  <td className="p-2"><input className="border rounded px-2 py-1 w-16" value={v.stock} onChange={(e) => updateVariantDraft(v.id, { stock: e.target.value })} /></td>
                  <td className="p-2"><input type="checkbox" checked={v.active} onChange={(e) => updateVariantDraft(v.id, { active: e.target.checked })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-2">
          <button onClick={save} disabled={saving} className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button onClick={() => router.push(`/dashboard/boxes/${id}/products`)} className="px-4 py-2 rounded text-sm border">Retour</button>
        </div>
      </div>
    </div>
  );
}
