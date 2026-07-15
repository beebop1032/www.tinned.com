import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Inter, Geist_Mono } from "next/font/google";
import { SiteFrame } from "@/components/SiteFrame";
import "./globals.css";

const GA_ID = "G-DTTZ38WPK1";

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
        <SiteFrame>{children}</SiteFrame>
        {/* Google Analytics (gtag.js) — chargé uniquement en production pour ne pas
            polluer les statistiques avec le trafic de développement. */}
        {process.env.NODE_ENV === "production" ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-gtag" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
