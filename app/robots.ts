import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/cart", "/checkout", "/orders", "/profile", "/auth", "/api/"],
      },
    ],
    sitemap: "https://tinned.com/sitemap.xml",
  };
}
