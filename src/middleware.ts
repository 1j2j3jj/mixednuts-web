import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { CLIENT_IDS, CLIENTS } from "@/config/clients";

/**
 * Multi-tenant Basic Auth + optional Clerk.
 *
 * Two credential classes:
 *
 *   1) Admin   — env BASIC_AUTH_USER / BASIC_AUTH_PASSWORD (legacy name kept).
 *                Sees admin index, sidebar account list, any /dashboard/[slug].
 *
 *   2) Client  — env CLIENT_AUTH_{ID} = "user:pass" (one env per client).
 *                Restricted to their own /dashboard/[slug]/*. Requests to
 *                /dashboard, /dashboard/[other-slug], or the marketing pages
 *                are silently redirected to /dashboard/[own-slug] so the
 *                existence of other tenants cannot leak.
 *
 * Viewer kind is forwarded to the app via a custom request header
 * (`x-viewer-kind`) so layouts/pages can hide admin-only UI chrome without
 * re-running auth logic.
 */

const REALM = 'Basic realm="mixednuts-web"';
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

type Auth =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  | { kind: "deny" };

function resolveAuth(request: NextRequest): Auth {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return { kind: "deny" };

  let decoded: string;
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return { kind: "deny" };
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return { kind: "deny" };
  const u = decoded.slice(0, idx);
  const p = decoded.slice(idx + 1);

  // Admin first. Legacy env names kept so existing deploys keep working.
  const adminUser = process.env.BASIC_AUTH_USER;
  const adminPass = process.env.BASIC_AUTH_PASSWORD;
  if (adminUser && adminPass && u === adminUser && p === adminPass) {
    return { kind: "admin" };
  }

  // Per-client credentials. Each env value is "user:pass" so a single env
  // var carries the full credential and we can loop the registry.
  for (const id of CLIENT_IDS) {
    const raw = process.env[`CLIENT_AUTH_${id.toUpperCase()}`];
    if (!raw) continue;
    const sep = raw.indexOf(":");
    if (sep === -1) continue;
    const cu = raw.slice(0, sep);
    const cp = raw.slice(sep + 1);
    if (u === cu && p === cp) {
      return { kind: "client", clientId: id, slug: CLIENTS[id].slug };
    }
  }

  return { kind: "deny" };
}

function denyResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

function passThrough(request: NextRequest, auth: Auth): NextResponse {
  const requestHeaders = new Headers(request.headers);
  if (auth.kind === "admin") requestHeaders.set("x-viewer-kind", "admin");
  else if (auth.kind === "client") {
    requestHeaders.set("x-viewer-kind", "client");
    requestHeaders.set("x-viewer-client-id", auth.clientId);
    requestHeaders.set("x-viewer-client-slug", auth.slug);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function checkBasicAuth(request: NextRequest): NextResponse {
  // Safety fallback: if NEITHER admin nor any client credential is set in the
  // environment, let traffic through. Avoids locking ourselves out of a fresh
  // deploy where envs haven't been provisioned yet.
  const hasAnyCred =
    Boolean(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD) ||
    CLIENT_IDS.some((id) => process.env[`CLIENT_AUTH_${id.toUpperCase()}`]);
  if (!hasAnyCred) return NextResponse.next();

  const auth = resolveAuth(request);
  if (auth.kind === "deny") return denyResponse();
  if (auth.kind === "admin") return passThrough(request, auth);

  // auth.kind === "client" — tenant scoping.
  const { pathname } = request.nextUrl;
  const ownDash = `/dashboard/${auth.slug}`;

  // /dashboard, /dashboard/, or any slug that isn't theirs → own dashboard.
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    const url = request.nextUrl.clone();
    url.pathname = ownDash;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/dashboard/")) {
    const segments = pathname.split("/").filter(Boolean);
    const requestedSlug = segments[1];
    if (requestedSlug && requestedSlug !== auth.slug) {
      const url = request.nextUrl.clone();
      url.pathname = ownDash;
      return NextResponse.redirect(url);
    }
    return passThrough(request, auth);
  }

  // Non-dashboard paths (marketing site, admin-only areas): clients get
  // bounced to their own dashboard. This is deliberately silent — a 403
  // would still reveal that a marketing site exists behind the portal.
  const url = request.nextUrl.clone();
  url.pathname = ownDash;
  return NextResponse.redirect(url);
}

// When Clerk is not configured (no CLERK_SECRET_KEY at build/runtime), the
// Clerk wrapper would throw. Fall back to Basic-Auth-only middleware in that
// case so scaffolding works before keys are provisioned.
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

const middleware = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      const basicResponse = checkBasicAuth(req);
      // If Basic Auth blocked or redirected, skip Clerk.
      if (basicResponse.status === 401 || basicResponse.headers.get("location")) {
        return basicResponse;
      }
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
      return basicResponse;
    })
  : (req: NextRequest) => checkBasicAuth(req);

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
