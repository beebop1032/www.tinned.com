import type { Metadata } from "next";
import { BlogBoxDetailClient } from "@/components/admin/BlogBoxDetailClient";

export const metadata: Metadata = {
  title: "Admin - Blog Box"
};

export default async function AdminBlogBoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BlogBoxDetailClient blogBoxId={Number(id)} />;
}
