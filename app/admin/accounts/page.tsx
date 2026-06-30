import type { Metadata } from "next";
import { AccountsClient } from "@/components/admin/AccountsClient";

export const metadata: Metadata = {
  title: "Admin - Comptes clients"
};

export default function AdminAccountsPage() {
  return <AccountsClient />;
}
