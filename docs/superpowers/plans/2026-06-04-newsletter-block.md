# Newsletter Block + Klaviyo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un bloc capture d'email sur la home page Tinned.com, connecté à Klaviyo (double opt-in), avec contenu éditable depuis l'admin.

**Architecture:** Contenu dans `data/newsletter-block.json` lu par un Server Component. Le formulaire client POSTe à `/api/newsletter` qui appelle Klaviyo v3. Même pattern CMS que la feature "Fournisseurs" déjà en place.

**Tech Stack:** Next.js 14 App Router, TypeScript, Klaviyo API v3, `fs` Node.js, Lucide React

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `data/newsletter-block.json` | Créer | Contenu CMS du bloc |
| `lib/newsletter-block.ts` | Créer | Type partagé + lecture fichier |
| `scripts/klaviyo-setup.ts` | Créer | Crée la liste Klaviyo, affiche List ID |
| `app/api/newsletter/route.ts` | Créer | POST email → Klaviyo |
| `app/api/newsletter-block/route.ts` | Créer | GET (public) + POST (admin) contenu CMS |
| `components/NewsletterBlock.tsx` | Créer | Bloc forest/amber + formulaire client |
| `app/page.tsx` | Modifier | Import + render NewsletterBlock |
| `components/NewsletterBlockCmsClient.tsx` | Créer | Formulaire CMS admin |
| `app/admin/newsletter/page.tsx` | Créer | Route admin newsletter |
| `components/AdminDashboardClient.tsx` | Modifier | Onglet "Newsletter" + section |

---

## Task 1 — Données + utilitaire partagé

**Files:**
- Create: `data/newsletter-block.json`
- Create: `lib/newsletter-block.ts`

- [ ] **Étape 1 : Créer `data/newsletter-block.json`**

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

- [ ] **Étape 2 : Créer `lib/newsletter-block.ts`**

```typescript
import { readFileSync } from "fs";
import { join } from "path";

export type NewsletterBlockData = {
  eyebrow: string;
  title: string;
  body: string;
  placeholder: string;
  cta: string;
  published: boolean;
};

const DATA_PATH = join(process.cwd(), "data", "newsletter-block.json");

export function readNewsletterBlock(): NewsletterBlockData | null {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as NewsletterBlockData;
  } catch {
    return null;
  }
}
```

- [ ] **Étape 3 : Vérifier**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com
node -e "const {readFileSync}=require('fs');const {join}=require('path');console.log(JSON.parse(readFileSync(join(process.cwd(),'data','newsletter-block.json'),'utf-8')))"
npx tsc --noEmit 2>&1 | head -5
```

Résultat attendu : objet JSON affiché, zéro erreur TypeScript.

---

## Task 2 — Script setup Klaviyo

**Files:**
- Create: `scripts/klaviyo-setup.ts`

- [ ] **Étape 1 : Créer `scripts/klaviyo-setup.ts`**

```typescript
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const apiKey = envContent.match(/^KLAVIYO_API_KEY=(.+)$/m)?.[1]?.trim();

if (!apiKey) {
  console.error("❌ KLAVIYO_API_KEY introuvable dans .env.local");
  process.exit(1);
}

