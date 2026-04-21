import type { PacingResult } from "@/lib/analysis";
import { cn, fmtJpy, fmtRatioPct } from "@/lib/utils";

interface Props {
  result: PacingResult;
  actualSpend: number;
  monthlyBudget: number;
}

/** Colour band depends on severity. No emoji/drama per calibration.md. */
export default function PacingAlert({ result, actualSpend, monthlyBudget }: Props) {
  const tone =
    result.status === "critical-over" || result.status === "critical-under"
      ? "border-rose-300 bg-rose-50 text-rose-900"
      : result.status === "over" || result.status === "under"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-emerald-300 bg-emerald-50 text-emerald-900";
  return (
    <div className={cn("rounded-md border px-3 py-2 text-sm", tone)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="font-medium">予算消化ペース</span>
        <span className="text-xs">
          消化 {fmtJpy(actualSpend)} / {fmtJpy(monthlyBudget)} · 月進捗{" "}
          {fmtRatioPct(result.monthProgress * 100, 0)} · 消化率{" "}
          {fmtRatioPct(result.spendProgress * 100, 0)}
        </span>
      </div>
      <div className="mt-1 text-xs">{result.message}</div>
    </div>
  );
}
