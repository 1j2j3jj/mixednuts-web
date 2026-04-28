import type { MetadataRoute } from "next";
import { works, CASES_COMING_SOON } from "@/data/works";
import { posts } from "#site/content";

/**
 * 動的 sitemap 生成
 *
 * 変更理由:
 * - 旧実装は静的 15 URL のみで Insights 全 16 記事が未掲載
 * - GSC 側で Wix 時代の sitemap (45 URL, 提出 2025-01-16) が残存し、
 *   新サイトの URL が Google に発見されない状態が継続していた
 * - 本実装で公開済 Insights 16 件 + 静的 14 件 = 約 30 URL に拡大
 *   (CASES_COMING_SOON=false になった時点で Works 件数も加算)
 *
 * hidden:true の記事は除外する（404 を返すページを sitemap に含めない）
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://mixednuts-inc.com";

  // 静的ルート（変更頻度: weekly、priority は / のみ 1.0）
  const staticRoutes = [
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

  // Insights 公開記事を動的取得
  // hidden:true は除外。lastModified は記事 frontmatter の date を採用
  const insightRoutes = posts
    .filter((p) => !p.hidden)
    .map((p) => ({
      url: `${base}${p.permalink}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  // Works 公開ケース（CASES_COMING_SOON=true の間は空配列）
  const workRoutes = (CASES_COMING_SOON ? [] : works.filter((w) => !w.hidden)).map((w) => ({
    url: `${base}/works/${w.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...insightRoutes, ...workRoutes];
}
