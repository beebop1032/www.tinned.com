# Page "Devenir fournisseur" + CMS admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page publique discrète `/vendre` éditée par l'admin via un formulaire CMS, restreindre `/dashboard` aux admins, et ajouter un lien "Vendre" conditionnel dans le header.

**Architecture:** Contenu stocké dans `data/vendor-page.json`. Un route handler Next.js gère lecture (GET public) et écriture (POST admin-auth). La page publique et le header lisent le fichier côté serveur. L'admin dashboard intègre une nouvelle section "Fournisseurs".

**Tech Stack:** Next.js 14 App Router, TypeScript, Lucide React, `fs` Node.js, JWT decode manuel (base64, même technique que `lib/auth.ts`)

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `data/vendor-page.json` | Créer | Source de vérité du contenu CMS |
| `lib/vendor-page.ts` | Créer | Type partagé + lecture fichier JSON |
| `app/api/admin/vendor-page/route.ts` | Créer | GET (public) + POST (admin-auth) |
| `app/vendre/page.tsx` | Créer | Page publique Server Component |
| `app/globals.css` | Modifier | Classe `.nav-sell` pour lien header |
| `app/layout.tsx` | Modifier | Lien "Vendre" conditionnel + retirer "Espace vendeur" footer |
| `app/dashboard/layout.tsx` | Modifier | Guard admin (redirect → /admin si non-admin) |
| `components/VendorPageCmsClient.tsx` | Créer | Formulaire CMS hybride |
| `components/AdminDashboardClient.tsx` | Modifier | Onglet "Fournisseurs" + render section vendor-page |
| `app/admin/vendor-page/page.tsx` | Créer | Route admin qui monte AdminDashboardClient section="vendor-page" |

---

## Task 1 — Fichier JSON + utilitaire partagé

**Files:**
- Create: `data/vendor-page.json`
- Create: `lib/vendor-page.ts`

- [ ] **Étape 1 : Créer le dossier `data/` et le fichier JSON**

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

- [ ] **Étape 2 : Créer `lib/vendor-page.ts`**

```typescript
import { readFileSync } from "fs";
import { join } from "path";

export type VendorPageData = {
  eyebrow: string;
  title: string;
  tagline: string;
  body: string;
  cta: { label: string; url: string };
  published: boolean;
};

const DATA_PATH = join(process.cwd(), "data", "vendor-page.json");

export function readVendorPage(): VendorPageData | null {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as VendorPageData;
  } catch {
    return null;
  }
}
```

- [ ] **Étape 3 : Vérifier que le fichier est lisible**

```bash
node -e "const {readFileSync}=require('fs');const {join}=require('path');console.log(JSON.parse(readFileSync(join(process.cwd(),'data','vendor-page.json'),'utf-8')))"
```

Résultat attendu : l'objet JSON affiché sans erreur.

- [ ] **Étape 4 : Commit**

```bash
git add data/vendor-page.json lib/vendor-page.ts
git commit -m "feat: add vendor-page.json data file and shared reader utility"
```

---

## Task 2 — Route handler GET + POST

**Files:**
- Create: `app/api/admin/vendor-page/route.ts`

- [ ] **Étape 1 : Créer `app/api/admin/vendor-page/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { VendorPageData } from "@/lib/vendor-page";

const DATA_PATH = join(process.cwd(), "data", "vendor-page.json");

function readData(): VendorPageData {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as VendorPageData;
}

function isAdminToken(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const json = JSON.parse(Buffer.from(normalized, "base64").toString("utf-8")) as { roles?: string[] };
    return Array.isArray(json.roles) && json.roles.includes("ROLE_ADMIN");
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    return NextResponse.json(readData());
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json() as Partial<VendorPageData>;

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const data: VendorPageData = {
    eyebrow: typeof body.eyebrow === "string" ? body.eyebrow : "",
    title: body.title.trim(),
    tagline: typeof body.tagline === "string" ? body.tagline : "",
    body: typeof body.body === "string" ? body.body : "",
    cta: {
      label: typeof body.cta?.label === "string" ? body.cta.label : "Nous contacter",
      url: typeof body.cta?.url === "string" ? body.cta.url : "",
    },
    published: typeof body.published === "boolean" ? body.published : false,
  };

  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json(data);
}
```

- [ ] **Étape 2 : Vérifier le GET**

