import type { Block } from "@/lib/blocks";

export function TestimonialBlock({ block }: { block: Extract<Block, { type: "testimonial" }> }) {
  return (
    <section className="container section">
      <blockquote className="admin-panel">
        <p>{block.quote}</p>
        {block.author ? (
          <footer className="eyebrow">
            {block.author}{block.role ? ` — ${block.role}` : ""}
          </footer>
        ) : null}
      </blockquote>
    </section>
  );
}
