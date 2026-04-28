import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* velite build runs via prebuild / predev scripts in package.json */

  /**
   * 301 redirects: 旧 Wix URL → 新サイト
   *
   * 理由: GSC で旧 URL が indexed のまま 404 を返している。
   * /company は 90日 983 imp / avg pos 1.7（「ミックスナッツ」ブランド検索が着地）。
   * 個別マップで SEO シグナルを可能な限り新 URL に転送する。
   *
   * Vercel の next.config redirects() はエッジ層で処理されるため
   * middleware より早く、2-hop チェーンも 1 ホップ削減できる。
   */
  async redirects() {
    return [
      // === Wix legacy CEO/team pages ===
      // /company は GSC で 983 imp/90d、「ミックスナッツ」1位の着地先
      { source: "/company", destination: "/about", permanent: true },
      // /members は GSC で 165 imp/90d、内容が /team に相当
      { source: "/members", destination: "/team", permanent: true },
      // その他 legacy alias（indexed 件数は少ないが念のため）
      { source: "/profile", destination: "/about", permanent: true },
      { source: "/ceo", destination: "/about", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/aboutus", destination: "/about", permanent: true },
      { source: "/our-team", destination: "/team", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },

      // === Wix /post/{slug} → /insights ===
      // 各記事の内容類似度で最近接の新 insights 記事へ個別マップ
      { source: "/post/startup-short-exit", destination: "/insights", permanent: true },
      { source: "/post/2025-seo-guide", destination: "/insights/ai-overviews-7-principles", permanent: true },
      { source: "/post/zapier-gas-automation", destination: "/insights/skills-as-microservices", permanent: true },
      { source: "/post/vision-strategy-apple-netflix", destination: "/insights/ai-first-org", permanent: true },
      { source: "/post/corporate-transformation-ibm-adobe", destination: "/insights/ai-first-org", permanent: true },
      { source: "/post/case-study-starbucks-airbnb-marketing", destination: "/insights", permanent: true },
      // 個別マップ漏れの最終受け皿（上記に該当しない /post/* は /insights 一覧へ）
      { source: "/post/:slug*", destination: "/insights", permanent: true },

      // === Wix /blog/* ===
      { source: "/blog", destination: "/insights", permanent: true },
      { source: "/blog/:path*", destination: "/insights", permanent: true },

      // === legacy paths ===
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/news", destination: "/insights", permanent: true },
      { source: "/portfolio", destination: "/works", permanent: true },
      { source: "/projects", destination: "/works", permanent: true },
      { source: "/case-studies", destination: "/works", permanent: true },
    ];
  },

  /**
   * headers: Insights 記事と SEO ファイルに Cache-Control を明示
   *
   * 理由: AI クローラー（OAI-SearchBot / Claude-User 等）は
   * Cache-Control を参照して再訪頻度を決定する。
   * s-maxage=3600 / stale-while-revalidate=86400 で CDN キャッシュを保ちつつ
   * 1 時間ごとに revalidate が走り、新記事も速やかに反映される。
   */
  async headers() {
    return [
      {
        source: "/insights/:slug*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" },
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" },
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
