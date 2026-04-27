import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { desc } from "drizzle-orm";

/**
 * /admin/audit — immutable audit log viewer (admin only).
 *
 * Displays the 200 most recent audit_log entries in reverse-chronological
 * order. Intended for operational oversight, not long-term analytics —
 * no pagination needed at current volume.
 *
 * Actions logged:
 *   invitation.created / invitation.revoked
 *   member.removed
 *   impersonation.started / impersonation.ended
 *   quota.updated
 *   role.changed
 */
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "invitation.created": "招待発行",
  "invitation.revoked": "招待取消",
  "member.removed": "メンバー削除",
  "impersonation.started": "閲覧開始",
  "impersonation.ended": "閲覧終了",
  "quota.updated": "クォータ変更",
  "role.changed": "ロール変更",
};

const ACTION_COLORS: Record<string, string> = {
  "invitation.created": "bg-emerald-100 text-emerald-800",
  "invitation.revoked": "bg-rose-100 text-rose-800",
  "member.removed": "bg-rose-100 text-rose-800",
  "impersonation.started": "bg-amber-100 text-amber-800",
  "impersonation.ended": "bg-neutral-100 text-neutral-700",
  "quota.updated": "bg-blue-100 text-blue-800",
  "role.changed": "bg-purple-100 text-purple-800",
};

function actionBadge(action: string) {
  const label = ACTION_LABELS[action] ?? action;
  const color = ACTION_COLORS[action] ?? "bg-neutral-100 text-neutral-700";
  return { label, color };
}

function formatMetadata(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  return Object.entries(meta as Record<string, unknown>)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(", ");
}

export default async function AuditLogPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const rows = await db
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link href="/dashboard/admin" className="underline hover:text-foreground">
            Admin
          </Link>
          {" / "}監査ログ
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">監査ログ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          直近 200 件のイベント — 招待・メンバー削除・閲覧・クォータ変更
        </p>
      </div>

      {/* Log table */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            イベントはまだありません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  日時
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  アクション
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  対象 Org
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  実行者
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  詳細
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => {
                const { label, color } = actionBadge(row.action);
                const metaStr = formatMetadata(row.metadata);
                return (
                  <tr key={row.id} className="hover:bg-neutral-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-neutral-500">
                      {row.createdAt.toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {row.targetOrgSlug ?? (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-neutral-600">
                      {row.actorEmail ?? (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-neutral-400">
                      {metaStr || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        最新 200 件を表示。全履歴は Neon DB の audit_log テーブルで参照できます。
      </p>
    </div>
  );
}
