import { describe, expect, it } from "vitest";
import { parseClientTargetsMatrix } from "./targets-matrix";
import { classifyTargetChanges } from "./targets-write";
import type { ClientTargetRow } from "./targets-schema";

/** テスト比較用に (metric, channel, year_month) で安定ソートする。 */
function sortRows(rows: ClientTargetRow[]): ClientTargetRow[] {
  return [...rows].sort((a, b) =>
    `${a.metric}|${a.channel}|${a.year_month}`.localeCompare(
      `${b.metric}|${b.channel}|${b.year_month}`,
    ),
  );
}

describe("parseClientTargetsMatrix", () => {
  // (a) 月×行 / 月×列、どちらの向きでも同じ行に正規化される。
  it("parses months-across-columns and months-down-rows to identical rows", () => {
    const monthsAcross =
      "\t2026-04\t2026-05\n売上\t1000000\t1200000\nCV\t50\t60\n";
    const monthsDown =
      "\t売上\tCV\n2026-04\t1000000\t50\n2026-05\t1200000\t60\n";

    const a = parseClientTargetsMatrix(monthsAcross);
    const b = parseClientTargetsMatrix(monthsDown);

    expect(a.errors).toEqual([]);
    expect(b.errors).toEqual([]);
    expect(sortRows(a.rows)).toEqual(sortRows(b.rows));
    expect(sortRows(a.rows)).toEqual([
      { metric: "CV", channel: "全体", year_month: "2026-04-01", value: 50 },
      { metric: "CV", channel: "全体", year_month: "2026-05-01", value: 60 },
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-04-01",
        value: 1000000,
      },
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-05-01",
        value: 1200000,
      },
    ]);
  });

  // (b) タブ区切り・カンマ区切りのどちらでも同じ結果になる。
  it("accepts both tab-separated and comma-separated paste", () => {
    const tsv = "\t2026-04\t2026-05\n売上\t1000000\t1200000\n";
    const csv = ",2026-04,2026-05\n売上,1000000,1200000\n";

    const fromTsv = parseClientTargetsMatrix(tsv);
    const fromCsv = parseClientTargetsMatrix(csv);

    expect(fromTsv.errors).toEqual([]);
    expect(fromCsv.errors).toEqual([]);
    expect(sortRows(fromTsv.rows)).toEqual(sortRows(fromCsv.rows));
    expect(fromCsv.rows).toEqual([
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-04-01",
        value: 1000000,
      },
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-05-01",
        value: 1200000,
      },
    ]);
  });

  // (c) 空セルは安全則により省略される。value:null の行は絶対に生成されない
  //     （= 明示削除マーカーを絶対に作らない、この修正の中核）。
  it("never emits a delete marker for blank cells in a matrix paste", () => {
    // 売上の 2026-05 と CV の 2026-04 を意図的に空欄にする（未来月・未計測など）。
    const text = "\t2026-04\t2026-05\n売上\t1000000\t\nCV\t\t60\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.some((r) => r.value === null)).toBe(false);
    expect(sortRows(result.rows)).toEqual([
      { metric: "CV", channel: "全体", year_month: "2026-05-01", value: 60 },
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-04-01",
        value: 1000000,
      },
    ]);
  });

  // 空セルの安全則: 全指標が空欄の月（未来月まるごと未入力）も、見出し行と
  // 誤認されず、単に無視される（value:null 行を生成しない）。
  it("treats an all-blank data row (a wholly unfilled future month) as skippable, not a heading", () => {
    const text =
      "\t2026-04\t2026-05\t2026-06\n売上\t1000000\t1200000\t\nCV\t50\t60\t\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(4);
    expect(result.rows.some((r) => r.value === null)).toBe(false);
  });

  // (d) 曖昧・未認識のブロックはサイレントに誤読せず、エラーで reject する。
  it("rejects when neither axis parses as year-months", () => {
    const text = "\tA\tB\n売上\t100\t200\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors[0]).toContain(
      "年月の並びを検出できませんでした",
    );
  });

  it("rejects an unrecognized metric label naming the offending label", () => {
    const text = "\t2026-04\t2026-05\n未知指標\t100\t200\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors[0]).toContain("未知指標");
    expect(result.errors[0].errors[0]).toContain("許可されている指標");
  });

  it("rejects an unrecognized bare line naming it instead of guessing 全体", () => {
    const text = "foo\n\t2026-04\t2026-05\n売上\t100\t200\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errors[0]).toContain("foo");
    expect(result.errors[0].errors[0]).toContain("許可されているチャネル");
  });

  it("reports a non-numeric, non-blank cell as a parse error rather than dropping it silently", () => {
    const text = "\t2026-04\t2026-05\n売上\t100\tTBD\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.rows).toEqual([]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some((e) => e.errors.some((m) => m.includes("TBD"))),
    ).toBe(true);
  });

  // (e) チャネル別ブロックは正しいチャネル値に、チャネルなしは「全体」にマップ。
  it("maps a channel-block matrix to the right channel values", () => {
    const text =
      "organic\n\t2026-04\t2026-05\n売上\t100\t150\n\ndirect\n\t2026-04\t2026-05\n売上\t200\t250\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.errors).toEqual([]);
    expect(sortRows(result.rows)).toEqual([
      {
        metric: "売上",
        channel: "direct",
        year_month: "2026-04-01",
        value: 200,
      },
      {
        metric: "売上",
        channel: "direct",
        year_month: "2026-05-01",
        value: 250,
      },
      {
        metric: "売上",
        channel: "organic",
        year_month: "2026-04-01",
        value: 100,
      },
      {
        metric: "売上",
        channel: "organic",
        year_month: "2026-05-01",
        value: 150,
      },
    ]);
    expect(result.interpretation).toContain("organic, direct");
    expect(result.interpretation).toContain("2ブロック");
  });

  it("maps a channel-less matrix to the 全体 sentinel (the dōzo shape)", () => {
    const text = "\t2026-04\t2026-05\n売上\t900000\t950000\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.errors).toEqual([]);
    expect(result.rows.every((r) => r.channel === "全体")).toBe(true);
    expect(result.interpretation).toContain("全体（1ブロック）");
  });

  // (f) 単価・セッション数は普通の指標行として通過する。
  it("passes 単価 and セッション数 through as ordinary metric rows", () => {
    const text =
      "\t2026-04\t2026-05\n単価\t2000\t2100\nセッション数\t30000\t32000\n";
    const result = parseClientTargetsMatrix(text);

    expect(result.errors).toEqual([]);
    expect(sortRows(result.rows)).toEqual([
      {
        metric: "セッション数",
        channel: "全体",
        year_month: "2026-04-01",
        value: 30000,
      },
      {
        metric: "セッション数",
        channel: "全体",
        year_month: "2026-05-01",
        value: 32000,
      },
      {
        metric: "単価",
        channel: "全体",
        year_month: "2026-04-01",
        value: 2000,
      },
      {
        metric: "単価",
        channel: "全体",
        year_month: "2026-05-01",
        value: 2100,
      },
    ]);
  });

  // (g) ラウンドトリップ: マトリクス貼り付け → classifyTargetChanges の件数が
  //     人間の直感どおりになる（そして明示削除は常に 0 件）。
  it("round-trips through classifyTargetChanges with human-expected counts and zero explicit deletes", () => {
    const existing = [
      {
        metric: "売上",
        channel: "全体",
        year_month: "2026-04-01",
        value: 900000,
      },
      { metric: "CV", channel: "全体", year_month: "2026-04-01", value: 40 },
      // upload に含まれない既存キー。温存されるはず。
      {
        metric: "広告費用",
        channel: "全体",
        year_month: "2026-03-01",
        value: 300000,
      },
    ];

    // 売上 2026-04 は既存 900000 → 1000000 に更新。
    // CV 2026-05 は新規。CV 2026-04 は空欄なので upload に含まれない
    //   （= 既存の CV 2026-04=40 も削除されず、そのまま温存される）。
    const text = "\t2026-04\t2026-05\n売上\t1000000\t1100000\nCV\t\t55\n";
    const result = parseClientTargetsMatrix(text);
    expect(result.errors).toEqual([]);

    const stats = classifyTargetChanges(result.rows, existing);
    expect(stats).toMatchObject({
      newCount: 2, // 売上/2026-05, CV/2026-05
      updatedCount: 1, // 売上/2026-04 (900000→1000000)
      explicitDeleteCount: 0, // マトリクス経路は絶対に削除マーカーを出さない
      deleteNoopCount: 0,
      preservedCount: 2, // CV/2026-04 と 広告費用/2026-03 は upload に含まれず温存
    });
  });
});
