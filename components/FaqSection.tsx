import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import type { FaqItem } from "@/lib/faq-content";

/**
 * Section FAQ accessible (accordéon natif <details>, lisible sans JS) qui émet aussi
 * le balisage FAQPage pour les résultats enrichis Google. `id` sert d'ancre (#faq).
 */
export function FaqSection({
  items,
  title = "Questions fréquentes",
  eyebrow,
  id = "faq",
}: {
  items: FaqItem[];
  title?: string;
  eyebrow?: string;
  id?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="container section faq-section" id={id} aria-label={title}>
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }}
      />
      <div className="faq-head">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <div className="faq-list">
        {items.map((item, index) => (
          <details className="faq-item" key={index}>
            <summary>
              <span>{item.q}</span>
              <svg className="faq-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
