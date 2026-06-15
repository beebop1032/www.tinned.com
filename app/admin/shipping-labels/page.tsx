import type { Metadata } from "next";
import { ShippingLabelsAdminClient } from "@/components/ShippingLabelsAdminClient";

export const metadata: Metadata = {
  title: "Admin - Etiquettes d'expedition"
};

export default function AdminShippingLabelsPage() {
  return <ShippingLabelsAdminClient />;
}
