import type { Metadata } from "next";
import { SubscriptionsClient } from "@/components/admin/SubscriptionsClient";

export const metadata: Metadata = {
  title: "Admin - Abonnements"
};

export default function AdminSubscriptionsPage() {
  return <SubscriptionsClient />;
}
