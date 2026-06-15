"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { createBox, slugify } from "@/lib/vendor-api";
import type { BoxType } from "@/lib/types";

const TYPES: { value: BoxType; label: string; description: string }[] = [
  { value: "business", label: "BusinessBox", description: "Site vitrine, activité professionnelle" },
  { value: "store", label: "StoreBox", description: "Boutique e-commerce avec produits" },
  { value: "blog", label: "BlogBox", description: "Blog, journal, média" },
  { value: "travel", label: "TravelBox", description: "Carnet de voyage" },
];

export default function NewBoxPage() {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "form">("type");
  const [type, setType] = useState<BoxType>("store");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const typeLabel = type === "business" ? "BusinessBox" : type === "store" ? "StoreBox" : type === "travel" ? "TravelBox" : "BlogBox";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const session = readStoredSession();
    if (!session) { setError("Vous devez être connecté."); return; }
    setSaving(true);
    setError(null);
    try {
      await createBox({ type, name, slug, tagline, active: true }, session.token);
      router.push("/dashboard/boxes");
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  if (step === "type") {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Choisir le type de Box</h1>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TYPES.map(t => (
            <li key={t.value}>
              <button
                onClick={() => { setType(t.value); setStep("form"); }}
                className="w-full text-left border rounded-xl p-5 hover:border-black hover:shadow transition-shadow"
              >
                <p className="font-bold text-lg">{t.label}</p>
                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Créer une {typeLabel}</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom</label>
          <input
            required value={name}
            onChange={e => { setName(e.target.value); setSlug(slugify(e.target.value)); }}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug (URL)</label>
          <input
            required value={slug} onChange={e => setSlug(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input
            value={tagline} onChange={e => setTagline(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setStep("type")} className="border px-4 py-2 rounded text-sm">← Retour</button>
          <button type="submit" disabled={saving} className="bg-black text-white px-6 py-2 rounded text-sm disabled:opacity-50">
            {saving ? "Création…" : "Créer la Box"}
          </button>
        </div>
      </form>
    </div>
  );
}
