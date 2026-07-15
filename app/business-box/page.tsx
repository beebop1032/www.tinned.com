import type { Metadata } from "next";
import Image from "next/image";
import { BoxCard } from "@/components/BoxCard";
import { getBoxes } from "@/lib/api";

export const metadata: Metadata = {
  title: "Business Box — marques et savoir-faire à découvrir",
  description: "Découvrez les Business Box de Tinned : l'univers, l'histoire et le savoir-faire des marques et créateurs indépendants belges.",
  alternates: { canonical: "/business-box" },
};

export default async function BusinessBoxPage() {
  const boxes = await getBoxes("business");

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Business Box</span>
          <h1>Les marques derrière les produits.</h1>
          <p>Découvrez leur univers, leurs boutiques et les sélections disponibles sur Tinned.</p>
          <form className="rounded-input-container" action="/search">
            <input name="q" placeholder="Rechercher une marque" />
            <button className="button" type="submit">Trouver</button>
          </form>
        </div>
        <div className="hero-visual"><Image src="/tinned-assets/box-business-new.svg" alt="" width={280} height={280} style={{ objectFit: "contain" }} /></div>
      </section>
      <section className="container section">
        <div className="section-header"><div><h2>Les marques</h2><p>Des profils clairs pour comprendre l'identité de chaque univers.</p></div></div>
        <div className="grid">{boxes.map((box) => <BoxCard key={box.slug} box={box} type="business" />)}</div>
      </section>
    </>
  );
}
