import type { MetadataRoute } from "next";
import { works, CASES_COMING_SOON } from "@/data/works";
import { SITE_UPDATED } from "@/data/site";
import { posts } from "#site/content";

const SITE_URL = "https://mixednuts-inc.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: Array<[string, MetadataRoute.Sitemap[number]["changeFrequency"], number]> = [
    ["", "weekly", 1],
    ["/services", "monthly", 0.9],
    ["/services/strategy", "monthly", 0.8],
    ["/services/ai", "monthly", 0.8],
    ["/services/marketing", "monthly", 0.8],
    ["/works", "monthly", 0.8],
    ["/insights", "weekly", 0.8],
    ["/about", "monthly", 0.7],
    ["/team", "monthly", 0.7],
    ["/team/ceo", "monthly", 0.7],
    ["/contact", "yearly", 0.6],
    ["/careers", "monthly", 0.6],
    ["/careers/apply", "monthly", 0.5],
    ["/legal", "yearly", 0.3],
    ["/privacy", "yearly", 0.3],
  ];

  const staticEntries = staticRoutes.map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: SITE_UPDATED,
    changeFrequency,
    priority,
  }));

  const publishedPosts = posts.filter((post) => !post.hidden);
  const articleEntries = publishedPosts.map((post) => ({
    url: `${SITE_URL}${post.permalink}`,
    lastModified: post.updated ?? post.date,
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Case pages stay out of the sitemap while the roster is gated (they 404 until CASES_COMING_SOON is false).
  const workEntries = (CASES_COMING_SOON ? [] : works.filter((work) => !work.hidden)).map((work) => ({
    url: `${SITE_URL}/works/${work.slug}`,
    lastModified: SITE_UPDATED,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const tagCounts = new Map<string, number>();
  for (const post of publishedPosts) {
    for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const tagEntries = Array.from(tagCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([tag]) => ({
      url: `${SITE_URL}/insights/tag/${encodeURIComponent(tag)}`,
      lastModified: SITE_UPDATED,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

  return [...staticEntries, ...workEntries, ...articleEntries, ...tagEntries];
}
