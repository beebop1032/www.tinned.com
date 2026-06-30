import type { Metadata } from "next";
import { CouponsClient } from "@/components/admin/CouponsClient";

export const metadata: Metadata = {
  title: "Admin - Codes promo"
};

export default function AdminCouponsPage() {
  return <CouponsClient />;
}
