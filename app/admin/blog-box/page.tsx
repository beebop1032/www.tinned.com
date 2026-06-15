import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Blog Box"
};

export default function AdminBlogBoxPage() {
  return <AdminDashboardClient section="blog" />;
}
