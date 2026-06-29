import type { Box } from "@/lib/types";
import type { Block } from "@/lib/blocks";
import { getProducts, getArticles, getTrips, getBoxesForBusiness, getBoxesForTravel } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { ArticleCard } from "@/components/ArticleCard";
import { TripCard } from "@/components/TripCard";
import { BoxCard } from "@/components/BoxCard";

export async function CollectionBlock({ block, box }: { block: Extract<Block, { type: "collection" }>; box: Box }) {
  const limit = block.limit ?? 6;
  const slug = box.slug;
  let body: React.ReactNode = null;

  if (block.source === "products") {
    const items = (await getProducts(slug)).slice(0, limit);
    body = (
      <div className="grid">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    );
  } else if (block.source === "articles") {
    const items = (await getArticles(slug)).slice(0, limit);
    body = (
      <div className="grid">
        {items.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    );
  } else if (block.source === "trips") {
    const items = (await getTrips(slug)).slice(0, limit);
    body = (
      <div className="grid">
        {items.map((t) => <TripCard key={t.id} trip={t} travelBoxSlug={slug} />)}
      </div>
    );
  } else {
    // childBoxes
    const children = box.type === "business"
      ? [
          ...(await getBoxesForBusiness("store", slug)),
          ...(await getBoxesForBusiness("blog", slug)),
        ]
      : box.type === "travel"
      ? [
          ...(await getBoxesForTravel("business", slug)),
          ...(await getBoxesForTravel("blog", slug)),
        ]
      : [];
    body = (
      <div className="grid">
        {children.slice(0, limit).map((b) => (
          <BoxCard key={b.id} box={b} type={b.type!} />
        ))}
      </div>
    );
  }

  return (
    <section className="container section">
      {block.title ? <div className="section-header"><h2>{block.title}</h2></div> : null}
      {body}
    </section>
  );
}
