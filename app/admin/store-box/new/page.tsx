import type { Metadata } from "next";
import { BoxCreateClient } from "@/components/admin/BoxCreateClient";

export const metadata: Metadata = {
  title: "Admin - Nouvelle Store Box"
};

export default function AdminStoreBoxCreatePage() {
  return <BoxCreateClient type="store" />;
}
