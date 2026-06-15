"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readStoredSession } from "@/lib/auth";
import { fetchMyBoxes, deleteBox } from "@/lib/vendor-api";
import type { Box } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  business: "BusinessBox", store: "StoreBox", blog: "BlogBox", travel: "TravelBox",
};

export default function MyBoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyBoxes(session.token, session.id).then(setBoxes).catch((e: unknown) => setError(String(e)));
  }, []);

  async function handleDelete(box: Box) {
    if (!confirm(`Supprimer "${box.name}" ?`)) return;
    const session = readStoredSession();
    if (!session || !box.type) return;
    try {
      await deleteBox(box.id, box.type, session.token);
      setBoxes(prev => prev.filter(b => b.id !== box.id));
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes Boxes</h1>
        <Link href="/dashboard/boxes/new" className="bg-black text-white px-4 py-2 rounded text-sm">+ Nouvelle Box</Link>
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {boxes.length === 0 && <p className="text-gray-500">Aucune Box pour le moment.</p>}
      <ul className="space-y-3">
        {boxes.map(box => (
          <li key={box.id} className="bg-white border rounded-lg px-4 py-3 flex justify-between items-center">
            <div>
              <span className="text-xs text-gray-400 uppercase mr-2">{TYPE_LABELS[box.type ?? ""] ?? box.type}</span>
              <span className="font-semibold">{box.name}</span>
              <span className="text-sm text-gray-400 ml-2">/{box.slug}</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/dashboard/boxes/${box.id}?type=${box.type}`} className="text-sm text-blue-600 hover:underline">Modifier</Link>
              <button onClick={() => handleDelete(box)} className="text-sm text-red-500 hover:underline">Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
