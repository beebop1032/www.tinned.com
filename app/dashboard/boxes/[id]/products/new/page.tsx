"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { createProduct, slugify, centsFromEuros } from "@/lib/vendor-api";
import type { VariantInput } from "@/lib/vendor-api";

export default function NewProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const session = readStoredSession();
    if (!session) return;
    setSaving(true);
    setError(null);
    const variant: VariantInput = { sku, priceCents: centsFromEuros(price), stock: Number(stock) };
    try {
      await createProduct(
        { storeBoxId: Number(id), name, slug, description, basePriceCents: centsFromEuros(price), currency: "EUR" },
        [variant],
        session.token
      );
      router.push(`/dashboard/boxes/${id}/products`);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold mb-4">Nouveau produit</h1>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input required placeholder="Nom du produit" value={name}
          onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
          className="w-full border rounded px-3 py-2 text-sm" />
        <input required placeholder="Slug (URL)" value={slug} onChange={e => setSlug(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm font-mono" />
        <textarea placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm h-20" />
        <input required placeholder="Prix (ex: 12,50)" value={price} onChange={e => setPrice(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        <input required placeholder="SKU variante (ex: ROUGE-M)" value={sku} onChange={e => setSku(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm font-mono" />
        <input required type="number" min="0" placeholder="Stock" value={stock} onChange={e => setStock(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        <button type="submit" disabled={saving} className="bg-black text-white px-5 py-2 rounded text-sm disabled:opacity-50">
          {saving ? "Création…" : "Créer le produit"}
        </button>
      </form>
    </div>
  );
}
