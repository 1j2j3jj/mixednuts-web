import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { user as userTable } from "@/db/schema";
import {
  type ClientConfig,
  type ClientId,
  getClient,
  getClientBySlug,
} from "@/config/clients";

/**
 * Access control for /dashboard/[slug]/*. Middleware
 * (src/middleware.ts) is the authoritative gate — this helper trusts
 * its viewer-identity headers (x-viewer-kind / x-viewer-client-slug)
 * and just decides whether the *specific* slug the page was called
 * with is permitted for the current viewer.
 *
 *   admin  → any slug permitted
 *   client → only own slug (redirected elsewhere by middleware anyway;
 *            defense in depth here)
 *   none   → dev fallback (no credential env configured); allow so
 *            local scaffolding works.
 *
 * Identity origin: middleware accepts mn_session (cookie set by ID/PW
 * login or by the Better Auth → mn_session bridge at /login/success)
 * or Basic Auth as a legacy fallback. Whichever authenticates first
 * is reflected in the x-viewer-* headers we read here.
 */

async function viewer(): Promise<{
  kind: "admin" | "client" | "client-multi" | "none";
  slug?: string;
  availableSlugs?: string[];
  email?: string;
}> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  const email = h.get("x-viewer-email") ?? undefined;
  if (kind === "admin") return { kind: "admin" };
  if (kind === "client")
    return { kind: "client", slug: h.get("x-viewer-client-slug") ?? undefined, email };
  if (kind === "client-multi") {
    const slugHeader = h.get("x-viewer-available-slugs") ?? "";
    const availableSlugs = slugHeader.split(",").filter(Boolean);
    return {
      kind: "client-multi",
      slug: h.get("x-viewer-client-slug") ?? undefined,
      availableSlugs,
      email,
    };
  }
  return { kind: "none" };
}

/**
 * 退会済みユーザーの残存セッション遮断（敵対検証 2026-07-04 must_fix #1）。
 *
 * mn_session はステートレス HMAC cookie（DB 照会なし・最長7日）のため、
 * /api/auth/delete-account で user 行を消しても**他端末**の cookie は
 * middleware を通過し続ける。ここ（ダッシュボード入場ゲート）で email 持ち
 * client セッションの user 行存在を確認し、削除済みなら notFound で遮断する
 * ＝退会は次のページ読込で全端末に波及する。
 *
 *  - email 無し（Basic Auth 共有ログイン）は対象外（削除APIの対象でもない）。
 *  - 判定コスト: indexed 1 SELECT/ページ。org-role 解決で既に DB を叩く
 *    ページ群なので限界コストは小さい。
 *  - DB 障害時は fail-open（console.error のみ）— 可用性優先。確定的な
 *    「行が無い」場合のみ fail-closed（notFound）。
 */
async function assertNotDeletedUser(email?: string): Promise<void> {
  const target = (email ?? "").trim().toLowerCase();
  if (!target) return;
  try {
    const rows = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(sql`lower(${userTable.email})`, target))
      .limit(1);
    if (rows.length === 0) notFound();
  } catch (err) {
    // notFound() は内部で throw するので再 throw、それ以外（DB障害）は fail-open。
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[access] deleted-user check failed (fail-open):", err);
  }
}

/** Resolve a slug into a ClientConfig the current viewer can access. */
export async function assertUserCanAccessClientBySlug(slug: string): Promise<ClientConfig> {
  const client = getClientBySlug(slug);
  if (!client) notFound();
  const v = await viewer();
  if (v.kind === "admin") return client;
  if (v.kind === "client") {
    await assertNotDeletedUser(v.email);
    if (v.slug === slug) return client;
    notFound();
  }
  if (v.kind === "client-multi") {
    await assertNotDeletedUser(v.email);
    if (v.availableSlugs?.includes(slug)) return client;
    notFound();
  }
  // No middleware auth configured — dev scaffolding. Allow.
  return client;
}

/** Admin-index variant: resolves a ClientId, requires admin role. */
export async function assertUserCanAccessClient(clientId: string): Promise<ClientConfig> {
  const client = getClient(clientId);
  if (!client) notFound();
  const v = await viewer();
  if (v.kind === "admin") return client;
  if (v.kind === "client") {
    await assertNotDeletedUser(v.email);
    if (v.slug === client.slug) return client;
    notFound();
  }
  if (v.kind === "client-multi") {
    await assertNotDeletedUser(v.email);
    if (v.availableSlugs?.includes(client.slug)) return client;
    notFound();
  }
  return client;
}

/**
 * Returns the list of available slugs for a multi-client viewer,
 * or null for admin/single-client viewers (they don't need the picker).
 */
export async function getAvailableSlugsIfMulti(): Promise<string[] | null> {
  const v = await viewer();
  if (v.kind === "client-multi") return v.availableSlugs ?? null;
  return null;
}

export type { ClientId };
