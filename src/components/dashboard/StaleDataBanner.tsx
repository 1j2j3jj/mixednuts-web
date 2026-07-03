import { Clock } from "lucide-react";
import { daysBehindJst, isStaleForBanner } from "@/lib/freshness";

interface Props {
  /** MAX(date) of the client's data (yyyy-mm-dd), null when no rows —
   *  null renders nothing (the empty state / MockBanner covers that). */
  maxDate: string | null;
}

/**
 * Amber banner shown when the client's latest data row is 2+ days old
 * (JST) — the daily sync has likely failed and the page would otherwise
 * present stale numbers as current (Batch2 監査P0 §3). Sibling of
 * MockBanner; same visual treatment, different failure mode.
 */
export default function StaleDataBanner({ maxDate }: Props) {
  if (!maxDate || !isStaleForBanner(maxDate)) return null;
  const days = daysBehindJst(maxDate);
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">
          最終データ日: {maxDate}（{days}日前）
        </div>
        <div className="text-xs text-amber-800/80">
          最新化が遅延している可能性があります。表示中の数値は最新ではない場合があります。
        </div>
      </div>
    </div>
  );
}
