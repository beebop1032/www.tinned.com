import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { UserRound, ShoppingBag, Search } from "lucide-react";
import { Bricolage_Grotesque, Inter, Geist_Mono } from "next/font/google";
import { NavPrimary } from "@/components/NavPrimary";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tinned.com"),
  title: {
    default: "Tinned",
    template: "%s — Tinned"
  },
  description: "Boutiques artisanales, créateurs et carnets de voyage — sélectionnés à la main. Découvrez, comparez et commandez sur Tinned.",
  openGraph: {
    title: "Tinned — Boutiques artisanales, créateurs et carnets de voyage",
    description: "Boutiques artisanales, créateurs et carnets de voyage — sélectionnés à la main. Découvrez, comparez et commandez sur Tinned.",
    url: "https://tinned.com",
    siteName: "Tinned",
    images: [{ url: "/tinned-assets/background-intro.jpg", width: 1200, height: 630, alt: "Tinned — Boutiques artisanales belges" }],
    locale: "fr_BE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${bricolage.variable} ${inter.variable} ${geistMono.variable}`}>
      <body>
        <div className="site-shell">
          <a href="#main-content" className="skip-link">Aller au contenu</a>
          <header className="topbar">
            <div className="topbar-inner">
              <Link className="brand" href="/" aria-label="Tinned">
                <Image
                  src="/tinned-assets/logo-tinned-color.svg"
                  alt=""
                  width={28}
                  height={32}
                  priority
                  aria-hidden
                />
                <span className="brand-word">Tinned.com</span>
              </Link>
              <NavPrimary />
              <nav className="nav nav-actions" aria-label="Actions">
                <Link className="nav-sell" href="/vendre">Vendre</Link>
                <Link className="nav-search" href="/search" aria-label="Recherche">
                  <Search size={15} aria-hidden />
                  <span>Rechercher</span>
                </Link>
                <Link className="nav-account" href="/profile" aria-label="Mon compte">
                  <UserRound size={15} aria-hidden />
                  <span>Compte</span>
                </Link>
                <Link className="nav-cart" href="/cart" aria-label="Panier">
                  <ShoppingBag size={15} aria-hidden />
                  <span>Panier</span>
                </Link>
              </nav>
            </div>
          </header>
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <div className="container footer-grid">
              <div className="footer-brand">
                <p className="brand-word" style={{ fontSize: "28px", color: "#fff", display: "block", marginBottom: "12px" }}>Tinned.com</p>
                <p>Boutiques artisanales, créateurs et carnets de voyage — sélectionnés à la main. Découvrez, comparez, commandez.</p>
              </div>
              <div>
                <h2>Explorer</h2>
                <Link href="/store-box" aria-label="Store Box — boutiques en ligne">Store Box</Link>
                <Link href="/business-box" aria-label="Business Box — vitrines de marques">Business Box</Link>
                <Link href="/blog-box" aria-label="Blog Box — articles et sélections">Blog Box</Link>
                <Link href="/travel-box" aria-label="Travel Box — carnets de voyage">Travel Box</Link>
              </div>
              <div>
                <h2>Acheter</h2>
                <Link href="/cart">Panier</Link>
                <Link href="/checkout">Commander</Link>
                <Link href="/orders">Mes commandes</Link>
              </div>
              <div>
                <h2>Aide</h2>
                <Link href="/faq">FAQ</Link>
                <Link href="/profile">Mon profil</Link>
              </div>
            </div>
            <div className="container footer-bottom">
              <span>© {new Date().getFullYear()} Tinned · BeebopCity</span>
              <span>Boutiques indépendantes · Livraison soignée · Paiement sécurisé</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
