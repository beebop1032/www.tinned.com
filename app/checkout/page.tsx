import type { Metadata } from "next";
import { CheckoutClient } from "@/components/CheckoutClient";
import { getProducts } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutPage() {
  const products = await getProducts();
  return <CheckoutClient products={products.map(toCartProduct)} />;
}
