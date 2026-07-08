import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function GalleryBlock({ block }: { block: Extract<Block, { type: "gallery" }> }) {
  // Jamais d'<img src=""> : une image sans fichier n'est pas rendue.
  const images = block.images.filter((img) => img.path?.trim());
  if (!images.length) return null;
  return (
    <section className="container section">
      <div className="grid">
        {images.map((img, i) => (
          <figure key={i} className="card">
            <Image src={img.path} alt={img.caption ?? ""} width={400} height={300} style={{ objectFit: "cover", width: "100%" }} />
            {img.caption ? <figcaption className="eyebrow">{img.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
