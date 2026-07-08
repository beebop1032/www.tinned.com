import type { Metadata } from "next";
import { ReviewsClient } from "@/components/admin/ReviewsClient";

export const metadata: Metadata = {
  title: "Admin - Avis"
};

export default function AdminReviewsPage() {
  return <ReviewsClient />;
}
