import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Travel Box"
};

export default function AdminTravelBoxPage() {
  return <AdminDashboardClient section="travel" />;
}
