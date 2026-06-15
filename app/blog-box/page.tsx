import type { Metadata } from "next";
import Image from "next/image";
import { ArticleCard } from "@/components/ArticleCard";
import { BoxCard } from "@/components/BoxCard";
import { getArticles, getBoxes } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog Box",
  description: "Guides, sélections et coulisses des boutiques Tinned."
};

export default async function BlogBoxPage() {
  const [boxes, articles] = await Promise.all([getBoxes("blog"), getArticles()]);

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Blog Box</span>
          <h1>Guides, sélections et nouveautés.</h1>
          <p>Des contenus courts pour découvrir les produits autrement et mieux choisir.</p>
          <form className="rounded-input-container" action="/search">
            <input name="q" placeholder="Rechercher un article" />
            <button className="button" type="submit">Trouver</button>
          </form>
        </div>
        <div className="hero-visual"><Image src="/tinned-assets/box-blog-new.svg" alt="" width={280} height={280} style={{ objectFit: "contain" }} /></div>
      </section>
      <section className="container section">
        <div className="section-header"><h2>Univers éditoriaux</h2></div>
        <div className="grid">{boxes.map((box) => <BoxCard key={box.slug} box={box} type="blog" />)}</div>
      </section>
      <section className="container section">
        <div className="section-header"><h2>Articles récents</h2></div>
        <div className="grid">{articles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div>
      </section>
    </>
  );
}
