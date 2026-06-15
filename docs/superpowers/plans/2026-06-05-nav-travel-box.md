# Nav Rename + Travel Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename nav labels to exact box type names with accessible subtitles, and fully design the three Travel Box pages using the design system already in place.

**Architecture:** Nav labels updated in-place in `layout.tsx` (no structure change). Travel Box pages rewritten to match the Business Box pattern: hero section + inter-box grid (business/blog linked to the destination) + editorial trips grid. A new `TripCard` component and `getBoxesForTravel` API function are added. A missing SVG asset `picto-box-travel.svg` is created to unblock `BoxCard`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS design system (`globals.css`), `BoxCard` / `ArticleCard` as reference components.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `front/app/layout.tsx` | Nav primary + footer labels |
| Create | `front/public/tinned-assets/picto-box-travel.svg` | Travel icon used by BoxCard |
| Modify | `front/lib/api.ts` | Add `getBoxesForTravel` after line 52 |
| Create | `front/components/TripCard.tsx` | Editorial trip card |
| Rewrite | `front/app/travel-box/page.tsx` | List page with hero + BoxCard grid |
| Rewrite | `front/app/travel-box/[boxSlug]/page.tsx` | Detail page with inter-box + trips |
| Rewrite | `front/app/travel-box/[boxSlug]/[tripSlug]/page.tsx` | Trip article page |

---

### Task 1: Create picto-box-travel.svg

**Files:**
- Create: `front/public/tinned-assets/picto-box-travel.svg`

`BoxCard` references `iconByType["travel"] = "/tinned-assets/picto-box-travel.svg"` unconditionally — without this file every Travel BoxCard shows a broken image.

- [ ] **Step 1: Create the SVG file**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <!-- Suitcase body -->
  <rect x="5" y="16" width="30" height="20" rx="3" fill="#017E7A"/>
  <!-- Handle -->
  <path d="M14 16 V11 Q14 8 17 8 H23 Q26 8 26 11 V16" fill="none" stroke="#015E5B" stroke-width="2.5" stroke-linecap="round"/>
  <!-- Center divider -->
  <rect x="18.5" y="16" width="3" height="20" fill="#015E5B" opacity="0.5"/>
  <!-- Clasp -->
  <rect x="16" y="23" width="8" height="6" rx="2" fill="#C4882A"/>
  <!-- Wheels -->
  <circle cx="12" cy="36" r="2" fill="#015E5B"/>
  <circle cx="28" cy="36" r="2" fill="#015E5B"/>
</svg>
```

Save to `front/public/tinned-assets/picto-box-travel.svg`.

- [ ] **Step 2: Verify the file is valid**

```bash
xmllint --noout front/public/tinned-assets/picto-box-travel.svg && echo "SVG valid"
```

Expected: `SVG valid` (or no output if `xmllint` unavailable — proceed anyway).

- [ ] **Step 3: Commit**

```bash
git add front/public/tinned-assets/picto-box-travel.svg
git commit -m "feat: add picto-box-travel.svg asset"
```

---

### Task 2: Rename navigation labels

**Files:**
- Modify: `front/app/layout.tsx`

- [ ] **Step 1: Replace the 4 nav-primary links**

In `front/app/layout.tsx`, replace the `<nav className="nav nav-primary">` block:

```tsx
<nav className="nav nav-primary" aria-label="Navigation principale">
  <Link href="/store-box" aria-label="Store Box — boutiques en ligne" title="Store Box — boutiques en ligne">Store Box</Link>
  <Link href="/business-box" aria-label="Business Box — vitrines de marques" title="Business Box — vitrines de marques">Business Box</Link>
  <Link href="/blog-box" aria-label="Blog Box — articles et sélections" title="Blog Box — articles et sélections">Blog Box</Link>
  <Link href="/travel-box" aria-label="Travel Box — carnets de voyage" title="Travel Box — carnets de voyage">Travel Box</Link>
</nav>
```

- [ ] **Step 2: Replace the 4 footer "Explorer" links**

In `front/app/layout.tsx`, replace the footer `<div>` with heading "Explorer":

```tsx
<div>
  <h2>Explorer</h2>
  <Link href="/store-box" aria-label="Store Box — boutiques en ligne">Store Box</Link>
  <Link href="/business-box" aria-label="Business Box — vitrines de marques">Business Box</Link>
  <Link href="/blog-box" aria-label="Blog Box — articles et sélections">Blog Box</Link>
  <Link href="/travel-box" aria-label="Travel Box — carnets de voyage">Travel Box</Link>
