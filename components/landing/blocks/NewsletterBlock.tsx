import type { Block } from "@/lib/blocks";

export function NewsletterBlock({ block }: { block: Extract<Block, { type: "newsletter" }> }) {
  return (
    <section className="container section">
      <div className="admin-panel" style={{ textAlign: "center" }}>
        {block.eyebrow ? <span className="eyebrow">{block.eyebrow}</span> : null}
        <h2>{block.title}</h2>
        {block.body ? <p>{block.body}</p> : null}
        {block.cta ? <a className="button" href={block.cta.href}>{block.cta.label}</a> : null}
      </div>
    </section>
  );
}
