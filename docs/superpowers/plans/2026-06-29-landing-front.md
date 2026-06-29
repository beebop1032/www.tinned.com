# Landing Front Implementation Plan (API catalogue + B rendu + C éditeur)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre et éditer le contenu (blocs) des landing pages de box : endpoint catalogue côté API, rendu front qui remplace le corps de la page box, éditeur visuel backoffice.

**Architecture:** L'API expose `BlockCatalog` à `GET /api/block_catalog` (source de vérité). Le front a un contrat TS miroir (`lib/blocks.ts`), un renderer server-component `LandingBlocks` (11 composants, le `collection` refetch le contenu de la box), et un `LandingEditor` client partagé vendeur/admin (sélecteur de locale, blocs ↑/↓/✕, form par bloc, POST/PATCH).

**Tech Stack:** API : Symfony 7.3 + API Platform 4.1. Front : Next.js 15 (App Router, server components), React 19, TypeScript, CSS global (`globals.css`, pas de Tailwind), `react-markdown` (nouveau). Pas de harnais de tests → vérif = `npm run build` (typecheck) + curl + visuel.

**Spec :** `front/docs/superpowers/specs/2026-06-29-landing-front-design.md`

**Repos / cwd :** Phase 0 → `api/` (`/Users/oliviervangest/Desktop/app/tinned/api`, branche dédiée). Phases B & C → `front/` (`/Users/oliviervangest/Desktop/app/tinned/front`, branche `feat/landing-front`).

---

## Structure des fichiers

**api/** (Phase 0)
| Fichier | Rôle | Action |
|---|---|---|
| `src/ApiResource/BlockCatalogResource.php` | DTO ressource, opération Get `/block_catalog` | Créer |
| `src/State/BlockCatalogProvider.php` | provider renvoyant `BlockCatalog::TYPES` + `COLLECTION_SOURCES` | Créer |

**front/** (Phases B, C)
| Fichier | Rôle | Action |
|---|---|---|
| `lib/types.ts` | + `Block`, `LandingPage` | Modifier |
| `lib/blocks.ts` | types/catalogue + `fetchBlockCatalog()` | Créer |
| `lib/api.ts` | + `getLanding()` | Modifier |
| `components/landing/LandingBlocks.tsx` | renderer | Créer |
| `components/landing/blocks/*.tsx` | 11 composants de bloc | Créer |
| `app/{store,business,blog,travel}-box/[boxSlug]/page.tsx` | intégration (remplace le corps) | Modifier |
| `lib/landing-api.ts` | load/save landing (édition) | Créer |
| `components/landing/LandingEditor.tsx` + `BlockForm.tsx` | éditeur | Créer |
| `app/dashboard/boxes/[id]/landing/page.tsx`, `app/admin/landing/[boxId]/page.tsx` | entrées | Créer |

---

# PHASE 0 — Endpoint catalogue (cwd: `api/`, nouvelle branche `feat/block-catalog-endpoint`)

## Task 0.1 : Ressource + provider `/api/block_catalog`

**Files:** Create `src/ApiResource/BlockCatalogResource.php`, `src/State/BlockCatalogProvider.php`.

- [ ] **Step 1 : Provider**
```php
<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\BlockCatalogResource;
use App\Service\Content\BlockCatalog;

final class BlockCatalogProvider implements ProviderInterface
{
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): BlockCatalogResource
    {
        return new BlockCatalogResource(
            types: BlockCatalog::TYPES,
            collectionSources: BlockCatalog::COLLECTION_SOURCES,
        );
    }
}
```

- [ ] **Step 2 : Ressource (lecture seule, publique)**
```php
<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\BlockCatalogProvider;

#[ApiResource(
    shortName: 'BlockCatalog',
    operations: [
        new Get(
            uriTemplate: '/block_catalog',
            provider: BlockCatalogProvider::class,
        ),
    ],
)]
final class BlockCatalogResource
{
    public function __construct(
        /** @var array<string, list<string>> type => champs requis */
        public array $types = [],
        /** @var list<string> */
        public array $collectionSources = [],
    ) {
    }
}
```
> Note : pas d'`id` → API Platform sert un item « singleton » à l'URI fixe `/api/block_catalog`. Si API Platform exige un identifiant, ajouter `#[ApiProperty(identifier: true)] public string $id = 'default';` et `uriVariables: []` reste géré par l'`uriTemplate` fixe.

