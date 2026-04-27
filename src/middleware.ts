import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, anyCredentialConfigured } from "@/lib/credentials";
import { verifySession, COOKIE_NAME } from "@/lib/auth-cookie";
import { CLIENT_SLUGS } from "@/config/client-slugs";

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
 *   4) Tenant routing:
 *      - /dashboard/{slug}/*  — existing paths (maintained for bookmark compat)
 *      - /{org-slug}/*        — new short URLs (redirected to /dashboard/{slug}/*)
 *      - /admin/*             — admin-only; clients are bounced to their dashboard
 *      - /switch              — workspace switcher (accessible to any authed user)
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

/**
 * Redirect a request to a new path, preserving search params.
 * Always 301 (permanent) for SEO benefit on canonical redirects,
 * 302 (temporary) for auth-driven redirects.
 */
function redirectTo(request: NextRequest, pathname: string, permanent = false): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url, permanent ? 301 : 302);
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

/**
 * Check if a pathname segment is a known client org slug.
 * Used to detect /{org-slug}/* paths and redirect to /dashboard/{slug}/*.
 * The slug list is derived from CLIENTS at build-time via client-slugs.ts
 * to avoid importing the full config in Edge middleware.
 */
function isKnownOrgSlug(segment: string): boolean {
  return CLIENT_SLUGS.includes(segment);
}

async function checkAuth(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Exempt routes (login page, auth API, public site) — always open.
  if (isExemptPath(pathname)) return NextResponse.next();

  // Safety fallback: if no credential env is set at all, let traffic
  // through. Avoids locking ourselves out on a fresh deploy.
  if (!anyCredentialConfigured()) return NextResponse.next();

  // 2. Session cookie takes precedence — lets /login users browse
  //    without the Basic Auth popup ever showing.
  const cookie = await resolveSessionCookie(request);
  const auth = cookie.kind !== "deny" ? cookie : resolveBasicAuth(request);

  // 3. Reject if neither path authenticated.
  if (auth.kind === "deny") {
    // Redirect to login for browser navigation (non-API, non-Basic-Auth).
    const isApi = pathname.startsWith("/api/");
    if (!isApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url, 302);
    }
    return denyResponse();
  }

  // 4. /switch — workspace switcher; accessible to any authenticated user.
  if (pathname === "/switch" || pathname === "/switch/") {
    return passThrough(request, auth);
  }

  // 5. /admin/* — operator-only. Clients are bounced to their dashboard.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (auth.kind !== "admin") {
      const slug =
        auth.kind === "client"
          ? auth.slug
          : auth.kind === "client-multi"
          ? auth.currentSlug
          : null;
      return redirectTo(request, slug ? `/dashboard/${slug}` : "/login");
    }
    return passThrough(request, auth);
  }

  // 6. /{org-slug}/* — short tenant URLs. 301-redirect to /dashboard/{slug}/*.
  //    Admin users can also reach these paths (for impersonation etc.) —
  //    redirect them too so the app logic lives in one place.
  const firstSegment = pathname.split("/")[1] ?? "";
  if (firstSegment && isKnownOrgSlug(firstSegment)) {
    // Strip the leading /{slug} and map the rest of the path.
    // /{slug}           → /dashboard/{slug}
    // /{slug}/dashboard → /dashboard/{slug}
    // /{slug}/ads       → /dashboard/{slug}/ads
    // /{slug}/settings/members → /dashboard/{slug} (settings is new UI)
    const rest = pathname.slice(firstSegment.length + 1); // after /{slug}
    const restNorm = rest === "" || rest === "/" || rest === "/dashboard" ? "" : rest;
    const target = `/dashboard/${firstSegment}${restNorm}`;
    // Settings paths are new — forward to new-style pages under /dashboard
    if (rest.startsWith("/settings")) {
      return redirectTo(request, `/dashboard/${firstSegment}${rest}`, false);
    }
    return redirectTo(request, target, true);
  }

  // 7. Admin: full passthrough for all remaining paths.
  if (auth.kind === "admin") return passThrough(request, auth);

  // 8. Multi-client: allow /dashboard/select and any slug in availableSlugs.
  if (auth.kind === "client-multi") {
    const { currentSlug, availableSlugs } = auth;

    if (pathname === "/dashboard/select") return passThrough(request, auth);

    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      return redirectTo(request, "/dashboard/select");
    }

    if (pathname.startsWith("/dashboard/")) {
      const segments = pathname.split("/").filter(Boolean);
      const requestedSlug = segments[1];
      if (requestedSlug && availableSlugs.includes(requestedSlug)) {
        const adjusted: Auth = { kind: "client-multi", currentSlug: requestedSlug, availableSlugs };
        return passThrough(request, adjusted);
      }
      return redirectTo(request, "/dashboard/select");
    }

    // Non-dashboard paths: bounce to select.
    return redirectTo(request, `/dashboard/${currentSlug}`);
  }

  // 9. Single-client: tenant-scope all paths.
  const ownDash = `/dashboard/${auth.slug}`;
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return redirectTo(request, ownDash);
  }
  if (pathname.startsWith("/dashboard/")) {
    const segments = pathname.split("/").filter(Boolean);
    const requestedSlug = segments[1];
    if (requestedSlug && requestedSlug !== auth.slug) {
      return redirectTo(request, ownDash);
    }
    return passThrough(request, auth);
  }

  // Non-dashboard paths (marketing site, admin-only areas): clients get
  // bounced to their own dashboard.
  return redirectTo(request, ownDash);
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
