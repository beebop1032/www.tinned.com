import type { Metadata } from "next";
import { getFaq } from "@/lib/api";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Réponses aux questions fréquentes sur Tinned — commandes, livraisons, paiements et boutiques.",
};

export default async function FaqPage() {
  const faq = await getFaq();

  if (!faq) {
    return (
      <section className="container section">
        <p className="text-gray-500">La FAQ n&apos;est pas disponible pour le moment.</p>
      </section>
    );
  }

  const questions = faq.sections.filter((s) => (s.question ?? s.title) && (s.answer ?? s.body));

  return (
    <>
      {questions.length > 0 && (
        <SchemaJsonLd data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: questions.map((s) => ({
            "@type": "Question",
            name: s.question ?? s.title,
            acceptedAnswer: { "@type": "Answer", text: s.answer ?? s.body },
          })),
        }} />
      )}
      <section className="container section">
        <h1 className="page-title">{faq.title}</h1>
        <div className="grid">
          {faq.sections.map((section, index) => (
            <article className="card" key={`${section.question}-${index}`}>
              <h3>{section.question ?? section.title}</h3>
              <p>{section.answer ?? section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
