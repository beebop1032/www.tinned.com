"use client";

import type { Block, Cta } from "../../lib/blocks";

type Props<T extends Block> = { block: T; onChange: (b: Block) => void };

// ─── Hero ────────────────────────────────────────────────────────────────────

function HeroFields({ block, onChange }: Props<Extract<Block, { type: "hero" }>>) {
  const cta: Cta = block.cta ?? { label: "", href: "" };
  return (
    <>
      <label className="field">
        <span>Titre</span>
        <input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
      <label className="field">
        <span>Sous-titre</span>
        <input value={block.subtitle ?? ""} onChange={(e) => onChange({ ...block, subtitle: e.target.value })} />
      </label>
      <label className="field">
        <span>Chemin image</span>
        <input value={block.imagePath ?? ""} onChange={(e) => onChange({ ...block, imagePath: e.target.value })} />
      </label>
      <label className="field">
        <span>CTA — libellé</span>
        <input value={cta.label} onChange={(e) => onChange({ ...block, cta: { ...cta, label: e.target.value } })} />
      </label>
      <label className="field">
        <span>CTA — lien</span>
        <input value={cta.href} onChange={(e) => onChange({ ...block, cta: { ...cta, href: e.target.value } })} />
      </label>
    </>
  );
}

// ─── Rich Text ───────────────────────────────────────────────────────────────

function RichTextFields({ block, onChange }: Props<Extract<Block, { type: "richText" }>>) {
  return (
    <label className="field field-full">
      <span>Markdown</span>
      <textarea rows={4} value={block.markdown} onChange={(e) => onChange({ ...block, markdown: e.target.value })} />
    </label>
  );
}

// ─── Gallery ─────────────────────────────────────────────────────────────────

