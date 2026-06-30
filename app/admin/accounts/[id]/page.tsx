import type { Metadata } from "next";
import { AccountDetailClient } from "@/components/admin/AccountDetailClient";

export const metadata: Metadata = {
  title: "Admin - Compte client"
};

export default async function AdminAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountDetailClient userId={Number(id)} />;
}
