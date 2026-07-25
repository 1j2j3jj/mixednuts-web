/**
 * GET /api/auth/accept-invitation?id=<invitationId>
 *
 * Landing page for invitation magic links. Two paths:
 *
 *   A) BA session already exists (user previously signed in):
 *      - Validate invitation (pending, not expired, email match)
 *      - Mark invitation accepted + create org member row
 *      - Issue mn_session for the client slug the org maps to
 *      - Redirect to the client dashboard
 *
 *   B) No BA session:
 *      - Redirect to /login?next=/api/auth/accept-invitation?id=<id>
 *        so the user signs in first, then lands back here (path A).
 *
 * This is intentionally a plain DB approach (no auth.api.* call) because
 * accept-invitation via auth.api requires a BA session header cookie that
 * the server-side handler cannot set on behalf of the client. We own the
 * DB so we replicate BA's accept logic (status update + member insert)
 * and keep full schema compatibility.
 *
 * Middleware note: /api/auth/* is exempt from mn_session gating, so this
 * route is always reachable even without a cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import {
  invitation as invitationTable,
  member as memberTable,
  organization as organizationTable,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";
import { recordLogin } from "@/lib/last-login";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { hashInviteToken, constantTimeEqual } from "@/lib/invite-token";
import {
  phaseFColumnsAvailable,
  invitationTokenHashField,
} from "@/db/phase-f-columns";

export const dynamic = "force-dynamic";

function errorPage(req: NextRequest, msg: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?error=${encodeURIComponent("invitation:" + msg.slice(0, 120))}`;
  return NextResponse.redirect(url);
}

/**
 * Map a BA organisation slug to our ClientId slug.
 * The org slug IS the client slug (kept intentionally aligned in ensureOrgForClient).
 */
function orgSlugToClientSlug(orgSlug: string): string | null {
  for (const id of CLIENT_IDS) {
    if (CLIENTS[id].slug === orgSlug) return CLIENTS[id].slug;
  }
  return null;
}

/**
 * Parse query params and return an array of invitation IDs to process.
 * Accepts both `?id=<uuid>` (single, legacy) and `?ids=<uuid>,<uuid>,...`
 * (bulk, post 2026-04-28). Order is preserved; whitespace and empties are
 * stripped; duplicates are removed.
 */
