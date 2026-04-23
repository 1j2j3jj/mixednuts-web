import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import HealthCheckButton from "../HealthCheckButton";

/**
 * Health check page — admin only.
 *
 * Extracted from the old monolithic admin page.tsx.
 * Shows data source connection health across all clients.
 * Phase 2: 7-day history stored in localStorage via client component.
 */
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/dashboard/admin" className="underline hover:text-foreground">
            管理パネル
          </Link>
          {" / "}
          <span>ヘルスチェック</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">データソースヘルスチェック</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全クライアントのデータソース（Google Sheets, GA4, GSC）接続状態をテストします。
        </p>
      </div>

      {/* Health check button + results */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <HealthCheckButton />
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          ヘルスチェックはデータソースへのライブアクセスを確認します。
          失敗した場合は Service Account の権限設定または Sheet / プロパティ ID を確認してください。
        </p>
        <p className="mt-1">
          SA email:{" "}
          <code className="font-mono">ai-agent@ai-agent-mixednuts.iam.gserviceaccount.com</code>
        </p>
      </div>
    </div>
  );
}
