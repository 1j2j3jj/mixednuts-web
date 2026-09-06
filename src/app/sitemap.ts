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

  const publishedPosts = posts.filter((post) => !post.hidden);

  /** 記事の updated (無ければ date) の最大値。記事一覧・トップの lastmod を実際の更新に追従させる。 */
  const latestPostUpdate = publishedPosts.reduce(
    (latest, post) => {
      const stamp = (post.updated ?? post.date).slice(0, 10);
      return stamp > latest ? stamp : latest;
    },
    SITE_UPDATED,
  );

  // 記事更新に追従させるルート。それ以外はサイト構造の更新日 (SITE_UPDATED) を使う。
  const POST_DRIVEN_ROUTES = new Set(["", "/insights"]);

  const staticEntries = staticRoutes.map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: POST_DRIVEN_ROUTES.has(path) ? latestPostUpdate : SITE_UPDATED,
    changeFrequency,
    priority,
  }));
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

  // タグページの lastmod は、そのタグを持つ公開記事の updated の最大値に合わせる。
  const tagCounts = new Map<string, { count: number; lastModified: string }>();
  for (const post of publishedPosts) {
    const stamp = (post.updated ?? post.date).slice(0, 10);
    for (const tag of post.tags) {
      const current = tagCounts.get(tag);
      if (current) {
        current.count += 1;
        if (stamp > current.lastModified) current.lastModified = stamp;
      } else {
        tagCounts.set(tag, { count: 1, lastModified: stamp });
      }
    }
  }
  const tagEntries = Array.from(tagCounts.entries())
    .filter(([, meta]) => meta.count >= 2)
    .map(([tag, meta]) => ({
      url: `${SITE_URL}/insights/tag/${encodeURIComponent(tag)}`,
      lastModified: meta.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

  return [...staticEntries, ...workEntries, ...articleEntries, ...tagEntries];
}
