import { TriangleAlert } from "lucide-react";

interface Props {
  /** Whether the page's primary data source is running on mock fallback. */
  isMock: boolean;
}

/**
 * Full-width banner rendered above the page when any upstream data source
 * is returning mock data (SA key missing, API failure, permission error,
 * etc.). Upgraded from an 11px amber chip to a real alert because decisions
 * made against mock data should not be made — the old chip was too easy to
 * miss.
 *
 * C3-b (defect A-23): previously named the hosting platform ("Vercel") and
 * a literal env var (`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64`) to a client who
 * has no way to act on either — that's an internal ops task, not something
 * a client can do. It also asserted one specific cause (missing
 * credentials) unconditionally, even when the real cause was something
 * else entirely (e.g. a Search Console permission error — see
 * src/lib/sources/gsc.ts's withAuthFallback/isPermissionError), which made
 * the guidance actively wrong on top of being unreadable to a client.
 * `isMock` alone doesn't currently carry a reason (see gsc.ts / ga4.ts —
 * the underlying error is logged server-side but not returned to callers),
 * so this banner deliberately no longer claims a specific fixable cause: it
 * states the fact (this is sample data) and defers to the standing support
 * channel (the layout footer's "お困りですか？" contact link) rather than
 * a per-cause instruction that may be wrong.
 */
export default function MockBanner({ isMock }: Props) {
  if (!isMock) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">
          本番データ未接続 · サンプル値を表示中
        </div>
        <div className="text-xs text-amber-800/80">
          このページの数値はサンプル値であり、実際の実績ではありません。データ連携が完了次第、実データに切り替わります。意思決定の根拠には使用しないでください。ご不明な点は下部の問い合わせ窓口までご連絡ください。
        </div>
      </div>
    </div>
  );
}
