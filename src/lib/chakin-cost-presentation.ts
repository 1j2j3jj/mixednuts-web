export type ChakinCostSurface = "summary" | "ads";

interface ChakinCostPresentation {
  label: string;
  note: string;
}

/**
 * Chakin has two intentionally different cost semantics. The summary mart
 * reads normalized `v_ads_daily_unified.cost_net`, while the generic ads tab
 * reads media-export `cost`/`spend` rows (or their Sheet equivalent). Keeping
 * both labels and reciprocal notes here prevents the two surfaces drifting
 * back to the same ambiguous "COST" label.
 */
export function chakinCostPresentation(
  surface: ChakinCostSurface,
): ChakinCostPresentation {
  if (surface === "summary") {
    return {
      label: "広告費（申込ベース）",
      note: "申込データを広告チャネル別に集計した広告費です。広告詳細の「広告費（媒体計上）」とは集計定義が異なります。",
    };
  }
  return {
    label: "広告費（媒体計上）",
    note: "媒体別の日次データを合算しています。サマリーの「広告費（申込ベース）」は申込データを広告チャネル別に集計しているため、集計定義が異なります。",
  };
}
