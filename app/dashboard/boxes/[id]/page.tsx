"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { updateBox } from "@/lib/vendor-api";
import Link from "next/link";
import type { BoxType } from "@/lib/types";

export default function EditBoxPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "store") as BoxType;
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const session = readStoredSession();
    if (!session) return;
    setSaving(true);
    setError(null);
    try {
      await updateBox(Number(id), type, { name, tagline, description, active }, session.token);
      router.push("/dashboard/boxes");
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Modifier la Box</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom</label>
          <input required value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 text-sm h-24" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} />
          <label htmlFor="active" className="text-sm">Active (visible publiquement)</label>
        </div>
        {type === "store" && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Contenu</p>
            <Link href={`/dashboard/boxes/${id}/products?type=store`} className="text-blue-600 text-sm hover:underline mr-4">Gérer les produits</Link>
          </div>
        )}
        {type === "blog" && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Contenu</p>
            <Link href={`/dashboard/boxes/${id}/articles?type=blog`} className="text-blue-600 text-sm hover:underline mr-4">Gérer les articles</Link>
          </div>
        )}
        {type === "travel" && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Contenu</p>
            <Link href={`/dashboard/boxes/${id}/trips?type=travel`} className="text-blue-600 text-sm hover:underline mr-4">Gérer les voyages</Link>
          </div>
        )}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Landing page</p>
          <a className="button" href={`/dashboard/boxes/${id}/landing?type=${type}`}>Éditer la landing</a>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/boxes" className="border px-4 py-2 rounded text-sm">Annuler</Link>
          <button type="submit" disabled={saving} className="bg-black text-white px-6 py-2 rounded text-sm disabled:opacity-50">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
