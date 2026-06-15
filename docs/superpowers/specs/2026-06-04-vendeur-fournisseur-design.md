# Design — Page "Devenir fournisseur" + CMS admin

**Date :** 2026-06-04
**Projet :** Tinned.com (Next.js 14 App Router)
**Statut :** Approuvé

---

## Contexte

Tinned.com souhaite permettre à des artisans/marques belges de rejoindre la plateforme. Le flux est simple : un intéressé découvre la page publique, contacte l'équipe via le CTA, et l'admin crée ensuite sa box manuellement depuis le dashboard admin existant.

Deux contraintes clés :
- La page doit être **discrète** (pas dans la nav principale, lien sobre dans le header)
- L'ensemble du `/dashboard` doit être **admin-only** (actuellement sans garde)

---

## Périmètre

1. Restriction du dashboard vendeur à l'accès admin uniquement
2. Page publique `/vendre` — informative + CTA
3. Lien conditionnel et discret dans le header
4. Section CMS dans l'admin dashboard pour éditer le contenu
5. Persistance via un fichier JSON + route handler Next.js

---

## Architecture

```
/data/vendor-page.json
        │
        ├── GET  app/api/admin/vendor-page/route.ts   (lecture publique)
        └── POST app/api/admin/vendor-page/route.ts   (écriture, token admin requis)
                │
                ├── app/vendre/page.tsx                (page publique, Server Component)
                │       └── lien conditionnel dans app/layout.tsx (topbar)
                │
                └── app/admin/vendor-page/page.tsx     (section CMS admin)
                        └── components/VendorPageCmsClient.tsx
```

---

## 1. Restriction du dashboard (`/dashboard`)

**Fichier :** `app/dashboard/layout.tsx`

Ajout d'un guard client-side dans le layout existant. Au montage, `sessionHasRole(session, "ROLE_ADMIN")` est vérifié. Si false (non-admin ou non-connecté), redirection vers `/admin`. Si vrai, le dashboard s'affiche normalement.

Le lien "Espace vendeur" dans le footer (`app/layout.tsx`) est retiré — il ne doit plus être accessible publiquement.

---

## 2. Fichier de données — `/data/vendor-page.json`

```json
{
  "eyebrow": "Devenir fournisseur",
  "title": "Vendez sur Tinned.com",
  "tagline": "Rejoignez les marques artisanales belges qui font confiance à Tinned.",
  "body": "Tinned.com rassemble des boutiques indépendantes, des vitrines de marques et des créateurs belges. Si vous souhaitez proposer vos produits sur notre plateforme, contactez-nous — nous étudions chaque candidature avec soin.",
  "cta": {
    "label": "Nous contacter",
    "url": "mailto:fournisseurs@tinned.com"
  },
  "published": true
}
```

**Champs structurés :** `eyebrow`, `title`, `tagline`, `cta.label`, `cta.url`
**Corps libre :** `body` — textarea, rendu avec sauts de ligne préservés (`whitespace-pre-line`)
**Toggle :** `published` — si `false`, la page publique retourne `notFound()` et le lien header disparaît

Éditable directement par Claude ou via l'UI admin.

---

## 3. Route handler — `app/api/admin/vendor-page/route.ts`

**GET** — Lecture publique du JSON, aucune auth requise. Utilisé par la page publique (Server Component) et par le formulaire CMS au chargement.

**POST** — Écriture. Vérifie que le header `Authorization: Bearer <token>` contient un JWT avec `ROLE_ADMIN` (même logique que `sessionHasRole` dans `lib/auth.ts`, côté serveur via `jose` ou décodage manuel). Écrit le JSON reçu dans `/data/vendor-page.json`. Retourne le contenu mis à jour.

Sécurité : seul le schéma attendu est accepté (validation des champs requis avant écriture).

---

## 4. Page publique — `app/vendre/page.tsx`

Server Component. Lit `/data/vendor-page.json` via `fs.readFileSync` ou via le route handler interne. Si `published: false`, appelle `notFound()`.

**Structure visuelle (design system Tinned.com) :**
- `.eyebrow` Geist Mono 400 / 12px / uppercase — "Devenir fournisseur"
- H1 Bricolage 700 / 40px — titre
- `.lead` Inter 400 / 16px — tagline
- Bloc `body` Inter 400 / 15px / lh 1.6 — texte libre
- Bouton CTA classe `.button` couleur teal (`--teal`) → URL configurée

Pas de layout spécial — utilise le layout racine (header + footer standard).

---

## 5. Lien dans le header — `app/layout.tsx`

Le header est un Server Component. Il lit le JSON (ou le route handler) au moment du rendu. Si `published: true`, un lien "Vendre" s'affiche dans `nav-actions`, avant les icônes Recherche/Compte/Panier.

Style : classe `nav-sell` — Inter 500 / 13px / couleur `--text-soft` / sans icône. Discret, en texte seul.

Pour éviter une lecture fichier à chaque requête, le layout utilise `cache()` de React pour dédupliquer la lecture dans le même render tree.

---

## 6. Section CMS admin — `app/admin/vendor-page/page.tsx`

Nouvel onglet dans `admin-nav` (icône `Handshake`, label "Fournisseurs"), lien vers `/admin/vendor-page`.

**Composant :** `components/VendorPageCmsClient.tsx`

Formulaire avec :
- Champs structurés : eyebrow, titre, tagline, CTA label, CTA URL
- Grand `<textarea>` pour le corps libre (`body`)
- Toggle checkbox "Page visible" (`published`)
- Bouton "Enregistrer" → POST `/api/admin/vendor-page` avec `Authorization: Bearer <token>`
- Lien "Voir la page" → `/vendre` (ouvre dans un nouvel onglet, visible seulement si `published: true`)
- États UI : chargement, sauvegarde en cours, succès, erreur — pattern identique à `AdminDashboardClient`

Chargement initial : GET `/api/admin/vendor-page` au montage pour pré-remplir le formulaire.

---

## Décisions

| Décision | Choix | Raison |
|---|---|---|
| Persistance | Fichier JSON + route handler | Zéro changement backend Symfony |
| Auth POST | Vérification JWT côté route handler | Cohérent avec `sessionHasRole` existant |
| Lien header | Conditionnel sur `published` | Pas de lien mort si la page est désactivée |
| Dashboard guard | Client-side dans layout | Cohérent avec le pattern existant (AdminDashboardClient) |
| URL page publique | `/vendre` | Court, neutre, pas de mot-clé commercial fort |

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `data/vendor-page.json` | Créer |
| `app/api/admin/vendor-page/route.ts` | Créer |
| `app/vendre/page.tsx` | Créer |
| `app/admin/vendor-page/page.tsx` | Créer |
| `components/VendorPageCmsClient.tsx` | Créer |
| `app/layout.tsx` | Modifier — lien "Vendre" conditionnel dans header, retirer "Espace vendeur" footer |
| `app/dashboard/layout.tsx` | Modifier — guard admin |
| `components/AdminDashboardClient.tsx` | Modifier — ajout onglet "Fournisseurs" dans admin-nav |
