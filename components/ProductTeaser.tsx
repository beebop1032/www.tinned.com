import { CalendarClock, PackageX, Sparkles } from "lucide-react";
import { NotifyMeForm } from "@/components/NotifyMeForm";
import type { Product } from "@/lib/types";

type Kind = "coming_soon" | "sold_out";

const COPY: Record<Kind, { badge: string; icon: typeof Sparkles; title: string; body: string }> = {
  coming_soon: {
    badge: "Teaser",
    icon: Sparkles,
    title: "Bientôt disponible",
    body: "Ce produit se prépare. Laissez-nous votre email pour être prévenu·e en avant-première dès son lancement.",
  },
  sold_out: {
    badge: "Épuisé",
    icon: PackageX,
    title: "Victime de son succès",
    body: "Ce produit est momentanément en rupture. Soyez le·la premier·ère informé·e du retour en stock.",
  },
};

export function ProductTeaser({
  product,
  kind,
  releaseLabel,
}: {
  product: Product;
  kind: Kind;
  releaseLabel?: string | null;
}) {
  const copy = COPY[kind];
  const Icon = copy.icon;

  return (
    <div className="product-teaser">
      <span className={`product-teaser-badge product-teaser-badge--${kind}`}>
        <Icon size={14} aria-hidden />
        {copy.badge}
      </span>
      <h2 className="product-teaser-title">{copy.title}</h2>
      {kind === "coming_soon" && releaseLabel ? (
        <p className="product-teaser-date">
          <CalendarClock size={16} aria-hidden />
          Disponible le {releaseLabel}
        </p>
      ) : null}
      <p className="product-teaser-body">{copy.body}</p>
      <NotifyMeForm
        targetType="product"
        productIri={`/api/products/${product.id}`}
        productName={product.name}
      />
    </div>
  );
}
