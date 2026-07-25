import type { DeviceTotals } from "@/lib/sources/ga4";
import { fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";
import AbsenceNotice from "@/components/dashboard/AbsenceNotice";
import type { AbsenceReason, NoDataPeriodDetail } from "@/lib/absence";

interface Props {
  rows: DeviceTotals[];
  /** Phase D sweep (item 2): `rows` empty used to render an empty wrapper
   *  div with no message — the exact A-21 failure mode ChannelStackedBar
   *  was already fixed for, just not applied here. Caller can pass a reason
   *  to distinguish not-configured/unavailable from a true empty result;
   *  defaults to the generic "no data" copy. */
  absenceReason?: AbsenceReason;
  absenceDetail?: NoDataPeriodDetail;
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

export default function DeviceBar({
  rows,
  absenceReason,
  absenceDetail,
}: Props) {
  if (rows.length === 0) {
    return (
      <AbsenceNotice
        reason={absenceReason ?? "no_data_period"}
        detail={absenceDetail}
        className="min-h-[120px]"
      />
    );
  }
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
              <span className="text-muted-foreground tabular-nums">
                {fmtInt(r.sessions)} セッション · CVR {fmtPct(cvr, 2)} ·{" "}
                {fmtJpy(r.revenue)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(share * 100)}%`,
                  background: COLOUR[r.device] ?? "var(--chart-1)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