- [ ] **Step 3 : Vérifier**
```bash
cd /Users/oliviervangest/Desktop/app/tinned/api
php bin/console cache:clear
curl -s http://localhost:8000/api/block_catalog | python3 -m json.tool | head -30
```
Expected : 200, un objet avec `types` (11 entrées : hero…newsletter) et `collectionSources` (`products, articles, trips, childBoxes`). Si 404, vérifier l'`uriTemplate`. Si « identifier » error, appliquer la note du Step 2.

- [ ] **Step 4 : Commit + push + merge**
```bash
git checkout -b feat/block-catalog-endpoint
git add src/ApiResource/BlockCatalogResource.php src/State/BlockCatalogProvider.php
git commit -m "feat(content): endpoint GET /api/block_catalog (catalogue de blocs)"
git push -u origin feat/block-catalog-endpoint
```
(Fusion sur `main` à la fin de la phase, après revue.)

---

# PHASE B — Rendu (cwd: `front/`, branche `feat/landing-front`)

## Task B.1 : Contrat front + data layer

**Files:** Modify `lib/types.ts`; Create `lib/blocks.ts`; Modify `lib/api.ts`.

- [ ] **Step 1 : `lib/blocks.ts` — types de blocs + fetch catalogue**
```ts
export type Cta = { label: string; href: string };

export type Block =
  | { id: string; type: "hero"; title: string; subtitle?: string; imagePath?: string; cta?: Cta }
  | { id: string; type: "richText"; markdown: string }
  | { id: string; type: "gallery"; images: { path: string; caption?: string }[] }
  | { id: string; type: "cta"; heading: string; text?: string; button: Cta }
  | { id: string; type: "collection"; source: "products" | "articles" | "trips" | "childBoxes"; title?: string; limit?: number }
  | { id: string; type: "features"; title?: string; items: { icon?: string; title: string; text: string }[] }
  | { id: string; type: "stats"; items: { value: string; label: string }[] }
  | { id: string; type: "testimonial"; quote: string; author?: string; role?: string }
  | { id: string; type: "faq"; title?: string; items: { question: string; answer: string }[] }
  | { id: string; type: "video"; url: string; title?: string }
  | { id: string; type: "newsletter"; eyebrow?: string; title: string; body?: string; cta?: Cta };

export type BlockType = Block["type"];

export type BlockCatalog = {
  types: Record<string, string[]>;          // type => champs requis
  collectionSources: string[];
};

// Libellés FR pour l'éditeur (ordre = ordre du menu "Ajouter un bloc")
export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero", richText: "Texte riche", gallery: "Galerie", cta: "Bandeau CTA",
  collection: "Collection", features: "Atouts", stats: "Chiffres",
  testimonial: "Témoignage", faq: "FAQ", video: "Vidéo", newsletter: "Newsletter",
};

export async function fetchBlockCatalog(apiBase: string): Promise<BlockCatalog | null> {
  try {
    const r = await fetch(`${apiBase}/api/block_catalog`, { headers: { Accept: "application/ld+json, application/json" } });
    if (!r.ok) return null;
    const d = await r.json();
    return { types: d.types ?? {}, collectionSources: d.collectionSources ?? [] };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2 : `lib/types.ts` — ajouter `LandingPage`**
Ajouter en haut l'import et le type (après les types existants) :
```ts
import type { Block } from "./blocks";

export type LandingPage = {
  id: number;
  locale: string;
  box: string;                 // IRI de la box
  title: string;
  metaDescription?: string | null;
  blocks: Block[];
};
```

- [ ] **Step 3 : `lib/api.ts` — `getLanding`**
Ajouter (réutilise les helpers `fetchApi` + `collection` existants) :
```ts
import type { LandingPage } from "./types";

