import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readVendorPage } from "@/lib/vendor-page";

export const metadata: Metadata = {
  title: "Devenir fournisseur",
  description: "Rejoignez Tinned et vendez vos produits artisanaux sur notre marketplace belge. Créez votre boutique en quelques minutes.",
};

export const dynamic = "force-dynamic";

export default function VendrePage() {
  const data = readVendorPage();
  if (!data || !data.published) notFound();

  return (
    <section style={{ maxWidth: "680px", margin: "0 auto", padding: "clamp(48px, 8vw, 96px) 24px" }}>
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
  );
}
