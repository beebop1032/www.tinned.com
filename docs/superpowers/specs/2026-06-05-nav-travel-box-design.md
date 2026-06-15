# Design — Navigation rename + Travel Box

**Date:** 2026-06-05  
**Statut:** Approuvé

---

## Contexte

La navigation principale utilise des labels génériques ("Boutiques", "Vitrines", "Blogs", "Voyages") qui ne reflètent pas les noms des types de box. La Travel Box n'a aucun design propre : ses trois pages utilisent du Tailwind brut sans hero, sans design system, sans composants partagés. Ce spec couvre le renommage de la nav et le design complet de Travel Box en s'appuyant sur les patterns existants (Business Box).

---

## 1. Navigation

### Fichier concerné
`front/app/layout.tsx`

### Changements
Les 4 liens de la nav primaire et les 4 liens du footer "Explorer" reçoivent :
- Texte visible : nom exact du type de box
- `aria-label` et `title` : nom + description FR

| Texte visible | aria-label / title |
|---|---|
| Store Box | "Store Box — boutiques en ligne" |
| Business Box | "Business Box — vitrines de marques" |
| Blog Box | "Blog Box — articles et sélections" |
| Travel Box | "Travel Box — carnets de voyage" |

Aucune modification de structure HTML ni de CSS.

---

## 2. Travel Box

### Concept
Une Travel Box représente une destination ("Portugal", "Disneyland Paris", "Tour Eiffel"). Elle agrège :
- Des Business Boxes liées (agences voyage, hôtels, opérateurs locaux)
- Des Blog Boxes liées (contenus éditoriaux sur la destination)
- Des Trips éditoriaux (carnets de voyage à lire — v1)
- Des voyages réservables (hors scope v1)

### 2.1 Page liste `/travel-box`

Structure identique à `business-box/page.tsx` :

```
<section className="container hero">
  eyebrow: "Travel Box"
  h1: "Destinations, carnets et inspirations de voyage."
  p: description
  <form action="/search"> barre de recherche
  <div className="hero-visual"> simple-box.svg (asset travel à créer plus tard)
</section>
<section className="container section">
  section-header: "Toutes les destinations" + sous-titre
  grid BoxCard type="travel"
</section>
```

### 2.2 Page détail `/travel-box/[boxSlug]`

Trois sections :

**Hero**
```
eyebrow: "Travel Box · {box.name}"
h1: {box.name}
p: box.description ?? box.tagline
hero-visual: box.coverPath ?? simple-box.svg
```

**Section inter-box** (masquée si les deux tableaux sont vides)
```
eyebrow: "Explorer"
h2: "L'univers {box.name}"
p: "Boutiques, agences et contenus liés à cette destination."
grid: BoxCard type="business" + BoxCard type="blog"
```
Appels API : `getBoxesForTravel("business", boxSlug)` + `getBoxesForTravel("blog", boxSlug)`.  
Ces fonctions n'existent pas encore dans `lib/api.ts` ni côté API Platform — elles doivent retourner `[]` silencieusement jusqu'à implémentation.

**Section Trips**
```
eyebrow: "Éditorial"
h2: "Carnets de voyage"
grid: TripCard[] (nouveau composant)
```
Masquée si `trips.length === 0`.

### 2.3 Page trip `/travel-box/[boxSlug]/[tripSlug]`

Layout article :
- Image hero pleine largeur si `trip.imagePath`
- Date publiée (`trip.publishedAt`, locale `fr-BE`)
- `<h1>` titre
- Corps en prose (`trip.body`)
- Lien retour "← {box.name}" vers `/travel-box/[boxSlug]`

### 2.4 Nouveau composant `TripCard`

`front/components/TripCard.tsx`  
Carte légère non-interactive (lecture seule) :
- Image cover (`trip.imagePath`, fallback `simple-box.svg`)
- Titre
- Excerpt
- Date

Similaire à `ArticleCard`. Pas de bouton achat.

### 2.5 Fonction API `getBoxesForTravel`

`front/lib/api.ts` — même signature que `getBoxesForBusiness(type, boxSlug)` :
```ts
export async function getBoxesForTravel(type: "business" | "blog", boxSlug: string): Promise<Box[]>
```
Retourne `[]` si `NEXT_PUBLIC_API_URL` absent ou si l'endpoint n'existe pas encore (catch silencieux).

---

## Dans scope v1 (correction bloquante)

- `public/tinned-assets/picto-box-travel.svg` — **doit être créé** : `BoxCard` le référence systématiquement comme icône de type (ligne `user-meta-typeBox`) et fallback logo. Sans lui, toute carte Travel Box affiche une image cassée. Utiliser `simple-box.svg` comme base ou créer un SVG avion/globe cohérent avec les autres pictos.

## Hors scope v1

- Asset SVG hero Travel Box distinct (utilise `simple-box.svg` en attendant)
- Voyages réservables (future extension des Trips avec prix/dispo)
- Endpoint API Platform `getBoxesForTravel` côté Symfony (à créer dans un sprint dédié)

---

## Vérification

1. Nav : les 4 liens en nav primaire et footer affichent les bons labels ; `aria-label` lisible par lecteur d'écran
2. `/travel-box` : hero + grid s'affichent, état vide géré proprement
3. `/travel-box/[slug]` : hero OK, sections inter-box et trips masquées si vides
4. `/travel-box/[slug]/[tripSlug]` : article lisible, retour fonctionnel
5. Aucune régression sur Store Box, Business Box, Blog Box
