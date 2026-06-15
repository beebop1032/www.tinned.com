import { getArticles, getBoxes, getProducts } from "@/lib/api";
import { productHref } from "@/lib/commerce";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [stores, businesses, blogs, products, articles] = await Promise.all([
    getBoxes("store"),
    getBoxes("business"),
    getBoxes("blog"),
    getProducts(),
    getArticles()
  ]);
  const term = q.toLowerCase();
  const results = [
    ...stores.map((item) => ({ label: `Store Box de ${item.name}`, href: `/store-box/${item.slug}`, text: item.description })),
    ...businesses.map((item) => ({ label: `Business Box de ${item.name}`, href: `/business-box/${item.slug}`, text: item.description })),
    ...blogs.map((item) => ({ label: `Blog Box de ${item.name}`, href: `/blog-box/${item.slug}`, text: item.description })),
    ...products.map((item) => ({ label: `Produit | ${item.name}`, href: productHref(item), text: item.description })),
    ...articles.map((item) => ({ label: `Article | ${item.title}`, href: `/blog-box/${item.blogBox?.slug ?? "blog"}/${item.slug}`, text: item.excerpt }))
  ].filter((item) => !term || `${item.label} ${item.text}`.toLowerCase().includes(term));

  return (
    <section className="container section">
      <h1 className="page-title">Recherche</h1>
      <form className="toolbar">
        <label className="field"><span>Votre recherche</span><input name="q" defaultValue={q} placeholder="Produit, boutique, marque, article..." /></label>
        <button className="button" type="submit">Rechercher</button>
      </form>
      <div className="grid">
        {results.map((item) => (
          <a className="card" href={item.href} key={item.href}>
            <h3>{item.label}</h3>
            <p>{item.text}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
