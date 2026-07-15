import Image from "next/image";
import type { Box, BoxType } from "@/lib/types";

const hrefByType: Record<BoxType, string> = {
  business: "/business-box",
  store: "/store-box",
  blog: "/blog-box",
  travel: "/travel-box"
};

const iconByType: Record<BoxType, string> = {
  business: "/tinned-assets/picto-box-business.svg",
  store: "/tinned-assets/picto-box-store.svg",
  blog: "/tinned-assets/picto-box-blog.svg",
  travel: "/tinned-assets/picto-box-travel.svg"
};

const categoryByType: Record<BoxType, string> = {
  business: "Business Box",
  store: "Store Box",
  blog: "Blog Box",
  travel: "Travel Box"
};

const actionByType: Record<BoxType, string> = {
  business: "Explorer la Business Box",
  store: "Explorer la Store Box",
  blog: "Ouvrir la Blog Box",
  travel: "Ouvrir la Travel Box"
};

const fallbackByType: Record<BoxType, string> = {
  business: "Une marque à découvrir.",
  store: "Une boutique à explorer.",
  blog: "Des contenus pour mieux choisir.",
  travel: "Un carnet de voyage à explorer."
};

export function BoxCard({ box, type }: { box: Box; type: BoxType }) {
  const boxLabel = `${categoryByType[type]} de ${box.name}`;

  return (
    <a className="box box-card" href={`${hrefByType[type]}/${box.slug}`} title={boxLabel}>
      <span className="box-content__like" aria-hidden>
        <Image src="/tinned-assets/ico-pin.svg" alt="" width={18} height={18} />
      </span>
      <div className="box-img">
        <div className="box-img__user">
          <Image className="box-img-container box-shell" src="/tinned-assets/simple-box.svg" alt="" width={268} height={268} />
          <picture className="box-img__user-img">
            <Image src={box.logoPath || iconByType[type]} alt="" width={120} height={120} />
          </picture>
        </div>
      </div>
      <div className="user-meta-container">
        <span className="box-kicker">{boxLabel}</span>
        <ul className="user-meta-container-infos">
          <li className="user-meta-infos-name">
            <Image className="user-meta-typeBox" src={iconByType[type]} alt="" width={20} height={20} />
            <span>{box.name}</span>
          </li>
        </ul>
        <p>{box.tagline || box.description || fallbackByType[type]}</p>
        <span className="box-link">{actionByType[type]}</span>
      </div>
    </a>
  );
}
