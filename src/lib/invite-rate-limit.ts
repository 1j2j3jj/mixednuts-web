import "server-only";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

/**
 * Server-side rate limiting for invitation creation (F-3, Phase F security
 * audit, 2026-07-25).
 *
 * Prior state: NO rate limiting existed at any layer — server or UI — for
 * invite creation. An authenticated editor/admin (or a compromised editor
 * session) could script unlimited invite creation: unlimited live tokens,
 * unlimited outbound email via the shared Resend account. A UI-side
 * cooldown is explicitly NOT a control (trivially bypassed by calling the
 * server action directly) — this file is the actual control, enforced
 * server-side before any invitation row is written.
 *
 * Design, given the constraint that this phase adds no new infrastructure
 * (no Redis/Upstash) and the migration in this branch is NOT run yet:
 *
 *   - Per-actor and per-org limits are derived from `audit_log`, which
 *     already gets one `invitation.created` row per create call (single
 *     OR bulk — a bulk batch writes one row with `metadata.count`). This
 *     needs no new table and survives across serverless instances/cold
 *     starts, unlike an in-memory counter.
 *   - The unit counted is "invite-creation calls", not individual emails
 *     (a bulk batch counts once). That's intentional: the threat this
 *     defends against is a scripted loop hammering the create action, and
 *     that loop makes one call per iteration regardless of batch size.
 *   - Per-IP limiting (`checkIpBurst` below) is wired into
 *     `assertInviteRateLimit` as of 2026-07-25 and IS called at every
 *     invite-creation call site. It is best-effort in-memory only — see
 *     `checkIpBurst`'s own doc comment for exactly what that does and does
 *     not defend against in this deployment. A real per-IP control needs a
 *     shared store (Redis/Upstash), which remains out of scope for this
 *     phase; that limitation is stated honestly rather than silently
 *     omitted, but the control itself is no longer dead code.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CREATES_PER_ACTOR = 20;
const MAX_CREATES_PER_ORG = 40;

export class InviteRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InviteRateLimitError";
  }
}

/**
 * Best-effort extraction of the caller's IP from the standard
 * edge-to-function forwarding header. Matches the convention already used
 * by src/app/api/events/route.ts. Not verified/signed — a caller could in
 * principle spoof this on a deployment without a trusted proxy in front,
 * which is acceptable here because this value only ever feeds the
 * best-effort `checkIpBurst` limiter below, never the actor/org limiter
 * (which is keyed off the authenticated session, not this header).
 */
export function getClientIp(h: Headers): string | null {
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip || null;
}

/**
 * Throws InviteRateLimitError if the actor, the org, or the calling IP has
 * issued too many invite-creation calls in the trailing window. Call this
 * BEFORE writing any invitation row. `ip` should come from
 * `getClientIp(await headers())` at the call site; pass null if unknown
 * (checkIpBurst treats that as "don't block").
 */
export async function assertInviteRateLimit(params: {
  actorEmail: string;
  orgId: string;
  ip: string | null;
}): Promise<void> {
  // Cheap in-memory check first, before the two DB round-trips below.
  if (!checkIpBurst(params.ip)) {
    throw new InviteRateLimitError(
      "招待の発行が短時間に集中しています。しばらく待ってから再度お試しください。",
    );
  }

  const since = new Date(Date.now() - WINDOW_MS);

  const [actorRows, orgRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.actorEmail, params.actorEmail),
          eq(auditLog.action, "invitation.created"),
          gte(auditLog.createdAt, since),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(
        and(
          eq(auditLog.targetOrgId, params.orgId),
          eq(auditLog.action, "invitation.created"),
          gte(auditLog.createdAt, since),
        ),
      ),
  ]);

  const actorCount = actorRows[0]?.n ?? 0;
  const orgCount = orgRows[0]?.n ?? 0;

  if (actorCount >= MAX_CREATES_PER_ACTOR) {
    throw new InviteRateLimitError(
      `招待の発行回数が上限（${MAX_CREATES_PER_ACTOR}回/時間）に達しています。しばらく待ってから再度お試しください。`,
    );
  }
  if (orgCount >= MAX_CREATES_PER_ORG) {
    throw new InviteRateLimitError(
      `このクライアントの招待発行回数が上限（${MAX_CREATES_PER_ORG}回/時間）に達しています。しばらく待ってから再度お試しください。`,
    );
  }
}

/**
 * Best-effort per-IP burst limiter, called from assertInviteRateLimit
 * above (2026-07-25 — previously implemented but not called from anywhere,
 * which meant it provided no actual protection despite the Phase F
 * self-report describing it as active; that gap is what this wiring
 * fixes). In-memory only — resets on cold start and does NOT coordinate
 * across concurrent serverless instances (each Vercel function instance
 * has its own `ipHits` map), so it catches a burst hitting the SAME warm
 * instance repeatedly, not a burst spread across instances/cold starts. It
 * is a speed bump, not a guarantee, and is documented as such rather than
 * presented as equivalent to the audit_log-backed actor/org limiter above
 * (which IS durable and shared). A real fix needs a shared store (e.g.
 * Upstash Redis) — still out of scope for this phase.
 */
const ipHits = new Map<string, number[]>();
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const IP_MAX_HITS = 15;

export function checkIpBurst(ip: string | null): boolean {
  if (!ip) return true; // no IP available (e.g. local dev) — don't block
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length <= IP_MAX_HITS;
}
