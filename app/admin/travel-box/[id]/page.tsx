import type { Metadata } from "next";
import { TravelBoxDetailClient } from "@/components/admin/TravelBoxDetailClient";

export const metadata: Metadata = {
  title: "Admin - Travel Box"
};

export default async function AdminTravelBoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TravelBoxDetailClient travelBoxId={Number(id)} />;
}
