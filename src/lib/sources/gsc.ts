import "server-only";
import type { ClientConfig } from "@/config/clients";

/**
 * GSC mock. Phase 2 will swap in `searchanalytics.query`. Minimal shape —
 * the Overview screen only consumes aggregate monthly clicks/impressions
 * for the blended click-to-session ratio.
 */

export interface GscMonth {
  yearMonth: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
}

export function getGscMonthly(_client: ClientConfig): GscMonth[] {
  const anchor = new Date("2026-04-21T00:00:00Z");
  const rows: GscMonth[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + Math.sin((d.getUTCMonth() / 12) * Math.PI * 2) * 0.2;
    rows.push({
      yearMonth: ym,
      clicks: Math.round(180_000 * seasonal),
      impressions: Math.round(2_400_000 * seasonal),
      avgPosition: Number((7.5 + Math.sin(m) * 0.4).toFixed(1)),
    });
  }
  return rows;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number; // decimal (0.012 = 1.2%)
  position: number;
}

/** Top search queries sample — mirrors the kind of CV-adjacent query mix
 *  seen in B2B promotional-goods SEO. */
export function getTopGscQueries(_client: ClientConfig): GscQueryRow[] {
  const base: Array<[string, number, number, number]> = [
    // [query, clicks, impressions, position]
    ["ノベルティ 小ロット", 8200, 142_000, 3.2],
    ["オリジナル タンブラー", 6100, 98_000, 4.1],
    ["販促品 オーダーメイド", 4800, 71_000, 2.8],
    ["展示会 配布品", 4200, 62_000, 3.5],
    ["エコバッグ オリジナル", 3900, 54_000, 4.7],
    ["ノベルティ 2026", 3400, 48_000, 2.1],
    ["販促スタイル", 3100, 4_200, 1.0], // brand query
    ["記念品 オリジナル", 2600, 41_000, 5.2],
    ["粗品 印刷", 2100, 34_000, 6.4],
    ["景品 小ロット", 1900, 29_000, 5.9],
    ["ポロシャツ オリジナル", 1700, 28_000, 6.1],
    ["クリアファイル 名入れ", 1400, 22_000, 4.8],
  ];
  return base.map(([query, clicks, impressions, position]) => ({
    query,
    clicks,
    impressions,
    ctr: clicks / impressions,
    position,
  }));
}
