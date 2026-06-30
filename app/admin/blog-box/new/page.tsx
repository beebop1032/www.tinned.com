import type { Metadata } from "next";
import { BoxCreateClient } from "@/components/admin/BoxCreateClient";

export const metadata: Metadata = {
  title: "Admin - Nouvelle Blog Box"
};

export default function AdminBlogBoxCreatePage() {
  return <BoxCreateClient type="blog" />;
}
