import type { MetadataRoute } from "next";

/**
 * robots.ts — クローラー管理（通常 + AI 学習/検索ボット分離）
 *
 * 設計方針:
 * 1. 通常クローラー (Google / Bing 等): マーケティングサイト全開放、認証ルートは disallow
 * 2. AI 学習ボット → 遮断しない（2026-09-03 CEO 決定。"*" ルールに従う）:
 *    以前は GPTBot / ClaudeBot / Google-Extended / CCBot 等を disallow "/" にしていたが、
 *    llms.txt で AI に会社と知見を同定させる方針（AIO）と矛盾するため撤廃。
 * 3. AI 検索ボット → allow "/":
 *    ユーザーの質問に対する citation 目的の fetch。
 *    ブロックすると ChatGPT Search / Perplexity / Claude Search での
 *    引用機会を失うため明示的に許可する。
 *    (OAI-SearchBot / ChatGPT-User / Claude-User / Perplexity-User 等)
 *
 * 根拠: Reuters / NYT / Stack Overflow 等の業界推奨パターン (2025-2026)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // === 通常クローラー (Google / Bing / DuckDuckGo 等) ===
      {
        userAgent: "*",
        allow: "/",
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

      // === AI 学習ボット ===
      // 2026-09-03 CEO 決定: 遮断しない（GPTBot / ClaudeBot / Google-Extended / CCBot 等は
      // 上の "*" ルールに従い、マーケティングサイトを全開放・認証ルートのみ disallow）。
      // 理由: AIO（AI 検索・LLM 引用）で会社と知見を同定させる方針と、学習遮断は整合しない。

      // === AI 検索ボット — allow ===
      // ユーザーへの citation 目的の fetch。許可することで AI 検索での露出を維持する。
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "Claude-SearchBot",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "Claude-User",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "Perplexity-User",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: "https://mixednuts-inc.com/sitemap.xml",
    host: "https://mixednuts-inc.com",
  };
}
