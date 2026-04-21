import { fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";

type Unit = "count" | "currency";

interface Stage {
  label: string;
  value: number;
  /** Display format. Defaults to integer. */
  format?: "int" | "jpy";
  /** Unit kind. If omitted, inferred from format (jpy → currency, else count). */
  unit?: Unit;
}

interface Props {
  stages: Stage[];
}

function unitOf(s: Stage): Unit {
  return s.unit ?? (s.format === "jpy" ? "currency" : "count");
}

/**
 * Horizontal funnel. Stage-to-stage annotation:
 *   - same units     → conversion rate (%)
 *   - count → currency → unit price (¥ per count, i.e. AOV)
 *   - other combos   → no annotation
 * This avoids the "9,366,273%" nonsense when conversions (count) step up to
 * revenue (currency), which used to be rendered as `(revenue/conversions) × 100`.
 */
export default function FunnelChart({ stages }: Props) {
  if (stages.length === 0) return null;
  const max = Math.max(...stages.map((s) => s.value));
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const width = max > 0 ? (s.value / max) * 100 : 0;
        const prev = i > 0 ? stages[i - 1] : null;
        const fmt = (v: number) => (s.format === "jpy" ? fmtJpy(v) : fmtInt(v));

        let annotation = "";
        if (prev && prev.value > 0) {
          const pu = unitOf(prev);
          const cu = unitOf(s);
          if (pu === cu) {
            annotation = `↓ ${fmtPct(safeDiv(s.value, prev.value), 1)}`;
          } else if (pu === "count" && cu === "currency") {
            // AOV: yen per count = unit price
            annotation = `↓ 単価 ¥${Math.round(s.value / prev.value).toLocaleString("ja-JP")}`;
          }
        }

        return (
          <div key={s.label}>
            {annotation && (
              <div className="py-1 pl-4 text-[10px] text-muted-foreground">{annotation}</div>
            )}
            <div className="relative h-9 w-full overflow-hidden rounded-md bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-md bg-[var(--chart-1)] opacity-30"
                style={{ width: `${width}%` }}
              />
              <div className="relative flex h-full items-center justify-between px-3 text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="tabular-nums">{fmt(s.value)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
