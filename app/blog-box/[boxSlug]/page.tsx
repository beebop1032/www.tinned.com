import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { BoxCard } from "@/components/BoxCard";
import { getArticles, getBox, getBoxes } from "@/lib/api";

type Props = { params: Promise<{ boxSlug: string }> };

export async function generateStaticParams() {
  const boxes = await getBoxes("blog");
  return boxes.map((b) => ({ boxSlug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boxSlug } = await params;
  const box = await getBox("blog", boxSlug);
  return {
    title: box ? `${box.name} — Blog Box` : "Not found",
    description: box?.description ?? box?.tagline ?? undefined,
  };
}

export default async function BlogBoxDetailPage({ params }: { params: Promise<{ boxSlug: string }> }) {
  const { boxSlug } = await params;
  const [box, articles] = await Promise.all([getBox("blog", boxSlug), getArticles(boxSlug)]);
  if (!box) notFound();

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Blog Box de {box.name}</span>
          <h1>{box.name}</h1>
          <p>{box.description ?? box.tagline}</p>
        </div>
        <div className="hero-visual"><Image src={box.logoPath ?? "/tinned-assets/box-blog-new.svg"} alt="" width={280} height={280} style={{ objectFit: "contain" }} /></div>
      </section>
      <section className="container section">
        <div className="section-header"><h2>Articles</h2></div>
        <div className="grid">{articles.map((article) => <ArticleCard key={article.slug} article={{ ...article, blogBox: box }} />)}</div>
      </section>
      {box.businessBox || box.storeBox ? (
        <section className="container section interbox-section">
          <div className="section-header"><div><span className="eyebrow">Immersion inter-boxes</span><h2>Retrouver cet univers</h2><p>Explorez directement la marque et la boutique associées à ces contenus.</p></div></div>
          <div className="grid">
            {box.businessBox ? <BoxCard box={box.businessBox} type="business" /> : null}
            {box.storeBox ? <BoxCard box={box.storeBox} type="store" /> : null}
          </div>
        </section>
      ) : null}
    </>
  );
}
