import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Belt-and-suspenders: pages under /dashboard, /login, /sign-in,
      // /sign-up already emit noindex via their layout metadata; the
      // robots disallow blocks crawlers from even fetching them so
      // slug URLs never end up in search-engine caches.
      disallow: [
        "/api/",
        "/dashboard",
        "/dashboard/",
        "/login",
        "/login/",
        "/sign-in",
        "/sign-up",
      ],
    },
    sitemap: "https://mixednuts-inc.com/sitemap.xml",
  };
}
