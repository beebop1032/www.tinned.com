"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Plane,
  Printer,
  Store
} from "lucide-react";
import { AUTH_STORAGE_KEY, normalizeSession, sessionHasRole, type TinnedSession } from "@/lib/auth";
import { AdminLogin } from "@/components/admin/AdminLogin";

type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean; tone?: string };
type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Pilotage",
    items: [{ href: "/admin", label: "Vue d'ensemble", icon: <LayoutDashboard size={18} aria-hidden />, exact: true }]
  },
  {
    title: "Catalogue",
    items: [
      { href: "/admin/store-box", label: "Store Box", icon: <Store size={18} aria-hidden />, tone: "tone-store" },
      { href: "/admin/business-box", label: "Business Box", icon: <Building2 size={18} aria-hidden />, tone: "tone-business" },
      { href: "/admin/blog-box", label: "Blog Box", icon: <Boxes size={18} aria-hidden />, tone: "tone-blog" },
      { href: "/admin/travel-box", label: "Travel Box", icon: <Plane size={18} aria-hidden />, tone: "tone-travel" }
    ]
  },
  {
    title: "Ventes",
    items: [
      { href: "/admin/orders", label: "Commandes", icon: <ClipboardList size={18} aria-hidden /> },
      { href: "/admin/shipping-labels", label: "Étiquettes", icon: <Printer size={18} aria-hidden /> }
    ]
  },
  {
    title: "Contenu",
    items: [
      { href: "/admin/vendor-page", label: "Page Fournisseurs", icon: <Handshake size={18} aria-hidden /> },
      { href: "/admin/newsletter", label: "Newsletter", icon: <Mail size={18} aria-hidden /> }
    ]
  }
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<TinnedSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const readSession = () => {
      setSession(normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null")));
      setReady(true);
    };
    readSession();
    window.addEventListener("tinned-auth-updated", readSession);
    return () => window.removeEventListener("tinned-auth-updated", readSession);
  }, []);

  const logout = () => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event("tinned-auth-updated"));
    setSession(null);
  };

  if (!ready) {
    return (
      <div className="admin-boot">
        <Loader2 className="spin" size={28} aria-hidden />
        <span>Chargement du back-office</span>
      </div>
    );
  }

  if (!sessionHasRole(session, "ROLE_ADMIN")) {
    return <AdminLogin onLogin={setSession} />;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img className="admin-sidebar-logo" src="/tinned-assets/logo-tinned-color.svg" alt="" width={26} height={30} aria-hidden />
          <div>
            <strong>Tinned</strong>
            <span>Back-office</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Navigation back-office">
          {NAV.map((group) => (
            <div className="admin-sidebar-group" key={group.title}>
              <p className="admin-sidebar-label">{group.title}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-side-link ${item.tone ?? ""} ${isActive(pathname, item) ? "is-active" : ""}`}
                  aria-current={isActive(pathname, item) ? "page" : undefined}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="admin-sidebar-avatar">{(session?.email ?? "A").charAt(0).toUpperCase()}</span>
            <div>
              <strong>Administrateur</strong>
              <span>{session?.email ?? ""}</span>
            </div>
          </div>
          <button type="button" className="admin-sidebar-logout" onClick={logout}>
            <LogOut size={16} aria-hidden />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
