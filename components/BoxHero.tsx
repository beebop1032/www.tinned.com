import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Hero commun aux pages box et aux landings : la cover en fond (avec voile sombre
 * pour la lisibilité), le logo de la boutique au-dessus du titre. Sans cover,
 * retombe sur le bandeau crème compact.
 */
export function BoxHero({
  eyebrow,
  title,
  subtitle,
  cover,
  logo,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  cover?: string | null;
  logo?: string | null;
  children?: ReactNode;
}) {
  const hasCover = Boolean(cover?.trim());
  const hasLogo = Boolean(logo?.trim());

  return (
    <section
      className={`container hero ${hasCover ? "hero--cover" : "hero--plain"}`}
      style={
        hasCover
          ? { backgroundImage: `linear-gradient(180deg, rgba(8, 34, 32, 0.28) 0%, rgba(8, 34, 32, 0.62) 100%), url(${cover})` }
          : undefined
      }
    >
      <div className="hero-content">
        {hasLogo ? (
          <div className="hero-boxlogo" aria-hidden>
            <Image className="hero-boxlogo__shell" src="/tinned-assets/simple-box.svg" alt="" width={168} height={168} />
            <span className="hero-boxlogo__logo">
              <Image src={logo!} alt="" width={96} height={96} />
            </span>
          </div>
        ) : null}
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
      </div>
    </section>
  );
}
