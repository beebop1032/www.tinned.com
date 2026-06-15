import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Newsletter"
};

export default function AdminNewsletterPage() {
  return <AdminDashboardClient section="newsletter" />;
}
