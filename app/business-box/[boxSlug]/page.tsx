import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BoxCard } from "@/components/BoxCard";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getBox, getBoxes, getBoxesForBusiness, getLanding } from "@/lib/api";
import { LandingBlocks } from "@/components/landing/LandingBlocks";

type Props = { params: Promise<{ boxSlug: string }> };

export async function generateStaticParams() {
  const boxes = await getBoxes("business");
  return boxes.map((b) => ({ boxSlug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boxSlug } = await params;
  const box = await getBox("business", boxSlug);
  return {
    title: box ? `${box.companyName ?? box.name} — Business Box` : "Not found",
    description: box?.description ?? box?.tagline ?? undefined,
  };
}

export default async function BusinessBoxDetailPage({ params }: { params: Promise<{ boxSlug: string }> }) {
  const { boxSlug } = await params;
  const [box, stores, blogs] = await Promise.all([
    getBox("business", boxSlug),
    getBoxesForBusiness("store", boxSlug),
    getBoxesForBusiness("blog", boxSlug)
  ]);
  if (!box) notFound();

  const landing = await getLanding(boxSlug);
  if (landing) {
    return <LandingBlocks landing={landing} box={box} />;
  }

  return (
    <>
      <SchemaJsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: box.companyName ?? box.name, url: box.website }} />
      <section className="container hero">
        <div>
          <span className="eyebrow">Business Box de {box.name}</span>
          <h1>{box.name}</h1>
          <p>{box.description ?? box.tagline}</p>
          {box.website ? <a className="button secondary" href={box.website}>Site web</a> : null}
        </div>
        <div className="hero-visual"><Image src={box.logoPath ?? "/tinned-assets/box-business-new.svg"} alt="" width={280} height={280} style={{ objectFit: "contain" }} /></div>
      </section>
      {stores.length || blogs.length ? (
        <section className="container section interbox-section">
          <div className="section-header"><div><span className="eyebrow">Immersion inter-boxes</span><h2>Explorer l'univers {box.name}</h2><p>Passez de la marque à ses boutiques et à ses contenus associés.</p></div></div>
          <div className="grid">
            {stores.map((item) => <BoxCard key={item.slug} box={item} type="store" />)}
            {blogs.map((item) => <BoxCard key={item.slug} box={item} type="blog" />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
