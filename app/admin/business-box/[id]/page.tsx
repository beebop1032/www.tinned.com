import type { Metadata } from "next";
import { BusinessBoxDetailClient } from "@/components/admin/BusinessBoxDetailClient";

export const metadata: Metadata = {
  title: "Admin - Business Box"
};

export default async function AdminBusinessBoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessBoxDetailClient businessBoxId={Number(id)} />;
}
