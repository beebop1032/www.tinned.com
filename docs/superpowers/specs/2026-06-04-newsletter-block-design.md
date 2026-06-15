# Design — Bloc capture d'email + intégration Klaviyo

**Date :** 2026-06-04
**Projet :** Tinned.com (Next.js 14 App Router)
**Statut :** Approuvé

---

## Contexte

La home page avait un bloc "VENDOR CTA" (bandeau forest/amber) qui a été retiré car il pointait vers le dashboard vendeur devenu admin-only. Ce même design est réutilisé pour une capture d'email : les visiteurs s'inscrivent à une liste Klaviyo avec double opt-in. Le texte est éditable depuis l'admin sans redéploiement.

---

## Périmètre

1. `data/newsletter-block.json` — contenu CMS du bloc
2. `scripts/klaviyo-setup.ts` — crée la liste Klaviyo une seule fois, affiche le List ID
3. `app/api/newsletter/route.ts` — POST email → Klaviyo (double opt-in)
4. `app/api/newsletter-block/route.ts` — GET (lecture) + POST (écriture admin-auth)
5. `components/NewsletterBlock.tsx` — bloc visuel forest/amber + formulaire
6. `app/page.tsx` — import du bloc, dernière section de la home
7. `components/NewsletterBlockCmsClient.tsx` — formulaire CMS admin
8. `app/admin/newsletter/page.tsx` — route admin
9. `components/AdminDashboardClient.tsx` — onglet "Newsletter"

---

## Architecture

```
data/newsletter-block.json
        │
        ├── GET  app/api/newsletter-block/route.ts   (lecture publique)
        └── POST app/api/newsletter-block/route.ts   (écriture, admin-auth)

.env.local
  KLAVIYO_API_KEY=<clé privée>
  KLAVIYO_LIST_ID=<id après setup>

scripts/klaviyo-setup.ts   → crée liste "Tinned Newsletter" double opt-in, affiche List ID

app/api/newsletter/route.ts
  POST { email } → valide → Klaviyo profile-subscription-bulk-create-jobs → 200 | 400 | 409 | 500

components/NewsletterBlock.tsx   → client component, formulaire + états
app/page.tsx                     → <NewsletterBlock /> avant </> final

app/admin/newsletter/page.tsx    → <AdminDashboardClient section="newsletter" />
components/NewsletterBlockCmsClient.tsx → formulaire CMS
components/AdminDashboardClient.tsx     → section "newsletter" + onglet
```

---

## 1. Données — `data/newsletter-block.json`

```json
{
  "eyebrow": "La sélection Tinned.com",
  "title": "Les meilleures adresses artisanales belges, directement dans votre boîte.",
  "body": "Boutiques indépendantes, créateurs et marques belges — sélectionnés à la main.",
  "placeholder": "votre@email.com",
  "cta": "S'inscrire",
  "published": true
}
```

Type partagé dans `lib/newsletter-block.ts` (même pattern que `lib/vendor-page.ts`).

---

## 2. Script setup Klaviyo — `scripts/klaviyo-setup.ts`

Exécuté **une seule fois** avec `npx ts-node scripts/klaviyo-setup.ts`.

- Lit `KLAVIYO_API_KEY` depuis `.env.local`
- `POST https://a.klaviyo.com/api/lists/` — crée la liste "Tinned Newsletter" avec double opt-in
- Affiche le `list_id` retourné → l'opérateur copie ce `list_id` dans `KLAVIYO_LIST_ID` de `.env.local`

---

## 3. Route handler newsletter — `app/api/newsletter/route.ts`

**POST** uniquement. Corps attendu : `{ email: string }`.

1. Validation basique : `email` présent, format valide (regex simple)
2. Appel Klaviyo v3 : `POST https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/`
   ```json
   {
     "data": {
       "type": "profile-subscription-bulk-create-job",
       "attributes": {
         "profiles": {
           "data": [{ "type": "profile", "attributes": { "email": "<email>" } }]
         }
       },
       "relationships": {
         "list": { "data": { "type": "list", "id": "<KLAVIYO_LIST_ID>" } }
       }
     }
   }
   ```