Démarrer le serveur avec `npm run dev`, puis :
```bash
curl http://localhost:3000/api/admin/vendor-page
```
Résultat attendu : l'objet JSON du fichier, status 200.

- [ ] **Étape 3 : Vérifier le POST sans token**

```bash
curl -X POST http://localhost:3000/api/admin/vendor-page \
  -H "content-type: application/json" \
  -d '{"title":"test"}'
```
Résultat attendu : `{"error":"Non autorisé"}`, status 401.

- [ ] **Étape 4 : Commit**

```bash
git add app/api/admin/vendor-page/route.ts
git commit -m "feat: add vendor-page API route with admin auth guard"
```

---

## Task 3 — Page publique `/vendre`

**Files:**
- Create: `app/vendre/page.tsx`

- [ ] **Étape 1 : Créer `app/vendre/page.tsx`**

```typescript
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readVendorPage } from "@/lib/vendor-page";

export const metadata: Metadata = {
  title: "Devenir fournisseur"
};

export const dynamic = "force-dynamic";

export default function VendrePage() {
  const data = readVendorPage();
  if (!data || !data.published) notFound();

  return (
    <section style={{ maxWidth: "680px", margin: "0 auto", padding: "clamp(48px, 8vw, 96px) 24px" }}>
      <p className="eyebrow">{data.eyebrow}</p>
      <h1 style={{ marginTop: "8px", marginBottom: "16px" }}>{data.title}</h1>
      <p className="lead" style={{ marginBottom: "32px" }}>{data.tagline}</p>
      <div style={{ marginBottom: "40px" }}>
        <p style={{ whiteSpace: "pre-line" }}>{data.body}</p>
      </div>
      <a
        className="button"
        href={data.cta.url}
        style={{ backgroundColor: "var(--teal)", color: "#fff", display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        {data.cta.label}
      </a>
    </section>
  );
}
```

- [ ] **Étape 2 : Vérifier en navigateur**

Aller sur `http://localhost:3000/vendre`.
Résultat attendu : la page s'affiche avec le titre, tagline, corps et bouton CTA teal.

- [ ] **Étape 3 : Vérifier `published: false` → 404**

Dans `data/vendor-page.json`, mettre temporairement `"published": false`, recharger `http://localhost:3000/vendre`.
Résultat attendu : page 404.
Remettre `"published": true` ensuite.

- [ ] **Étape 4 : Commit**

```bash
git add app/vendre/page.tsx
git commit -m "feat: add public /vendre page, server-rendered from vendor-page.json"
```

---

## Task 4 — CSS `.nav-sell` + mise à jour header/footer

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Étape 1 : Ajouter `.nav-sell` dans `app/globals.css`**

Ajouter après les styles `.nav-cart:hover` (ligne ~220) :

```css
.nav-sell {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-soft);
}

.nav-sell:hover {
  color: var(--forest);
}
```

- [ ] **Étape 2 : Modifier `app/layout.tsx`**

Ajouter l'import en haut du fichier (après les imports existants) :
```typescript
import { readVendorPage } from "@/lib/vendor-page";
```

