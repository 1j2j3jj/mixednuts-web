interface Props {
  /** Already-formatted timestamp label — reuses the page's existing
   *  fetchedAt computation (see [slug]/page.tsx `fetchedAtLabel`), no new
   *  data/logic here, just a second, consistently-placed display of it. */
  timestamp: string;
}

/**
 * デジタル庁 guidebook G5/U12 — a consistent "データ更新: {timestamp}"
 * indicator at the bottom-right of the dashboard content area, so viewers
 * always know how fresh the numbers are without hunting for it. Sits
 * alongside (not instead of) the existing "最終取得" chip in the page
 * header — this is additive, not a replacement of existing UI.
 */
export default function DataUpdatedFooter({ timestamp }: Props) {
  return (
    <div className="flex justify-end pt-1 text-xs tabular-nums text-muted-foreground">
      データ更新: {timestamp}
    </div>
  );
}
