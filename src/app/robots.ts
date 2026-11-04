import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const locales = ["vi", "en"];
  const privatePaths = ["cart", "checkout", "account", "order", "track", "wishlist", "search"];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...locales.flatMap((l) => privatePaths.map((p) => `/${l}/${p}`))],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
