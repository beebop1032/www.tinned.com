import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function HeroBlock({ block }: { block: Extract<Block, { type: "hero" }> }) {
  return (
    <section className="container hero">
      <div className="hero-copy">
        <h1>{block.title}</h1>
        {block.subtitle ? <p>{block.subtitle}</p> : null}
        {block.cta ? <a className="button" href={block.cta.href}>{block.cta.label}</a> : null}
      </div>
      {block.imagePath ? (
        <div className="hero-visual">
          <Image src={block.imagePath} alt={block.title} width={600} height={400} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </div>
      ) : null}
    </section>
  );
}
