import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { VariantSelector } from "@/components/VariantSelector";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { toCartProduct } from "@/lib/cart";
import { getProduct } from "@/lib/api";
import { productPriceCents } from "@/lib/commerce";
import { money } from "@/lib/format";

type Props = { params: Promise<{ boxSlug: string; productSlug: string; variantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const product = await getProduct(productSlug);
  return {
    title: product ? product.name : "Not found",
    description: product?.description?.slice(0, 155) ?? undefined,
    openGraph: product?.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ productSlug: string; variantSlug: string }> }) {
  const { productSlug, variantSlug } = await params;
  const product = await getProduct(productSlug);
  if (!product) notFound();

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
          }))
        }}
      />
      <div className="container product-layout">
        <div className="product-image">
          <Image src={product.images[0] ?? "/tinned-assets/box-store.svg"} alt={product.name} width={250} height={250} priority />
        </div>
        <article>
          <span className="eyebrow">{product.storeBox?.name ?? "Boutique"}</span>
          <h1 className="page-title">{product.name}</h1>
          <p className="lead">{product.description}</p>
          {product.variants.length > 1 ? <p className="muted">Prix à partir de {money(productPriceCents(product), product.currency)}</p> : null}
          <VariantSelector product={toCartProduct(product)} initialSku={variantSlug} />
        </article>
      </div>
    </>
  );
}
