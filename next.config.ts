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
      /**
       * セキュリティヘッダ（全ルート共通、2026-07-04 監査対応）。
       *
       * - X-Frame-Options: DENY — クリックジャッキング防止（ダッシュボード /
       *   管理画面を iframe 埋め込みしない設計のため全面 DENY で安全）。
       * - X-Content-Type-Options: nosniff — MIME スニッフィング防止。
       * - Referrer-Policy: strict-origin-when-cross-origin — 外部遷移時に
       *   パス（?next= 等の内部 URL）を漏らさない。
       * - Strict-Transport-Security: 1年 + includeSubDomains。preload は
       *   サブドメイン全体の HTTPS 確認後に検討（不可逆のため今回は付けない）。
       * - Permissions-Policy: ブラウザ機能を最小化（未使用の強力 API を無効化）。
       * - CSP は Report-Only から開始（enforce への昇格は次段）:
       *   Next.js のインライン script / styled inline CSS / Recharts の
       *   インライン style が 'unsafe-inline' を要求するため、まず観測モード。
       *   ⚠ report-uri / report-to は未設定＝違反は各ブラウザの DevTools
       *   Console にしか出ない（サーバ側収集なし）。enforce 昇格前の確認は
       *   手元ブラウザで /login（Google OAuth 遷移）と /dashboard/{slug}
       *   （Recharts 描画）を開き violation warning ゼロを目視する手順で行う
       *   （敵対検証 2026-07-04 must_fix #3: 収集器を持つ計画は撤回し実態に合わせた）。
       *   frame-ancestors 'none' は X-Frame-Options: DENY と同義（併記）。
       */
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              // Next.js が inline bootstrap script を注入するため 'unsafe-inline'、
              // dev の Fast Refresh / 一部ライブラリが eval を使うため 'unsafe-eval'
              // を初期値に含める（Report-Only なので実配信への影響なし）。
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Tailwind / Recharts のインライン style。
              "style-src 'self' 'unsafe-inline'",
              // og 画像・アバター（Google プロフィール画像等）を許容。
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // 自サイト API + 外部 API（GA4 送信等）。
              "connect-src 'self' https:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              // ログインフォームは自サイト POST のみ。OAuth（accounts.google.com /
              // login.microsoftonline.com への遷移）はリダイレクト＝form-action の
              // 対象外だが、将来のフォーム直 POST に備えて明示許可しておく。
              "form-action 'self' https://accounts.google.com https://login.microsoftonline.com",
            ].join("; "),
          },
        ],
      },
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
