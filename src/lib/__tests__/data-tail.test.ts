import { describe, it, expect } from "vitest";
import {
  resolveDataTail,
  fillZeroDays,
  tailNotice,
  type DataTail,
} from "../data-tail";

/**
 * 核心の不変条件: **anchor を前日へ進めるのは `adSyncOk === true` のときだけ。**
 * ここが緩むと「同期が失敗して古い数字が残っている」状態を「配信していないだけ」に
 * 見せてしまう（本セッションで繰り返し潰した欠陥類型）。
 *
 * 舞台: 2026-07-27(月)。前日=07-26(日)。MSEC は土日配信を止めており、
 * Google Ads は指標ゼロの日を行として返さないので最終行は 07-24(金)。
 */
const YESTERDAY = "2026-07-26";
const FRIDAY = "2026-07-24";

describe("resolveDataTail — 進めるのは肯定的な証拠があるときだけ", () => {
  it("同期成功 + 末尾が金曜 → 配信なし扱いで anchor を前日へ進める", () => {
    const t = resolveDataTail({
      lastAdDate: FRIDAY,
      yesterday: YESTERDAY,
      adSyncOk: true,
    });
    expect(t.state).toBe("no_delivery");
    expect(t.anchor).toBe(YESTERDAY);
    expect(t.gapFrom).toBe("2026-07-25");
    expect(t.gapTo).toBe(YESTERDAY);
    expect(t.gapDays).toBe(2);
  });

  it("同期失敗 → anchor を進めない（鮮度を隠さない）", () => {
    const t = resolveDataTail({
      lastAdDate: FRIDAY,
      yesterday: YESTERDAY,
      adSyncOk: false,
    });
    expect(t.state).toBe("not_fetched");
    expect(t.anchor).toBe(FRIDAY);
  });

  it("判定不能(null) → anchor を進めない（安全側）", () => {
    const t = resolveDataTail({
      lastAdDate: FRIDAY,
      yesterday: YESTERDAY,
      adSyncOk: null,
    });
    expect(t.state).toBe("unknown");
    expect(t.anchor).toBe(FRIDAY);
  });

  it("末尾が前日に達していれば gap なし・anchor はそのまま", () => {
    const t = resolveDataTail({
      lastAdDate: YESTERDAY,
      yesterday: YESTERDAY,
      adSyncOk: true,
    });
    expect(t.state).toBe("current");
    expect(t.anchor).toBe(YESTERDAY);
    expect(t.gapDays).toBe(0);
  });

  it("末尾が前日より新しくても anchor を巻き戻さない", () => {
    const t = resolveDataTail({
      lastAdDate: "2026-07-27",
      yesterday: YESTERDAY,
      adSyncOk: true,
    });
    expect(t.state).toBe("current");
    expect(t.anchor).toBe("2026-07-27");
  });

  it("1行も無い場合は状態を正直に出す（成功なら配信なし・それ以外は未取得）", () => {
    expect(
      resolveDataTail({
        lastAdDate: null,
        yesterday: YESTERDAY,
        adSyncOk: true,
      }).state,
    ).toBe("no_delivery");
    expect(
      resolveDataTail({
        lastAdDate: null,
        yesterday: YESTERDAY,
        adSyncOk: null,
      }).state,
    ).toBe("not_fetched");
  });
});

describe("fillZeroDays", () => {
  const zero = (date: string) => ({ date, cost: 0 });

  it("末尾から upTo までの欠損日を 0 行で埋める", () => {
    const rows = [
      { date: "2026-07-23", cost: 100 },
      { date: FRIDAY, cost: 200 },
    ];
    const out = fillZeroDays(rows, YESTERDAY, zero);
    expect(out.map((r) => r.date)).toEqual([
      "2026-07-23",
      "2026-07-24",
      "2026-07-25",
      "2026-07-26",
    ]);
    // 既存行の値は書き換えない
    expect(out.find((r) => r.date === FRIDAY)?.cost).toBe(200);
    // 追加分は 0
    expect(out.find((r) => r.date === YESTERDAY)?.cost).toBe(0);
  });

  it("既に upTo まである場合は何も足さない", () => {
    const rows = [{ date: YESTERDAY, cost: 5 }];
    expect(fillZeroDays(rows, YESTERDAY, zero)).toHaveLength(1);
  });

  it("空配列はそのまま返す（0 行から系列を捏造しない）", () => {
    expect(
      fillZeroDays([] as { date: string; cost: number }[], YESTERDAY, zero),
    ).toHaveLength(0);
  });
});

describe("tailNotice — 状態ごとに別の文言を出す", () => {
  const base: DataTail = {
    state: "no_delivery",
    anchor: YESTERDAY,
    gapFrom: "2026-07-25",
    gapTo: YESTERDAY,
    gapDays: 2,
  };

  it("current は何も出さない", () => {
    expect(tailNotice({ ...base, state: "current" })).toBeNull();
  });

  it("配信なしは COST 0 として集計した旨を述べる", () => {
    const s = tailNotice(base)!;
    expect(s).toContain("広告配信がありません");
    expect(s).toContain("2026-07-25 〜 2026-07-26");
  });

  it("未取得は警告として、表示がどこまでかを明示する", () => {
    const s = tailNotice({ ...base, state: "not_fetched", anchor: FRIDAY })!;
    expect(s).toContain("取得できていません");
    expect(s).toContain(FRIDAY);
  });

  it("配信なしと未取得で文言が異なる（同じ見た目にしない）", () => {
    expect(tailNotice(base)).not.toBe(
      tailNotice({ ...base, state: "not_fetched" }),
    );
  });
});
