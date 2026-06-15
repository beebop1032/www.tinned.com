/**
 * Seed complet — Univers Tinned.com
 * Truncate + création de l'univers Casa do Sul (Portugal)
 *
 * Usage: ADMIN_PASS=ChangeMe123! npx tsx scripts/seed-universe.ts
 */

const API = "http://appbeta.tinned.com/api";
const ADMIN_EMAIL = "admin@tinned.local";
const ADMIN_PASS = process.argv[2] || process.env.ADMIN_PASS || "";
const BASE_URL = "http://localhost:3000";

if (!ADMIN_PASS) {
  console.error("❌ ADMIN_PASS=xxx npx tsx scripts/seed-universe.ts");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function req<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/ld+json",
    accept: "application/ld+json",
  };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { detail?: string; "hydra:description"?: string };
    throw new Error(`${method} ${path} → ${res.status}: ${d.detail ?? d["hydra:description"] ?? "erreur"}`);
  }
  return data as T;
}

type Coll<T> = { "hydra:member": T[] };
type WithId = { id: number; "@id"?: string };
const iri = (resource: string, id: number) => `/api/${resource}/${id}`;

// ─── Login ────────────────────────────────────────────────────────────────────

async function login() {
  const headers = { "content-type": "application/json", accept: "application/json" };
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const data = await res.json() as { token?: string };
  if (!data.token) throw new Error("Login échoué");
  return data.token;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup(token: string) {
  console.log("🧹 Nettoyage...\n");

  // Products
  const prods = await req<Coll<WithId>>("GET", "/products?order[id]=asc&itemsPerPage=100", undefined, token);
  for (const p of prods["hydra:member"] ?? []) {
    await req("DELETE", `/products/${p.id}`, undefined, token).catch(() => {});
  }
  console.log(`   Produits supprimés : ${prods["hydra:member"]?.length ?? 0}`);

  // Articles
  const arts = await req<Coll<WithId>>("GET", "/articles?itemsPerPage=100", undefined, token);
  for (const a of arts["hydra:member"] ?? []) {
    await req("DELETE", `/articles/${a.id}`, undefined, token).catch(() => {});
  }
  console.log(`   Articles supprimés : ${arts["hydra:member"]?.length ?? 0}`);

  // Trips
  const trips = await req<Coll<WithId>>("GET", "/trips?itemsPerPage=100", undefined, token);
  for (const t of trips["hydra:member"] ?? []) {
    await req("DELETE", `/trips/${t.id}`, undefined, token).catch(() => {});
  }
  console.log(`   Voyages supprimés : ${trips["hydra:member"]?.length ?? 0}`);

  // Store boxes
  const sb = await req<Coll<WithId>>("GET", "/store_boxes?itemsPerPage=100", undefined, token);
  for (const b of sb["hydra:member"] ?? []) {
    await req("DELETE", `/store_boxes/${b.id}`, undefined, token).catch(() => {});
  }

  // Blog boxes
  const bb = await req<Coll<WithId>>("GET", "/blog_boxes?itemsPerPage=100", undefined, token);
  for (const b of bb["hydra:member"] ?? []) {
    await req("DELETE", `/blog_boxes/${b.id}`, undefined, token).catch(() => {});
  }

  // Travel boxes
  const tb = await req<Coll<WithId>>("GET", "/travel_boxes?itemsPerPage=100", undefined, token);
  for (const b of tb["hydra:member"] ?? []) {
    await req("DELETE", `/travel_boxes/${b.id}`, undefined, token).catch(() => {});
  }

  // Business boxes
  const biz = await req<Coll<WithId>>("GET", "/business_boxes?itemsPerPage=100", undefined, token);
  for (const b of biz["hydra:member"] ?? []) {
    await req("DELETE", `/business_boxes/${b.id}`, undefined, token).catch(() => {});
  }

  console.log(`   Boxes supprimées : ${(sb["hydra:member"]?.length ?? 0) + (bb["hydra:member"]?.length ?? 0) + (tb["hydra:member"]?.length ?? 0) + (biz["hydra:member"]?.length ?? 0)}`);
  console.log();
}

// ─── Create helpers ───────────────────────────────────────────────────────────

async function createBizBox(token: string, data: {
  name: string; slug: string; tagline: string; description: string;
  logo: string; cover: string;
}) {
  return req<WithId>("POST", "/business_boxes", {
    name: data.name, slug: data.slug,
    tagline: data.tagline, description: data.description,
    companyName: data.name,
    logoPath: data.logo, coverPath: data.cover,
    active: true,
  }, token);
}

async function createStoreBox(token: string, data: {
  name: string; slug: string; tagline: string; description: string;
  logo: string; cover: string; bizId: number;
}) {
  return req<WithId>("POST", "/store_boxes", {
    name: data.name, slug: data.slug,
    tagline: data.tagline, description: data.description,
    logoPath: data.logo, coverPath: data.cover,
    businessBox: iri("business_boxes", data.bizId),
    active: true,
  }, token);
}

async function createBlogBox(token: string, data: {
  name: string; slug: string; tagline: string; description: string;
  logo: string; bizId: number; storeId: number;
}) {
  return req<WithId>("POST", "/blog_boxes", {
    name: data.name, slug: data.slug,
    tagline: data.tagline, description: data.description,
    logoPath: data.logo,
    businessBox: iri("business_boxes", data.bizId),
    storeBox: iri("store_boxes", data.storeId),
    active: true,
  }, token);
}

async function createTravelBox(token: string, data: {
  name: string; slug: string; tagline: string; description: string; logo: string;
}) {
  return req<WithId>("POST", "/travel_boxes", {
    name: data.name, slug: data.slug,
    tagline: data.tagline, description: data.description,
    logoPath: data.logo,
    active: true,
  }, token);
}

async function createProduct(token: string, storeId: number, data: {
  name: string; slug: string; desc: string; price: number; image: string;
  variants: { sku: string; price: number; stock: number; image: string; colorLabel?: string; sizeLabel?: string }[];
}) {
  const p = await req<WithId>("POST", "/products", {
    storeBox: iri("store_boxes", storeId),
    name: data.name, slug: data.slug,
    description: data.desc,
    basePriceCents: data.price, currency: "EUR",
    active: true, images: [data.image],
  }, token);
  for (const v of data.variants) {
    await req("POST", "/product_variants", {
      product: iri("products", p.id),
      sku: v.sku, priceCents: v.price, stock: v.stock,
      active: true, images: [v.image], attributeValues: [],
    }, token);
  }
  return p;
}

async function createArticle(token: string, blogId: number, data: {
  title: string; slug: string; excerpt: string; body: string; image: string;
}) {
  return req<WithId>("POST", "/articles", {
    blogBox: iri("blog_boxes", blogId),
    title: data.title, slug: data.slug,
    excerpt: data.excerpt, body: data.body,
    imagePath: data.image,
    published: true, publishedAt: new Date().toISOString(),
  }, token);
}

async function createTrip(token: string, travelId: number, data: {
  title: string; slug: string; excerpt: string; body: string; image: string;
}) {
  return req<WithId>("POST", "/trips", {
    travelBox: iri("travel_boxes", travelId),
    title: data.title, slug: data.slug,
    locale: "fr", excerpt: data.excerpt, body: data.body,
    imagePath: data.image,
    published: true, publishedAt: new Date().toISOString(),
  }, token);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log("🔐 Connexion admin...");
  const token = await login();
  console.log("✅ Connecté\n");

  await cleanup(token);

  const LOGO = `${BASE_URL}/tinned-assets/brands/casa-do-sul.svg`;
  const COVER_CERAM = "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80";
  const COVER_LISBON = "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80";

  // ── Business Box : Casa do Sul ─────────────────────────────────────────────
  console.log("🏛️  Business Box — Casa do Sul");
  const biz = await createBizBox(token, {
    name: "Casa do Sul",
    slug: "casa-do-sul",
    tagline: "Art de la table et céramiques du Portugal",
    description: "Casa do Sul sélectionne des pièces de céramique artisanale fabriquées dans les ateliers du sud du Portugal — Alentejo, Algarve, Sintra. Chaque assiette, chaque bol est façonné à la main et émaillé selon des recettes transmises de génération en génération. Fondée pour mettre en lumière un artisanat vivant, Casa do Sul propose une sélection resserrée : moins de pièces, mais choisies avec soin.",
    logo: LOGO,
    cover: COVER_CERAM,
  });
  console.log(`   ✅ #${biz.id}\n`);

  // ── Store Box : Casa do Sul ────────────────────────────────────────────────
  console.log("🛍️  Store Box — Casa do Sul Boutique");
  const store = await createStoreBox(token, {
    name: "Casa do Sul",
    slug: "casa-do-sul-boutique",
    tagline: "Assiettes, bols et art de vivre portugais",
    description: "La boutique Casa do Sul réunit une sélection d'assiettes, bols, mugs et plats de service fabriqués par des potiers portugais. Chaque pièce est unique — légèrement irrégulière, comme il se doit.",
    logo: LOGO,
    cover: COVER_CERAM,
    bizId: biz.id,
  });
  console.log(`   ✅ #${store.id}\n`);

  // ── Produits ───────────────────────────────────────────────────────────────
  console.log("🍽️  Produits Casa do Sul\n");

  await createProduct(token, store.id, {
    name: "Assiette plate Alentejo",
    slug: "assiette-plate-alentejo",
    desc: "Assiette plate en faïence, motifs traditionnels de l'Alentejo peints à la main. Bords légèrement irréguliers — la marque du travail artisanal. Ø 27 cm. Disponible en trois coloris.",
    price: 4200,
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80",
    variants: [
      { sku: "ALP-TERRA", price: 4200, stock: 8, image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=800&q=80", colorLabel: "Terracotta" },
      { sku: "ALP-AZUL", price: 4200, stock: 6, image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80", colorLabel: "Azul Mar" },
      { sku: "ALP-BLANC", price: 3800, stock: 10, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80", colorLabel: "Branco" },
    ],
  });
  console.log("   ✅ Assiette plate Alentejo (3 coloris)");

  await createProduct(token, store.id, {
    name: "Bol Fado",
    slug: "bol-fado",
    desc: "Bol généreux pour la soupe ou le petit-déjeuner. Émaillage satiné, forme arrondie typique de la poterie du centre-Portugal. Ø 16 cm, h. 9 cm. Passe au lave-vaisselle.",
    price: 2800,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80",
    variants: [
      { sku: "BOL-MIEL", price: 2800, stock: 12, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80", colorLabel: "Miel" },
      { sku: "BOL-ARD", price: 2800, stock: 9, image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80", colorLabel: "Ardoise" },
    ],
  });
  console.log("   ✅ Bol Fado (2 coloris)");

  await createProduct(token, store.id, {
    name: "Assiette à dessert Lisboa",
    slug: "assiette-dessert-lisboa",
    desc: "Assiette à dessert inspirée des azulejos de Lisbonne. Motifs bleus sur fond blanc, peinte à la main dans un atelier de Sintra. Ø 22 cm.",
    price: 2600,
    image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80",
    variants: [
      { sku: "LIS-001", price: 2600, stock: 14, image: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80" },
    ],
  });
  console.log("   ✅ Assiette à dessert Lisboa");

  await createProduct(token, store.id, {
    name: "Mug Douro",
    slug: "mug-douro",
    desc: "Mug à paroi épaisse, idéal pour le café ou le thé. Argile de la vallée du Douro, émaillage brun-orangé caractéristique. Deux contenances disponibles.",
    price: 1800,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80",
    variants: [
      { sku: "MUG-S", price: 1800, stock: 16, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80", sizeLabel: "250 ml" },
      { sku: "MUG-L", price: 2200, stock: 12, image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80", sizeLabel: "380 ml" },
    ],
  });
  console.log("   ✅ Mug Douro (2 tailles)");

  await createProduct(token, store.id, {
    name: "Plat de service Algarve",
    slug: "plat-service-algarve",
    desc: "Grand plat de service ovale, idéal pour partager. Tons sable et bleu côtier, motifs de vagues peints au pinceau. 38 × 24 cm. Pièce de caractère — légèrement épaisse, robuste.",
    price: 6800,
    image: "https://images.unsplash.com/photo-1584346133934-a3afd8a50cc0?w=800&q=80",
    variants: [
      { sku: "PLT-ALG-001", price: 6800, stock: 5, image: "https://images.unsplash.com/photo-1584346133934-a3afd8a50cc0?w=800&q=80" },
    ],
  });
  console.log("   ✅ Plat de service Algarve");

  await createProduct(token, store.id, {
    name: "Set côtier — 4 assiettes",
    slug: "set-cotier-4-assiettes",
    desc: "Un ensemble de quatre assiettes plates dans les tons de l'Algarve — sable, ocre et bleu côtier. Idéal pour une table légère et lumineuse. Livré dans une boîte cadeau en kraft.",
    price: 13500,
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    variants: [
      { sku: "SET-COT-001", price: 13500, stock: 4, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80" },
    ],
  });
  console.log("   ✅ Set côtier — 4 assiettes\n");

  // ── Blog Box : À Table ─────────────────────────────────────────────────────
  console.log("📝  Blog Box — À Table");
  const blog = await createBlogBox(token, {
    name: "À Table",
    slug: "a-table",
    tagline: "Céramique, recettes et art de vivre portugais",
    description: "À Table est le journal de Casa do Sul. Portraits de potiers, conseils pour dresser une belle table, récits de voyage au Portugal. Un espace éditorial pour ceux qui croient que la vaisselle qu'on choisit dit quelque chose de soi.",
    logo: LOGO,
    bizId: biz.id,
    storeId: store.id,
  });
  console.log(`   ✅ #${blog.id}\n`);

  console.log("📄  Articles\n");

  await createArticle(token, blog.id, {
    title: "L'art de dresser une table à la portugaise",
    slug: "dresser-une-table-portugaise",
    excerpt: "Au Portugal, la table est un rituel. Pas de vaisselle industrielle — on dresse avec des pièces héritées, façonnées à la main.",
    body: `Au Portugal, la table est un rituel. Pas de vaisselle industrielle — on dresse avec des pièces héritées, des assiettes que la potière du village a tournées à la main.

La règle d'or : mélanger les générations. Une assiette ancienne de l'Alentejo à côté d'un bol contemporain de Barcelos. Les tons chauds dominent : terracotta, ocre, blanc cassé. Quelques fleurs sauvages dans un bol en guise de centre de table, et le tour est joué.

L'irrégularité est une qualité, pas un défaut. Un bord qui n'est pas tout à fait rond, un émaillage qui s'éclaircit aux extrémités — c'est ça qui donne de l'âme à une table.

Ce qui tue une table, c'est l'uniformité. Douze assiettes identiques, c'est une cantine. Une table mémorable, c'est une composition — une intention derrière chaque pièce.`,
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  });
  console.log("   ✅ L'art de dresser une table à la portugaise");

  await createArticle(token, blog.id, {
    title: "João, potier de l'Alentejo depuis quarante ans",
    slug: "joao-potier-alentejo",
    excerpt: "Dans son atelier d'Évora, João façonne l'argile rouge de l'Alentejo comme son père avant lui. Rencontre avec un artisan qui refuse la sérialisation.",
    body: `João travaille l'argile depuis quarante ans dans son atelier d'Évora. "Le secret, c'est la terre", dit-il en façonnant un bol sur son tour. La terre de l'Alentejo est rouge et grasse — elle donne cette couleur terracotta si caractéristique.

João ne se souvient pas d'avoir appris. Il a regardé son père, puis ses mains ont suivi. Son four est un four à bois — il refuse d'en changer. "Le gaz, ça donne une chaleur morte. Le bois, ça bouge, ça respire, chaque fournée est une surprise."

Chaque pièce est signée d'une légère irrégularité — bords qui ne sont jamais tout à fait ronds, émaillage qui s'éclaircit aux extrémités. "Les machines font des assiettes parfaites. Moi je fais des assiettes vivantes."

Il produit environ 800 pièces par an. Pas plus. "Si je fais plus, je ne peux plus regarder chaque pièce. Et si je ne regarde pas chaque pièce, je ne suis plus potier."`,
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
  });
  console.log("   ✅ João, potier de l'Alentejo");

  await createArticle(token, blog.id, {
    title: "5 façons de composer une table qui a du caractère",
    slug: "5-facons-composer-table",
    excerpt: "Mélanger les textures, jouer sur les hauteurs, ne pas tout assortir — les règles simples d'une table réussie.",
    body: `1. Mélanger les textures. Mettre une assiette mate à côté d'une brillante, un bol lisse près d'un plat nervuré. Le contraste crée du mouvement et évite l'effet showroom.

2. Ne pas assortir à l'identique. Une table entièrement assortie, c'est une table de restaurant d'hôtel. Chez soi, on mélange — c'est ce qui donne une table une personnalité.

3. Jouer sur les hauteurs. Bols hauts, plats bas, verres à tiges longues ou courtes — variez les niveaux pour que la table respire et que l'œil voyage.

4. Le blanc ou le crème comme base. Quelques pièces neutres permettent de lier n'importe quelle combinaison de couleurs. Elles font respirer l'ensemble.

5. Moins c'est plus. Deux ou trois pièces de qualité valent mieux que dix pièces quelconques. Une belle assiette creuse fait plus d'effet que six sous-verres assortis.`,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
  });
  console.log("   ✅ 5 façons de composer une table\n");

  // ── Travel Box : Portugal ─────────────────────────────────────────────────
  console.log("✈️  Travel Box — Portugal");
  const travel = await createTravelBox(token, {
    name: "Portugal",
    slug: "portugal",
    tagline: "Carnets de voyage — Lisbonne, Alentejo, Sintra",
    description: "Lisbonne et ses azulejos, les plaines silencieuses de l'Alentejo, les marchés d'artisans de Sintra. Trois carnets pour découvrir le Portugal au-delà des circuits touristiques.",
    logo: COVER_LISBON,
  });
  console.log(`   ✅ #${travel.id}\n`);

  console.log("🗺️  Carnets de voyage\n");

  await createTrip(token, travel.id, {
    title: "Lisbonne en 3 jours — les adresses qui comptent",
    slug: "lisbonne-3-jours",
    excerpt: "Alfama le matin, Belém l'après-midi, Príncipe Real pour les boutiques. Un circuit Lisbonne sans les pièges touristiques.",
    body: `Jour 1 — Alfama

Commencer par le haut : le château São Jorge tôt le matin, avant les groupes. Vue sur la ville et l'estuaire. Redescendre à pied par les ruelles d'Alfama — se perdre, c'est le but.

Déjeuner chez Zé da Mouraria : grillades simples, vin verde, moins de 15 euros. L'après-midi au Museu Nacional do Azulejo — indispensable pour comprendre d'où vient l'obsession portugaise pour les carreaux peints.

Dîner au Bairro Alto, rue Diário de Notícias. Choisir un restaurant sans photo à l'entrée.

Jour 2 — Belém

Pastéis de Belém au petit matin (ouvrent à 8h, queue raisonnable avant 9h). Tour de Belém en vingt minutes, Mosteiro dos Jerónimos en une heure. Déjeuner au marché de Ribeira.

Après-midi libre à Bairro Príncipe Real — les meilleures boutiques de céramiques contemporaines de la ville. Comptez deux heures minimum.

Jour 3 — Sintra et retour

Une demi-journée à Sintra suffit : Palácio Nacional, marché du weekend sur la place centrale. Retour en train (40 minutes). Dîner d'adieu dans le Chiado.`,
    image: COVER_LISBON,
  });
  console.log("   ✅ Lisbonne en 3 jours");

  await createTrip(token, travel.id, {
    title: "L'Alentejo, terre de céramique et de silence",
    slug: "alentejo-ceramique",
    excerpt: "Des plaines à perte de vue, des villages blancs et des potiers partout. L'Alentejo se visite lentement.",
    body: `L'Alentejo, c'est le contraire de l'agitation. Des plaines à perte de vue, des chênes-lièges, des villages blancs aux volets bleus. Et des potiers — partout.

À Évora

João travaille depuis vingt ans. Son atelier est au fond d'une ruelle derrière la cathédrale. Il façonne des pièces inspirées des motifs wisigothiques gravés sur les pierres de la ville. Visite libre sur rendez-vous, vente directe. Compter 35 à 55€ la pièce.

À São Geraldo

Atelier collectif de quatre potiers qui partagent un four à bois. Leurs pièces se retrouvent à Lisbonne et à Paris — mais on peut en acheter directement, 30 à 40% moins cher qu'en boutique. Ouverts du mardi au samedi.

Pratique

L'Alentejo ça se visite lentement. Prévoir trois jours minimum. Loger dans une quinta — les maisons d'hôtes sont parmi les plus belles du Portugal, et les prix sont raisonnables hors juillet-août.

Ne pas conduire vite. Les routes droites donnent envie — résister. Les ânes ont la priorité.`,
    image: "https://images.unsplash.com/photo-1558370781-d6196949e317?w=800&q=80",
  });
  console.log("   ✅ L'Alentejo, terre de céramique");

  await createTrip(token, travel.id, {
    title: "Sintra et ses marchés d'artisans",
    slug: "sintra-marches-artisans",
    excerpt: "Sintra a deux visages. Le touristique et bruyant — et le vrai, accessible tôt le matin ou hors saison.",
    body: `Sintra a deux visages. Le premier : touriste, bruyant, queues devant les palaces. Le second, accessible le matin tôt ou en semaine hors juillet-août : paisible, authentique, extraordinairement beau.

Le marché du weekend

Les marchés artisanaux du samedi et dimanche matin (sur la praça central) sont parmi les meilleurs du Portugal pour la céramique. Les prix sont honnêtes — les artisans vendent directement.

Points de repère : Adriana fait des pièces bleu cobalt sur fond blanc, très azulejo classique. Carlos, lui, travaille la poterie noire de Barcelos dans un style plus contemporain. María propose des bols utilitaires, épais et solides, à des prix très accessibles.

Prévoir deux heures minimum pour le marché. Ne pas hésiter à demander d'où vient l'argile — c'est une bonne façon d'entamer la conversation.

Après le marché

Déjeuner à Casa Piriquita : pastel de feijão (spécialité locale, à ne pas rater), trajet à pied vers les palaces l'après-midi. Le Palácio da Pena est spectaculaire — prendre le billet coupe-file en ligne.

Retour à Lisbonne en train : 40 minutes, toutes les 30 minutes.`,
    image: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?w=800&q=80",
  });
  console.log("   ✅ Sintra et ses marchés\n");

  console.log("🎉 Univers Tinned créé !\n");
  console.log("   🏛️  Business Box : http://localhost:3000/business-box/casa-do-sul");
  console.log("   🛍️  Store Box    : http://localhost:3000/store-box/casa-do-sul-boutique");
  console.log("   📝  Blog Box     : http://localhost:3000/blog-box/a-table");
  console.log("   ✈️  Travel Box   : http://localhost:3000/travel-box/portugal\n");
}

run().catch((err: unknown) => {
  console.error("\n❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
