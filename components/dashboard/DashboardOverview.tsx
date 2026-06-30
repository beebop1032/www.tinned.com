"use client";

import { useEffect, useState } from "react";
import { readStoredSession } from "@/lib/auth";
import { fetchDashboardStats, type DashboardStats } from "@/lib/vendor-api";
import { money } from "@/lib/format";

function Sparkline({ data }: { data: { date: string; revenueCents: number }[] }) {
  const max = Math.max(1, ...data.map((point) => point.revenueCents));
  const width = 100;
  const height = 32;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((point, index) => `${(index * step).toFixed(2)},${(height - (point.revenueCents / max) * height).toFixed(2)}`);
  const line = points.join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: "60px", display: "block" }}>
      <polygon points={area} fill="rgba(1,126,122,0.10)" />
      <polyline points={line} fill="none" stroke="var(--forest)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = readStoredSession();
    if (!session?.token) {
      setLoading(false);
      return;
    }
    let active = true;
    fetchDashboardStats(session.token)
      .then((next) => { if (active) setStats(next); })
      .catch(() => { /* KPIs are best-effort: the quick actions below stay usable. */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !stats) return null;

  const kpis = [
    { label: "Chiffre d'affaires", value: money(stats.revenueCents, "EUR"), tone: "var(--forest)" },
    { label: "Commandes payées", value: String(stats.paidOrderCount), tone: "var(--deep)" },
    { label: "Panier moyen", value: money(stats.averageOrderValueCents, "EUR"), tone: "var(--amber)" },
    { label: "À préparer", value: String(stats.toPrepareCount), tone: "var(--coral, #e4572e)" },
  ];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        {kpis.map(({ label, value, tone }) => (
          <div key={label} style={{ padding: "18px 20px", background: "#fff", border: "1px solid var(--stone)", borderRadius: "2px" }}>
            <div style={{ width: "24px", height: "2px", background: tone, marginBottom: "12px" }} />
            <div style={{ fontFamily: "var(--font-brand), sans-serif", fontSize: "26px", fontWeight: 700, color: "var(--deep)" }}>{value}</div>
            <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 22px", background: "#fff", border: "1px solid var(--stone)", borderRadius: "2px" }}>
        <div style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>Ventes — 30 derniers jours</div>
        <Sparkline data={stats.revenueByDay} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
        <div style={{ padding: "20px 22px", background: "#fff", border: "1px solid var(--stone)", borderRadius: "2px" }}>
          <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>Top produits</div>
          {stats.topProducts.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>Aucune vente pour l'instant.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
              {stats.topProducts.map((product) => (
                <li key={product.name} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
                  <span style={{ color: "var(--ink)" }}>{product.name} <span style={{ color: "var(--muted)" }}>× {product.quantity}</span></span>
                  <span style={{ color: "var(--forest)", fontWeight: 600 }}>{money(product.revenueCents, "EUR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ padding: "20px 22px", background: "#fff", border: "1px solid var(--stone)", borderRadius: "2px" }}>
          <div style={{ color: "var(--ink)", fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>Stock bas</div>
          {stats.lowStock.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>Aucune rupture imminente. 👍</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "8px" }}>
              {stats.lowStock.map((variant) => (
                <li key={variant.sku} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px" }}>
                  <span style={{ color: "var(--ink)" }}>{variant.productName} <span style={{ color: "var(--muted)" }}>({variant.sku})</span></span>
                  <span style={{ color: variant.stock === 0 ? "var(--coral, #e4572e)" : "var(--amber)", fontWeight: 600 }}>{variant.stock} en stock</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
