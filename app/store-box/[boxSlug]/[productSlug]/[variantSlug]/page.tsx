import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { VariantSelector } from "@/components/VariantSelector";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductLaunch } from "@/components/ProductLaunch";
import { ProductReviews } from "@/components/ProductReviews";
import { StarRating } from "@/components/StarRating";
import { LandingBlocks } from "@/components/landing/LandingBlocks";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { toCartProduct } from "@/lib/cart";
import { getProduct, getProductLanding, getReviews } from "@/lib/api";
import { isPreorderable, productHref, productPriceCents } from "@/lib/commerce";
import { formatReleaseDate, money } from "@/lib/format";

type Props = { params: Promise<{ boxSlug: string; productSlug: string; variantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await getProduct(productSlug);
  const store = product?.storeBox?.name;
  return {
    title: product ? (store ? `${product.name} — ${store}` : product.name) : "Not found",
    description: product?.description?.slice(0, 155) ?? undefined,
    alternates: product ? { canonical: productHref(product) } : undefined,
    openGraph: product?.images[0] ? { images: [product.images[0]], type: "website" } : undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productSlug: string; variantSlug: string }> }) {
  const { productSlug, variantSlug } = await params;
  const product = await getProduct(productSlug);
  if (!product) notFound();

  const [reviews, landing] = await Promise.all([getReviews(productSlug), getProductLanding(productSlug)]);
  const ratingAverage = product.ratingAverage ?? 0;
  const ratingCount = product.ratingCount ?? 0;

  const availability = product.availability ?? "available";
  const releaseLabel = formatReleaseDate(product.releaseAt);
  const hasVariants = product.variants.length > 0;
  const soldOut = availability === "available" && hasVariants && product.variants.every((variant) => variant.stock <= 0);
  const teaserKind = availability === "coming_soon" ? "coming_soon" : soldOut ? "sold_out" : null;
  const preorderable = isPreorderable(product);

  return (
    <>
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.images[0],
          brand: product.storeBox ? { "@type": "Brand", name: product.storeBox.name } : undefined,
          offers: product.variants.map((variant) => ({
            "@type": "Offer",
            sku: variant.sku,
            price: variant.priceCents / 100,
            priceCurrency: product.currency,
            availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: product.storeBox ? { "@type": "Organization", name: product.storeBox.name } : undefined,
          })),
          aggregateRating: ratingCount > 0 ? {
            "@type": "AggregateRating",
            ratingValue: ratingAverage,
            reviewCount: ratingCount,
            bestRating: 5,
            worstRating: 1,
          } : undefined,
          review: reviews.slice(0, 20).map((review) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
            author: { "@type": "Person", name: review.authorName },
            datePublished: review.createdAt,
            name: review.title ?? undefined,
            reviewBody: review.body,
          })),
        }}
      />
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: "https://tinned.com" },
            { "@type": "ListItem", position: 2, name: "Store Box", item: "https://tinned.com/store-box" },
            ...(product.storeBox
              ? [{ "@type": "ListItem", position: 3, name: product.storeBox.name, item: `https://tinned.com/store-box/${product.storeBox.slug}` }]
              : []),
            { "@type": "ListItem", position: product.storeBox ? 4 : 3, name: product.name, item: `https://tinned.com${productHref(product)}` },
          ],
        }}
      />
      {landing ? <LandingBlocks landing={landing} box={product.storeBox} /> : null}
      <div className="container product-layout">
        <ProductGallery images={product.images} alt={product.name} />
        <article>
          <span className="eyebrow">{product.storeBox?.name ?? "Boutique"}</span>
          <h1 className="page-title">{product.name}</h1>
          {ratingCount > 0 ? (
            <Link href="#avis" className="product-rating-link">
              <StarRating value={ratingAverage} size={16} />
              <span>{ratingAverage.toFixed(1)} · {ratingCount} avis</span>
            </Link>
          ) : null}
          {product.description
            ?.split(/\n{2,}/)
            .filter((paragraph) => paragraph.trim())
            .map((paragraph, index) => (
              <p className="lead product-desc" key={index}>{paragraph}</p>
            ))}
          {product.variants.length > 1 && !teaserKind ? <p className="muted">Prix à partir de {money(productPriceCents(product), product.currency)}</p> : null}
          {teaserKind === "coming_soon" && preorderable ? (
            <>
              <p className="muted">Pré-commande{releaseLabel ? ` — livrée à la sortie, le ${releaseLabel}` : " — livrée à la sortie"}</p>
              <VariantSelector product={toCartProduct(product)} initialSku={variantSlug} preorder />
              <ProductLaunch product={product} kind="coming_soon" releaseLabel={releaseLabel} />
            </>
          ) : teaserKind ? (
            <ProductLaunch product={product} kind={teaserKind} releaseLabel={releaseLabel} />
          ) : (
            <>
              {availability === "preorder" ? (
                <p className="muted">Pré-vente{releaseLabel ? ` — sortie le ${releaseLabel}` : ""}</p>
              ) : null}
              <VariantSelector product={toCartProduct(product)} initialSku={variantSlug} preorder={availability === "preorder"} />
            </>
          )}
        </article>
      </div>
      {/* Pas d'appel aux avis sur un produit pas encore lancé (personne n'a pu l'acheter). */}
      {availability === "coming_soon" && ratingCount === 0 ? null : (
        <div className="container section">
          <ProductReviews
            productId={product.id}
            productName={product.name}
            reviews={reviews}
            ratingAverage={ratingAverage}
            ratingCount={ratingCount}
          />
        </div>
      )}
    </>
  );
}
