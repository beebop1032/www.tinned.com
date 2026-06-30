import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { VariantSelector } from "@/components/VariantSelector";
import { NotifyMeForm } from "@/components/NotifyMeForm";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { toCartProduct } from "@/lib/cart";
import { getProduct } from "@/lib/api";
import { productPriceCents } from "@/lib/commerce";
import { money } from "@/lib/format";

function formatReleaseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("fr-BE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

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

  const availability = product.availability ?? "available";
  const releaseLabel = formatReleaseDate(product.releaseAt);

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
          {availability === "coming_soon" ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <p className="lead" style={{ margin: 0 }}>Bientôt disponible</p>
                {releaseLabel ? <p className="muted" style={{ margin: 0 }}>Disponible le {releaseLabel}</p> : null}
              </div>
              <NotifyMeForm
                targetType="product"
                productIri={`/api/products/${product.id}`}
                productName={product.name}
              />
            </div>
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
    </>
  );
}
