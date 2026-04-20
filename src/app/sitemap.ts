import type { MetadataRoute } from "next";
import { works } from "@/data/works";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mixednuts-inc.com";
  const routes = [
    "",
    "/about",
    "/services",
    "/services/ai",
    "/services/strategy",
    "/services/marketing",
    "/works",
    "/team",
    "/team/ceo",
    "/insights",
    "/insights/ai-first-org",
    "/careers",
    "/contact",
    "/privacy",
    "/legal",
  ].map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.7,
  }));

  const workRoutes = works.map((w) => ({
    url: `${base}/works/${w.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...routes, ...workRoutes];
}
