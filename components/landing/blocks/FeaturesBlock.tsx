import type { Block } from "@/lib/blocks";

export function FeaturesBlock({ block }: { block: Extract<Block, { type: "features" }> }) {
  return (
    <section className="container section">
      {block.title ? (
        <div className="section-header"><h2>{block.title}</h2></div>
      ) : null}
      <div className="grid">
        {block.items.map((item, i) => {
          const text = item.text ?? item.description;
          return (
            <div key={i} className="card">
              {item.icon ? <span className="eyebrow">{item.icon}</span> : null}
              <h3>{item.title}</h3>
              {text ? <p>{text}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
