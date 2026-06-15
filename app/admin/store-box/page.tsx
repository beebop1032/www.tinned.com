import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Store Box"
};

export default function AdminStoreBoxPage() {
  return <AdminDashboardClient section="store" />;
}
