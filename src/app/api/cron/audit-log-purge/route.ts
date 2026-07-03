import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { lt } from "drizzle-orm";
import { auditLogPurgeCutoff } from "@/lib/audit-retention";

/**
 * Audit-log retention purge (privacy §5-4).
 *
 * privacy/page.tsx の保存期間表で「監査ログ … 取得から原則 1 年間（不正アクセス
 * 調査等で必要な場合を除く）」と 2026-07-04 に公表済み。この cron が毎日
 * audit_log.created_at < now()-1年 の行を物理削除して公表文面を裏付ける。
 * 「不正アクセス調査等で必要な場合を除く」の運用上の保全は、必要になった時点で
 * 個別に別テーブル/エクスポートへ退避する前提（この定常 purge の対象外）。
 *
 * 境界判定は src/lib/audit-retention.ts の純関数に集約（vitest 済み）。ちょうど
 * 1 年前の行はまだ保持し、それより前を削除する（strict less-than）。
 *
 * Auth: membership-cleanup / freshness-check と同一 — CRON_SECRET の Bearer 一致
 * のみを認可根拠にする fail-closed。Vercel Cron は CRON_SECRET 設定時に
 * Authorization: Bearer を自動付与する。
 *
 * Schedule: vercel.json crons — daily 03:30 UTC（12:30 JST）。1 クエリの軽い DELETE。
 */
export const dynamic = "force-dynamic";

function isAuthorised(req: NextRequest): boolean {
  // CRON_SECRET の Bearer 一致のみを認可根拠にする（fail-closed）。
  // 旧来の x-vercel-cron-signature「存在」チェックは値未検証のスプーフ穴だった
  // ため、他 cron と同様に採用しない（2026-07-03 敵対検証で撤去済み）。
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = auditLogPurgeCutoff(now);

  const deleted = await db
    .delete(auditLog)
    .where(lt(auditLog.createdAt, cutoff))
    .returning({ id: auditLog.id });

  console.info(
    `[cron/audit-log-purge] cutoff=${cutoff.toISOString()} deleted=${deleted.length}`
  );

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    cutoff: cutoff.toISOString(),
    deleted: deleted.length,
  });
}
