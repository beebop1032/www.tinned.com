import type { Box, LandingPage } from "@/lib/types";
import { HeroBlock } from "./blocks/HeroBlock";
import { RichTextBlock } from "./blocks/RichTextBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { CtaBlock } from "./blocks/CtaBlock";
import { CollectionBlock } from "./blocks/CollectionBlock";
import { FeaturesBlock } from "./blocks/FeaturesBlock";
import { StatsBlock } from "./blocks/StatsBlock";
import { TestimonialBlock } from "./blocks/TestimonialBlock";
import { FaqBlock } from "./blocks/FaqBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";

export async function LandingBlocks({ landing, box }: { landing: LandingPage; box?: Box | null }) {
  return (
    <>
      {landing.blocks.map((block) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={block.id} block={block} />;
          case "richText": return <RichTextBlock key={block.id} block={block} />;
          case "gallery": return <GalleryBlock key={block.id} block={block} />;
          case "cta": return <CtaBlock key={block.id} block={block} />;
          case "collection": return box ? <CollectionBlock key={block.id} block={block} box={box} /> : null;
          case "features": return <FeaturesBlock key={block.id} block={block} />;
          case "stats": return <StatsBlock key={block.id} block={block} />;
          case "testimonial": return <TestimonialBlock key={block.id} block={block} />;
          case "faq": return <FaqBlock key={block.id} block={block} />;
          case "video": return <VideoBlock key={block.id} block={block} />;
          case "newsletter": return <NewsletterBlock key={block.id} block={block} />;
          default: return null;
        }
      })}
    </>
  );
}
