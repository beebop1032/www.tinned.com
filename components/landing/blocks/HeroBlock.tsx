import type { Box } from "@/lib/types";
import type { Block } from "@/lib/blocks";
import { BoxHero } from "@/components/BoxHero";

export function HeroBlock({ block, box }: { block: Extract<Block, { type: "hero" }>; box?: Box | null }) {
  return (
    <BoxHero
      title={block.title}
      subtitle={block.subtitle}
      cover={block.imagePath || box?.coverPath}
      logo={box?.logoPath}
    >
      {block.cta ? <a className="button" href={block.cta.href}>{block.cta.label}</a> : null}
    </BoxHero>
  );
}
