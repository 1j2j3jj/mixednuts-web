import { describe, it, expect } from "vitest";
import {
  buildLlmsTxt,
  formatInsightLine,
  orderedPublishedPosts,
  type LlmsTxtPost,
} from "@/lib/llms-txt";

// 2026-09-10 09:00 JST — A1 (09-08) is out, C1 (09-15) is not yet.
const now = new Date(Date.UTC(2026, 8, 10, 0, 0, 0));

const fixtures: LlmsTxtPost[] = [
  {
    slug: "older-updated",
    title: "古い記事（更新あり）",
    excerpt: "更新済みの要約。",
    date: "2026-04-10",
    updated: "2026-09-06",
  },
  {
    slug: "future",
    title: "未来の記事",
    excerpt: "まだ出ない。",
    date: "2026-09-15",
  },
  {
    slug: "hidden",
    title: "非公開の記事",
    excerpt: "hidden: true。",
    date: "2026-05-01",
    hidden: true,
  },
  {
    slug: "newest",
    title: "最新の記事",
    excerpt: "更新なしの要約。",
    date: "2026-09-08",
  },
  {
    slug: "b-same-day",
    title: "同日 B",
    excerpt: "同日の 2 本目。",
    date: "2026-07-27",
  },
  {
    slug: "a-same-day",
    title: "同日 A",
    excerpt: "同日の 1 本目。",
    date: "2026-07-27",
  },
];

describe("formatInsightLine", () => {
  it("emits `(date 公開 / updated 更新)` when `updated` exists", () => {
    expect(formatInsightLine(fixtures[0])).toBe(
      "- [古い記事（更新あり）](https://mixednuts-inc.com/insights/older-updated) (2026-04-10 公開 / 2026-09-06 更新): 更新済みの要約。",
    );
  });

  it("emits only `(date 公開)` when `updated` is absent", () => {
    expect(formatInsightLine(fixtures[3])).toBe(
      "- [最新の記事](https://mixednuts-inc.com/insights/newest) (2026-09-08 公開): 更新なしの要約。",
    );
  });

  it("truncates a full ISO datetime to YYYY-MM-DD", () => {
    expect(
      formatInsightLine({
        slug: "iso",
        title: "t",
        excerpt: "e",
        date: "2026-09-08T00:00:00.000Z",
        updated: "2026-09-09T12:00:00.000Z",
      }),
    ).toBe(
      "- [t](https://mixednuts-inc.com/insights/iso) (2026-09-08 公開 / 2026-09-09 更新): e",
    );
  });
});

describe("orderedPublishedPosts", () => {
  it("drops hidden and future posts and orders newest first (slug tie-break)", () => {
    expect(orderedPublishedPosts(fixtures, now).map((p) => p.slug)).toEqual([
      "newest",
      "a-same-day",
      "b-same-day",
      "older-updated",
    ]);
  });

  it("does not mutate the input array", () => {
    const copy = [...fixtures];
    orderedPublishedPosts(fixtures, now);
    expect(fixtures).toEqual(copy);
  });
});

describe("buildLlmsTxt", () => {
  const text = buildLlmsTxt(fixtures, now);
  const lines = text.split("\n");

  it("keeps the corporate name and the verbatim non-Insights sections", () => {
    expect(lines[0]).toBe("# ミックスナッツ株式会社 (mixednuts Inc.)");
    expect(text).toContain("ミックスナッツ株式会社（英文表記 mixednuts Inc.）");
    for (const heading of [
      "## Services",
      "## Works",
      "## Insights",
      "## About / Team / CEO",
      "## Careers",
      "## Contact",
    ]) {
      expect(lines).toContain(heading);
    }
    expect(text).toContain("- [お問い合わせ・無料相談](https://mixednuts-inc.com/contact)");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("lists exactly the published posts, newest first, in the contract line format", () => {
    const insightLines = lines.filter((l) => l.includes("mixednuts-inc.com/insights/"));
    expect(insightLines).toEqual([
      "- [最新の記事](https://mixednuts-inc.com/insights/newest) (2026-09-08 公開): 更新なしの要約。",
      "- [同日 A](https://mixednuts-inc.com/insights/a-same-day) (2026-07-27 公開): 同日の 1 本目。",
      "- [同日 B](https://mixednuts-inc.com/insights/b-same-day) (2026-07-27 公開): 同日の 2 本目。",
      "- [古い記事（更新あり）](https://mixednuts-inc.com/insights/older-updated) (2026-04-10 公開 / 2026-09-06 更新): 更新済みの要約。",
    ]);
    expect(text).not.toContain("/insights/future");
    expect(text).not.toContain("/insights/hidden");
  });

  it("states the published count and the latest date as 最終更新", () => {
    expect(text).toContain("公開記事 4 本。");
    // max(SITE_UPDATED, updated ?? date) — 2026-09-08 (newest.date) beats 2026-09-06 (updated).
    expect(text).toContain("> このファイルの最終更新: 2026-09-08");
  });

  it("changes with the clock: once C1's date arrives it is listed and the count grows", () => {
    const later = new Date(Date.UTC(2026, 8, 14, 15, 0, 0)); // 2026-09-15 00:00 JST
    const laterText = buildLlmsTxt(fixtures, later);
    expect(laterText).toContain("公開記事 5 本。");
    expect(laterText.split("\n")[lines.indexOf("## Insights") + 4]).toContain("/insights/future");
    expect(laterText).toContain("> このファイルの最終更新: 2026-09-15");
  });
});
