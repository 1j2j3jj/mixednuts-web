/**
 * llms.txt generator.
 *
 * `public/llms.txt` used to be a hand-written static file. Since Insights
 * posts publish on their frontmatter `date` at 00:00 JST via ISR (see
 * `src/lib/insights.ts`) — without a deploy — a static file cannot stay in
 * sync with the published set, and `scripts/seo-postbuild-check.mjs` #10
 * (llms.txt Insights list must match the published articles exactly) would
 * fail on the first deploy after every scheduled publish.
 *
 * This module renders the same document from the Velite `posts` collection.
 * The non-Insights sections are kept verbatim from the former static file;
 * only the `## Insights` list (and its count) is derived from
 * `publishedPosts(posts)`. The route handler `src/app/llms.txt/route.ts`
 * serves it with `revalidate = 3600`, matching sitemap / article ISR.
 *
 * Kept free of Next.js / Velite imports so it can be unit-tested with plain
 * post fixtures (see `src/lib/__tests__/llms-txt.test.ts`).
 */
import { publishedPosts, type SchedulablePost } from "@/lib/insights";
import { SITE_UPDATED } from "@/data/site";

export const SITE_URL = "https://mixednuts-inc.com";

/** Minimal post shape the generator needs (a subset of the Velite `Post`). */
export type LlmsTxtPost = SchedulablePost & {
  slug: string;
  title: string;
  excerpt: string;
  updated?: string;
};

const HEADER = (
  lastUpdated: string,
) => `# ミックスナッツ株式会社 (mixednuts Inc.)

> 正式名称: ミックスナッツ株式会社 / 英文表記: mixednuts Inc. / 所在地: 東京都港区南青山 / 設立: 2021年
> このファイルの最終更新: ${lastUpdated}

ミックスナッツ株式会社（英文表記 mixednuts Inc.）は、2021年創業のコンサルティング会社です。
事業戦略・経営管理、AIエージェントの業務実装、グロースマーケティングを一つのチームで支援します。
自社で100体超のAIエージェント組織を運用し、実装と改善から得た知見をクライアント支援へ生かしています。

## Services

- [戦略・経営管理支援](https://mixednuts-inc.com/services/strategy): 中期経営計画、FP&A、投資評価、M&A、新規事業、組織設計を支援します。
- [AI実装支援](https://mixednuts-inc.com/services/ai): AIエージェント設計、LLM業務実装、データ基盤・MCP統合、ガバナンス、研修を支援します。
- [マーケティング支援](https://mixednuts-inc.com/services/marketing): 広告運用、SEO・AIO、LTV・CAC分析、コンテンツ、計測基盤を統合します。

## Works

- [支援実績](https://mixednuts-inc.com/works): 戦略・AI・マーケティングを横断した案件を、企業名を伏せた匿名ケースとして掲載しています。
`;

const FOOTER = `## About / Team / CEO

- [会社情報](https://mixednuts-inc.com/about): mixednutsの考え方、行動原則、会社概要、提供体制を紹介します。
- [チーム](https://mixednuts-inc.com/team): 代表、100体超のAIエージェント組織、案件ごとの専門パートナーによる編成を紹介します。
- [代表プロフィール](https://mixednuts-inc.com/team/ceo): 石井希実の広告、IT企業の広告事業、経営企画・FP&A、2021年の創業までの経歴を紹介します。

## Careers

- [採用情報](https://mixednuts-inc.com/careers): 戦略・AI・マーケティングの専門性を持ち、AIを標準装備として越境して働くメンバーを募集しています。

## Contact

- [お問い合わせ・無料相談](https://mixednuts-inc.com/contact): 戦略・AI・マーケティングに関する60分の初回無料相談を受け付けています。
`;

const day = (iso: string) => iso.slice(0, 10);

/**
 * One Insights bullet:
 * `- [title](https://mixednuts-inc.com/insights/<slug>) (YYYY-MM-DD 公開 / YYYY-MM-DD 更新): excerpt`
 * The ` / YYYY-MM-DD 更新` part is emitted only when `post.updated` exists.
 */
export function formatInsightLine(post: LlmsTxtPost): string {
  const dates = post.updated
    ? `${day(post.date)} 公開 / ${day(post.updated)} 更新`
    : `${day(post.date)} 公開`;
  return `- [${post.title}](${SITE_URL}/insights/${post.slug}) (${dates}): ${post.excerpt}`;
}

/**
 * Published posts, newest first (by `date`; slug as a stable tie-break).
 * Mirrors the ordering of `/insights` and the article prev/next navigation.
 */
export function orderedPublishedPosts<T extends LlmsTxtPost>(
  posts: T[],
  now: Date = new Date(),
): T[] {
  return publishedPosts(posts, now).sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

/**
 * Renders the full llms.txt document.
 *
 * @param posts - Velite `posts` (or fixtures with the same subset of fields)
 * @param now - injectable clock (publish cutoff), defaults to the real time
 */
export function buildLlmsTxt(
  posts: LlmsTxtPost[],
  now: Date = new Date(),
): string {
  const visible = orderedPublishedPosts(posts, now);

  // 「最終更新」は sitemap の lastmod と同じ規則: サイト構造の更新日と
  // 公開記事の updated (無ければ date) の最大値。
  const lastUpdated = visible.reduce((latest, post) => {
    const stamp = day(post.updated ?? post.date);
    return stamp > latest ? stamp : latest;
  }, SITE_UPDATED);

  const insights = [
    "## Insights",
    "",
    `公開記事 ${visible.length} 本。すべて一次実装ログまたは一次監査データにもとづく解説です。新しい順。`,
    "",
    ...visible.map(formatInsightLine),
    "",
  ].join("\n");

  return `${HEADER(lastUpdated)}\n${insights}\n${FOOTER}`;
}
