import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  fmtJstTime,
  fmtJstDate,
  fmtJstDateTimeSeconds,
  fmtJstMonthDayTime,
  APP_TIME_ZONE,
} from "../datetime";

/**
 * 2026-07-27、CEO が本番で「表示時刻: 02:16」を発見（実際は 11:16 JST）。
 * 原因は全呼び出しが `toLocaleTimeString("ja-JP", …)` のようにロケールだけを
 * 指定し `timeZone` を渡していなかったこと。ロケールは書式しか決めないため、
 * Vercel（UTC）のサーバコンポーネントでは「日本語書式の UTC」になっていた。
 *
 * 2本立てのテスト:
 *  1. 変換が本当に JST になっているか（TZ_OFFSET に依存しない絶対時刻で検証）
 *  2. ソーステキストガード — 生の日時 toLocale* が再び現れないこと。
 *     これが本質。1 だけでは「新しい呼び出し箇所が timeZone を忘れる」型の
 *     再発を止められない（Q6: 一貫性は注意力でなく機構で担保する）
 */

describe("fmtJst* は JST 固定（実行環境の TZ に依存しない）", () => {
  // 2026-07-27T02:16:00Z は JST では同日 11:16。CEO が見た 02:16 がまさにこれ。
  const utcMorning = new Date("2026-07-27T02:16:00Z");

  it("時刻が UTC ではなく JST で出る（02:16Z -> 11:16）", () => {
    expect(fmtJstTime(utcMorning)).toBe("11:16");
  });

  it("JST 0〜9 時台は UTC では前日 — 日付が 1 日ずれない", () => {
    // 2026-07-27T00:30:00Z = JST 09:30 same day.
    // 2026-07-26T16:00:00Z = JST 2026-07-27 01:00 → 日付は 27 日でなければならない。
    const lateUtc = new Date("2026-07-26T16:00:00Z");
    expect(fmtJstDate(lateUtc)).toBe("2026/7/27");
    // 素の toLocaleDateString だと（UTC 実行時）7/26 になる = 招待期限が 1 日早く出る欠陥
    expect(fmtJstDate(lateUtc)).not.toBe("2026/7/26");
  });

  it("秒つき書式も JST", () => {
    expect(fmtJstDateTimeSeconds(utcMorning)).toContain("11:16:00");
  });

  it("月日+時刻書式も JST", () => {
    expect(fmtJstMonthDayTime(utcMorning)).toContain("11:16");
  });

  it("string / number の入力も受ける", () => {
    expect(fmtJstTime("2026-07-27T02:16:00Z")).toBe("11:16");
    expect(fmtJstTime(utcMorning.getTime())).toBe("11:16");
  });

  it("タイムゾーン定数が Asia/Tokyo に固定されている", () => {
    expect(APP_TIME_ZONE).toBe("Asia/Tokyo");
  });
});

/** src/ 配下の .ts/.tsx を再帰列挙（テストと datetime.ts 自身は除く）。 */
function sourceFiles(): string[] {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const out: string[] = [];
  (function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === "__tests__" || name === "node_modules") continue;
        walk(p);
      } else if (/\.tsx?$/.test(name) && !p.endsWith("lib/datetime.ts")) {
        out.push(p);
      }
    }
  })(root);
  return out;
}

describe("ガード: 生の日時 toLocale* を使わない", () => {
  it("toLocaleDateString / toLocaleTimeString はソースに存在しない（必ず @/lib/datetime 経由）", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const src = readFileSync(f, "utf8");
      if (/toLocale(Date|Time)String\s*\(/.test(src)) {
        offenders.push(f.slice(f.indexOf("/src/") + 1));
      }
    }
    // これらのメソッドは必ず日時であり、timeZone 無指定なら実行環境依存になる。
    expect(offenders).toEqual([]);
  });

  it("toLocaleString を Date に対して直接使っていない（数値整形は許可）", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles()) {
      const src = readFileSync(f, "utf8");
      // `new Date(...).toLocaleString` / `<何か>At.toLocaleString` の形だけを拾う。
      // `Math.round(v).toLocaleString()` のような数値整形は対象外。
      const re =
        /(new Date\([^)]*\)|[A-Za-z_$][\w$]*(?:At|Date|Time|Timestamp))\s*\.\s*toLocaleString\s*\(/g;
      if (re.test(src)) offenders.push(f.slice(f.indexOf("/src/") + 1));
    }
    expect(offenders).toEqual([]);
  });
});