Modifier la fonction `RootLayout` pour lire le JSON et afficher le lien conditionnel :
```typescript
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const vendorPage = readVendorPage();
  const showVendorLink = vendorPage?.published === true;

  return (
    <html lang="fr" className={`${bricolage.variable} ${inter.variable} ${geistMono.variable}`}>
      <body>
        <div className="site-shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link className="brand" href="/" aria-label="Tinned">
                <Image
                  src="/tinned-assets/logo-tinned-color.svg"
                  alt=""
                  width={28}
                  height={32}
                  priority
                  aria-hidden
                />
                <span className="brand-word">Tinned.com</span>
              </Link>
              <nav className="nav nav-primary" aria-label="Navigation principale">
                <Link href="/store-box">Boutiques</Link>
                <Link href="/business-box">Vitrines</Link>
                <Link href="/blog-box">Blogs</Link>
                <Link href="/travel-box">Voyages</Link>
              </nav>
              <nav className="nav nav-actions" aria-label="Actions">
                {showVendorLink && (
                  <Link className="nav-sell" href="/vendre">Vendre</Link>
                )}
                <Link className="nav-search" href="/search" aria-label="Recherche">
                  <Search size={15} aria-hidden />
                  <span>Rechercher</span>
                </Link>
                <Link className="nav-account" href="/profile" aria-label="Mon compte">
                  <UserRound size={15} aria-hidden />
                  <span>Compte</span>
                </Link>
                <Link className="nav-cart" href="/cart" aria-label="Panier">
                  <ShoppingBag size={15} aria-hidden />
                  <span>Panier</span>
                </Link>
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="container footer-grid">
              <div className="footer-brand">
                <p className="brand-word" style={{ fontSize: "28px", color: "#fff", display: "block", marginBottom: "12px" }}>Tinned.com</p>
                <p>Boutiques artisanales, marques indépendantes et carnets de voyage belges. Découvrez, comparez, commandez.</p>
              </div>
              <div>
                <h2>Explorer</h2>
                <Link href="/store-box">Boutiques</Link>
                <Link href="/business-box">Vitrines</Link>
                <Link href="/blog-box">Blogs</Link>
                <Link href="/travel-box">Voyages</Link>
              </div>
              <div>
                <h2>Acheter</h2>
                <Link href="/cart">Panier</Link>
                <Link href="/checkout">Commander</Link>
                <Link href="/orders">Mes commandes</Link>
              </div>
              <div>
                <h2>Aide</h2>
                <Link href="/faq">FAQ</Link>
                <Link href="/profile">Mon profil</Link>
              </div>
            </div>
            <div className="container footer-bottom">
              <span>© {new Date().getFullYear()} Tinned · BeebopCity</span>
              <span>Boutiques indépendantes · Livraison belge · Paiement sécurisé</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
```

Note : le lien "Espace vendeur" du footer est retiré. Le lien "Vendre" n'apparaît dans le header que si `published: true`.

- [ ] **Étape 3 : Vérifier en navigateur**

Recharger `http://localhost:3000`. Le lien "Vendre" doit apparaître dans `nav-actions`, avant "Rechercher". Vérifier qu'il est discret (couleur `--text-soft`, pas de bordure).

- [ ] **Étape 4 : Vérifier la disparition du lien si `published: false`**

Mettre temporairement `"published": false` dans `data/vendor-page.json`, redémarrer le serveur, vérifier que "Vendre" n'est plus dans le header. Remettre `true`.

