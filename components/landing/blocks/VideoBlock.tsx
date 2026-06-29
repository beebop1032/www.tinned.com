import type { Block } from "@/lib/blocks";

export function VideoBlock({ block }: { block: Extract<Block, { type: "video" }> }) {
  return (
    <section className="container section">
      <div className="video-embed">
        <iframe src={block.url} title={block.title ?? "video"} allowFullScreen />
      </div>
    </section>
  );
}
