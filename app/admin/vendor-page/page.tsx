import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Page Fournisseurs"
};

export default function AdminVendorPagePage() {
  return <AdminDashboardClient section="vendor-page" />;
}
