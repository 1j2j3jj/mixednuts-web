import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, anyCredentialConfigured } from "@/lib/credentials";
import { verifySession, COOKIE_NAME } from "@/lib/auth-cookie";

/**
 * Auth stack (applied in order):
 *
 *   1) Exempt routes — /login page and /api/auth/* are always open so
 *      clients can sign in without first presenting Basic Auth. The
 *      Better Auth handler also lives under /api/auth/* and needs to
 *      reach social callbacks unauthenticated.
 *
 *   2) Session cookie (mn_session) — signed JSON set by /api/auth/login
 *      (ID/PW) and /login/success (post-OAuth bridge). HttpOnly, Secure,
 *      7-day expiry. Preferred when present; lets clients browse
 *      dashboards without a Basic Auth popup.
 *
 *   3) Basic Auth — legacy fallback. Admin creds (BASIC_AUTH_USER/_PASSWORD)
 *      and per-client creds (CLIENT_AUTH_<ID>=user:pass) still accepted
 *      via HTTP Authorization header. Allows bookmarked admin workflows
 *      and existing integrations to keep working.
 *
 *   4) Tenant routing — clients are silently redirected to their own
 *      /dashboard/<slug> when they hit any other path, so cross-tenant
 *      existence never leaks in the URL space.
 *
 * Viewer kind is forwarded to the app via request headers
 * (`x-viewer-kind`, `x-viewer-client-slug`) so layouts/pages can hide
 * admin-only chrome without re-running auth logic.
 *
 * Better Auth note: the BA session lives in its own cookie
 * (`better-auth.session_token`) and is read by /login/success to map
 * the verified OAuth email to a role + set our mn_session. The
 * middleware itself never reads BA's cookie — we keep mn_session as
 * the single source of truth for tenant gating.
 */

const REALM = 'Basic realm="mixednuts-web"';

type Auth =
  | { kind: "admin" }
  | { kind: "client"; clientId: string; slug: string }
  | { kind: "client-multi"; currentSlug: string; availableSlugs: string[] }
  | { kind: "deny" };

async function resolveSessionCookie(request: NextRequest): Promise<Auth> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const sess = await verifySession(token);
  if (!sess) return { kind: "deny" };
  if (sess.kind === "admin") return { kind: "admin" };
  if (sess.kind === "client-multi") {
    return {
      kind: "client-multi",
      currentSlug: sess.currentSlug,
      availableSlugs: sess.availableSlugs,
    };
  }
  return { kind: "client", clientId: sess.clientId, slug: sess.slug };
}

function resolveBasicAuth(request: NextRequest): Auth {
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

  const check = verifyCredentials(u, p);
  if (check.kind === "deny") return { kind: "deny" };
  return check;
}

function denyResponse(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

function passThrough(request: NextRequest, auth: Auth): NextResponse {
  const requestHeaders = new Headers(request.headers);
  if (auth.kind === "admin") {
    requestHeaders.set("x-viewer-kind", "admin");
  } else if (auth.kind === "client") {
    requestHeaders.set("x-viewer-kind", "client");
    requestHeaders.set("x-viewer-client-id", auth.clientId);
    requestHeaders.set("x-viewer-client-slug", auth.slug);
  } else if (auth.kind === "client-multi") {
    // Downstream pages see "client-multi" kind; current slug is forwarded so
    // layout chrome can display the active tenant and show the switch link.
    requestHeaders.set("x-viewer-kind", "client-multi");
    requestHeaders.set("x-viewer-client-slug", auth.currentSlug);
    requestHeaders.set("x-viewer-available-slugs", auth.availableSlugs.join(","));
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

function isExemptPath(pathname: string): boolean {
  // Always open — clients need these to reach a login form without
  // first satisfying Basic Auth. Better Auth's social OAuth callback
  // and the post-OAuth bridge at /login/success must be reachable
  // before our cookie exists.
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/og-default.jpg" ||
    pathname === "/og-default.png"
  ) return true;

  // Public marketing site — open to all visitors (post-launch 2026-04-27).
  // Dashboard, admin, and authenticated APIs remain protected below.
  if (
    pathname === "/" ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/works") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/services") ||
    pathname.startsWith("/careers") ||
    pathname.startsWith("/team") ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/legal" ||
    pathname.startsWith("/_next/")
  ) return true;

  return false;
}

async function checkAuth(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Exempt routes (login page, auth API) — always open.
  if (isExemptPath(pathname)) return NextResponse.next();

  // Safety fallback: if no credential env is set at all, let traffic
  // through. Avoids locking ourselves out on a fresh deploy.
  if (!anyCredentialConfigured()) return NextResponse.next();

  // 2. Session cookie takes precedence — lets /login users browse
  //    without the Basic Auth popup ever showing.
  const cookie = await resolveSessionCookie(request);
  const auth = cookie.kind !== "deny" ? cookie : resolveBasicAuth(request);

  // 3. Reject if neither path authenticated.
  if (auth.kind === "deny") return denyResponse();

  // 4. Admin: full passthrough.
  if (auth.kind === "admin") return passThrough(request, auth);

  // 5. Multi-client: allow /dashboard/select and any slug in availableSlugs.
  if (auth.kind === "client-multi") {
    const { currentSlug, availableSlugs } = auth;

    if (pathname === "/dashboard/select") return passThrough(request, auth);

    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/select";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/dashboard/")) {
      const segments = pathname.split("/").filter(Boolean);
      const requestedSlug = segments[1];
      // If the user navigated to a slug they have access to, honour it
      // by updating the active slug in the forwarded headers. The session
      // cookie itself is NOT re-signed here; the select page action does
      // that when the user actively switches. For passive navigation the
      // effective slug is derived from the URL.
      if (requestedSlug && availableSlugs.includes(requestedSlug)) {
        const adjusted: Auth = { kind: "client-multi", currentSlug: requestedSlug, availableSlugs };
        return passThrough(request, adjusted);
      }
      // Slug not in their access list — bounce to select.
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/select";
      return NextResponse.redirect(url);
    }

    // Non-dashboard paths: bounce to select.
    const url = request.nextUrl.clone();
    url.pathname = `/dashboard/${currentSlug}`;
    return NextResponse.redirect(url);
  }

  // 6. Single-client: tenant-scope all paths. Redirects are silent (no 403)
  //    so cross-tenant existence doesn't leak via error pages.
  const ownDash = `/dashboard/${auth.slug}`;
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
  // bounced to their own dashboard.
  const url = request.nextUrl.clone();
  url.pathname = ownDash;
  return NextResponse.redirect(url);
}

export default async function middleware(req: NextRequest): Promise<NextResponse> {
  return checkAuth(req);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