export async function getLanding(boxSlug: string, locale = "fr"): Promise<LandingPage | null> {
  const remote = await fetchApi<HydraCollection<LandingPage>>(
    `/landing_pages?box.slug=${encodeURIComponent(boxSlug)}&locale=${locale}`
  );
  return remote ? (collection(remote)[0] ?? null) : null;
}
```

- [ ] **Step 4 : Typecheck**
```bash
cd /Users/oliviervangest/Desktop/app/tinned/front
npx tsc --noEmit
```
Expected : aucune erreur.

- [ ] **Step 5 : Commit**
```bash
git add lib/blocks.ts lib/types.ts lib/api.ts
git commit -m "feat(landing): contrat de blocs front + getLanding"
```

## Task B.2 : `react-markdown` + renderer + 4 blocs de base

**Files:** Create `components/landing/LandingBlocks.tsx`, `components/landing/blocks/{HeroBlock,RichTextBlock,GalleryBlock,CtaBlock}.tsx`.

- [ ] **Step 1 : Installer react-markdown**
```bash
cd /Users/oliviervangest/Desktop/app/tinned/front
npm install react-markdown
```
Expected : ajout dans `package.json` dependencies.

- [ ] **Step 2 : Renderer `LandingBlocks.tsx`** (server component)
```tsx
import type { Box } from "@/lib/types";
import type { Block } from "@/lib/blocks";
import type { LandingPage } from "@/lib/types";
import { HeroBlock } from "./blocks/HeroBlock";
import { RichTextBlock } from "./blocks/RichTextBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { CtaBlock } from "./blocks/CtaBlock";
import { CollectionBlock } from "./blocks/CollectionBlock";
import { FeaturesBlock } from "./blocks/FeaturesBlock";
import { StatsBlock } from "./blocks/StatsBlock";
import { TestimonialBlock } from "./blocks/TestimonialBlock";
import { FaqBlock } from "./blocks/FaqBlock";
import { VideoBlock } from "./blocks/VideoBlock";
import { NewsletterBlock } from "./blocks/NewsletterBlock";

export async function LandingBlocks({ landing, box }: { landing: LandingPage; box: Box }) {
  return (
    <>
      {landing.blocks.map((block) => {
        switch (block.type) {
          case "hero": return <HeroBlock key={block.id} block={block} />;
          case "richText": return <RichTextBlock key={block.id} block={block} />;
          case "gallery": return <GalleryBlock key={block.id} block={block} />;
          case "cta": return <CtaBlock key={block.id} block={block} />;
          case "collection": return <CollectionBlock key={block.id} block={block} box={box} />;
          case "features": return <FeaturesBlock key={block.id} block={block} />;
          case "stats": return <StatsBlock key={block.id} block={block} />;
          case "testimonial": return <TestimonialBlock key={block.id} block={block} />;
          case "faq": return <FaqBlock key={block.id} block={block} />;
          case "video": return <VideoBlock key={block.id} block={block} />;
          case "newsletter": return <NewsletterBlock key={block.id} block={block} />;
          default: return null;
        }
      })}
    </>
  );
}
```

- [ ] **Step 3 : Les 4 blocs de base** (server components, classes `globals.css`)
`components/landing/blocks/HeroBlock.tsx` :
```tsx
import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function HeroBlock({ block }: { block: Extract<Block, { type: "hero" }> }) {
  return (
    <section className="container hero">
      <div className="hero-copy">
        <h1>{block.title}</h1>
        {block.subtitle ? <p>{block.subtitle}</p> : null}
        {block.cta ? <a className="button" href={block.cta.href}>{block.cta.label}</a> : null}
      </div>
      {block.imagePath ? (
        <div className="hero-visual">
          <Image src={block.imagePath} alt={block.title} width={600} height={400} style={{ objectFit: "cover" }} />
        </div>
      ) : null}
    </section>
  );
}
```
`components/landing/blocks/RichTextBlock.tsx` :
```tsx
import ReactMarkdown from "react-markdown";
import type { Block } from "@/lib/blocks";

