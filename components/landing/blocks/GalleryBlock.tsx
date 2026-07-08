import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function GalleryBlock({ block }: { block: Extract<Block, { type: "gallery" }> }) {
  // Les deux schémas d'auteur coexistent : {path, caption} et {url, alt}.
  const images = block.images
    .map((img) => ({ src: (img.path ?? img.url ?? "").trim(), caption: img.caption ?? img.alt ?? "" }))
    .filter((img) => img.src);
  if (!images.length) return null;

  return (
    <section className="container section">
      <div className="gallery-grid">
        {images.map((img, i) => (
          <figure key={i} className="gallery-item">
            <Image src={img.src} alt={img.caption} width={720} height={540} />
            {img.caption ? <figcaption>{img.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
