import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoxCard } from "@/components/BoxCard";
import { BoxHero } from "@/components/BoxHero";
import { TripCard } from "@/components/TripCard";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getBox, getBoxes, getBoxesForTravel, getLanding, getTrips } from "@/lib/api";
import { LandingBlocks } from "@/components/landing/LandingBlocks";

type Props = { params: Promise<{ boxSlug: string }> };

export async function generateStaticParams() {
  const boxes = await getBoxes("travel");
  return boxes.map((b) => ({ boxSlug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boxSlug } = await params;
  const box = await getBox("travel", boxSlug);
  return {
    title: box ? `${box.name} — Travel Box` : "Not found",
    description: box?.description ?? box?.tagline ?? undefined,
  };
}

export default async function TravelBoxDetailPage({ params }: Props) {
  const { boxSlug } = await params;
  const [box, businesses, blogs, trips] = await Promise.all([
    getBox("travel", boxSlug),
    getBoxesForTravel("business", boxSlug),
    getBoxesForTravel("blog", boxSlug),
    getTrips(boxSlug),
  ]);
  if (!box) notFound();

  const landing = await getLanding(boxSlug);
  if (landing) {
    return <LandingBlocks landing={landing} box={box} />;
  }

  const linkedBoxes = [...businesses, ...blogs];

  return (
    <>
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          name: box.name,
          description: box.description ?? box.tagline,
        }}
      />
      <BoxHero
        eyebrow={`Travel Box · ${box.name}`}
        title={box.name}
        subtitle={box.description ?? box.tagline}
        cover={box.coverPath}
        logo={box.logoPath}
      />

      {linkedBoxes.length > 0 && (
        <section className="container section interbox-section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Explorer</span>
              <h2>L'univers {box.name}</h2>
              <p>Boutiques, agences et contenus liés à cette destination.</p>
            </div>
          </div>
          <div className="grid">
            {businesses.map((item) => (
              <BoxCard key={item.slug} box={item} type="business" />
            ))}
            {blogs.map((item) => (
              <BoxCard key={item.slug} box={item} type="blog" />
            ))}
          </div>
        </section>
      )}

      {trips.length > 0 && (
        <section className="container section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Éditorial</span>
              <h2>Carnets de voyage</h2>
            </div>
          </div>
          <div className="grid">
            {trips.map((trip) => (
              <TripCard key={trip.slug} trip={trip} travelBoxSlug={boxSlug} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