- [ ] **Étape 5 : Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add conditional Vendre link in header, remove Espace vendeur from footer"
```

---

## Task 5 — Guard admin sur `/dashboard`

**Files:**
- Modify: `app/dashboard/layout.tsx`

- [ ] **Étape 1 : Modifier `app/dashboard/layout.tsx`**

Remplacer le contenu complet par :

```typescript
"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, ShoppingBag, Box, LogOut } from "lucide-react";
import { readStoredSession, sessionHasRole } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/boxes", label: "Mes Boxes", icon: Box },
  { href: "/dashboard/orders", label: "Commandes", icon: ShoppingBag },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const session = readStoredSession();
    if (sessionHasRole(session, "ROLE_ADMIN")) {
      setAuthorized(true);
    } else {
      router.replace("/admin");
    }
  }, [router]);

  if (!authorized) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      minHeight: "calc(100vh - 72px)",
      background: "var(--cream)"
    }}>
      <aside style={{
        background: "var(--deep)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "32px 0",
        borderRight: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "16px" }}>
          <div style={{
            fontFamily: "var(--font-brand), sans-serif",
            fontSize: "17px",
            color: "#fff",
            fontWeight: 600
          }}>Mon espace</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", marginTop: "4px", fontWeight: 500 }}>Espace vendeur</div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", padding: "0 12px" }}>
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "14px",
                  textDecoration: "none",
                  transition: "all 150ms ease"
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.4)",
            fontSize: "13px",
            fontWeight: 500,
            textDecoration: "none"
          }}>
            <LogOut size={14} />
            Retour au site
          </Link>
        </div>
      </aside>

      <main style={{ padding: "clamp(28px, 4vw, 48px)", overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Étape 2 : Vérifier sans session admin**

Sans être connecté en admin, naviguer vers `http://localhost:3000/dashboard`.
Résultat attendu : redirection immédiate vers `/admin`.

- [ ] **Étape 3 : Vérifier avec session admin**

Se connecter en admin via `/admin`, puis naviguer vers `/dashboard`.
Résultat attendu : dashboard s'affiche normalement.

- [ ] **Étape 4 : Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: restrict /dashboard to admin role, redirect to /admin otherwise"
```

---

## Task 6 — Composant CMS `VendorPageCmsClient`

**Files:**
- Create: `components/VendorPageCmsClient.tsx`

- [ ] **Étape 1 : Créer `components/VendorPageCmsClient.tsx`**

```typescript
"use client";

import { ExternalLink, Loader2, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, normalizeSession } from "@/lib/auth";
import type { VendorPageData } from "@/lib/vendor-page";

export function VendorPageCmsClient() {
  const [form, setForm] = useState<VendorPageData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/vendor-page")
      .then((r) => r.json())
      .then((data) => setForm(data as VendorPageData))
      .catch(() => setError("Impossible de charger le contenu."));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const stored = normalizeSession(JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null"));
    if (!stored?.token) { setError("Session expirée."); return; }
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const res = await fetch("/api/admin/vendor-page", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${stored.token}`
        },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erreur lors de la sauvegarde.");
      }
      setStatus("Contenu enregistré.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  };

  const patch = (patch: Partial<VendorPageData>) =>
    setForm((f) => f ? { ...f, ...patch } : f);

  if (!form) {
    return (
      <p style={{ padding: "24px", color: "var(--text-soft)" }}>
        {error || "Chargement…"}
      </p>
    );
  }

  return (
    <div>
      {(status || error) && (
        <div className={`admin-alert ${error ? "is-error" : "is-success"}`} role="status">
          {error || status}
        </div>
      )}

      {form.published && (
        <div style={{ marginBottom: "16px" }}>
          <a
            className="button secondary"
            href="/vendre"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
          >
            <ExternalLink size={15} aria-hidden />
            Voir la page /vendre
          </a>
        </div>
      )}

      <form className="admin-panel" style={{ padding: "24px" }} onSubmit={submit}>
        <div className="admin-form-grid">
          <label className="field">
            <span>Eyebrow</span>
            <input
              value={form.eyebrow}
              onChange={(e) => patch({ eyebrow: e.target.value })}
              placeholder="Devenir fournisseur"
            />
          </label>
          <label className="field">
            <span>Titre</span>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              required
              placeholder="Vendez sur Tinned.com"
            />
          </label>
          <label className="field field-full">
            <span>Tagline</span>
            <input
              value={form.tagline}
              onChange={(e) => patch({ tagline: e.target.value })}
              placeholder="Rejoignez les marques artisanales belges…"
            />
          </label>
          <label className="field field-full">
            <span>Corps du texte</span>
            <textarea
              rows={8}
              value={form.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </label>
          <label className="field">
            <span>CTA — Libellé</span>
            <input
              value={form.cta.label}
              onChange={(e) => patch({ cta: { ...form.cta, label: e.target.value } })}
              placeholder="Nous contacter"
            />
          </label>
          <label className="field">
            <span>CTA — URL</span>
            <input
              value={form.cta.url}
              onChange={(e) => patch({ cta: { ...form.cta, url: e.target.value } })}
              placeholder="mailto:fournisseurs@tinned.com"
            />
          </label>
        </div>

        <label className="admin-toggle" style={{ marginTop: "16px" }}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>Page visible sur le site</span>
        </label>

        <button
          className="button admin-submit"
          type="submit"
          disabled={busy}
          style={{ marginTop: "24px" }}
        >
          {busy ? <Loader2 size={18} aria-hidden className="spin" /> : <Save size={18} aria-hidden />}
          Enregistrer
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Étape 2 : Commit**

```bash
git add components/VendorPageCmsClient.tsx
git commit -m "feat: add VendorPageCmsClient CMS form for vendor page content"
```

---

## Task 7 — Intégration dans `AdminDashboardClient`

**Files:**
- Modify: `components/AdminDashboardClient.tsx`

- [ ] **Étape 1 : Mettre à jour le type `AdminSection`, les imports et les fonctions impactées**

En haut de `components/AdminDashboardClient.tsx`, ajouter à la ligne des imports lucide-react :
```typescript
import { Handshake } from "lucide-react"; // ajouter dans la liste existante
```

Ajouter l'import du composant CMS :
```typescript
import { VendorPageCmsClient } from "@/components/VendorPageCmsClient";
```

Modifier le type `AdminSection` :
```typescript
type AdminSection = "overview" | BoxType | "vendor-page";
```

Mettre à jour `boxFormForSection` pour gérer le nouveau cas (sinon TypeScript error: `"vendor-page"` n'est pas un `BoxType`) :
```typescript
function boxFormForSection(section: AdminSection): BoxFormState {
  const type: BoxType =
    section === "overview" || section === "vendor-page" ? "store" : section;
  return { ...initialBoxForm, type };
}
```

Mettre à jour la variable `boxSection` dans le corps du composant (chercher `const boxSection`) :
```typescript
const boxSection: BoxType =
  section === "overview" || section === "vendor-page" ? "store" : section;
```

- [ ] **Étape 2 : Mettre à jour le header h1 et description**

Remplacer les lignes du header (chercher `<h1>{section === "overview"`) par :
```typescript
<h1>
  {section === "overview"
    ? "Dashboard Tinned"
    : section === "vendor-page"
      ? "Page Fournisseurs"
      : sectionLabel(section as BoxType)}
</h1>
<p>
  {section === "overview"
    ? "Pilotez chaque espace depuis sa page dédiée."
    : section === "vendor-page"
      ? "Contenu de la page publique /vendre."
      : `Gérez vos ${sectionLabel(section as BoxType)} et leur contenu.`}
</p>
```

- [ ] **Étape 3 : Ajouter le lien "Fournisseurs" dans admin-nav**

Dans `<nav className="admin-nav">`, ajouter après le lien Etiquettes :
```tsx
<Link href="/admin/vendor-page">
  <Handshake size={17} aria-hidden />
  Fournisseurs
</Link>
```

- [ ] **Étape 4 : Ajouter le render pour section "vendor-page"**

Remplacer la condition finale (chercher `{section === "overview" ? (`) par :
```tsx
{section === "vendor-page" ? (
  <VendorPageCmsClient />
) : section === "overview" ? (
  <>
    {/* ... contenu overview existant, inchangé ... */}
  </>
) : (
  <div className={`admin-catalog-layout ...`}>
    {/* ... contenu catalog existant, inchangé ... */}
  </div>
)}
```

Note : ne pas toucher au contenu existant de "overview" et du catalog layout, juste enrober.

- [ ] **Étape 5 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit
```

Résultat attendu : aucune erreur.

- [ ] **Étape 6 : Commit**

```bash
git add components/AdminDashboardClient.tsx
git commit -m "feat: add Fournisseurs tab in admin nav with VendorPageCmsClient integration"
```

---

## Task 8 — Page route admin `/admin/vendor-page`

**Files:**
- Create: `app/admin/vendor-page/page.tsx`

- [ ] **Étape 1 : Créer `app/admin/vendor-page/page.tsx`**

```typescript
import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Page Fournisseurs"
};

export default function AdminVendorPagePage() {
  return <AdminDashboardClient section="vendor-page" />;
}
```

- [ ] **Étape 2 : Vérifier le flux complet en navigateur**

1. Aller sur `http://localhost:3000/admin`
2. Se connecter en admin
3. Cliquer sur "Fournisseurs" dans la nav admin
4. Vérifier que le formulaire CMS s'affiche avec les valeurs actuelles du JSON
5. Modifier le titre, cliquer "Enregistrer"
6. Vérifier le message "Contenu enregistré."
7. Ouvrir `/vendre` dans un nouvel onglet — vérifier que le titre a changé
8. Décocher "Page visible", enregistrer — vérifier que `/vendre` renvoie 404 et "Vendre" disparaît du header (après redémarrage ou revalidation)

- [ ] **Étape 3 : Commit final**

```bash
git add app/admin/vendor-page/page.tsx
git commit -m "feat: add /admin/vendor-page route, complete vendor CMS feature"
```

---

## Récapitulatif des commits

1. `feat: add vendor-page.json data file and shared reader utility`
2. `feat: add vendor-page API route with admin auth guard`
3. `feat: add public /vendre page, server-rendered from vendor-page.json`
4. `feat: add conditional Vendre link in header, remove Espace vendeur from footer`
5. `feat: restrict /dashboard to admin role, redirect to /admin otherwise`
6. `feat: add VendorPageCmsClient CMS form for vendor page content`
7. `feat: add Fournisseurs tab in admin nav with VendorPageCmsClient integration`
8. `feat: add /admin/vendor-page route, complete vendor CMS feature`
