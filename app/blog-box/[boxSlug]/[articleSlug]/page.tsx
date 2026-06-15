import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SchemaJsonLd } from "@/components/SchemaJsonLd";
import { getArticle } from "@/lib/api";

type Props = { params: Promise<{ boxSlug: string; articleSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { articleSlug } = await params;
  const article = await getArticle(articleSlug);
  return {
    title: article ? article.title : "Not found",
    description: article?.excerpt ?? undefined,
    openGraph: article ? { type: "article", publishedTime: article.publishedAt ?? undefined, images: article.imagePath ? [article.imagePath] : undefined } : undefined,
  };
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ articleSlug: string }> }) {
  const { articleSlug } = await params;
  const article = await getArticle(articleSlug);
  if (!article) notFound();

  return (
    <>
      <SchemaJsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        image: article.imagePath,
        datePublished: article.publishedAt,
        author: { "@type": "Organization", name: article.blogBox?.name ?? "Tinned" },
        publisher: { "@type": "Organization", name: "Tinned", logo: { "@type": "ImageObject", url: "https://tinned.com/tinned-assets/logo-tinned-color.svg" } },
        url: article.blogBox?.slug ? `https://tinned.com/blog-box/${article.blogBox.slug}/${article.slug}` : undefined,
      }} />
      <article className="container product-layout">
        <div className="product-image">
          <Image src={article.imagePath ?? "/tinned-assets/blog.jpg"} alt={article.title} width={320} height={220} priority />
        </div>
        <div>
          <span className="eyebrow">{article.blogBox ? `Blog Box de ${article.blogBox.name}` : "Inspirations"}</span>
          <h1 className="page-title">{article.title}</h1>
          <p className="lead">{article.excerpt}</p>
          <p>{article.body}</p>
        </div>
      </article>
    </>
  );
}
