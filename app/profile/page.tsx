import type { Metadata } from "next";
import { ProfileClient } from "@/components/ProfileClient";
import { getProducts } from "@/lib/api";
import { toCartProduct } from "@/lib/cart";

export const metadata: Metadata = { robots: { index: false } };

export default async function ProfilePage() {
  const products = await getProducts();
  return <ProfileClient products={products.map(toCartProduct)} />;
}
