import type { Metadata } from "next";
import { StandaloneLandingsClient } from "@/components/admin/StandaloneLandingsClient";

export const metadata: Metadata = {
  title: "Admin - Landing pages"
};

export default function AdminLandingPagesPage() {
  return <StandaloneLandingsClient />;
}
