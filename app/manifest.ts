import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tinned",
    short_name: "Tinned",
    description: "Boutiques artisanales, créateurs et carnets de voyage — sélectionnés à la main.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF5E6",
    theme_color: "#017E7A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
