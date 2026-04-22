import { notFound } from "next/navigation";
import { headers } from "next/headers";
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
 * Historical note: an earlier Clerk-only implementation called `auth()`
 * from @clerk/nextjs here and notFound()'d any viewer not signed in
 * to Clerk. That broke every Basic-Auth / cookie session once Clerk
 * keys were added to env (Clerk session was absent → 404). Fixed by
 * moving the identity read to the middleware headers, which reflect
 * whichever auth succeeded.
 */

async function viewer(): Promise<{ kind: "admin" | "client" | "none"; slug?: string }> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  if (kind === "admin") return { kind: "admin" };
  if (kind === "client") return { kind: "client", slug: h.get("x-viewer-client-slug") ?? undefined };
  return { kind: "none" };
}

/** Resolve a slug into a ClientConfig the current viewer can access. */
export async function assertUserCanAccessClientBySlug(slug: string): Promise<ClientConfig> {
  const client = getClientBySlug(slug);
  if (!client) notFound();
  const v = await viewer();
  if (v.kind === "admin") return client;
  if (v.kind === "client") {
    if (v.slug === slug) return client;
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
    if (v.slug === client.slug) return client;
    notFound();
  }
  return client;
}

export type { ClientId };
