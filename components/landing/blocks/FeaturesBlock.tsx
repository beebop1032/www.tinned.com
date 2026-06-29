import type { Block } from "@/lib/blocks";

export function FeaturesBlock({ block }: { block: Extract<Block, { type: "features" }> }) {
  return (
    <section className="container section">
      {block.title ? (
        <div className="section-header"><h2>{block.title}</h2></div>
      ) : null}
      <div className="grid">
        {block.items.map((item, i) => (
          <div key={i} className="card">
            {item.icon ? <span className="eyebrow">{item.icon}</span> : null}
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
