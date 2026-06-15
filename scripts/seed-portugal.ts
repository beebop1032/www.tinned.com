/**
 * Seed script — Casa do Sul (Portugal)
 * Usage: ADMIN_PASS=<password> npx tsx scripts/seed-portugal.ts
 * Or:    npx tsx scripts/seed-portugal.ts <password>
 */

const API = "http://appbeta.tinned.com/api";
const ADMIN_EMAIL = "admin@tinned.local";
const ADMIN_PASS = process.argv[2] || process.env.ADMIN_PASS || "";

if (!ADMIN_PASS) {
  console.error("❌ Mot de passe requis : ADMIN_PASS=xxx npx tsx scripts/seed-portugal.ts");
  process.exit(1);
}

type Box = { id: number; name: string };
type Product = { id: number; name: string; "@id"?: string };

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/ld+json", accept: "application/ld+json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { detail?: string; message?: string };
    throw new Error(`POST ${path} → ${res.status}: ${err.detail ?? err.message ?? "erreur"}`);
  }
  return res.json() as Promise<T>;
}

async function login(): Promise<string> {
  const res = await post<{ token: string }>("/login", { email: ADMIN_EMAIL, password: ADMIN_PASS });
  return res.token;
}

async function run() {
  console.log("🔐 Connexion admin...");
  const token = await login();
  console.log("✅ Connecté\n");

  // ── Business Box ──────────────────────────────────────────────────────────
  console.log("📦 Création Business Box : Casa do Sul");
  const biz = await post<Box>("/business_boxes", {
    name: "Casa do Sul",
    slug: "casa-do-sul",
    tagline: "Art de la table et céramiques du Portugal",
    description: "Casa do Sul sélectionne des pièces de céramique artisanale fabriquées dans les ateliers du sud du Portugal. Chaque assiette, chaque bol est façonné à la main, dans les traditions de l'Alentejo et de l'Algarve.",
    companyName: "Casa do Sul",
    website: null,
    logoPath: null,
    coverPath: null,
    active: true,
  }, token);
  console.log(`   ✅ Business Box #${biz.id} — ${biz.name}\n`);

  // ── Store Box ─────────────────────────────────────────────────────────────
  console.log("🏪 Création Store Box : Casa do Sul");
  const store = await post<Box>("/store_boxes", {
    name: "Casa do Sul",
    slug: "casa-do-sul-boutique",
    tagline: "Assiettes, bols et art de vivre portugais",
    description: "Céramiques artisanales du Portugal — sélectionnées à la main, livrées chez vous.",
    logoPath: null,
    coverPath: null,
    businessBox: `/api/business_boxes/${biz.id}`,
    active: true,
  }, token);
  console.log(`   ✅ Store Box #${store.id} — ${store.name}\n`);

  // ── Produits ──────────────────────────────────────────────────────────────
  const storeIri = `/api/store_boxes/${store.id}`;

  // Helpers
  async function createProduct(data: { name: string; slug: string; desc: string; price: number; image: string }) {
    return post<Product>("/products", {
      storeBox: storeIri,
      name: data.name,
      slug: data.slug,
      description: data.desc,
      basePriceCents: data.price,
      currency: "EUR",
      active: true,
      images: [data.image],
    }, token);
  }

  async function createVariant(productIri: string, v: {
    sku: string; price: number; stock: number; image: string;
    colorLabel?: string; hexColor?: string; sizeLabel?: string;
  }) {
    await post("/product_variants", {
      product: productIri,
      sku: v.sku,
      priceCents: v.price,
      stock: v.stock,
      active: true,
      images: [v.image],
      attributeValues: [],
    }, token);
  }

  // ── 1. Assiette plate Alentejo ─────────────────────────────────────────────
  console.log("🍽️  Produit 1 : Assiette plate Alentejo");
  const p1 = await createProduct({
    name: "Assiette plate Alentejo",
    slug: "assiette-plate-alentejo",
    desc: "Assiette plate en faïence, motifs traditionnels de l'Alentejo peints à la main. Légèrement irrégulière — la marque du travail artisanal. Disponible en trois coloris.",
    price: 4200,
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&q=80",
  });
  const p1iri = p1["@id"] ?? `/api/products/${p1.id}`;
  await createVariant(p1iri, { sku: "ALP-TERRA-001", price: 4200, stock: 8, image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&q=80" });
  await createVariant(p1iri, { sku: "ALP-AZUL-001", price: 4200, stock: 6, image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80" });
  await createVariant(p1iri, { sku: "ALP-BRANCO-001", price: 3800, stock: 10, image: "https://images.unsplash.com/photo-1591483071613-8e7c1b6b7a1e?w=600&q=80" });
  console.log(`   ✅ #${p1.id} — ${p1.name} (3 variantes)\n`);

  // ── 2. Bol Fado ────────────────────────────────────────────────────────────
  console.log("🥣  Produit 2 : Bol Fado");
  const p2 = await createProduct({
    name: "Bol Fado",
    slug: "bol-fado",
    desc: "Bol généreux, idéal pour la soupe ou le petit-déjeuner. Émaillage satiné, forme arrondie typique de la poterie du centre-Portugal. Passe au lave-vaisselle.",
    price: 2800,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80",
  });
  const p2iri = p2["@id"] ?? `/api/products/${p2.id}`;
  await createVariant(p2iri, { sku: "BOL-MIEL-001", price: 2800, stock: 12, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80" });
  await createVariant(p2iri, { sku: "BOL-ARD-001", price: 2800, stock: 8, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80" });
  console.log(`   ✅ #${p2.id} — ${p2.name} (2 variantes)\n`);

  // ── 3. Assiette Lisboa ────────────────────────────────────────────────────
  console.log("🔵  Produit 3 : Assiette Lisboa");
  const p3 = await createProduct({
    name: "Assiette Lisboa",
    slug: "assiette-lisboa",
    desc: "Assiette à dessert inspirée des azulejos de Lisbonne. Motifs bleus sur fond blanc, bords légèrement irréguliers. Peinte à la main dans un atelier de Sintra.",
    price: 2600,
    image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&q=80",
  });
  const p3iri = p3["@id"] ?? `/api/products/${p3.id}`;
  await createVariant(p3iri, { sku: "LIS-001", price: 2600, stock: 15, image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=600&q=80" });
  console.log(`   ✅ #${p3.id} — ${p3.name} (1 variante)\n`);

  // ── 4. Set côtier — 4 assiettes ──────────────────────────────────────────
  console.log("🌊  Produit 4 : Set côtier — 4 assiettes");
  const p4 = await createProduct({
    name: "Set côtier — 4 assiettes",
    slug: "set-cotier-4-assiettes",
    desc: "Un ensemble de quatre assiettes plates dans les tons de l'Algarve — sable, ocre et bleu côtier. Idéal pour une table légère et lumineuse. Livré dans une boîte cadeau.",
    price: 13500,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80",
  });
  const p4iri = p4["@id"] ?? `/api/products/${p4.id}`;
  await createVariant(p4iri, { sku: "SET-COTIER-001", price: 13500, stock: 4, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" });
  console.log(`   ✅ #${p4.id} — ${p4.name} (1 variante)\n`);

  console.log("🎉 Seed terminé !\n");
  console.log(`   Business Box : http://appbeta.tinned.com/business-box/casa-do-sul`);
  console.log(`   Store Box    : http://appbeta.tinned.com/store-box/casa-do-sul`);
  console.log(`   Admin        : http://localhost:3000/admin/store-box\n`);
}

run().catch((err: unknown) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
