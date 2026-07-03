import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  user as userTable,
  member as memberTable,
} from "@/db/schema";
import { and, eq, isNull, lt, inArray } from "drizzle-orm";

/**
 * Inactivity-based membership lifecycle (2026-04-28).
 *
 *   user.last_login_at < now()-6mo AND member.blocked_at IS NULL
 *     → set member.blocked_at = now() (block dormant memberships).
 *   member.blocked_at < now()-6mo
 *     → DELETE row (physical removal after 6mo of being blocked).
 *
 * Admins (ADMIN_EMAILS env) bypass this — they're never reaching this
 * resolver path because role-resolver short-circuits on admin email match.
 *
 * Auth: Bearer ${CRON_SECRET} only (Vercel Cron auto-attaches it when the
 * env var is set; manual runs pass the same header).
 *
 * Schedule: daily at 03:00 UTC (12:00 JST). Light query, 1-2 round trips.
 */
export const dynamic = "force-dynamic";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function isAuthorised(req: NextRequest): boolean {
  // CRON_SECRET の Bearer 一致のみを認可根拠にする（fail-closed）。
  // 旧実装の x-vercel-cron-signature「存在」チェックは値未検証で、外部から
  // 同名ヘッダを付けるだけで member block/delete が無認可実行できるスプーフ穴
  // だったため撤去（2026-07-03 敵対検証で検出。CRON_SECRET は Vercel に設定済）。
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const idleCutoff = new Date(now.getTime() - SIX_MONTHS_MS);
  const deleteCutoff = new Date(now.getTime() - SIX_MONTHS_MS);

  // 1) Block: find users idle ≥6mo, then block their non-blocked memberships.
  const dormantUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(lt(userTable.lastLoginAt, idleCutoff));

  let blockedCount = 0;
  if (dormantUsers.length > 0) {
    const dormantIds = dormantUsers.map((u) => u.id);
    const blockResult = await db
      .update(memberTable)
      .set({ blockedAt: now })
      .where(
        and(
          inArray(memberTable.userId, dormantIds),
          isNull(memberTable.blockedAt)
        )
      )
      .returning({ id: memberTable.id });
    blockedCount = blockResult.length;
  }

  // 2) Delete: rows blocked ≥6mo ago.
  const deleted = await db
    .delete(memberTable)
    .where(lt(memberTable.blockedAt, deleteCutoff))
    .returning({ id: memberTable.id });

  console.info(
    `[cron/membership-cleanup] dormant_users=${dormantUsers.length} blocked=${blockedCount} deleted=${deleted.length}`
  );

  // Avoid unused import lint when delete query above doesn't use eq.
  void eq;

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    dormantUsers: dormantUsers.length,
    newlyBlocked: blockedCount,
    deleted: deleted.length,
  });
}
