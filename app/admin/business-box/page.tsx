import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Business Box"
};

export default function AdminBusinessBoxPage() {
  return <AdminDashboardClient section="business" />;
}