</div>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add front/app/layout.tsx
git commit -m "feat: rename nav labels to box type names with aria descriptions"
```

---

### Task 3: Add getBoxesForTravel to lib/api.ts

**Files:**
- Modify: `front/lib/api.ts` (after line 52, after `getBoxesForBusiness`)

- [ ] **Step 1: Insert the function after `getBoxesForBusiness`**

After the closing `}` of `getBoxesForBusiness` (line 52), insert:

```ts
export async function getBoxesForTravel(type: "business" | "blog", travelSlug: string): Promise<Box[]> {
  const resource = type === "business" ? "business_boxes" : "blog_boxes";
  const remote = await fetchApi<HydraCollection<Box>>(`/${resource}?travelBox.slug=${encodeURIComponent(travelSlug)}&active=true`);
  return remote ? collection(remote).map((box) => ({ ...box, type })) : [];
}
```

Note: the API Platform endpoint `?travelBox.slug=` does not yet exist on the backend — the function will silently return `[]` until the backend relation is created.

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add front/lib/api.ts
git commit -m "feat: add getBoxesForTravel to api.ts"
```

---

### Task 4: Create TripCard component

**Files:**
- Create: `front/components/TripCard.tsx`

Mirrors `ArticleCard`. Links to `/travel-box/[travelBoxSlug]/[trip.slug]`. Requires the parent `travelBoxSlug` since `Trip.travelBox?.slug` may be null.

- [ ] **Step 1: Create the component**

```tsx
import Image from "next/image";
import type { Trip } from "@/lib/types";

export function TripCard({ trip, travelBoxSlug }: { trip: Trip; travelBoxSlug: string }) {
  return (
    <a className="card article-card" href={`/travel-box/${travelBoxSlug}/${trip.slug}`}>
      <div className="card-media">
        <Image
          src={trip.imagePath ?? "/tinned-assets/simple-box.svg"}
          alt=""
          width={132}
          height={96}
        />
      </div>
      <span className="pill">Carnet</span>
      <h3>{trip.title}</h3>
      {trip.excerpt && <p>{trip.excerpt}</p>}
      <span className="box-link">Lire le carnet</span>
    </a>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add front/components/TripCard.tsx
git commit -m "feat: add TripCard component"
```

---

### Task 5: Rewrite Travel Box list page

**Files:**
- Rewrite: `front/app/travel-box/page.tsx`

- [ ] **Step 1: Replace the file content entirely**

```tsx
import type { Metadata } from "next";
import { BoxCard } from "@/components/BoxCard";
import { getBoxes } from "@/lib/api";

export const metadata: Metadata = {
  title: "Travel Box",
  description: "Destinations, carnets et inspirations de voyage — sélectionnés à la main."
};

export default async function TravelBoxPage() {
  const boxes = await getBoxes("travel");

  return (
    <>
      <section className="container hero">
        <div>
          <span className="eyebrow">Travel Box</span>
          <h1>Destinations, carnets et inspirations de voyage.</h1>
          <p>Explorez des destinations à travers les boutiques, agences et récits qui les font vivre.</p>
          <form className="rounded-input-container" action="/search">
            <input name="q" placeholder="Rechercher une destination" />
            <button className="button" type="submit">Trouver</button>
          </form>
        </div>
        <div className="hero-visual">
          <img src="/tinned-assets/simple-box.svg" alt="" />
        </div>
      </section>
      <section className="container section">
        <div className="section-header">
          <div>
            <h2>Toutes les destinations</h2>
            <p>Chaque Travel Box rassemble les boutiques, agences et contenus d'une destination.</p>
          </div>
        </div>
        <div className="grid">
          {boxes.map((box) => (
            <BoxCard key={box.slug} box={box} type="travel" />
          ))}
        </div>
        {boxes.length === 0 && (
          <div className="home-empty-state">
            <strong>Aucune destination publiée pour le moment.</strong>
            <span>Les premières Travel Box arrivent bientôt.</span>
          </div>
        )}
      </section>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add front/app/travel-box/page.tsx
git commit -m "feat: rewrite Travel Box list page with design system"
```

---

### Task 6: Rewrite Travel Box detail page

**Files:**
- Rewrite: `front/app/travel-box/[boxSlug]/page.tsx`

- [ ] **Step 1: Replace the file content entirely**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoxCard } from "@/components/BoxCard";
import { TripCard } from "@/components/TripCard";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getBox, getBoxesForTravel, getTrips } from "@/lib/api";

type Props = { params: Promise<{ boxSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boxSlug } = await params;
  const box = await getBox("travel", boxSlug);
  return {
    title: box ? `${box.name} — Travel Box` : "Not found",
    description: box?.description ?? box?.tagline ?? undefined,
  };
}

