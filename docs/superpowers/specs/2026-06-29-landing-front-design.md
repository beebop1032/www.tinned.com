# Design — Front des landing pages de box (rendu B + éditeur C)

Date : 2026-06-29
Statut : validé (en attente de revue spec)
Périmètre : `front/` (Next.js 15 / React 19) + **une petite brique `api/`** (endpoint catalogue).
Sous-projets **B** (rendu) et **C** (éditeur) du découpage en 3 ; **A** (API LandingPage + blocks) est déjà livré sur `main`.

## Contexte

Le sous-projet A a livré côté API : `LandingPage` canonique par `(box, locale)` avec un champ
`blocks` (JSON) validé contre un `BlockCatalog` de 11 types. Côté front, **rien ne lit encore**
ce contenu : les pages box (`store-box/[boxSlug]`, etc.) n'affichent que `name`, `description`,
logo/cover. B fait le rendu des blocs ; C donne au vendeur/superadmin un éditeur visuel.

Faits établis (exploration) :
- Pages box = **server components** (`getBox` + `getProducts/...` via `lib/api.ts`, ISR 300s).
- Style = **CSS global** `app/globals.css` (classes sémantiques `.container .section .hero .grid
  .card .field .button .eyebrow .pill`, tokens `--forest/--stone/--cream`). **Pas de Tailwind.**
- i18n : routing `[locale]` **inactif** (middleware no-op) → tout est rendu en **`fr`** aujourd'hui.
- Backoffice : vendeur = `app/dashboard/boxes/[id]` (`"use client"`, JWT `readStoredSession`,
  `vendor-api`) ; admin = `components/AdminDashboardClient.tsx` (JWT + `sessionHasRole('ROLE_ADMIN')`,
  `admin-api`). `vendorFetch`/`adminFetch` posent tous deux `Authorization: Bearer <token>`.
- Convention de formulaire à suivre = **`.field`** (`<label className="field"><span>…</span><input/></label>`),
  pas les classes Tailwind-like non fonctionnelles du dashboard.
- `LocaleTabs` existe mais est per-champ et inutilisé → non réutilisé tel quel ici.

## Décisions validées

