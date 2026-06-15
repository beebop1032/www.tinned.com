import type { Metadata } from "next";
import { AuthClient } from "@/components/AuthClient";

export const metadata: Metadata = { robots: { index: false } };

export default function AuthPage() {
  return <AuthClient />;
}
