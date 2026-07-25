import { CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  absenceCopy,
  type AbsenceReason,
  type NoDataPeriodDetail,
  type NotConfiguredDetail,
} from "@/lib/absence";

interface Props {
  reason: AbsenceReason;
  detail?: NoDataPeriodDetail | NotConfiguredDetail;
  /** Fixed height for chart-body placement (keeps the card from collapsing —
   *  A-21: "the ~500px card body" must be replaced by a designed state, not
   *  removed). Table placements pass `compact` instead. */
  className?: string;
  /** Smaller, inline treatment for use inside a table cell / colSpan row. */
  compact?: boolean;
}

/**
 * The ONE rendering for "this slot cannot show a real number right now".
 * Used inside chart card bodies (replaces an empty Recharts canvas) and
 * table bodies (replaces a silently-empty `<tbody>`). Never used for
 * MEASURED_ZERO — that case renders the real formatted value unchanged.
 *
 * The card/table's own title and controls stay outside this component (the
 * caller keeps rendering them) — the client should still see WHAT they were
 * looking at, per the task's empty-state requirement.
 */
export default function AbsenceNotice({
  reason,
  detail,
  className,
  compact = false,
}: Props) {
  const copy = absenceCopy(reason, detail);
  const Icon = copy.tone === "warning" ? CircleAlert : Info;
  const toneClass =
    copy.tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-border bg-muted/40 text-muted-foreground";

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
          toneClass,
          className,
        )}
      >
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <div>
          <div className="font-semibold">{copy.title}</div>
          <div className="opacity-90">{copy.body}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      role={copy.tone === "warning" ? "alert" : undefined}
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-md border px-4 py-8 text-center text-sm",
        toneClass,
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <div className="font-semibold">{copy.title}</div>
      <div className="max-w-md text-xs opacity-90">{copy.body}</div>
    </div>
  );
}
