interface Props {
  /** Already-formatted timestamp label supplied by the shared layout. */
  timestamp: string;
}

/**
 * デジタル庁 guidebook G5/U12 — a freshness indicator at the bottom-right of
 * the dashboard content area, shown on every tab via [slug]/layout.tsx.
 *
 * Deliberately labelled 表示時刻 (page-render time), NOT データ更新: the layout
 * has no data fetch of its own, so the only timestamp it can honestly report
 * is when the page was rendered. Each tab's own header already carries a
 * 最終取得 chip driven by its real fetchedAt — that one is the data-freshness
 * signal. Labelling a render clock as "データ更新" would make stale numbers
 * look current, which is worse than showing nothing.
 */
export default function DataUpdatedFooter({ timestamp }: Props) {
  return (
    <div className="flex justify-end pt-1 text-xs tabular-nums text-muted-foreground">
      表示時刻: {timestamp}
    </div>
  );
}
