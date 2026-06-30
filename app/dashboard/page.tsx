import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export const metadata: Metadata = { robots: { index: false } };

export default function DashboardPage() {
  return (
    <div style={{ display: "grid", gap: "32px" }}>
      {/* Header */}
      <div>
        <div style={{ display: "block", width: "32px", height: "1px", background: "var(--amber)", marginBottom: "12px" }} />
        <h1 style={{
          fontFamily: "var(--font-brand), sans-serif",
          fontSize: "clamp(30px, 4vw, 40px)",
          fontWeight: 700,
          color: "var(--deep)",
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: "-0.025em"
        }}>
          Tableau de bord
        </h1>
        <p style={{ color: "var(--muted)", margin: "8px 0 0", fontSize: "15px" }}>
          Gérez vos Boxes, produits et commandes.
        </p>
      </div>

      {/* Real selling stats (best-effort; renders nothing until loaded) */}
      <DashboardOverview />

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {[
          { href: "/dashboard/boxes/new", label: "Créer une Box", desc: "Boutique, vitrine, blog ou voyage", color: "var(--forest)" },
          { href: "/dashboard/boxes", label: "Mes Boxes", desc: "Gérer mes espaces en ligne", color: "var(--deep)" },
          { href: "/dashboard/orders", label: "Commandes", desc: "Voir les commandes reçues", color: "var(--amber)" },
        ].map(({ href, label, desc, color }) => (
          <a key={href} href={href} style={{
            display: "grid",
            gap: "8px",
            padding: "20px 22px",
            background: "#fff",
            border: "1px solid var(--stone)",
            borderRadius: "2px",
            textDecoration: "none",
            transition: "box-shadow 180ms ease, transform 180ms ease"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: color
            }} />
            <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: "15px" }}>{label}</div>
            <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 400 }}>{desc}</div>
          </a>
        ))}
      </div>

      {/* Intro text */}
      <div style={{
        padding: "24px 28px",
        background: "linear-gradient(135deg, rgba(30, 77, 58, 0.06), rgba(196, 120, 26, 0.04))",
        border: "1px solid var(--stone)",
        borderRadius: "2px"
      }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--ink)", fontWeight: 600 }}>Bienvenue dans votre espace vendeur.</strong><br />
          Créez votre première Box, ajoutez vos produits ou articles, et commencez à vendre sur Tinned.
          Chaque Box a sa propre URL publique et son backoffice dédié.
        </p>
      </div>
    </div>
  );
}
