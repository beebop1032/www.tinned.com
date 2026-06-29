import type { Block } from "@/lib/blocks";

export function StatsBlock({ block }: { block: Extract<Block, { type: "stats" }> }) {
  return (
    <section className="container section">
      <div className="stats-grid">
        {block.items.map((s, i) => (
          <div key={i} className="stat">
            <span className="stat-value">{s.value}</span>
            <span className="eyebrow">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