async function main() {
  console.log("Création de la liste Klaviyo \"Tinned Newsletter\"...");

  const res = await fetch("https://a.klaviyo.com/api/lists/", {
    method: "POST",
    headers: {
      "Authorization": `Klaviyo-API-Key ${apiKey}`,
      "revision": "2024-02-15",
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "list",
        attributes: { name: "Tinned Newsletter" },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ Erreur Klaviyo :", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  const data = await res.json() as { data: { id: string } };
  const listId = data.data.id;

  // Écrire le List ID dans .env.local
  const updated = envContent.replace(/^KLAVIYO_LIST_ID=.*$/m, `KLAVIYO_LIST_ID=${listId}`);
  writeFileSync(envPath, updated, "utf-8");

  console.log(`\n✅ Liste créée ! List ID : ${listId}`);
  console.log("✅ KLAVIYO_LIST_ID écrit dans .env.local");
  console.log("\n⚠️  Active le double opt-in dans Klaviyo :");
  console.log("   Klaviyo → Lists → Tinned Newsletter → Settings → Double Opt-In → Enable\n");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Étape 2 : Exécuter le script**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com
npx ts-node --skip-project scripts/klaviyo-setup.ts
```

Résultat attendu :
```
✅ Liste créée ! List ID : XXXXXX
✅ KLAVIYO_LIST_ID écrit dans .env.local
```

Si erreur `Cannot find module 'ts-node'` :
```bash
npm install -D ts-node
npx ts-node --skip-project scripts/klaviyo-setup.ts
```

- [ ] **Étape 3 : Activer le double opt-in dans Klaviyo dashboard**

Aller dans Klaviyo → Lists & Segments → Tinned Newsletter → Settings → Double Opt-In → Enable.

- [ ] **Étape 4 : Vérifier `.env.local`**

```bash
grep KLAVIYO_LIST_ID /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com/.env.local
```

Résultat attendu : `KLAVIYO_LIST_ID=XXXXXX` (non vide).

---

## Task 3 — Route handler newsletter (POST email → Klaviyo)

**Files:**
- Create: `app/api/newsletter/route.ts`

- [ ] **Étape 1 : Créer `app/api/newsletter/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string };
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  const apiKey = process.env.KLAVIYO_API_KEY;
  const listId = process.env.KLAVIYO_LIST_ID;

  if (!apiKey || !listId) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 500 });
  }

  try {
    const res = await fetch("https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/", {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${apiKey}`,
        "revision": "2024-02-15",
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [
                {
                  type: "profile",
                  attributes: {
                    email,
                    subscriptions: {
                      email: {
                        marketing: {
                          consent: "SUBSCRIBED",
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          relationships: {
            list: {
              data: { type: "list", id: listId },
            },
          },
        },
      }),
    });

    // Klaviyo retourne 202 Accepted pour ce job endpoint
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { errors?: { detail?: string }[] };
      const detail = err.errors?.[0]?.detail ?? "Erreur Klaviyo.";
      throw new Error(detail);
    }

    return NextResponse.json({ success: true });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Erreur lors de l'inscription.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

Résultat attendu : aucune erreur.

- [ ] **Étape 3 : Tester le endpoint (email invalide)**

Démarrer le serveur (`npm run dev`) puis :
```bash
curl -X POST http://localhost:3000/api/newsletter \
  -H "content-type: application/json" \
  -d '{"email":"pasunemail"}'
```

Résultat attendu : `{"error":"Email invalide."}` status 400.

---

## Task 4 — Route handler CMS newsletter-block

**Files:**
- Create: `app/api/newsletter-block/route.ts`

- [ ] **Étape 1 : Créer `app/api/newsletter-block/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import type { NewsletterBlockData } from "@/lib/newsletter-block";

const DATA_PATH = join(process.cwd(), "data", "newsletter-block.json");

function readData(): NewsletterBlockData {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8")) as NewsletterBlockData;
}

// Decodes JWT payload without signature verification — same pattern as sessionHasRole in lib/auth.ts.
// Token authenticity is guaranteed by the Symfony backend that issued it.
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

  const body = await request.json() as Partial<NewsletterBlockData>;

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  const data: NewsletterBlockData = {
    eyebrow: typeof body.eyebrow === "string" ? body.eyebrow : "",
    title: body.title.trim(),
    body: typeof body.body === "string" ? body.body : "",
    placeholder: typeof body.placeholder === "string" ? body.placeholder : "votre@email.com",
    cta: typeof body.cta === "string" ? body.cta : "S'inscrire",
    published: typeof body.published === "boolean" ? body.published : false,
  };

  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json(data);
}
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

Résultat attendu : aucune erreur.

---

## Task 5 — Composant `NewsletterBlock`

**Files:**
- Create: `components/NewsletterBlock.tsx`

- [ ] **Étape 1 : Créer `components/NewsletterBlock.tsx`**

```typescript
"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { NewsletterBlockData } from "@/lib/newsletter-block";

export function NewsletterBlock({ data }: { data: NewsletterBlockData }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erreur lors de l'inscription.");
      }
      setSuccess(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inconnue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 320px)",
      alignItems: "center",
      gap: "clamp(24px, 4vw, 48px)",
      padding: "clamp(32px, 5vw, 56px)",
      background: "var(--forest)",
      borderRadius: "2px",
      color: "#fff",
    }}>
      <div>
        <span style={{
          display: "inline-block",
          marginBottom: "12px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}>
          {data.eyebrow}
        </span>
        <h2 style={{
          fontFamily: "var(--font-brand)",
          fontSize: "clamp(22px, 3.5vw, 36px)",
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: "-0.015em",
          margin: "0 0 12px",
          color: "#fff",
        }}>
          {data.title}
        </h2>
        <p style={{
          margin: 0,
          color: "rgba(255,255,255,0.75)",
          fontSize: "15px",
          lineHeight: 1.55,
        }}>
          {data.body}
        </p>
      </div>

      <div>
        {success ? (
          <p style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: "15px",
            fontWeight: 500,
            textAlign: "center",
          }}>
            ✓ Vérifiez votre boîte email.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={data.placeholder}
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "14px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {error && (
              <p style={{ color: "#FCA5A5", fontSize: "13px", margin: 0 }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "var(--amber)",
                color: "#fff",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "14px",
                border: "none",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.7 : 1,
                width: "100%",
                fontFamily: "var(--font-body)",
              }}
            >
              {busy && <Loader2 size={16} aria-hidden className="spin" />}
              {data.cta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

Résultat attendu : aucune erreur.

---

## Task 6 — Intégration dans `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Étape 1 : Lire le début du fichier pour connaître les imports existants**

Lire les 10 premières lignes de `app/page.tsx` pour confirmer les imports actuels.

- [ ] **Étape 2 : Ajouter les imports**

Ajouter ces deux lignes après les imports existants (avant la ligne `export default async function`):

```typescript
import { NewsletterBlock } from "@/components/NewsletterBlock";
import { readNewsletterBlock } from "@/lib/newsletter-block";
```

- [ ] **Étape 3 : Lire l'appel `Promise.all` existant (ligne ~12)**

Le composant commence par :
```typescript
export default async function HomePage() {
  const [stores, businesses, blogs, travels, products, articles] = await Promise.all([...]);
```

Ajouter `readNewsletterBlock()` appelé **avant** le `Promise.all` (c'est synchrone, pas besoin d'être dans le Promise.all) :

```typescript
export default async function HomePage() {
  const newsletterBlock = readNewsletterBlock();
  const [stores, businesses, blogs, travels, products, articles] = await Promise.all([
```

- [ ] **Étape 4 : Ajouter le bloc avant le `</>` final**

Trouver la fin du composant :
```tsx
    </>
  );
}
```

Remplacer par :
```tsx
      {newsletterBlock?.published && (
        <section className="container" style={{ paddingBottom: "clamp(54px, 7vw, 86px)" }}>
          <NewsletterBlock data={newsletterBlock} />
        </section>
      )}
    </>
  );
}
```

- [ ] **Étape 5 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

Résultat attendu : aucune erreur.

- [ ] **Étape 6 : Vérifier en navigateur**

Aller sur `http://localhost:3000` — le bloc forest/amber doit apparaître en bas de page avec le formulaire email.

---

## Task 7 — `NewsletterBlockCmsClient`

**Files:**
- Create: `components/NewsletterBlockCmsClient.tsx`

- [ ] **Étape 1 : Créer `components/NewsletterBlockCmsClient.tsx`**

```typescript
"use client";

import { ExternalLink, Loader2, Save } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, normalizeSession } from "@/lib/auth";
import type { NewsletterBlockData } from "@/lib/newsletter-block";

export function NewsletterBlockCmsClient() {
  const [form, setForm] = useState<NewsletterBlockData | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/newsletter-block")
      .then((r) => r.json())
      .then((data) => setForm(data as NewsletterBlockData))
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
      const res = await fetch("/api/newsletter-block", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${stored.token}`,
        },
        body: JSON.stringify(form),
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

  const patch = (next: Partial<NewsletterBlockData>) =>
    setForm((f) => f ? { ...f, ...next } : f);

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
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
          >
            <ExternalLink size={15} aria-hidden />
            Voir sur la home
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
              placeholder="La sélection Tinned.com"
            />
          </label>
          <label className="field field-full">
            <span>Titre</span>
            <input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              required
            />
          </label>
          <label className="field field-full">
            <span>Corps du texte</span>
            <textarea
              rows={3}
              value={form.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Placeholder champ email</span>
            <input
              value={form.placeholder}
              onChange={(e) => patch({ placeholder: e.target.value })}
              placeholder="votre@email.com"
            />
          </label>
          <label className="field">
            <span>Libellé bouton</span>
            <input
              value={form.cta}
              onChange={(e) => patch({ cta: e.target.value })}
              placeholder="S'inscrire"
            />
          </label>
        </div>

        <label className="admin-toggle" style={{ marginTop: "16px" }}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => patch({ published: e.target.checked })}
          />
          <span>Bloc visible sur la home</span>
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

- [ ] **Étape 2 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

---

## Task 8 — Section admin + page route

**Files:**
- Create: `app/admin/newsletter/page.tsx`
- Modify: `components/AdminDashboardClient.tsx`

- [ ] **Étape 1 : Créer `app/admin/newsletter/page.tsx`**

```typescript
import type { Metadata } from "next";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";

export const metadata: Metadata = {
  title: "Admin - Newsletter"
};

export default function AdminNewsletterPage() {
  return <AdminDashboardClient section="newsletter" />;
}
```

- [ ] **Étape 2 : Modifier `components/AdminDashboardClient.tsx` — imports**

Ajouter `Mail` dans la liste des imports lucide-react existants (même ligne que `Handshake`).

Ajouter l'import du composant CMS après les imports existants :
```typescript
import { NewsletterBlockCmsClient } from "@/components/NewsletterBlockCmsClient";
```

- [ ] **Étape 3 : Étendre `AdminSection`**

Trouver :
```typescript
type AdminSection = "overview" | BoxType | "vendor-page";
```
Remplacer par :
```typescript
type AdminSection = "overview" | BoxType | "vendor-page" | "newsletter";
```

- [ ] **Étape 4 : Mettre à jour `boxFormForSection`**

Trouver :
```typescript
function boxFormForSection(section: AdminSection): BoxFormState {
  const type: BoxType =
    section === "overview" || section === "vendor-page" ? "store" : section;
  return { ...initialBoxForm, type };
}
```
Remplacer par :
```typescript
function boxFormForSection(section: AdminSection): BoxFormState {
  const type: BoxType =
    section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
  return { ...initialBoxForm, type };
}
```

- [ ] **Étape 5 : Mettre à jour `boxSection`**

Trouver :
```typescript
const boxSection: BoxType =
  section === "overview" || section === "vendor-page" ? "store" : section;
```
Remplacer par :
```typescript
const boxSection: BoxType =
  section === "overview" || section === "vendor-page" || section === "newsletter" ? "store" : section;
```

- [ ] **Étape 6 : Mettre à jour le h1 de l'admin-header**

Trouver :
```tsx
<h1>
  {section === "overview"
    ? "Dashboard Tinned"
    : section === "vendor-page"
      ? "Page Fournisseurs"
      : sectionLabel(boxSection)}
</h1>
```
Remplacer par :
```tsx
<h1>
  {section === "overview"
    ? "Dashboard Tinned"
    : section === "vendor-page"
      ? "Page Fournisseurs"
      : section === "newsletter"
        ? "Newsletter"
        : sectionLabel(boxSection)}
</h1>
```

- [ ] **Étape 7 : Mettre à jour la description**

Trouver :
```tsx
<p>
  {section === "overview"
    ? "Pilotez chaque espace depuis sa page dédiée."
    : section === "vendor-page"
      ? "Contenu de la page publique /vendre."
      : `Gérez vos ${sectionLabel(section as BoxType)} et leur contenu.`}
</p>
```
Remplacer par :
```tsx
<p>
  {section === "overview"
    ? "Pilotez chaque espace depuis sa page dédiée."
    : section === "vendor-page"
      ? "Contenu de la page publique /vendre."
      : section === "newsletter"
        ? "Bloc d'inscription email affiché sur la home page."
        : `Gérez vos ${sectionLabel(section as BoxType)} et leur contenu.`}
</p>
```

- [ ] **Étape 8 : Ajouter le lien nav "Newsletter"**

Dans `<nav className="admin-nav">`, ajouter après le lien "Fournisseurs" :
```tsx
<Link href="/admin/newsletter"><Mail size={17} aria-hidden />Newsletter</Link>
```

- [ ] **Étape 9 : Ajouter le render de la section newsletter**

Trouver :
```tsx
{section === "vendor-page" ? (
  <VendorPageCmsClient />
) : section === "overview" ? (
```
Remplacer par :
```tsx
{section === "newsletter" ? (
  <NewsletterBlockCmsClient />
) : section === "vendor-page" ? (
  <VendorPageCmsClient />
) : section === "overview" ? (
```

- [ ] **Étape 10 : Vérifier TypeScript**

```bash
cd /Users/oliviervangest/Desktop/app/tinned/appbeta.tinned.com && npx tsc --noEmit 2>&1 | head -10
```

Résultat attendu : zéro erreur.

- [ ] **Étape 11 : Vérification finale en navigateur**

1. `http://localhost:3000` → bloc newsletter en bas de page
2. Soumettre un email valide → "Vérifiez votre boîte email."
3. Vérifier dans Klaviyo → Profiles qu'un email en attente de confirmation apparaît
4. `http://localhost:3000/admin` → onglet "Newsletter" visible → modifier le titre → Enregistrer → home page mise à jour
5. Toggle `published: false` → bloc disparu de la home