function parseInvitationIds(req: NextRequest): string[] {
  const single = req.nextUrl.searchParams.get("id");
  const bulk = req.nextUrl.searchParams.get("ids");
  const raw = [single, bulk].filter(Boolean).join(",");
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Parse the `token` (single) / `tokens` (bulk, comma-separated,
 * position-aligned with `ids`) query params (F-3, 2026-07-25). Unlike
 * parseInvitationIds this does NOT dedupe — position must be preserved
 * to zip 1:1 against the id list.
 */
function parseInviteTokens(req: NextRequest): string[] {
  const single = req.nextUrl.searchParams.get("token");
  const bulk = req.nextUrl.searchParams.get("tokens");
  const raw = single ?? bulk ?? "";
  if (!raw) return [];
  return raw.split(",").map((t) => t.trim());
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const invitationIds = parseInvitationIds(req);
  if (invitationIds.length === 0) {
    return errorPage(req, "招待IDが指定されていません");
  }
  const invitationTokens = parseInviteTokens(req);

  // ── 1. Look up all invitations in one query ─────────────────────────────
  // Explicit projection, NOT a bare `.select()`: this project's Drizzle
  // version lists every column configured on `invitationTable` in the
  // generated SQL for a bare `.select()`, including the Phase F columns
  // added by drizzle/0003_phase_f_invitation_hardening.sql (NOT YET RUN) —
  // so a bare select here would 42703 pre-migration despite this route's
  // own fallback logic (below) correctly treating a null tokenHash as a
  // legacy pre-hardening row. Base columns are always real; tokenHash is
  // the real column once the migration has run, or a literal NULL (never
  // referencing the column) until then. See src/db/phase-f-columns.ts.
  const columnsAvailable = await phaseFColumnsAvailable();
  const invRows = await db
    .select({
      id: invitationTable.id,
      organizationId: invitationTable.organizationId,
      email: invitationTable.email,
      role: invitationTable.role,
      status: invitationTable.status,
      expiresAt: invitationTable.expiresAt,
      tokenHash: invitationTokenHashField(columnsAvailable),
    })
    .from(invitationTable)
    .where(inArray(invitationTable.id, invitationIds));

  if (invRows.length === 0) {
    return errorPage(req, "招待が見つかりません");
  }

  // ── F-3: verify the bearer token against its stored hash ────────────────
  // `id` is a non-secret primary key; the actual credential is a separate
  // raw token whose SHA-256 hash is stored as tokenHash. A row with
  // tokenHash === null predates this hardening (see invite-token.ts doc
  // comment) and is matched by id alone, unchanged from before. A row WITH
  // a tokenHash requires the matching token — no token, or a mismatching
  // one, invalidates that row's use in this request.
  //
  // On any mismatch we fall through to the SAME generic "not found /
  // invalid" error used for an unknown id, rather than a token-specific
  // message — this avoids confirming to a caller with a valid id but wrong
  // token that the id itself exists and is otherwise well-formed.
  const tokenById = new Map(
    invitationIds.map((id, i) => [id, invitationTokens[i]]),
  );
  const verifiedInvRows: typeof invRows = [];
  for (const r of invRows) {
    if (!r.tokenHash) {
      verifiedInvRows.push(r); // legacy pre-hardening row
      continue;
    }
    const provided = tokenById.get(r.id);
    if (!provided) continue; // hashed row requires a token; none given
    const providedHash = await hashInviteToken(provided);
    if (!constantTimeEqual(providedHash, r.tokenHash)) continue;
    verifiedInvRows.push(r);
  }
  if (verifiedInvRows.length === 0) {
    return errorPage(req, "招待リンクが無効です");
  }

  // Validate every invitation is targeting the same email — otherwise the
  // bulk link was tampered with.
  const emails = new Set(verifiedInvRows.map((r) => r.email.toLowerCase()));
  if (emails.size > 1) {
    return errorPage(req, "招待リンクが不正です（複数の宛先が混在）");
  }
  const invitationEmail = verifiedInvRows[0].email;

  // Filter pending + non-expired. Already-accepted ones are silently skipped
  // (idempotent re-entry); cancelled / expired ones become a soft warning
  // logged but don't fail the whole batch unless ALL are bad.
  const now = new Date();
  const pendingInvs = verifiedInvRows.filter(
    (r) => r.status === "pending" && r.expiresAt > now,
  );
  const skippedReasons: string[] = [];
  for (const r of verifiedInvRows) {
    if (r.status === "accepted") continue; // silent
    if (r.status === "cancelled")
      skippedReasons.push(`${r.id.slice(0, 8)}: 取消済み`);
    else if (r.expiresAt <= now)
      skippedReasons.push(`${r.id.slice(0, 8)}: 期限切れ`);
  }
  // F-3: previously an ACCEPTED invitation's link kept issuing sessions
  // forever — the idempotent-reclick branch below never re-checked
  // expiresAt, so a leaked accept-invitation URL (email forward, log
  // line, browser history) stayed a working, no-password login link past
  // the "14 days" the invite email itself promises. Now the idempotent
  // path only fires when at least one accepted row is still within its
  // original validity window; once every accepted row has aged past
  // expiresAt, the user must use the normal login path instead.
  const acceptedStillFresh = verifiedInvRows.filter(
    (r) => r.status === "accepted" && r.expiresAt > now,
  );
  if (pendingInvs.length === 0 && acceptedStillFresh.length > 0) {
    // Fall through to session issuance based on existing memberships
    // (idempotent re-click, within the original validity window).
  } else if (pendingInvs.length === 0) {
    return errorPage(
      req,
      `処理可能な招待がありません: ${skippedReasons.join(", ")}`,
    );
  }

  // ── 2. Check for BA session ──────────────────────────────────────────────
  let baEmail: string | null = null;
  let baUserId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    baEmail = session?.user?.email ?? null;
    baUserId = session?.user?.id ?? null;
  } catch {
    // BA session read error — treat as unauthenticated
  }

  // ── 3. No session → redirect to login, preserve all ids in next param ───
  // F-3: the token(s) must round-trip through login too — without this,
  // the post-login redirect back to this route would arrive with an id
  // but no token, and a hashed invitation would then (correctly) fail
  // verification, breaking the entire "sign in first" flow for any
  // invite issued after this hardening landed.
  if (!baEmail || !baUserId) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    const idsParam = invitationIds.join(",");
    const tokensParam = invitationTokens.join(",");
    const selfHref =
      invitationIds.length === 1
        ? `/api/auth/accept-invitation?id=${encodeURIComponent(invitationIds[0])}${
            invitationTokens[0]
              ? `&token=${encodeURIComponent(invitationTokens[0])}`
              : ""
          }`
        : `/api/auth/accept-invitation?ids=${encodeURIComponent(idsParam)}${
            tokensParam ? `&tokens=${encodeURIComponent(tokensParam)}` : ""
          }`;
    loginUrl.search = `?next=${encodeURIComponent(selfHref)}&invitation_hint=${encodeURIComponent(invitationEmail)}`;
    return NextResponse.redirect(loginUrl);
  }

  // Track last login (inactivity lifecycle — non-fatal on failure).
  await recordLogin(baUserId);

  // ── 4. Email must match invitation ────────────────────────────────────────
  if (baEmail.toLowerCase() !== invitationEmail.toLowerCase()) {
    return errorPage(
      req,
      `この招待は ${invitationEmail} 宛てです。別のアカウント (${baEmail}) でログインしています`,
    );
  }

  // ── 5. Look up all relevant organisations in one round-trip ─────────────
  const orgIds = Array.from(
    new Set(
      [...pendingInvs, ...acceptedStillFresh].map((r) => r.organizationId),
    ),
  );
  const orgRows = orgIds.length
    ? await db
        .select()
        .from(organizationTable)
        .where(inArray(organizationTable.id, orgIds))
    : [];
  const orgById = new Map(orgRows.map((o) => [o.id, o]));

  // ── 6. Existing memberships for this user across these orgs ─────────────
  const existingMembers = orgIds.length
    ? await db
        .select()
        .from(memberTable)
        .where(inArray(memberTable.organizationId, orgIds))
    : [];
  const memberOrgIds = new Set(
    existingMembers
      .filter((m) => m.userId === baUserId)
      .map((m) => m.organizationId),
  );

  // ── 7. Process each pending invitation: create member row + mark accepted
  const acceptedSlugs: string[] = [];
  const acceptedClientIds: string[] = [];
  const failures: string[] = [];
  for (const inv of pendingInvs) {
    const org = orgById.get(inv.organizationId);
    if (!org) {
      failures.push(`${inv.id.slice(0, 8)}: org missing`);
      continue;
    }
    const orgSlug = org.slug ?? "";
    const clientSlug = orgSlugToClientSlug(orgSlug);
    const matchedId = CLIENT_IDS.find((id) => CLIENTS[id].slug === clientSlug);
    if (!clientSlug || !matchedId) {
      failures.push(`${org.name}: client slug 未対応`);
      continue;
    }
    if (!memberOrgIds.has(inv.organizationId)) {
      await db.insert(memberTable).values({
        id: crypto.randomUUID(),
        organizationId: inv.organizationId,
        userId: baUserId,
        role: inv.role ?? "member",
        createdAt: new Date(),
      });
      memberOrgIds.add(inv.organizationId);
    }
    await db
      .update(invitationTable)
      .set({ status: "accepted" })
      .where(eq(invitationTable.id, inv.id));
    acceptedSlugs.push(clientSlug);
    acceptedClientIds.push(matchedId);
  }

  // For idempotent re-click on a fully-accepted batch, derive slugs from
  // existing membership in the orgs covered by the link.
  if (acceptedSlugs.length === 0) {
    for (const inv of acceptedStillFresh) {
      if (!memberOrgIds.has(inv.organizationId)) continue;
      const org = orgById.get(inv.organizationId);
      if (!org) continue;
      const orgSlug = org.slug ?? "";
      const clientSlug = orgSlugToClientSlug(orgSlug);
      const matchedId = CLIENT_IDS.find(
        (id) => CLIENTS[id].slug === clientSlug,
      );
      if (clientSlug && matchedId && !acceptedSlugs.includes(clientSlug)) {
        acceptedSlugs.push(clientSlug);
        acceptedClientIds.push(matchedId);
      }
    }
  }

  if (acceptedSlugs.length === 0) {
    return errorPage(
      req,
      `招待を処理できませんでした${failures.length ? `: ${failures.join(", ")}` : ""}`,
    );
  }

  // ── 8. Issue mn_session: client (single) or client-multi (2+) ───────────
  let token: string;
  let target: string;
  if (acceptedSlugs.length === 1) {
    token = await signSession({
      kind: "client",
      clientId: acceptedClientIds[0],
      slug: acceptedSlugs[0],
      email: invitationEmail,
    });
    target = `/dashboard/${acceptedSlugs[0]}`;
  } else {
    // Multi-org: drop them on the picker so they can choose.
    token = await signSession({
      kind: "client-multi",
      currentSlug: acceptedSlugs[0],
      availableSlugs: acceptedSlugs,
      email: invitationEmail,
    });
    target = "/dashboard/select";
  }

  const res = NextResponse.redirect(new URL(target, req.url));
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });

  console.info(
    `[accept-invitation] ids=${invitationIds.length} email=${baEmail} accepted=${acceptedSlugs.length} -> ${target}`,
  );

  return res;
}
