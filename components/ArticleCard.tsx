import Image from "next/image";
import type { Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  const blogSlug = article.blogBox?.slug ?? "blog";

  return (
    <a className="card article-card" href={`/blog-box/${blogSlug}/${article.slug}`}>
      <div className="card-media">
        <Image src={article.imagePath ?? "/tinned-assets/blog.jpg"} alt="" width={132} height={96} />
      </div>
      <span className="pill">Journal</span>
      <h3>{article.title}</h3>
      <p>{article.excerpt}</p>
      <span className="box-link">Lire l'article</span>
    </a>
  );
}