function GalleryFields({ block, onChange }: Props<Extract<Block, { type: "gallery" }>>) {
  return (
    <>
      {block.images.map((img, i) => (
        <div key={i} className="admin-form-grid">
          <label className="field">
            <span>Chemin</span>
            <input
              value={img.path}
              onChange={(e) => {
                const images = [...block.images];
                images[i] = { ...images[i], path: e.target.value };
                onChange({ ...block, images });
              }}
            />
          </label>
          <label className="field">
            <span>Légende</span>
            <input
              value={img.caption ?? ""}
              onChange={(e) => {
                const images = [...block.images];
                images[i] = { ...images[i], caption: e.target.value };
                onChange({ ...block, images });
              }}
            />
          </label>
          <button type="button" onClick={() => onChange({ ...block, images: block.images.filter((_, j) => j !== i) })}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ ...block, images: [...block.images, { path: "" }] })}>
        + Ajouter
      </button>
    </>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CtaFields({ block, onChange }: Props<Extract<Block, { type: "cta" }>>) {
  return (
    <>
      <label className="field field-full">
        <span>Accroche</span>
        <input value={block.heading} onChange={(e) => onChange({ ...block, heading: e.target.value })} />
      </label>
      <label className="field field-full">
        <span>Texte</span>
        <textarea rows={4} value={block.text ?? ""} onChange={(e) => onChange({ ...block, text: e.target.value })} />
      </label>
      <label className="field">
        <span>Bouton — libellé</span>
        <input
          value={block.button.label}
          onChange={(e) => onChange({ ...block, button: { ...block.button, label: e.target.value } })}
        />
      </label>
      <label className="field">
        <span>Bouton — lien</span>
        <input
          value={block.button.href}
          onChange={(e) => onChange({ ...block, button: { ...block.button, href: e.target.value } })}
        />
      </label>
    </>
  );
}

// ─── Collection ──────────────────────────────────────────────────────────────

const COLLECTION_SOURCES = ["products", "articles", "trips", "childBoxes"] as const;
const COLLECTION_SOURCE_LABELS: Record<(typeof COLLECTION_SOURCES)[number], string> = {
  products: "Produits",
  articles: "Articles",
  trips: "Voyages",
  childBoxes: "Sous-boxes",
};

function CollectionFields({ block, onChange }: Props<Extract<Block, { type: "collection" }>>) {
  return (
    <>
      <label className="field">
        <span>Source</span>
        <select
          value={block.source}
          onChange={(e) =>
            onChange({ ...block, source: e.target.value as (typeof COLLECTION_SOURCES)[number] })
          }
        >
          {COLLECTION_SOURCES.map((s) => (
            <option key={s} value={s}>
              {COLLECTION_SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Titre</span>
        <input value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
      <label className="field">
        <span>Limite</span>
        <input
          type="number"
          value={block.limit ?? ""}
          onChange={(e) => onChange({ ...block, limit: Number(e.target.value) || undefined })}
        />
      </label>
    </>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

function FeaturesFields({ block, onChange }: Props<Extract<Block, { type: "features" }>>) {
  return (
    <>
      <label className="field field-full">
        <span>Titre</span>
        <input value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
      {block.items.map((it, i) => (
        <div key={i} className="admin-form-grid">
          <label className="field">
            <span>Icône</span>
            <input
              value={it.icon ?? ""}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], icon: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <label className="field">
            <span>Titre</span>
            <input
              value={it.title}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], title: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <label className="field field-full">
            <span>Texte</span>
            <input
              value={it.text}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], text: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...block, items: [...block.items, { title: "", text: "" }] })}
      >
        + Ajouter
      </button>
    </>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function StatsFields({ block, onChange }: Props<Extract<Block, { type: "stats" }>>) {
  return (
    <>
      {block.items.map((it, i) => (
        <div key={i} className="admin-form-grid">
          <label className="field">
            <span>Valeur</span>
            <input
              value={it.value}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], value: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <label className="field">
            <span>Libellé</span>
            <input
              value={it.label}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], label: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...block, items: [...block.items, { value: "", label: "" }] })}
      >
        + Ajouter
      </button>
    </>
  );
}

// ─── Testimonial ─────────────────────────────────────────────────────────────

function TestimonialFields({ block, onChange }: Props<Extract<Block, { type: "testimonial" }>>) {
  return (
    <>
      <label className="field field-full">
        <span>Citation</span>
        <textarea rows={4} value={block.quote} onChange={(e) => onChange({ ...block, quote: e.target.value })} />
      </label>
      <label className="field">
        <span>Auteur</span>
        <input value={block.author ?? ""} onChange={(e) => onChange({ ...block, author: e.target.value })} />
      </label>
      <label className="field">
        <span>Rôle</span>
        <input value={block.role ?? ""} onChange={(e) => onChange({ ...block, role: e.target.value })} />
      </label>
    </>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

function FaqFields({ block, onChange }: Props<Extract<Block, { type: "faq" }>>) {
  return (
    <>
      <label className="field field-full">
        <span>Titre</span>
        <input value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
      {block.items.map((it, i) => (
        <div key={i} className="admin-form-grid">
          <label className="field field-full">
            <span>Question</span>
            <input
              value={it.question}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], question: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <label className="field field-full">
            <span>Réponse</span>
            <textarea
              rows={3}
              value={it.answer}
              onChange={(e) => {
                const items = [...block.items];
                items[i] = { ...items[i], answer: e.target.value };
                onChange({ ...block, items });
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })}
      >
        + Ajouter
      </button>
    </>
  );
}

// ─── Video ───────────────────────────────────────────────────────────────────

function VideoFields({ block, onChange }: Props<Extract<Block, { type: "video" }>>) {
  return (
    <>
      <label className="field field-full">
        <span>URL</span>
        <input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
      </label>
      <label className="field field-full">
        <span>Titre</span>
        <input value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
    </>
  );
}

// ─── Newsletter ──────────────────────────────────────────────────────────────

function NewsletterFields({ block, onChange }: Props<Extract<Block, { type: "newsletter" }>>) {
  const cta: Cta = block.cta ?? { label: "", href: "" };
  return (
    <>
      <label className="field field-full">
        <span>Eyebrow</span>
        <input value={block.eyebrow ?? ""} onChange={(e) => onChange({ ...block, eyebrow: e.target.value })} />
      </label>
      <label className="field field-full">
        <span>Titre</span>
        <input value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
      </label>
      <label className="field field-full">
        <span>Corps</span>
        <textarea rows={4} value={block.body ?? ""} onChange={(e) => onChange({ ...block, body: e.target.value })} />
      </label>
      <label className="field">
        <span>CTA — libellé</span>
        <input value={cta.label} onChange={(e) => onChange({ ...block, cta: { ...cta, label: e.target.value } })} />
      </label>
      <label className="field">
        <span>CTA — lien</span>
        <input value={cta.href} onChange={(e) => onChange({ ...block, cta: { ...cta, href: e.target.value } })} />
      </label>
    </>
  );
}

// ─── BlockForm (dispatcher) ──────────────────────────────────────────────────

export function BlockForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "hero":
      return <HeroFields block={block} onChange={onChange} />;
    case "richText":
      return <RichTextFields block={block} onChange={onChange} />;
    case "gallery":
      return <GalleryFields block={block} onChange={onChange} />;
    case "cta":
      return <CtaFields block={block} onChange={onChange} />;
    case "collection":
      return <CollectionFields block={block} onChange={onChange} />;
    case "features":
      return <FeaturesFields block={block} onChange={onChange} />;
    case "stats":
      return <StatsFields block={block} onChange={onChange} />;
    case "testimonial":
      return <TestimonialFields block={block} onChange={onChange} />;
    case "faq":
      return <FaqFields block={block} onChange={onChange} />;
    case "video":
      return <VideoFields block={block} onChange={onChange} />;
    case "newsletter":
      return <NewsletterFields block={block} onChange={onChange} />;
  }
}
