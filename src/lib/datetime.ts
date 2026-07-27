/**
 * 日時表示は JST 固定。
 *
 * 直した欠陥: すべての呼び出しが `toLocaleTimeString("ja-JP", …)` のように
 * ロケールだけを指定し `timeZone` を渡していなかった。ロケールは**書式**しか
 * 決めず**タイムゾーン**は実行環境に従うため、Vercel（UTC）上のサーバ
 * コンポーネントでは「日本語書式で表示された UTC」になっていた。
 * 2026-07-27、CEO が本番で「表示時刻: 02:16」を発見（実際は 11:16 JST）。
 * 書式が正しく見えるため 9 時間ズレが露見しにくい類型。
 *
 * 実害:
 *  - `最終取得`（サマリー/広告詳細/ドリル/レポート）はデータ鮮度の指標。
 *    11:16 取得を 02:16 と表示すると、クライアントは 9 時間古いデータだと
 *    誤認する（新しい数字を信用できなくなる）
 *  - `toLocaleDateString` 側はさらに悪い: JST 00:00〜09:00 は UTC では前日
 *    なので、**招待の有効期限が 1 日早く表示され得る**
 *
 * なぜ viewer のタイムゾーンでなく JST 固定にするか:
 *  1. このダッシュボードの期間（当月 / 先月 / 過去7日）は日本の営業日基準で、
 *     GA4 の集計境界も JST。海外から見ても「JST のその日」を指すべきで、
 *     端末TZに追従すると期間の意味と表示がずれる
 *  2. サーバとクライアントで同じ文字列になるため hydration mismatch が原理的に
 *     起きない（従来はクライアントコンポーネントだけ端末TZで、サーバ側と
 *     食い違っていた）
 */

export const APP_TIME_ZONE = "Asia/Tokyo";
const LOCALE = "ja-JP";

type DateInput = Date | string | number;

function toDate(v: DateInput): Date {
  return v instanceof Date ? v : new Date(v);
}

/** HH:mm — 表示時刻 / 最終取得。 */
export function fmtJstTime(v: DateInput): string {
  return toDate(v).toLocaleTimeString(LOCALE, {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** yyyy/m/d — 有効期限・参加日など日付のみ。 */
export function fmtJstDate(v: DateInput): string {
  return toDate(v).toLocaleDateString(LOCALE, { timeZone: APP_TIME_ZONE });
}

/** yyyy/mm/dd HH:mm:ss — 監査ログ（秒まで必要）。 */
export function fmtJstDateTimeSeconds(v: DateInput): string {
  return toDate(v).toLocaleString(LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** m/d HH:mm — 送信試行時刻など、年が自明な文脈。 */
export function fmtJstMonthDayTime(v: DateInput): string {
  return toDate(v).toLocaleString(LOCALE, {
    timeZone: APP_TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ロケール既定の日時（資格情報の更新時刻など）。 */
export function fmtJstDateTime(v: DateInput): string {
  return toDate(v).toLocaleString(LOCALE, { timeZone: APP_TIME_ZONE });
}