- Le contenu est **par locale** (rendu en `fr` pour l'instant, fallback prêt).
- Quand une box a une LandingPage, **ses blocs remplacent le corps** de la page ; sinon rendu par
  défaut actuel (rétrocompatible).
- Éditeur : réordonnancement par **boutons ↑/↓** (pas de lib drag-and-drop).
- Édition par **vendeur (sa box) + superadmin (toutes)** — même endpoint, le backend arbitre.
- `react-markdown` pour le bloc `richText` (nouvelle dépendance front).
- **Aperçu live (WYSIWYG) hors v1** : éditeur = builder par formulaires.
- **Le catalogue est exposé par l'API** (source de vérité unique) ; le front le consomme au runtime,
  + types TS côté front pour le compile-time.

---

## 0. Brique API — exposer le catalogue (`api/`)

Nouvel endpoint **public, lecture seule** : `GET /api/block_catalog`, qui renvoie le contenu de
`App\Service\Content\BlockCatalog` (source de vérité déjà existante).

- DTO/ressource `src/ApiResource/BlockCatalogResource.php` :
  `#[ApiResource(operations: [ new Get(uriTemplate: '/block_catalog', provider: BlockCatalogProvider::class) ])]`
  exposant `types` (`type => requiredFields`) et `collectionSources`.
- Provider `src/State/BlockCatalogProvider.php` retournant l'objet construit depuis
  `BlockCatalog::TYPES` et `BlockCatalog::COLLECTION_SOURCES`.

Réponse :
```json
{
  "types": { "hero": ["title"], "richText": ["markdown"], "...": ["..."] },
  "collectionSources": ["products", "articles", "trips", "childBoxes"]
}
```

> Cette brique vit dans le repo `api/` (commit/branche séparés). B et C en dépendent.

---

## 1. Contrat partagé front (`lib/blocks.ts`)

- **Types TS** (compile-time) : un type `Block` = union discriminée des 11 types, chacun avec sa
  forme (cf. catalogue ci-dessous). Plus `LandingPage` dans `lib/types.ts` :
  `{ id:number; locale:string; box:string; title:string; metaDescription?:string|null; blocks:Block[] }`.
- **Runtime** : `fetchBlockCatalog()` consomme `GET /api/block_catalog` (utilisé par l'éditeur C pour
  la liste des types et les champs requis). Le rendu B n'en a pas besoin (il switch sur `block.type`).

Catalogue (forme des blocs — doit refléter `BlockCatalog` de l'API) :
```ts
type Cta = { label: string; href: string };
type Block =
  | { id: string; type: 'hero';        title: string; subtitle?: string; imagePath?: string; cta?: Cta }
  | { id: string; type: 'richText';    markdown: string }
  | { id: string; type: 'gallery';     images: { path: string; caption?: string }[] }
  | { id: string; type: 'cta';         heading: string; text?: string; button: Cta }
  | { id: string; type: 'collection';  source: 'products'|'articles'|'trips'|'childBoxes'; title?: string; limit?: number }
  | { id: string; type: 'features';    title?: string; items: { icon?: string; title: string; text: string }[] }
  | { id: string; type: 'stats';       items: { value: string; label: string }[] }
  | { id: string; type: 'testimonial'; quote: string; author?: string; role?: string }
  | { id: string; type: 'faq';         title?: string; items: { question: string; answer: string }[] }
  | { id: string; type: 'video';       url: string; title?: string }
  | { id: string; type: 'newsletter';  eyebrow?: string; title: string; body?: string; cta?: Cta };
```

---

## 2. Sous-projet B — Rendu (server components)

### Data layer
- `lib/api.ts` : `getLanding(boxSlug: string, locale = 'fr'): Promise<LandingPage | null>` →
  `fetchApi('/landing_pages?box.slug=…&locale=…')` puis `collection(...)[0] ?? null`. Même pattern
  que `getProducts`. (Fallback `fr` trivial : la locale courante est `fr` aujourd'hui.)

### Renderer
- `components/landing/LandingBlocks.tsx` (server component) : reçoit `{ landing: LandingPage; box: Box }`,
  mappe chaque `block.type` vers son composant. Bloc inconnu → ignoré (robustesse).
- `components/landing/blocks/` — **11 composants** présentationnels (classes `globals.css`) :
  `HeroBlock, RichTextBlock, GalleryBlock, CtaBlock, CollectionBlock, FeaturesBlock, StatsBlock,
  TestimonialBlock, FaqBlock, VideoBlock, NewsletterBlock`.
  - `RichTextBlock` : rend `markdown` via **`react-markdown`**.
  - `CollectionBlock` (server) : selon `source`, fetch le contenu propre de la box et réutilise les
    cartes existantes — `products → getProducts(box.slug)/ProductCard`,
    `articles → getArticles(box.slug)/ArticleCard`, `trips → getTrips(box.slug)/TripCard`,
    `childBoxes → getBoxesForBusiness|Travel(...)/BoxCard` selon le type de box. `limit` tronque.
  - `NewsletterBlock` : s'aligne sur le composant `NewsletterBlock` existant si pertinent.
- CSS : réutiliser au maximum les classes existantes ; ajouter à `globals.css` les rares classes
  spécifiques (ex. `.stats-grid`, `.faq-item`) au même style (tokens, BEM-ish).

### Intégration dans les 4 pages box
Dans `app/{store,business,blog,travel}-box/[boxSlug]/page.tsx` :
```tsx
const landing = await getLanding(boxSlug);
if (landing) return <LandingBlocks landing={landing} box={box} />;
// sinon : rendu par défaut actuel (inchangé)
```
Le layout (nav/footer) reste géré ailleurs — inchangé.

---

## 3. Sous-projet C — Éditeur visuel (client)

### Composant partagé
- `components/landing/LandingEditor.tsx` (`"use client"`), utilisé par le vendeur ET l'admin
  (même endpoint `/api/landing_pages` + `Authorization: Bearer`, droits arbitrés par le backend) :
  - **Sélecteur de locale** (FR/NL/EN/IT/ES/DE) en tête ; changer de locale charge la LandingPage
    `(box, locale)` correspondante (ou un brouillon vide). Pastille « rempli » par locale.
  - Champs `title` / `metaDescription` (`.field`).
  - **Liste de blocs** : chaque bloc affiche son type + ses champs (formulaire), avec **↑ ↓ ✕**.
  - « **Ajouter un bloc ▾** » : menu des 11 types (depuis `fetchBlockCatalog()`), insère un bloc
    vide avec un `id` généré (`'b_' + compteur/aléatoire`).
  - **Enregistrer** : `POST` si aucune LandingPage pour `(box, locale)`, sinon `PATCH`.
- `components/landing/BlockForm.tsx` : switch sur `block.type` → champs adéquats (convention `.field`).
  Listes (`gallery.images`, `features.items`, `stats.items`, `faq.items`) : ajout/suppression de
  lignes avec les mêmes boutons.

### Data layer éditeur
- `lib/landing-api.ts` (nouveau) :
  - `loadLanding(boxSlug, locale): Promise<LandingPage|null>` (lecture publique, réutilise `fetchApi`).
  - `saveLanding(input, token)` : `POST /api/landing_pages` ou `PATCH /api/landing_pages/{id}` avec
    `Authorization: Bearer <token>` ; `box` envoyé en IRI (`/api/{type}_boxes/{id}`).
  - Parser d'erreurs alignant les `violations` (chemins `blocks[i].field`) sur l'UI.

### Entrées (routes)
- **Vendeur** : `app/dashboard/boxes/[id]/landing/page.tsx` — résout la box du vendeur (type+id+slug),
  monte `<LandingEditor>`. Lien « Éditer la landing » depuis `app/dashboard/boxes/[id]`.
- **Admin** : `app/admin/landing/[boxId]/page.tsx` (ou section equivalente) — même `<LandingEditor>`,
  accessible depuis la liste de box admin. `sessionHasRole('ROLE_ADMIN')` garde l'accès.

---

## Découpage d'implémentation

Une spec (ce document), puis **plans séquencés** :
1. **API** — endpoint `/api/block_catalog` (repo `api/`).
2. **B** — contrat front + rendu (repo `front/`).
3. **C** — éditeur (repo `front/`), réutilise B.

## Vérification (par sous-projet)

- **API** : `GET /api/block_catalog` → 200 avec `types`/`collectionSources` cohérents avec `BlockCatalog`.
- **B** : la page d'une box **avec** landing (seed A sur `casa-do-sul-boutique/fr`) rend les blocs
  (hero, richText, collection produits, cta) ; une box **sans** landing rend le défaut actuel ;
  `npm run build` passe (types OK).
- **C** : créer/charger une landing par locale, ajouter/réordonner/supprimer des blocs, enregistrer
  → POST/PATCH 201/200 ; un bloc invalide → 422 mappé sur le bon champ ; vendeur limité à sa box
  (403 sinon), admin sur toutes.

## Hors périmètre

- Aperçu live WYSIWYG (builder par formulaires uniquement en v1).
- Activation du routing `[locale]` (rendu en `fr` ; le modèle par locale est prêt).
- Drag-and-drop ; versioning/brouillon des landings.
