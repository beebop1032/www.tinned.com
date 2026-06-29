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
  stock: number;
  images?: string[];
  attributeValues: ProductAttributeValue[];
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  basePriceCents: number;
  currency: string;
  images: string[];
  storeBox?: Box | null;
  variants: ProductVariant[];
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  imagePath?: string | null;
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
  publishedAt?: string | null;
  travelBox?: Box | null;
};

export type LandingPage = {
  id: number;
  locale: string;
  box: string;                 // IRI de la box
  title: string;
  metaDescription?: string | null;
  blocks: Block[];
};
