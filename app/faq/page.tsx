import type { Metadata } from "next";
import { getFaq } from "@/lib/api";
import { FaqSection } from "@/components/FaqSection";
import { generalFaq, type FaqItem } from "@/lib/faq-content";

export const metadata: Metadata = {
  title: "FAQ — commandes, livraison, paiement et boutiques",
  description: "Toutes les réponses sur Tinned : commander, pré-commander, moyens de paiement, livraison en Belgique et vendre sur la marketplace.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faq = await getFaq();

  // Contenu du back s'il existe, sinon la FAQ éditoriale de secours (toujours du contenu + schema).
  const remote: FaqItem[] = (faq?.sections ?? [])
    .map((s) => ({ q: (s.question ?? s.title) ?? "", a: (s.answer ?? s.body) ?? "" }))
    .filter((item) => item.q && item.a);
  const items = remote.length > 0 ? remote : generalFaq;

  return (
    <FaqSection
      items={items}
      eyebrow="Aide"
      title={faq?.title || "Questions fréquentes"}
    />
  );
}
