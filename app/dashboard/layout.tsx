"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, ShoppingBag, Box, LogOut } from "lucide-react";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/boxes", label: "Mes Boxes", icon: Box },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = readStoredSession();
    if (sessionHasRole(session, "ROLE_ADMIN")) {
      setAuthorized(true);
    } else {
      router.replace("/admin");
    }
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      minHeight: "calc(100vh - 72px)",
      background: "var(--cream)"
    }}>
      <aside style={{
        background: "var(--deep)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "32px 0",
        borderRight: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
          <div style={{
            fontFamily: "var(--font-brand), sans-serif",
            fontSize: "17px",
            color: "#fff",
            fontWeight: 600
          }}>Mon espace</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "4px", fontWeight: 500 }}>Espace vendeur</div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "14px",
                  textDecoration: "none",
                  transition: "all 150ms ease"
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none"
          }}>
            <LogOut size={14} />
            Retour au site
          </Link>
        </div>
      </aside>

      <main style={{ padding: "clamp(28px, 4vw, 48px)", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
