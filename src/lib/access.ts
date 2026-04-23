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
 * Identity origin: middleware accepts mn_session (cookie set by ID/PW
 * login or by the Better Auth → mn_session bridge at /login/success)
 * or Basic Auth as a legacy fallback. Whichever authenticates first
 * is reflected in the x-viewer-* headers we read here.
 */

async function viewer(): Promise<{
  kind: "admin" | "client" | "client-multi" | "none";
  slug?: string;
  availableSlugs?: string[];
}> {
  const h = await headers();
  const kind = h.get("x-viewer-kind");
  if (kind === "admin") return { kind: "admin" };
  if (kind === "client") return { kind: "client", slug: h.get("x-viewer-client-slug") ?? undefined };
  if (kind === "client-multi") {
    const slugHeader = h.get("x-viewer-available-slugs") ?? "";
    const availableSlugs = slugHeader.split(",").filter(Boolean);
    return {
      kind: "client-multi",
      slug: h.get("x-viewer-client-slug") ?? undefined,
      availableSlugs,
    };
  }
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
  if (v.kind === "client-multi") {
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
    if (v.slug === client.slug) return client;
    notFound();
  }
  if (v.kind === "client-multi") {
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
