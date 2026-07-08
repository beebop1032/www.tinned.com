"use client";

import Image from "next/image";
import { useState } from "react";

/** Image principale + vignettes cliquables quand le produit a plusieurs photos. */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.filter((src) => src?.trim());
  const [active, setActive] = useState(0);
  const main = list[active] ?? "/tinned-assets/box-store.svg";

  return (
    <div className="product-gallery">
      <div className="product-image">
        <Image src={main} alt={alt} width={250} height={250} priority />
      </div>
      {list.length > 1 ? (
        <div className="product-gallery-thumbs" role="tablist" aria-label="Photos du produit">
          {list.map((src, index) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Photo ${index + 1}`}
              className={`product-gallery-thumb${index === active ? " is-active" : ""}`}
              onClick={() => setActive(index)}
            >
              <Image src={src} alt="" width={76} height={76} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
