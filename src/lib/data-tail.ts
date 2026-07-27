import { addDays } from "@/lib/datetime";

/**
 * 日次データの「末尾」の解釈。
 *
 * 解く問題（CEO 2026-07-27）: MSEC は土日の広告配信を止めている。Google Ads は
 * 指標ゼロの日を**行として返さない**ため（export_msec_adgroup_daily.py にゼロ埋め
 * は無い）、月曜に見ると最新行が金曜になり、`anchor = 最終行の日付` を通じて
 * 期間計算ごと金曜で止まる。CEO の要件は「昨日まで数値を更新してほしい」。
 *
 * ただし素朴にゼロ埋めして anchor を前日へ進めると、**本当に取得が失敗している
 * 状態も同じ見た目になる**。Google Ads が行を返さないのは「配信停止」と「未同期」で
 * 区別がつかないため。これは古いデータを最新に見せる典型で、本セッションで繰り返し
 * 潰してきた欠陥類型そのもの。
 *
 * そこで `app_analytics.sync_status`（daily_sync_all.py が毎回書く実行ログ）を
 * 証拠に使う:
 *   - 同期が成功していて行が無い  → 配信なし。anchor を前日へ進めてゼロ埋めする
 *   - 同期が失敗している / 記録が無い → 未取得。**anchor は進めない**（鮮度を隠さない）
 *
 * 「進めるのは肯定的な証拠があるときだけ」が本モジュールの不変条件。
 */

export type TailState =
  /** 末尾が前日に達している。説明不要。 */
  | "current"
  /** 同期は成功。行が無いのは配信していないから。ゼロ埋めして良い。 */
  | "no_delivery"
  /** 同期が失敗している。ゼロ埋めしてはいけない。 */
  | "not_fetched"
  /** sync_status が読めなかった。安全側（進めない）に倒す。 */
  | "unknown";

export interface DataTail {
  state: TailState;
  /** ダッシュボードが使う基準日。 */
  anchor: string;
  /** 広告行が存在しない区間（両端含む）。無ければ null。 */
  gapFrom: string | null;
  gapTo: string | null;
  /** 欠損日数（0 なら gap なし）。 */
  gapDays: number;
}

export interface ResolveDataTailArgs {
  /** 広告行に存在する最新日付（yyyy-mm-dd）。1行も無ければ null。 */
  lastAdDate: string | null;
  /** JST 基準の前日。日次データが揃っているべき最終日。 */
  yesterday: string;
  /**
   * 直近の同期でこのクライアントの広告取込が成功したか。
   * null = sync_status が読めなかった（不明）。
   */
  adSyncOk: boolean | null;
}

export function resolveDataTail({
  lastAdDate,
  yesterday,
  adSyncOk,
}: ResolveDataTailArgs): DataTail {
  // 1行も無い場合は「進める」判断の材料自体が無い。anchor は前日にしておく
  // （期間計算が壊れないように）が、状態は正直に出す。
  if (!lastAdDate) {
    return {
      state: adSyncOk === true ? "no_delivery" : "not_fetched",
      anchor: yesterday,
      gapFrom: null,
      gapTo: null,
      gapDays: 0,
    };
  }

  // 末尾が前日以降なら何もしない（未来日付が来ても anchor を巻き戻さない）。
  if (lastAdDate >= yesterday) {
    return {
      state: "current",
      anchor: lastAdDate,
      gapFrom: null,
      gapTo: null,
      gapDays: 0,
    };
  }

  const gapFrom = addDays(lastAdDate, 1);
  const gapTo = yesterday;
  const gapDays = daysBetween(gapFrom, gapTo);

  if (adSyncOk === true) {
    // 肯定的な証拠あり。ここだけが anchor を前日へ進める唯一の分岐。
    return { state: "no_delivery", anchor: yesterday, gapFrom, gapTo, gapDays };
  }

  // 失敗 or 不明 → 進めない。「金曜が最新」と正直に見せる。
  return {
    state: adSyncOk === false ? "not_fetched" : "unknown",
    anchor: lastAdDate,
    gapFrom,
    gapTo,
    gapDays,
  };
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd, 12);
  const b = Date.UTC(ty, tm - 1, td, 12);
  if (b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * 日次系列を anchor まで 0 で延長する。**`no_delivery` のときだけ呼ぶこと。**
 * 未取得の日を 0 で埋めると「配信したが成果ゼロ」と区別できなくなる。
 *
 * `zero` は呼び出し側が行の形を決める（DailyRow 相当のゼロ行を渡す）。
 */
export function fillZeroDays<T extends { date: string }>(
  rows: T[],
  upTo: string,
  zero: (date: string) => T,
): T[] {
  if (rows.length === 0) return rows;
  const present = new Set(rows.map((r) => r.date));
  const last = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date);
  const out = [...rows];
  for (let d = addDays(last, 1); d <= upTo; d = addDays(d, 1)) {
    if (!present.has(d)) out.push(zero(d));
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 画面に出す一文。null なら何も出さない（current のとき）。 */
export function tailNotice(t: DataTail): string | null {
  if (t.state === "current") return null;
  const range =
    t.gapFrom && t.gapTo
      ? t.gapFrom === t.gapTo
        ? t.gapFrom
        : `${t.gapFrom} 〜 ${t.gapTo}`
      : null;
  switch (t.state) {
    case "no_delivery":
      return range
        ? `${range} は広告配信がありません（COST 0 として集計）`
        : "対象期間に広告配信がありません";
    case "not_fetched":
      return range
        ? `⚠ ${range} のデータを取得できていません（同期が失敗しています。表示は ${t.anchor} まで）`
        : "⚠ 広告データを取得できていません（同期が失敗しています）";
    case "unknown":
      return range
        ? `${range} のデータがありません（配信なしか未取得かを判定できていません。表示は ${t.anchor} まで）`
        : "広告データがありません（配信なしか未取得かを判定できていません）";
  }
}
