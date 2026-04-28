import type { MetadataRoute } from "next";

/**
 * robots.ts — クローラー管理（通常 + AI 学習/検索ボット分離）
 *
 * 設計方針:
 * 1. 通常クローラー (Google / Bing 等): マーケティングサイト全開放、認証ルートは disallow
 * 2. AI 学習ボット → disallow "/":
 *    訓練データ収集目的のボット。コンテンツの無断学習を防ぐ。
 *    (GPTBot / ClaudeBot / Google-Extended / CCBot 等)
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

      // === AI 学習ボット — disallow ===
      // 訓練データ収集ボット。コンテンツの無断学習を防ぐ。
      // Google Search 本体への影響なし（Google-Extended は Gemini 学習専用）
      { userAgent: "GPTBot", disallow: "/" },          // OpenAI 訓練用
      { userAgent: "ClaudeBot", disallow: "/" },        // Anthropic 訓練用
      { userAgent: "Google-Extended", disallow: "/" },  // Gemini/Bard 訓練用 (Google Search 本体には影響なし)
      { userAgent: "anthropic-ai", disallow: "/" },     // Anthropic legacy
      { userAgent: "CCBot", disallow: "/" },            // Common Crawl (LLM 訓練に頻用)
      { userAgent: "FacebookBot", disallow: "/" },      // Meta LLaMA 訓練用
      { userAgent: "Bytespider", disallow: "/" },       // ByteDance/TikTok
      // PerplexityBot は学習用と検索用が混在との報告あり。
      // 検索用は Perplexity-User が担うため、訓練用 PerplexityBot はブロック
      { userAgent: "PerplexityBot", disallow: "/" },

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
