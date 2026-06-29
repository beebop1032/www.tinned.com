import type { Block } from "@/lib/blocks";

export function CtaBlock({ block }: { block: Extract<Block, { type: "cta" }> }) {
  return (
    <section className="container section">
      <div className="admin-panel" style={{ textAlign: "center" }}>
        <h2>{block.heading}</h2>
        {block.text ? <p>{block.text}</p> : null}
        <a className="button" href={block.button.href}>{block.button.label}</a>
      </div>
    </section>
  );
}
