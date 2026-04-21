import type { DeviceTotals } from "@/lib/sources/ga4";
import { fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";

interface Props {
  rows: DeviceTotals[];
}

const LABEL: Record<string, string> = {
  mobile: "モバイル",
  desktop: "デスクトップ",
  tablet: "タブレット",
};

const COLOUR: Record<string, string> = {
  mobile: "var(--chart-1)",
  desktop: "var(--chart-2)",
  tablet: "var(--chart-4)",
};

export default function DeviceBar({ rows }: Props) {
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const share = safeDiv(r.sessions, totalSessions) ?? 0;
        const cvr = safeDiv(r.conversions, r.sessions);
        return (
          <div key={r.device}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-medium">{LABEL[r.device] ?? r.device}</span>
              <span className="text-muted-foreground">
                {fmtInt(r.sessions)} sessions · CVR {fmtPct(cvr, 2)} · {fmtJpy(r.revenue)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(share * 100)}%`, background: COLOUR[r.device] ?? "var(--chart-1)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