3. Réponses :
   - `202` Klaviyo → `{ success: true }` → UI : "Vérifiez votre boîte email."
   - Email déjà inscrit : Klaviyo retourne profil existant sans erreur → même réponse `{ success: true }`
   - Validation échouée → `400 { error: "Email invalide." }`
   - `KLAVIYO_LIST_ID` manquant → `500 { error: "Service indisponible." }`
   - Erreur Klaviyo → `500 { error: "Erreur lors de l'inscription." }`

Headers : `Authorization: Klaviyo-API-Key <KLAVIYO_API_KEY>`, `revision: 2024-02-15`.

---

## 4. Bloc visuel — `components/NewsletterBlock.tsx`

Client component (`"use client"`). Lit les données depuis `app/page.tsx` via props (Server Component parent passe les données).

**Structure visuelle** (reprend le design de l'ancien VENDOR CTA) :
- Container : fond `var(--forest)`, `borderRadius: "2px"`, padding `clamp(32px, 5vw, 56px)`
- Gauche : `.eyebrow` (blanc/60%) + H2 Bricolage blanc + `<p>` body Inter blanc/80%
- Droite : `<form>` avec `<input type="email">` stylé + bouton amber `var(--amber)`
- Mobile (`max-width: 640px`) : layout colonne, input + bouton pleine largeur
- États :
  - **Idle** : formulaire normal
  - **Loading** : bouton désactivé + spinner `Loader2`
  - **Success** : message "Vérifiez votre boîte email." en blanc, formulaire masqué
  - **Error** : message d'erreur en rouge clair sous le champ

**Intégration dans `app/page.tsx`** :
- Le Server Component `page.tsx` lit `data/newsletter-block.json` via `lib/newsletter-block.ts`
- Si `published: false`, le bloc n'est pas rendu
- Si `published: true`, `<NewsletterBlock data={data} />` est rendu avant le `</>` final

---

## 5. CMS Admin — section "Newsletter"

**Pattern identique à "Fournisseurs"** :

- `AdminSection` étendu à `"newsletter"`
- Onglet "Newsletter" dans `admin-nav` (icône `Mail`)
- `app/admin/newsletter/page.tsx` → `<AdminDashboardClient section="newsletter" />`
- `components/NewsletterBlockCmsClient.tsx` :
  - Champs : eyebrow, titre, body, placeholder, CTA label
  - Toggle `published`
  - GET `/api/newsletter-block` au montage, POST `/api/newsletter-block` à la sauvegarde

---

## Variables d'environnement

| Variable | Description |
|---|---|
| `KLAVIYO_API_KEY` | Clé privée Klaviyo (dans `.env.local`) |
| `KLAVIYO_LIST_ID` | ID de la liste (rempli après `klaviyo-setup.ts`) |

---

## Fichiers à créer / modifier

| Fichier | Action |
|---|---|
| `data/newsletter-block.json` | Créer |
| `lib/newsletter-block.ts` | Créer |
| `scripts/klaviyo-setup.ts` | Créer |
| `app/api/newsletter/route.ts` | Créer |
| `app/api/newsletter-block/route.ts` | Créer |
| `components/NewsletterBlock.tsx` | Créer |
| `components/NewsletterBlockCmsClient.tsx` | Créer |
| `app/admin/newsletter/page.tsx` | Créer |
| `app/page.tsx` | Modifier — import + render NewsletterBlock |
| `components/AdminDashboardClient.tsx` | Modifier — onglet Mail + section newsletter |

---

## Vérification

1. `npx ts-node scripts/klaviyo-setup.ts` → affiche un `list_id` → le copier dans `.env.local`
2. `http://localhost:3000` → bloc newsletter visible en bas de page
3. Soumettre un email → "Vérifiez votre boîte email." → email de confirmation Klaviyo reçu
4. Cliquer le lien de confirmation → profil actif dans Klaviyo avec analytics
5. `http://localhost:3000/admin` → onglet "Newsletter" → modifier le titre → sauvegarder → home page mise à jour
6. Toggle `published: false` → bloc disparu de la home
