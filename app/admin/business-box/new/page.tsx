import type { Metadata } from "next";
import { BoxCreateClient } from "@/components/admin/BoxCreateClient";

export const metadata: Metadata = {
  title: "Admin - Nouvelle Business Box"
};

export default function AdminBusinessBoxCreatePage() {
  return <BoxCreateClient type="business" />;
}
