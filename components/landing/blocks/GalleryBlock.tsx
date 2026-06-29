import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function GalleryBlock({ block }: { block: Extract<Block, { type: "gallery" }> }) {
  return (
    <section className="container section">
      <div className="grid">
        {block.images.map((img, i) => (
          <figure key={i} className="card">
            <Image src={img.path} alt={img.caption ?? ""} width={400} height={300} style={{ objectFit: "cover", width: "100%" }} />
            {img.caption ? <figcaption className="eyebrow">{img.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
