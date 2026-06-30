import type { Metadata } from "next";
import { StockClient } from "@/components/admin/StockClient";

export const metadata: Metadata = {
  title: "Admin - Stock"
};

export default function AdminStockPage() {
  return <StockClient />;
}
