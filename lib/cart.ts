import type { Box, Product, ProductVariant } from "./types";
import type { AddressSuggestion, CarrierSelection } from "./delivery";

export const CART_STORAGE_KEY = "tinned_cart_v1";
export const CHECKOUT_STORAGE_KEY = "tinned_checkout_v1";
export const ORDER_STORAGE_KEY = "tinned_last_order_v1";
export const SAVED_STORAGE_KEY = "tinned_saved_v1";

type CartStoreBox = Pick<Box, "id" | "name" | "slug" | "type" | "logoPath">;

export type CartProduct = Omit<Product, "storeBox"> & {
  storeBox?: CartStoreBox | null;
};

export type CartItem = {
  productSlug: string;
  variantSku: string;
  quantity: number;
};

export type CartLine = {
  product: CartProduct;
  variant: ProductVariant;
  quantity: number;
  storeSlug: string;
  storeName: string;
  lineTotalCents: number;
  currency: string;
};

export type StoreCartGroup = {
  storeSlug: string;
  storeName: string;
  storeLogoPath?: string | null;
  lines: CartLine[];
  subtotalCents: number;
  currency: string;
};

export type CheckoutSelection = {
  selectedStoreSlugs: string[];
  couponCode?: string;
};

// Saved-for-later items share the CartItem shape; reuse normalizeCartItems to read/persist them.
export function normalizeSavedItems(value: unknown): CartItem[] {
  return normalizeCartItems(value);
}

export type StoredOrderShipment = {
  id: number;
  status: string;
  storeNameSnapshot?: string;
  carrierNameSnapshot?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
};

export type StoredOrder = {
  orderId?: number;
  id: string;
  reference?: string;
  status?: string;
  paymentStatus?: string;
  storeOrders?: StoredOrderShipment[];
  checkoutUrl?: string;
  items: CartItem[];
  selectedStoreSlugs: string[];
  carrierSelections?: CarrierSelection[];
  address?: AddressSuggestion;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  createdAt: string;
  email?: string;
  paymentMethod?: string;
  currency?: string;
};

export function toCartProduct(product: Product): CartProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePriceCents: product.basePriceCents,
    currency: product.currency,
    images: product.images,
    availability: product.availability,
    releaseAt: product.releaseAt,
    variants: product.variants,
    storeBox: product.storeBox
      ? {
          id: product.storeBox.id,
          name: product.storeBox.name,
          slug: product.storeBox.slug,
          type: product.storeBox.type,
          logoPath: product.storeBox.logoPath
        }
      : null
  };
}

export function cartItemKey(item: Pick<CartItem, "productSlug" | "variantSku">) {
  return `${item.productSlug}:${item.variantSku}`;
}

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<CartItem>;
      if (typeof candidate.productSlug !== "string" || typeof candidate.variantSku !== "string") return null;
      return {
        productSlug: candidate.productSlug,
        variantSku: candidate.variantSku,
        quantity: Math.max(1, Math.min(99, Number(candidate.quantity) || 1))
      };
    })
    .filter((item): item is CartItem => Boolean(item));
}

export function normalizeCheckoutSelection(value: unknown): CheckoutSelection | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CheckoutSelection>;
  if (!Array.isArray(candidate.selectedStoreSlugs)) return null;
  return {
    selectedStoreSlugs: candidate.selectedStoreSlugs.filter((slug): slug is string => typeof slug === "string"),
    couponCode: typeof candidate.couponCode === "string" ? candidate.couponCode : undefined
  };
}

