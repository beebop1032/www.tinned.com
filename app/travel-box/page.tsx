import type { Metadata } from "next";
import Image from "next/image";
import { BoxCard } from "@/components/BoxCard";
import { getBoxes } from "@/lib/api";

export const metadata: Metadata = {
  title: "Travel Box",
  description: "Destinations, carnets et inspirations de voyage — sélectionnés à la main."
};

export default async function TravelBoxPage() {
  const boxes = await getBoxes("travel");

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Travel Box</span>
          <h1>Destinations, carnets et inspirations de voyage.</h1>
          <p>Explorez des destinations à travers les boutiques, agences et récits qui les font vivre.</p>
          <form className="rounded-input-container" action="/search">
            <input name="q" placeholder="Rechercher une destination" />
            <button className="button" type="submit">Trouver</button>
          </form>
        </div>
        <div className="hero-visual">
          <Image src="/tinned-assets/simple-box.svg" alt="" width={280} height={280} style={{ objectFit: "contain" }} />
        </div>
      </section>
      <section className="container section">
        <div className="section-header">
          <div>
            <h2>Toutes les destinations</h2>
            <p>Chaque Travel Box rassemble les boutiques, agences et contenus d'une destination.</p>
          </div>
        </div>
        <div className="grid">
          {boxes.map((box) => (
            <BoxCard key={box.slug} box={box} type="travel" />
          ))}
        </div>
        {boxes.length === 0 && (
          <div className="home-empty-state">
            <strong>Aucune destination publiée pour le moment.</strong>
            <span>Les premières Travel Box arrivent bientôt.</span>
          </div>
        )}
      </section>
    </>
  );
}
