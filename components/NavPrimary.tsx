"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/store-box", label: "Store Box", aria: "Store Box — boutiques en ligne" },
  { href: "/business-box", label: "Business Box", aria: "Business Box — vitrines de marques" },
  { href: "/blog-box", label: "Blog Box", aria: "Blog Box — articles et sélections" },
  { href: "/travel-box", label: "Travel Box", aria: "Travel Box — carnets de voyage" },
];

export function NavPrimary() {
  const pathname = usePathname();
  return (
    <nav className="nav nav-primary" aria-label="Navigation principale">
      {NAV_ITEMS.map(({ href, label, aria }) => (
        <Link
          key={href}
          href={href}
          aria-label={aria}
          title={aria}
          aria-current={pathname.startsWith(href) ? "page" : undefined}
          className={pathname.startsWith(href) ? "nav-active" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