export default async function TravelBoxDetailPage({ params }: Props) {
  const { boxSlug } = await params;
  const [box, businesses, blogs, trips] = await Promise.all([
    getBox("travel", boxSlug),
    getBoxesForTravel("business", boxSlug),
    getBoxesForTravel("blog", boxSlug),
    getTrips(boxSlug),
  ]);
  if (!box) notFound();

  const linkedBoxes = [...businesses, ...blogs];

  return (
    <>
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          name: box.name,
          description: box.description ?? box.tagline,
        }}
      />
      <section className="container hero">
        <div>
          <span className="eyebrow">Travel Box · {box.name}</span>
          <h1>{box.name}</h1>
          <p>{box.description ?? box.tagline}</p>
        </div>
        <div className="hero-visual">
          <img src={box.coverPath ?? "/tinned-assets/simple-box.svg"} alt="" />
        </div>
      </section>

      {linkedBoxes.length > 0 && (
        <section className="container section interbox-section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Explorer</span>
              <h2>L'univers {box.name}</h2>
              <p>Boutiques, agences et contenus liés à cette destination.</p>
            </div>
          </div>
          <div className="grid">
            {businesses.map((item) => (
              <BoxCard key={item.slug} box={item} type="business" />
            ))}
            {blogs.map((item) => (
              <BoxCard key={item.slug} box={item} type="blog" />
            ))}
          </div>
        </section>
      )}

      {trips.length > 0 && (
        <section className="container section">
          <div className="section-header">
            <div>
              <span className="eyebrow">Éditorial</span>
              <h2>Carnets de voyage</h2>
            </div>
          </div>
          <div className="grid">
            {trips.map((trip) => (
              <TripCard key={trip.slug} trip={trip} travelBoxSlug={boxSlug} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "front/app/travel-box/[boxSlug]/page.tsx"
git commit -m "feat: rewrite Travel Box detail page with inter-box + trips sections"
```

---

### Task 7: Rewrite Travel Box trip detail page

**Files:**
- Rewrite: `front/app/travel-box/[boxSlug]/[tripSlug]/page.tsx`

- [ ] **Step 1: Replace the file content entirely**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBox, getTrip } from "@/lib/api";

type Props = { params: Promise<{ boxSlug: string; tripSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tripSlug } = await params;
  const trip = await getTrip(tripSlug);
  return {
    title: trip ? `${trip.title} — Tinned` : "Not found",
  };
}

export default async function TripPage({ params }: Props) {
  const { boxSlug, tripSlug } = await params;
  const [box, trip] = await Promise.all([
    getBox("travel", boxSlug),
    getTrip(tripSlug),
  ]);
  if (!box || !trip) notFound();

  return (
    <article className="container" style={{ maxWidth: "720px", paddingTop: "clamp(40px, 6vw, 72px)", paddingBottom: "clamp(40px, 6vw, 72px)" }}>
      <Link
        href={`/travel-box/${boxSlug}`}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted)", fontSize: "14px", fontWeight: 600, marginBottom: "32px" }}
      >
        ← {box.name}
      </Link>

      {trip.publishedAt && (
        <p style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "16px" }}>
          {new Date(trip.publishedAt).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}

      <h1 style={{ marginBottom: "32px" }}>{trip.title}</h1>

      {trip.imagePath && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16/7", borderRadius: "4px", overflow: "hidden", marginBottom: "40px" }}>
          <Image
            src={trip.imagePath}
            alt={trip.title}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      )}

      {trip.body && (
        <div style={{ color: "var(--ink)", fontSize: "17px", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
          {trip.body}
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "front/app/travel-box/[boxSlug]/[tripSlug]/page.tsx"
git commit -m "feat: rewrite Travel Box trip article page"
```

---

### Task 8: Visual verification

- [ ] **Step 1: Confirm dev server is running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/
```

Expected: `200`

If not running:
```bash
/Users/oliviervangest/Desktop/app/tinned/front/node_modules/.bin/next dev -p 4000 &
sleep 10
```

- [ ] **Step 2: Check each URL returns 200**

```bash
curl -s -o /dev/null -w "travel-box list: %{http_code}\n" http://localhost:4000/travel-box
curl -s -o /dev/null -w "store-box (no regression): %{http_code}\n" http://localhost:4000/store-box
curl -s -o /dev/null -w "business-box (no regression): %{http_code}\n" http://localhost:4000/business-box
curl -s -o /dev/null -w "blog-box (no regression): %{http_code}\n" http://localhost:4000/blog-box
```

Expected: all `200`.

- [ ] **Step 3: Open in browser and verify visually**

Open `http://localhost:4000` and check:
- Nav shows "Store Box", "Business Box", "Blog Box", "Travel Box"
- `http://localhost:4000/travel-box` shows hero + empty state or grid
- No broken images on any Travel BoxCard (picto-box-travel.svg loaded)
- Other pages (store-box, business-box, blog-box) unchanged
