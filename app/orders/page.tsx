import type { Metadata } from "next";
import { OrdersClient } from "@/components/OrdersClient";
import { getProducts } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

export default async function OrdersPage() {
  const products = await getProducts();
  return <OrdersClient products={products.map(toCartProduct)} />;
}
