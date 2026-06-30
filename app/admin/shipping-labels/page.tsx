import type { Metadata } from "next";
import { ShippingLabelsAdminClient } from "@/components/ShippingLabelsAdminClient";

export const metadata: Metadata = {
  title: "Admin - Étiquettes d'expédition"
};

export default function AdminShippingLabelsPage() {
  return <ShippingLabelsAdminClient />;
}
