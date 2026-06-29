import type { Block } from "@/lib/blocks";

export function FaqBlock({ block }: { block: Extract<Block, { type: "faq" }> }) {
  return (
    <section className="container section">
      {block.title ? (
        <div className="section-header"><h2>{block.title}</h2></div>
      ) : null}
      {block.items.map((f, i) => (
        <details key={i} className="faq-item">
          <summary>{f.question}</summary>
          <p>{f.answer}</p>
        </details>
      ))}
    </section>
  );
}
