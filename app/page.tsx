import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BoxCard } from "@/components/BoxCard";
import { ProductCard } from "@/components/ProductCard";
import { ArticleCard } from "@/components/ArticleCard";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getArticles, getBoxes, getProducts } from "@/lib/api";
import { productHref } from "@/lib/commerce";
import { money } from "@/lib/format";
import { NewsletterBlock } from "@/components/NewsletterBlock";
import { readNewsletterBlock } from "@/lib/newsletter-block";

export const metadata: Metadata = {
  title: "Boutiques artisanales, créateurs et carnets de voyage",
  description: "Marketplace belge de boutiques indépendantes. Découvrez, comparez et commandez auprès de créateurs sélectionnés à la main.",
};

export default async function HomePage() {
  const newsletterBlock = readNewsletterBlock();
  const [stores, businesses, blogs, travels, products, articles] = await Promise.all([
    getBoxes("store"),
    getBoxes("business"),
    getBoxes("blog"),
    getBoxes("travel"),
    getProducts(),
    getArticles()
  ]);

  const hasProducts = products.length > 0;
  const hasArticles = articles.length > 0;
  const featuredBoxes = [stores[0], businesses[0], blogs[0]].filter(Boolean);
  const hasBoxes = featuredBoxes.length > 0;

  return (
    <>
      <SchemaJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Tinned",
          url: "https://tinned.com",
          potentialAction: { "@type": "SearchAction", target: "/search?q={search_term_string}", "query-input": "required name=search_term_string" }
        }}
      />

      {/* HERO */}
      <section style={{
        background: "linear-gradient(160deg, #FBF5E6 0%, #F5ECD8 100%)",
        borderBottom: "1px solid var(--stone)",
        paddingTop: "clamp(60px, 8vw, 100px)",
        paddingBottom: "clamp(48px, 6vw, 80px)",
        overflow: "hidden",
        position: "relative"
      }}>
        {/* Subtle paper grain */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 18px, rgba(0,0,0,0.014) 18px, rgba(0,0,0,0.014) 19px)",
          zIndex: 0
        }} />
        {/* Decorative teal blob top-right */}
        <div style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "320px",
          height: "320px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2, 162, 157, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0
        }} />

        <div className="container home-hero-grid">

          {/* Left: copy */}
          <div style={{ display: "grid", gap: "24px" }}>
            <div>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--amber)",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "16px"
              }}>
                <span style={{ display: "inline-block", width: "32px", height: "1px", background: "var(--amber)" }} />
                Boutiques & créateurs indépendants
              </span>

              <h1 style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(40px, 7.5vw, 72px)",
                fontWeight: 700,
                lineHeight: 0.97,
                letterSpacing: "-0.025em",
                color: "var(--ink)",
                margin: 0
              }}>
                <span style={{ display: "block" }}>Trouvez</span>
                <span style={{ display: "block", color: "var(--forest)" }}>votre</span>
                <span style={{ display: "block" }}>boutique.</span>
              </h1>
            </div>

            <p style={{
              maxWidth: "540px",
              margin: 0,
              color: "var(--muted)",
              fontSize: "clamp(16px, 1.8vw, 19px)",
              lineHeight: 1.6,
              fontWeight: 400
            }}>
              Boutiques, créateurs et carnets de voyage — sélectionnés à la main.
              Explorez, comparez, commandez.
            </p>

            <form action="/search" style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              width: "min(520px, 100%)",
              border: "1px solid var(--stone)",
              borderRadius: "999px",
              background: "#fff",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(12, 26, 20, 0.06)"
            }}>
              <input
                name="q"
                placeholder="Boutique, produit, artisan…"
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "14px 20px",
                  border: 0,
                  outline: 0,
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: "15px",
                  fontFamily: "inherit"
                }}
              />
              <button type="submit" style={{
                height: "48px",
                padding: "0 22px",
                background: "var(--forest)",
                color: "#fff",
                border: 0,
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "inherit",
                margin: "4px",
                transition: "background 200ms ease"
              }}>
                Rechercher
              </button>
            </form>

            {/* Trust pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {["Boutiques vérifiées", "Livraison soignée", "Paiement sécurisé"].map(t => (
                <span key={t} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  border: "1px solid var(--stone)",
                  borderRadius: "999px",
                  color: "var(--muted)",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: "#fff"
                }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--forest)", flexShrink: 0 }} />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: featured product showcase */}
          <div style={{ display: "grid", gap: "12px" }}>
            {products[0] ? (
              <Link href={productHref(products[0])} style={{
                display: "grid",
                gap: "0",
                border: "1px solid var(--stone)",
                borderRadius: "2px",
                background: "#fff",
                overflow: "hidden",
                textDecoration: "none",
                transition: "box-shadow 200ms ease, transform 200ms ease",
                boxShadow: "0 4px 24px rgba(12, 26, 20, 0.08)"
              }}>
                <div style={{
                  position: "relative",
                  minHeight: "340px",
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, rgba(30, 77, 58, 0.06), rgba(196, 120, 26, 0.04)), var(--cream)"
                }}>
                  <span style={{
                    position: "absolute",
                    top: "14px",
                    left: "14px",
                    padding: "4px 10px",
                    background: "var(--forest)",
                    color: "#fff",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase"
                  }}>
                    À découvrir
                  </span>
                  <Image
                    src={products[0].images[0] ?? "/tinned-assets/simple-box.svg"}
                    alt={products[0].name}
                    width={360}
                    height={340}
                    priority
                    style={{ objectFit: "contain", width: "82%", maxWidth: "360px", height: "auto", filter: "drop-shadow(0 20px 28px rgba(12, 26, 20, 0.20))" }}
                  />
                </div>
                <div style={{
                  padding: "18px 20px",
                  borderTop: "1px solid var(--stone)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: "16px" }}>{products[0].name}</div>
                    <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "2px" }}>{products[0].storeBox?.name ?? "Boutique"}</div>
                  </div>
                  <div style={{
                    fontFamily: "var(--font-brand)",
                    fontWeight: 700,
                    fontSize: "22px",
                    letterSpacing: "-0.02em",
                    color: "var(--teal)",
                    flexShrink: 0
                  }}>
                    {money(products[0].basePriceCents, products[0].currency)}
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{
                minHeight: "320px",
                display: "grid",
                placeItems: "center",
                border: "1px solid var(--stone)",
                borderRadius: "2px",
                background: "linear-gradient(135deg, rgba(30, 77, 58, 0.06), rgba(196, 120, 26, 0.04)), var(--cream)"
              }}>
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <div style={{
                    fontFamily: "var(--font-brand)",
                    fontWeight: 700,
                    fontSize: "42px",
                    color: "var(--teal)",
                    lineHeight: 1,
                    letterSpacing: "-0.025em",
                    marginBottom: "12px"
                  }}>Bientôt</div>
                  <p style={{ color: "var(--muted)", margin: 0, fontSize: "15px" }}>Les premières boutiques arrivent.</p>
                </div>
              </div>
            )}

            {/* Mini stats — only shown when numbers are meaningful */}
            {stores.length >= 5 && products.length >= 10 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  { n: stores.length, label: "Boutiques" },
                  { n: products.length, label: "Produits" }
                ].map(({ n, label }) => (
                  <div key={label} style={{
                    padding: "16px 20px",
                    border: "1px solid var(--stone)",
                    borderRadius: "2px",
                    background: "#fff"
                  }}>
                    <div style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "32px",
                      fontWeight: 500,
                      color: "var(--teal)",
                      lineHeight: 1,
                      letterSpacing: "-0.02em"
                    }}>{n}</div>
                    <div style={{ color: "var(--muted)", fontSize: "13px", marginTop: "4px", fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* BOX TYPES — 4 types with box illustrations */}
      <section style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "var(--forest)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle dot-grid on dark bg */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          zIndex: 0
        }} />
        {/* Glow accent bottom-left */}
        <div style={{
          position: "absolute", bottom: "-80px", left: "-80px",
          width: "360px", height: "360px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196,136,42,0.18) 0%, transparent 65%)",
          pointerEvents: "none", zIndex: 0
        }} />
        <div className="container" style={{ paddingTop: "clamp(48px, 6vw, 72px)", paddingBottom: "clamp(48px, 6vw, 72px)", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "24px", marginBottom: "40px" }}>
            <div>
              <span style={{ display: "block", width: "40px", height: "2px", background: "var(--amber)", marginBottom: "14px", borderRadius: "2px" }} />
              <h2 style={{
                fontFamily: "var(--font-brand)",
                fontSize: "clamp(25px, 3.5vw, 44px)",
                fontWeight: 700,
                color: "#fff",
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.015em"
              }}>
                Quatre espaces<br />à explorer
              </h2>
            </div>
            <Link href="/store-box" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "999px",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              whiteSpace: "nowrap",
              background: "rgba(255,255,255,0.1)",
              textDecoration: "none"
            }}>Explorer →</Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            {[
              {
                href: "/store-box", label: "Store Box",
                desc: "Boutiques et produits. Parcourez, comparez, commandez.",
                img: "/tinned-assets/box-store.svg",
                bg: "#FFF8EE", accent: "#C4882A"
              },
              {
                href: "/business-box", label: "Business Box",
                desc: "Vitrines de marques. L'univers et le savoir-faire derrière chaque enseigne.",
                img: "/tinned-assets/box-business-new.svg",
                bg: "#EDFAF8", accent: "#017E7A"
              },
              {
                href: "/blog-box", label: "Blog Box",
                desc: "Articles et récits. La vie derrière les boutiques, racontée.",
                img: "/tinned-assets/box-blog-new.svg",
                bg: "#FFF4EE", accent: "#E8682A"
              },
              {
                href: "/travel-box", label: "Travel Box",
                desc: "Carnets de voyage. Destinations, adresses et coups de cœur.",
                img: "/tinned-assets/simple-box.svg",
                bg: "#F5F0E8", accent: "#8A6F4A"
              },
            ].map(({ href, label, desc, img, bg, accent }) => (
              <Link key={href} href={href} style={{
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--stone)",
                borderRadius: "10px",
                background: "#fff",
                overflow: "hidden",
                textDecoration: "none",
                boxShadow: "0 2px 10px rgba(44, 24, 0, 0.06)",
                transition: "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 220ms ease"
              }}>
                {/* Box illustration area */}
                <div style={{
                  display: "grid",
                  placeItems: "center",
                  minHeight: "148px",
                  background: bg,
                  borderBottom: "1px solid var(--stone)",
                  padding: "20px",
                  position: "relative"
                }}>
                  {/* Stamp/label accent top-right */}
                  <span style={{
                    position: "absolute", top: "12px", right: "12px",
                    width: "10px", height: "10px",
                    borderRadius: "50%",
                    background: accent,
                    opacity: 0.6
                  }} />
                  <Image
                    src={img}
                    alt={label}
                    width={90}
                    height={90}
                    style={{ objectFit: "contain", filter: "drop-shadow(0 6px 12px rgba(44,24,0,0.14))" }}
                  />
                </div>
                {/* Label zone — like a shipping sticker */}
                <div style={{ padding: "18px 20px 22px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{
                    fontFamily: "var(--font-brand)",
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontSize: "16px",
                    letterSpacing: "-0.01em"
                  }}>{label}</div>
                  <div style={{ color: "var(--muted)", fontSize: "13.5px", lineHeight: 1.55 }}>{desc}</div>
                  <span style={{
                    marginTop: "auto",
                    paddingTop: "10px",
                    color: accent,
                    fontSize: "13px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}>Explorer →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="container section">
        <div className="section-header">
          <div>
            <span style={{ display: "block", width: "32px", height: "1px", background: "var(--amber)", marginBottom: "12px" }} />
            <span className="eyebrow">{hasProducts ? "Nouveautés" : "Catalogue"}</span>
            <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, letterSpacing: "-0.015em" }}>
              {hasProducts ? "À découvrir maintenant" : "Les sélections arrivent"}
            </h2>
            <p>{hasProducts ? "Une sélection triée sur le volet, disponible tout de suite." : "Les boutiques préparent leurs premières sélections."}</p>
          </div>
          <Link href="/store-box" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            border: "1px solid var(--stone)",
            borderRadius: "999px",
            color: "var(--forest)",
            fontWeight: 600,
            fontSize: "14px",
            whiteSpace: "nowrap",
            background: "#fff",
            textDecoration: "none"
          }}>Voir les boutiques</Link>
        </div>
        {hasProducts ? (
          <div className="grid product-grid">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <strong>Aucun produit publié pour le moment.</strong>
            <span>Revenez bientôt pour parcourir les premières boutiques.</span>
          </div>
        )}
      </section>

      {/* BOXES SHOWCASE */}
      {hasBoxes && (
        <section style={{
          background: "var(--cream)",
          borderTop: "1px solid var(--stone)",
          borderBottom: "1px solid var(--stone)",
          paddingTop: "clamp(54px, 7vw, 86px)",
          paddingBottom: "clamp(54px, 7vw, 86px)"
        }}>
          <div className="container storefront-grid">
            <div className="storefront-copy">
              <span style={{ display: "block", width: "32px", height: "1px", background: "var(--amber)", marginBottom: "12px" }} />
              <span className="eyebrow">Store Box · Business Box · Blog Box</span>
              <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, letterSpacing: "-0.015em", margin: "8px 0 0" }}>
                Un univers,<br />plusieurs facettes.
              </h2>
              <p>Chaque boutique a son univers, son contenu, son histoire. Explorez librement, commandez ce qui vous parle.</p>
              <Link className="button" href="/store-box">Découvrir les boutiques</Link>
            </div>
            <div className="grid box-grid">
              {featuredBoxes.map((box) => (
                <BoxCard key={`${box.type}-${box.slug}`} box={box} type={box.type ?? "store"} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ARTICLES */}
      <section className="container section editorial-section">
        <div className="section-header">
          <div>
            <span style={{ display: "block", width: "32px", height: "1px", background: "var(--amber)", marginBottom: "12px" }} />
            <span className="eyebrow">Éditorial</span>
            <h2 style={{ fontFamily: "var(--font-brand)", fontWeight: 700, letterSpacing: "-0.015em" }}>
              {hasArticles ? "À lire avant d'acheter" : "Les inspirations arrivent"}
            </h2>
            <p>{hasArticles ? "Coulisses, portraits de créateurs et récits de voyage." : "Les articles et carnets arrivent avec les premières boutiques."}</p>
          </div>
          <Link href="/blog-box" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            border: "1px solid var(--stone)",
            borderRadius: "999px",
            color: "var(--forest)",
            fontWeight: 600,
            fontSize: "14px",
            whiteSpace: "nowrap",
            background: "#fff",
            textDecoration: "none"
          }}>Lire les articles</Link>
        </div>
        {hasArticles ? (
          <div className="grid editorial-grid">
            {articles.slice(0, 3).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <strong>Aucun article publié pour le moment.</strong>
            <span>Les articles et carnets arrivent avec les premières Box.</span>
          </div>
        )}
      </section>

      {newsletterBlock?.published && (
        <section className="container" style={{ paddingBottom: "clamp(54px, 7vw, 86px)" }}>
          <NewsletterBlock data={newsletterBlock} />
        </section>
      )}

    </>
  );
}
