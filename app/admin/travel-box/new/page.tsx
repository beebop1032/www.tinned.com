import type { Metadata } from "next";
import { BoxCreateClient } from "@/components/admin/BoxCreateClient";

export const metadata: Metadata = {
  title: "Admin - Nouvelle Travel Box"
};

export default function AdminTravelBoxCreatePage() {
  return <BoxCreateClient type="travel" />;
}
