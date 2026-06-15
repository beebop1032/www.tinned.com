import type { Metadata } from "next";
import { CartClient } from "@/components/CartClient";
import { getProducts } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

export default async function CartPage() {
  const products = await getProducts();
  return <CartClient products={products.map(toCartProduct)} />;
}
