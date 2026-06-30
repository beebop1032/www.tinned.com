import type { Metadata } from "next";
import { StoreBoxDetailClient } from "@/components/admin/StoreBoxDetailClient";

export const metadata: Metadata = {
  title: "Admin - Store Box"
};

export default async function AdminStoreBoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StoreBoxDetailClient storeBoxId={Number(id)} />;
}
