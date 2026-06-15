import type { Metadata } from "next";
import { OrderConfirmationClient } from "@/components/OrderConfirmationClient";
import { getProducts } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutConfirmationPage() {
  const products = await getProducts();
  return <OrderConfirmationClient products={products.map(toCartProduct)} />;
}
