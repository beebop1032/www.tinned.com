import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readVendorPage } from "@/lib/vendor-page";
import { FaqSection } from "@/components/FaqSection";
import { sellerFaq } from "@/lib/faq-content";

export const metadata: Metadata = {
  title: "Vendre sur Tinned — ouvrez votre boutique en ligne",
  description: "Vendez vos produits artisanaux sur Tinned, la marketplace belge des créateurs indépendants. Ouvrez votre Store Box en quelques minutes, sans frais d'inscription.",
  alternates: { canonical: "/vendre" },
};

export const dynamic = "force-dynamic";

export default function VendrePage() {
  const data = readVendorPage();
  if (!data || !data.published) notFound();

  return (
    <>
      <section style={{ maxWidth: "680px", margin: "0 auto", padding: "clamp(48px, 8vw, 96px) 24px 0" }}>
        <p className="eyebrow">{data.eyebrow}</p>
        <h1 style={{ marginTop: "8px", marginBottom: "16px" }}>{data.title}</h1>
        <p className="lead" style={{ marginBottom: "32px" }}>{data.tagline}</p>
        <div style={{ marginBottom: "40px" }}>
          <p style={{ whiteSpace: "pre-line" }}>{data.body}</p>
        </div>
        <a
          className="button"
          href={data.cta.url}
          style={{ backgroundColor: "var(--teal)", color: "#fff", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {data.cta.label}
        </a>
      </section>
      <FaqSection items={sellerFaq} eyebrow="Vendeurs" title="Vendre sur Tinned : vos questions" />
    </>
  );
}
