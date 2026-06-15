"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { readStoredSession } from "@/lib/auth";
import { fetchMyProducts, deleteProduct, eurosFromCents } from "@/lib/vendor-api";
import type { Product } from "@/lib/types";

export default function MyProductsPage() {
  const { id } = useParams<{ id: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session) return;
    fetchMyProducts(Number(id), session.token).then(setProducts).catch((e: unknown) => setError(String(e)));
  }, [id]);

  async function handleDelete(productId: number) {
    if (!confirm("Supprimer ce produit ?")) return;
    const session = readStoredSession();
    if (!session) return;
    try {
      await deleteProduct(productId, session.token);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (e: unknown) {
      setError(String(e));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Produits</h1>
        <Link href={`/dashboard/boxes/${id}/products/new`} className="bg-black text-white px-4 py-2 rounded text-sm">+ Ajouter</Link>
      </div>
      {error && <p className="text-red-600 mb-3">{error}</p>}
      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nom</th><th className="p-2 text-left">Prix</th><th className="p-2 text-left">Variantes</th><th /></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{eurosFromCents(p.basePriceCents)} €</td>
              <td className="p-2">{p.variants.length}</td>
              <td className="p-2 text-right">
                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Supprimer</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
