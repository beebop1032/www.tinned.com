import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BoxCard } from "@/components/BoxCard";
import { getBoxes } from "@/lib/api";

export const metadata: Metadata = {
  title: "Store Box",
  description: "Boutiques indépendantes, produits disponibles et paniers boutique."
};

export default async function StoreBoxPage() {
  const boxes = await getBoxes("store");

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Store Box</span>
          <h1>Les boutiques disponibles maintenant.</h1>
          <p>Chaque Store Box réunit l'univers d'une boutique — ses coffrets, ses coups de cœur, son histoire. Ouvrez, comparez, laissez-vous porter.</p>
          <form className="rounded-input-container" action="/search">
            <input name="q" placeholder="Rechercher une boutique ou un produit" />
            <button className="button" type="submit">Trouver</button>
          </form>
        </div>
        <div className="hero-visual">
          <Image src="/tinned-assets/box-store.svg" alt="" width={280} height={280} style={{ objectFit: "contain" }} />
        </div>
      </section>
      <section className="container section">
        <div className="section-header"><div><h2>Toutes les Store Box</h2><p>Chaque boutique présente ses produits, son stock et son univers.</p></div></div>
        <div className="grid">{boxes.map((box) => <BoxCard key={box.slug} box={box} type="store" />)}</div>
      </section>
    </>
  );
}
