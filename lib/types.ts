import type { Block } from "./blocks";

export type BoxType = "business" | "store" | "blog" | "travel";

export type Box = {
  id: number;
  name: string;
  slug: string;
  type?: BoxType;
  tagline?: string | null;
  description?: string | null;
  logoPath?: string | null;
  coverPath?: string | null;
  active?: boolean;
  companyName?: string | null;
  website?: string | null;
  owner?: { id: number } | null;
  businessBox?: Box | null;
  storeBox?: Box | null;
  storeBoxes?: Box[];
  blogBoxes?: Box[];
  products?: Product[];
  articles?: Article[];
  trips?: Trip[];
};

export type ProductAttributeValue = {
  id: number;
  label: string;
  value: string;
  hexColor?: string | null;
  attribute?: {
    code: string;
    name: string;
    type: string;
  };
};

export type ProductVariant = {
  id: number;
  sku: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  stock: number;
  images?: string[];
  attributeValues: ProductAttributeValue[];
};

export type ProductAvailability = "available" | "coming_soon" | "preorder";

export type BundleItem = {
  id: number;
  variant: ProductVariant & { product?: { name?: string; slug?: string } };
  quantity: number;
};

export type ProductBundle = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  images: string[];
  pricingType: "fixed" | "discount";
  fixedPriceCents: number;
  discountPercent: number;
  priceCents: number;
  componentsTotalCents: number;
  storeBox?: Box | null;
  items: BundleItem[];
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  basePriceCents: number;
  currency: string;
  vatRatePercent?: number;
  images: string[];
  availability?: ProductAvailability;
  releaseAt?: string | null;
  storeBox?: Box | null;
  variants: ProductVariant[];
  translations?: { locale: string; name: string; description?: string | null }[];
  ratingAverage?: number;
  ratingCount?: number;
};

export type Review = {
  id: number;
  authorName: string;
  rating: number;
  title?: string | null;
  body: string;
  verifiedPurchase: boolean;
  status?: "pending" | "approved" | "rejected";
  merchantResponse?: string | null;
  createdAt: string;
  productSlug?: string | null;
  productName?: string | null;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  imagePath?: string | null;
  published?: boolean;
  publishedAt?: string | null;
  blogBox?: Box | null;
};

export type StaticPage = {
  id: number;
  slug: string;
  title: string;
  metaDescription?: string | null;
  sections: Array<{ question?: string; answer?: string; title?: string; body?: string }>;
};

export type Trip = {
  id: number;
  title: string;
  slug: string;
  locale?: string;
  excerpt?: string | null;
  body?: string | null;
  imagePath?: string | null;
  published?: boolean;
  publishedAt?: string | null;
  travelBox?: Box | null;
};

export type LandingPage = {
  id: number;
  locale: string;
  box: string | null;          // IRI de la box
  product?: string | null;     // IRI du produit (landing teaser rattachée à un produit)
  productSlug?: string | null;
  slug?: string | null;        // slug pour les landings autonomes (sans box)
  title: string;
  metaDescription?: string | null;
  blocks: Block[];
};
