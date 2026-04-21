import { fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";

interface Stage {
  label: string;
  value: number;
  /** How to format the value. Defaults to integer. */
  format?: "int" | "jpy";
}

interface Props {
  stages: Stage[];
}

/**
 * Horizontal funnel visualised with proportional bars. Stage-to-stage
 * conversion rate is shown between bars. Minimal CSS, no chart library —
 * renders cleanly server-side.
 */
export default function FunnelChart({ stages }: Props) {
  if (stages.length === 0) return null;
  const max = Math.max(...stages.map((s) => s.value));
  return (
    <div className="space-y-1">
      {stages.map((s, i) => {
        const width = max > 0 ? (s.value / max) * 100 : 0;
        const prev = i > 0 ? stages[i - 1].value : null;
        const rate = prev != null ? safeDiv(s.value, prev) : null;
        const fmt = (v: number) => (s.format === "jpy" ? fmtJpy(v) : fmtInt(v));
        return (
          <div key={s.label}>
            {i > 0 && (
              <div className="py-1 pl-4 text-[10px] text-muted-foreground">
                ↓ {fmtPct(rate, 1)}
              </div>
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