export function normalizeOrder(value: unknown): StoredOrder | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredOrder>;
  if (typeof candidate.id !== "string" || !Array.isArray(candidate.items)) return null;
  return {
    orderId: typeof candidate.orderId === "number" ? candidate.orderId : undefined,
    id: candidate.id,
    reference: typeof candidate.reference === "string" ? candidate.reference : undefined,
    status: typeof candidate.status === "string" ? candidate.status : undefined,
    paymentStatus: typeof candidate.paymentStatus === "string" ? candidate.paymentStatus : undefined,
    items: normalizeCartItems(candidate.items),
    selectedStoreSlugs: Array.isArray(candidate.selectedStoreSlugs)
      ? candidate.selectedStoreSlugs.filter((slug): slug is string => typeof slug === "string")
      : [],
    carrierSelections: Array.isArray(candidate.carrierSelections)
      ? candidate.carrierSelections
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const selection = item as Partial<CarrierSelection>;
            if (typeof selection.storeSlug !== "string" || typeof selection.carrierCode !== "string") return null;
            return { storeSlug: selection.storeSlug, carrierCode: selection.carrierCode };
          })
          .filter((item): item is CarrierSelection => Boolean(item))
      : [],
    address: normalizeAddress(candidate.address),
    subtotalCents: Number(candidate.subtotalCents) || 0,
    shippingCents: Number(candidate.shippingCents) || 0,
    totalCents: Number(candidate.totalCents) || 0,
    createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
    email: typeof candidate.email === "string" ? candidate.email : undefined,
    paymentMethod: typeof candidate.paymentMethod === "string" ? candidate.paymentMethod : undefined,
    currency: typeof candidate.currency === "string" ? candidate.currency : undefined
  };
}

export function upsertCartItem(items: CartItem[], nextItem: CartItem): CartItem[] {
  const existing = items.find((item) => cartItemKey(item) === cartItemKey(nextItem));
  if (!existing) return [...items, nextItem];
  return items.map((item) =>
    cartItemKey(item) === cartItemKey(nextItem)
      ? { ...item, quantity: Math.max(1, Math.min(99, item.quantity + nextItem.quantity)) }
      : item
  );
}

export function buildStoreCartGroups(products: CartProduct[], items: CartItem[]): StoreCartGroup[] {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  const groups = new Map<string, StoreCartGroup>();

  items.forEach((item) => {
    const product = productsBySlug.get(item.productSlug);
    const variant = product?.variants.find((candidate) => candidate.sku === item.variantSku);
    if (!product || !variant) return;

    const storeSlug = product.storeBox?.slug ?? "boutique";
    const storeName = product.storeBox?.name ?? "Boutique";
    const quantity = Math.max(1, Math.min(99, item.quantity));
    const lineTotalCents = variant.priceCents * quantity;
    const existing = groups.get(storeSlug);

    if (existing) {
      existing.lines.push({ product, variant, quantity, storeSlug, storeName, lineTotalCents, currency: product.currency });
      existing.subtotalCents += lineTotalCents;
      return;
    }

    groups.set(storeSlug, {
      storeSlug,
      storeName,
      storeLogoPath: product.storeBox?.logoPath,
      lines: [{ product, variant, quantity, storeSlug, storeName, lineTotalCents, currency: product.currency }],
      subtotalCents: lineTotalCents,
      currency: product.currency
    });
  });

  return [...groups.values()];
}

export function cartSubtotal(groups: StoreCartGroup[]) {
  return groups.reduce((total, group) => total + group.subtotalCents, 0);
}

export function shippingFor(groups: StoreCartGroup[], subtotalCents: number) {
  if (!groups.length) return 0;
  return subtotalCents >= 9000 ? 0 : groups.length * 490;
}

export function variantSummary(variant: ProductVariant) {
  return variant.attributeValues.map((value) => value.label).join(" / ");
}

function normalizeAddress(value: unknown): AddressSuggestion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<AddressSuggestion>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.label !== "string" ||
    typeof candidate.street !== "string" ||
    typeof candidate.postalCode !== "string" ||
    typeof candidate.city !== "string" ||
    typeof candidate.country !== "string"
  ) {
    return undefined;
  }
  return {
    id: candidate.id,
    label: candidate.label,
    street: candidate.street,
    postalCode: candidate.postalCode,
    city: candidate.city,
    country: candidate.country
  };
}
