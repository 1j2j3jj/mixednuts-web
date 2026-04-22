import { TriangleAlert } from "lucide-react";

interface Props {
  /** Whether the page's primary data source is running on mock fallback. */
  isMock: boolean;
}

/**
 * Full-width banner rendered above the page when any upstream data source
 * is returning mock data (SA key missing, API failure, etc.). Upgraded from
 * an 11px amber chip to a real alert because decisions made against mock
 * data should not be made — the old chip was too easy to miss.
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
        <div className="font-semibold">MOCK DATA · 本番データ未接続</div>
        <div className="text-xs text-amber-800/80">
          このページの数値はダミー値です。Vercel 環境変数
          <code className="mx-1 rounded bg-amber-100 px-1 font-mono">GOOGLE_SERVICE_ACCOUNT_JSON_BASE64</code>
          を設定すると実データに切り替わります。意思決定の根拠には使用しないでください。
        </div>
      </div>
    </div>
  );
}
