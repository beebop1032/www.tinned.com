import type { MetadataRoute } from "next";
import { getBoxes, getArticles, getTrips } from "@/lib/api";

const BASE = "https://tinned.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [stores, businesses, blogs, travels, articles, trips] = await Promise.all([
    getBoxes("store"),
    getBoxes("business"),
    getBoxes("blog"),
    getBoxes("travel"),
    getArticles(),
    getTrips(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/store-box`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/business-box`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/blog-box`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/travel-box`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/vendre`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const storePages: MetadataRoute.Sitemap = stores.map((box) => ({
    url: `${BASE}/store-box/${box.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const businessPages: MetadataRoute.Sitemap = businesses.map((box) => ({
    url: `${BASE}/business-box/${box.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const blogPages: MetadataRoute.Sitemap = blogs.map((box) => ({
    url: `${BASE}/blog-box/${box.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const travelPages: MetadataRoute.Sitemap = travels.map((box) => ({
    url: `${BASE}/travel-box/${box.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const articlePages: MetadataRoute.Sitemap = articles
    .filter((a) => a.blogBox?.slug)
    .map((article) => ({
      url: `${BASE}/blog-box/${article.blogBox!.slug}/${article.slug}`,
      changeFrequency: "monthly",
      lastModified: article.publishedAt ?? undefined,
      priority: 0.6,
    }));

  const tripPages: MetadataRoute.Sitemap = trips
    .filter((t) => t.travelBox?.slug)
    .map((trip) => ({
      url: `${BASE}/travel-box/${trip.travelBox!.slug}/${trip.slug}`,
      changeFrequency: "monthly",
      lastModified: trip.publishedAt ?? undefined,
      priority: 0.6,
    }));

  return [
    ...staticPages,
    ...storePages,
    ...businessPages,
    ...blogPages,
    ...travelPages,
    ...articlePages,
    ...tripPages,
  ];
}