export function RichTextBlock({ block }: { block: Extract<Block, { type: "richText" }> }) {
  return (
    <section className="container section">
      <div className="prose"><ReactMarkdown>{block.markdown}</ReactMarkdown></div>
    </section>
  );
}
```
`components/landing/blocks/GalleryBlock.tsx` :
```tsx
import Image from "next/image";
import type { Block } from "@/lib/blocks";

export function GalleryBlock({ block }: { block: Extract<Block, { type: "gallery" }> }) {
  return (
    <section className="container section">
      <div className="grid">
        {block.images.map((img, i) => (
          <figure key={i} className="card">
            <Image src={img.path} alt={img.caption ?? ""} width={400} height={300} style={{ objectFit: "cover", width: "100%" }} />
            {img.caption ? <figcaption className="eyebrow">{img.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </section>
  );
}
```
`components/landing/blocks/CtaBlock.tsx` :
```tsx
import type { Block } from "@/lib/blocks";

export function CtaBlock({ block }: { block: Extract<Block, { type: "cta" }> }) {
  return (
    <section className="container section">
      <div className="admin-panel" style={{ textAlign: "center" }}>
        <h2>{block.heading}</h2>
        {block.text ? <p>{block.text}</p> : null}
        <a className="button" href={block.button.href}>{block.button.label}</a>
      </div>
    </section>
  );
}
```

- [ ] **Step 4 : Typecheck** — `npx tsc --noEmit` (les imports des 7 autres blocs n'existent pas encore → ce step échouera ; le faire après Task B.3). Pour valider B.2 isolément, commenter temporairement les imports manquants OU enchaîner directement B.3 puis typecheck. **Recommandé : faire B.2 + B.3 puis typecheck une fois.**

- [ ] **Step 5 : Commit** (après B.3 si imports liés)
```bash
git add components/landing package.json package-lock.json
git commit -m "feat(landing): renderer LandingBlocks + blocs hero/richText/gallery/cta + react-markdown"
```

## Task B.3 : Les 7 blocs restants + CSS

**Files:** Create `components/landing/blocks/{CollectionBlock,FeaturesBlock,StatsBlock,TestimonialBlock,FaqBlock,VideoBlock,NewsletterBlock}.tsx`; Modify `app/globals.css`.

Chaque bloc suit le même patron : un composant nommé exporté `XBlock({ block }: { block: Extract<Block, { type: "x" }> })`, enveloppé dans `<section className="container section">`, classes `globals.css`. Détails par bloc :

- [ ] **Step 1 : `CollectionBlock.tsx`** (server, refetch le contenu de la box)
```tsx
import type { Box } from "@/lib/types";
import type { Block } from "@/lib/blocks";
import { getProducts, getArticles, getTrips, getBoxesForBusiness, getBoxesForTravel } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { ArticleCard } from "@/components/ArticleCard";
import { TripCard } from "@/components/TripCard";
import { BoxCard } from "@/components/BoxCard";

export async function CollectionBlock({ block, box }: { block: Extract<Block, { type: "collection" }>; box: Box }) {
  const limit = block.limit ?? 6;
  const slug = box.slug;
  let body: React.ReactNode = null;
  if (block.source === "products") {
    const items = (await getProducts(slug)).slice(0, limit);
    body = <div className="grid">{items.map((p) => <ProductCard key={p.id} product={p} boxSlug={slug} />)}</div>;
  } else if (block.source === "articles") {
    const items = (await getArticles(slug)).slice(0, limit);
    body = <div className="grid">{items.map((a) => <ArticleCard key={a.id} article={a} />)}</div>;
  } else if (block.source === "trips") {
    const items = (await getTrips(slug)).slice(0, limit);
    body = <div className="grid">{items.map((t) => <TripCard key={t.id} trip={t} boxSlug={slug} />)}</div>;
  } else { // childBoxes
    const type = box.type;
    const children = type === "business"
      ? [...(await getBoxesForBusiness("store", slug)), ...(await getBoxesForBusiness("blog", slug))]
      : type === "travel"
      ? [...(await getBoxesForTravel("business", slug)), ...(await getBoxesForTravel("blog", slug))]
      : [];
    body = <div className="grid">{children.slice(0, limit).map((b) => <BoxCard key={b.id} box={b} type={b.type!} />)}</div>;
  }
  return (
    <section className="container section">
      {block.title ? <div className="section-header"><h2>{block.title}</h2></div> : null}
      {body}
    </section>
  );
}
```
> Vérifier les **signatures réelles** de `ProductCard`/`ArticleCard`/`TripCard`/`BoxCard` (props exactes) en lisant ces composants ; adapter les props (`boxSlug`, etc.) à leur API réelle. Idem pour `getBoxesForBusiness/Travel` (ordre des arguments).

- [ ] **Step 2 : Les 6 blocs présentationnels** — créer chacun selon ce patron (champs depuis le catalogue) :
  - `FeaturesBlock` : optionnel `title` en `section-header` ; `items` en `.grid`, chaque item `.card` avec `icon`(optionnel, texte/emoji), `title` (`<h3>`), `text` (`<p>`).
  - `StatsBlock` : `items` dans `<div className="stats-grid">`, chaque `<div className="stat"><span className="stat-value">{value}</span><span className="eyebrow">{label}</span></div>`.
  - `TestimonialBlock` : `<blockquote className="admin-panel">{quote}</blockquote>` + `author`/`role` en `.eyebrow`.
  - `FaqBlock` : optionnel `title` ; `items` en liste de `<details className="faq-item"><summary>{question}</summary><p>{answer}</p></details>`.
  - `VideoBlock` : `<div className="video-embed"><iframe src={block.url} title={block.title ?? "video"} allowFullScreen /></div>`.
  - `NewsletterBlock` : `eyebrow`/`title`/`body` + bouton `cta` optionnel, dans `.admin-panel` centré. (Réutiliser le style du `components/NewsletterBlock.tsx` existant — c'est un composant différent, ne pas écraser ; importer sous un autre nom si besoin, ex. `LandingNewsletterBlock`.)

  > ⚠️ Nom de fichier/symbole : le composant existant `components/NewsletterBlock.tsx` existe déjà. Le bloc landing doit être `components/landing/blocks/NewsletterBlock.tsx` (chemin distinct) et exporter `NewsletterBlock` — l'import dans `LandingBlocks.tsx` pointe vers `./blocks/NewsletterBlock`. Pas de collision (chemins différents).

- [ ] **Step 3 : CSS** — ajouter à la fin de `app/globals.css` les classes manquantes, dans le style existant (tokens) :
```css
.prose { max-width: 70ch; }
.prose h2 { margin-top: 1.4em; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 22px; }
.stat { display: grid; gap: 6px; }
.stat-value { font: 700 32px/1 var(--font-mono); color: var(--forest); }
.faq-item { border-bottom: 1px solid var(--stone); padding: 14px 0; }
.faq-item summary { cursor: pointer; font-weight: 700; }
.video-embed { position: relative; aspect-ratio: 16 / 9; }
.video-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; border-radius: var(--radius); }
```

- [ ] **Step 4 : Typecheck**
```bash
npx tsc --noEmit
```
Expected : aucune erreur (tous les blocs importés par `LandingBlocks` existent).

- [ ] **Step 5 : Commit**
```bash
git add components/landing app/globals.css
git commit -m "feat(landing): blocs collection/features/stats/testimonial/faq/video/newsletter + CSS"
```

## Task B.4 : Intégration dans les 4 pages box

**Files:** Modify `app/store-box/[boxSlug]/page.tsx`, `app/business-box/[boxSlug]/page.tsx`, `app/blog-box/[boxSlug]/page.tsx`, `app/travel-box/[boxSlug]/page.tsx`.

- [ ] **Step 1 : Patron d'intégration** (à appliquer aux 4 pages)
Lire d'abord chaque page pour repérer où le `box` est résolu et où commence le rendu du corps. Ajouter l'import et, juste après `if (!box) notFound();`, brancher la landing :
```tsx
import { getLanding } from "@/lib/api";
import { LandingBlocks } from "@/components/landing/LandingBlocks";
// ...
const landing = await getLanding(boxSlug);
if (landing) {
  return <LandingBlocks landing={landing} box={box} />;
}
// sinon : le rendu par défaut existant (inchangé) suit
```
> Le `getBox(type, boxSlug)` reste nécessaire (fournit `box` passé à `LandingBlocks` et le fallback). Conserver les fetchs existants pour la branche « pas de landing ».

- [ ] **Step 2 : Build**
```bash
npm run build
```
Expected : build OK, pas d'erreur de type.

- [ ] **Step 3 : Commit**
```bash
git add app/store-box app/business-box app/blog-box app/travel-box
git commit -m "feat(landing): rendu des blocs sur les pages box (remplace le corps si landing)"
```

## Task B.5 : Vérification visuelle

- [ ] **Step 1 : Lancer le front contre l'API locale**
```bash
cd /Users/oliviervangest/Desktop/app/tinned/front
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```
- [ ] **Step 2 :** Ouvrir `http://localhost:3000/store-box/casa-do-sul-boutique` → la landing seedée (hero + texte + collection produits + cta) s'affiche à la place du rendu par défaut.
- [ ] **Step 3 :** Ouvrir une box **sans** landing (autre store/business box) → rendu par défaut inchangé.
- [ ] (Pas de commit — vérification.)

---

# PHASE C — Éditeur (cwd: `front/`, branche `feat/landing-front`)

## Task C.1 : Data layer éditeur

**Files:** Create `lib/landing-api.ts`.

- [ ] **Step 1 :** `lib/landing-api.ts`
```ts
import type { Block } from "./blocks";
import type { LandingPage } from "./types";

function apiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_URL manquant");
  return url;
}

export async function loadLanding(boxSlug: string, locale: string): Promise<LandingPage | null> {
  const r = await fetch(`${apiBase()}/api/landing_pages?box.slug=${encodeURIComponent(boxSlug)}&locale=${locale}`, {
    headers: { Accept: "application/ld+json, application/json" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const d = await r.json();
  const list = Array.isArray(d) ? d : (d.member ?? d["hydra:member"] ?? []);
  return list[0] ?? null;
}

export type LandingInput = {
  id?: number;
  boxIri: string;      // ex. /api/store_boxes/2
  locale: string;
  title: string;
  metaDescription?: string;
  blocks: Block[];
};

export async function saveLanding(input: LandingInput, token: string): Promise<LandingPage> {
  const isUpdate = typeof input.id === "number";
  const url = isUpdate
    ? `${apiBase()}/api/landing_pages/${input.id}`
    : `${apiBase()}/api/landing_pages`;
  const body = {
    box: input.boxIri,
    locale: input.locale,
    title: input.title,
    metaDescription: input.metaDescription ?? null,
    blocks: input.blocks,
  };
  const r = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      "Content-Type": isUpdate ? "application/merge-patch+json" : "application/ld+json",
      Accept: "application/ld+json, application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const violations: { propertyPath: string; message: string }[] = err.violations ?? [];
    const msg = violations.length
      ? violations.map((v) => `${v.propertyPath} : ${v.message}`).join("\n")
      : (err.detail ?? err["hydra:description"] ?? `Erreur ${r.status}`);
    throw new Error(msg);
  }
  return r.json();
}
```

- [ ] **Step 2 : Typecheck** — `npx tsc --noEmit` → OK.
- [ ] **Step 3 : Commit** — `git add lib/landing-api.ts && git commit -m "feat(landing): data layer éditeur (load/save)"`

## Task C.2 : `BlockForm` (formulaire par type)

**Files:** Create `components/landing/BlockForm.tsx`.

- [ ] **Step 1 :** Composant client `BlockForm({ block, onChange }: { block: Block; onChange: (b: Block) => void })` : switch sur `block.type`, rend les champs avec la convention `.field`. Helper de mise à jour : `const set = (patch: Partial<Block>) => onChange({ ...block, ...patch } as Block);`. Patron par type :
  - **scalaires** (`hero.title`, `richText.markdown`, `cta.heading`…) : `<label className="field"><span>Titre</span><input value={block.title} onChange={(e) => set({ title: e.target.value })} /></label>` (textarea pour markdown/text).
  - **objet imbriqué** (`hero.cta`, `cta.button`) : deux champs `label`/`href` mettant à jour `set({ cta: { ...block.cta, label: ... } })`.
  - **listes** (`gallery.images`, `features.items`, `stats.items`, `faq.items`) : map sur les entrées avec un champ par sous-propriété + bouton « ✕ » par ligne + bouton « + Ajouter » qui pousse une entrée vide ; mettre à jour via `set({ items: nextItems })`.
  - **`collection.source`** : `<select>` peuplé depuis le catalogue (`collectionSources`), + `title` + `limit` (number).
  Garder le composant lisible : une petite fonction interne par type (ex. `HeroFields`, `CollectionFields`…) dans le même fichier.

- [ ] **Step 2 : Typecheck** — `npx tsc --noEmit` → OK.
- [ ] **Step 3 : Commit** — `git add components/landing/BlockForm.tsx && git commit -m "feat(landing): BlockForm (formulaire par type de bloc)"`

## Task C.3 : `LandingEditor`

**Files:** Create `components/landing/LandingEditor.tsx`.

- [ ] **Step 1 :** Composant client `LandingEditor({ boxIri, boxSlug }: { boxIri: string; boxSlug: string })` :
  - State : `locale` (défaut `"fr"`), `landing` courante (id?, title, metaDescription, blocks), `catalog` (via `fetchBlockCatalog(apiBase)` au mount), `saving`, `error`.
  - Au changement de `locale` : `loadLanding(boxSlug, locale)` → peuple le state (ou vide si null, `id` indéfini).
  - **Sélecteur de locale** : 6 boutons (`fr nl en it es de`), pastille « rempli » si une landing existe pour la locale (optionnel : check au chargement).
  - **Liste de blocs** : pour chaque bloc, `<BlockForm>` + boutons **↑** (swap i/i-1), **↓** (swap i/i+1), **✕** (filter). 
  - **« Ajouter un bloc ▾ »** : `<select>` des types (libellés `BLOCK_LABELS`, ordre du catalogue) → pousse un bloc vide minimal pour ce type avec `id: "b_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6)` (id stable, généré client). Valeurs initiales = champs requis vides (`hero` → `{title:""}`, `collection` → `{source:"products"}`, listes → `[]`).
  - Champs `title` / `metaDescription` (`.field`).
  - **Enregistrer** : lit le token via `readStoredSession()` (de `@/lib/auth`), appelle `saveLanding({ id, boxIri, locale, title, metaDescription, blocks }, token)`, met à jour `landing.id` depuis la réponse, affiche `error` si throw (message déjà formaté avec les chemins `blocks[i].field`).
  - `apiBase` côté client = `process.env.NEXT_PUBLIC_API_URL`.

- [ ] **Step 2 : Typecheck** — `npx tsc --noEmit` → OK.
- [ ] **Step 3 : Commit** — `git add components/landing/LandingEditor.tsx && git commit -m "feat(landing): éditeur visuel (locale, blocs ↑↓✕, ajout, enregistrement)"`

## Task C.4 : Entrées vendeur + admin

**Files:** Create `app/dashboard/boxes/[id]/landing/page.tsx`, `app/admin/landing/[boxId]/page.tsx`; Modify `app/dashboard/boxes/[id]/page.tsx` (lien).

- [ ] **Step 1 : Route vendeur** `app/dashboard/boxes/[id]/landing/page.tsx` (`"use client"`)
  - Récupère la box du vendeur (via `vendor-api`, comme la page d'édition existante) pour connaître `type` + `slug` + `id`.
  - Construit `boxIri = "/api/" + resourcePathForType(type) + "/" + id` (réutiliser le mapping type→resource déjà présent dans `vendor-api.ts`).
  - Monte `<LandingEditor boxIri={boxIri} boxSlug={slug} />`.

- [ ] **Step 2 : Lien depuis l'édition box vendeur** — dans `app/dashboard/boxes/[id]/page.tsx`, ajouter un lien `<a href={\`/dashboard/boxes/${id}/landing\`} className="button">Éditer la landing</a>`.

- [ ] **Step 3 : Route admin** `app/admin/landing/[boxId]/page.tsx` (`"use client"`)
  - Garde `sessionHasRole(session, "ROLE_ADMIN")` (rediriger/masquer sinon, comme `AdminDashboardClient`).
  - Récupère la box par id via `admin-api` (type+slug), construit `boxIri`, monte `<LandingEditor>`.
  - (Lien depuis la liste de box admin : ajouter dans `AdminDashboardClient.tsx` un lien « Landing » par box pointant vers `/admin/landing/${box.id}` — modification minimale, ne pas refactorer le fichier.)

- [ ] **Step 4 : Build** — `npm run build` → OK.
- [ ] **Step 5 : Commit**
```bash
git add app/dashboard/boxes app/admin/landing components/AdminDashboardClient.tsx
git commit -m "feat(landing): entrées éditeur vendeur (/dashboard) + admin (/admin/landing)"
```

## Task C.5 : Vérification e2e éditeur

- [ ] **Step 1 :** `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev`, se connecter (vendeur owner de la box 2, ou admin).
- [ ] **Step 2 :** Aller sur l'éditeur de la box 2, locale `fr` → la landing seedée se charge (4 blocs).
- [ ] **Step 3 :** Ajouter un bloc `stats`, le remplir, réordonner avec ↑/↓, supprimer un bloc, **Enregistrer** → 200, rechargement OK.
- [ ] **Step 4 :** Tenter un bloc invalide (ex. `hero` sans titre via vidage) → l'erreur 422 s'affiche avec le chemin `blocks[i].title`.
- [ ] **Step 5 :** Changer de locale (`en`) → éditeur vide → ajouter un hero → Enregistrer → POST 201 (nouvelle LandingPage `(box, en)`).
- [ ] (Pas de commit — vérification.)

---

## Self-review (couverture spec)

- Endpoint `/api/block_catalog` → Phase 0.
- Contrat front `lib/blocks.ts` + `LandingPage` → B.1.
- `getLanding` → B.1. Renderer + 11 blocs → B.2/B.3. `collection` refetch box → B.3. react-markdown → B.2.
- Intégration « remplace le corps » → B.4.
- `lib/landing-api.ts` (load/save POST/PATCH, erreurs `blocks[i]`) → C.1.
- Éditeur (locale, ↑↓✕, add, form par bloc, save) → C.2/C.3. Entrées vendeur+admin → C.4.
- Vérifs B.5 / C.5.

## Notes
- Avant B.3/B.4, **lire les composants `ProductCard/ArticleCard/TripCard/BoxCard`** et les fonctions `getBoxesForBusiness/Travel` pour utiliser leurs **signatures réelles** (props/args) — le plan donne le patron, pas la signature exacte.
- Le rendu B nécessite que la **Phase 0 (endpoint)** ne soit PAS bloquante pour B (B n'utilise pas le catalogue) ; seul C en dépend. On peut donc faire 0 et B en parallèle, C après.
- Prod : `react-markdown` est une dép front standard ; le déploiement front (`npm ci && build`) la prendra. L'endpoint API est du code (pas de migration).
