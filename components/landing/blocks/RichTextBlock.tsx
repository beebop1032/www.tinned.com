import ReactMarkdown from "react-markdown";
import type { Block } from "@/lib/blocks";

export function RichTextBlock({ block }: { block: Extract<Block, { type: "richText" }> }) {
  return (
    <section className="container section">
      <div className="prose"><ReactMarkdown>{block.markdown}</ReactMarkdown></div>
    </section>
  );
}
