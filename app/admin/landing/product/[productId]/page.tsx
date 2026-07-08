"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { readStoredSession, sessionHasRole } from "@/lib/auth";
import { fetchProducts } from "@/lib/admin-api";
import { LandingEditor } from "@/components/landing/LandingEditor";
import type { Product } from "@/lib/types";

export default function AdminProductLandingPage() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = readStoredSession();
    if (!session || !sessionHasRole(session, "ROLE_ADMIN")) {
      setDenied(true);
      setLoading(false);
      return;
    }
    fetchProducts()
      .then((products) => {
        const found = products.find((p) => p.id === Number(productId));
        if (found) setProduct(found);
        else setError("Produit introuvable.");
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return <p className="admin-shell admin-inline-state">Chargement…</p>;
  if (denied) return <p className="admin-shell admin-inline-state">Accès refusé.</p>;
  if (error || !product) return <p className="admin-shell admin-inline-state">{error ?? "Produit introuvable."}</p>;

  return (
    <section className="admin-shell">
      <div className="admin-header">
        <div>
          <p className="eyebrow">Back-office / Contenu</p>
          <h1>Landing produit — {product.name}</h1>
          <p>Composez la page teaser/vitrine de ce produit, bloc par bloc. Elle s&apos;affiche sur la fiche produit.</p>
        </div>
      </div>
      <LandingEditor productIri={`/api/products/${product.id}`} productSlug={product.slug} />
    </section>
  );
}
