import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { BoxCard } from "@/components/BoxCard";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getBlogsForStore, getBox, getBoxes, getLanding, getProducts } from "@/lib/api";
import { LandingBlocks } from "@/components/landing/LandingBlocks";
import { NotifyMeForm } from "@/components/NotifyMeForm";

type Props = { params: Promise<{ boxSlug: string }> };

export async function generateStaticParams() {
  const boxes = await getBoxes("store");
  return boxes.map((b) => ({ boxSlug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boxSlug } = await params;
  const box = await getBox("store", boxSlug);
  return {
    title: box ? `${box.name} — Store Box` : "Not found",
    description: box?.description ?? box?.tagline ?? undefined,
  };
}

export default async function StoreBoxDetailPage({ params }: { params: Promise<{ boxSlug: string }> }) {
  const { boxSlug } = await params;
  const [box, products, blogs] = await Promise.all([getBox("store", boxSlug), getProducts(boxSlug), getBlogsForStore(boxSlug)]);
  if (!box) notFound();

  const landing = await getLanding(boxSlug);
  if (landing) {
    return <LandingBlocks landing={landing} box={box} />;
  }

  return (
    <>
      <SchemaJsonLd data={{ "@context": "https://schema.org", "@type": "Store", name: box.name, description: box.description }} />
      <section className="container hero">
        <div>
          <span className="eyebrow">Store Box de {box.name}</span>
          <h1>{box.name}</h1>
          <p>{box.description ?? box.tagline}</p>
          <span className="pill">Produits disponibles</span>
        </div>
        <div className="hero-visual"><Image src={box.logoPath ?? "/tinned-assets/box-store.svg"} alt="" width={280} height={280} style={{ objectFit: "contain" }} /></div>
      </section>
      <section className="container section">
        <div className="section-header"><div><h2>Produits de la boutique</h2><p>Prix, options et disponibilité sont visibles avant l'ajout au panier.</p></div></div>
        <div className="grid">{products.map((product) => <ProductCard key={product.slug} product={{ ...product, storeBox: box }} />)}</div>
      </section>
      <section className="container section">
        <NotifyMeForm targetType="box" boxIri={`/api/store_boxes/${box.id}`} boxName={box.name} />
      </section>
      {box.businessBox || blogs.length ? (
        <section className="container section interbox-section">
          <div className="section-header"><div><span className="eyebrow">Immersion inter-boxes</span><h2>Prolonger la découverte</h2><p>Découvrez la marque derrière cette boutique et ses inspirations.</p></div></div>
          <div className="grid">
            {box.businessBox ? <BoxCard box={box.businessBox} type="business" /> : null}
            {blogs.map((item) => <BoxCard key={item.slug} box={item} type="blog" />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
