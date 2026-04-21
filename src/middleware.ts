import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Two-layer protection:
 *   1) Basic Auth — blanket lock on the whole origin while the site is
 *      still in construction. Applied to every request.
 *   2) Clerk — tenant-level auth for /dashboard/*. Only activated when
 *      CLERK_SECRET_KEY is present (so local/dev without a Clerk account
 *      can still boot).
 *
 * Public marketing pages stay open after Basic Auth passes.
 */

const REALM = 'Basic realm="mixednuts-web (construction)"';
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If Basic Auth is not configured, let traffic through (safety fallback).
  if (!user || !pass) return null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice(6).trim();
    try {
      const decoded = atob(encoded);
      const idx = decoded.indexOf(":");
      if (idx !== -1) {
        const u = decoded.slice(0, idx);
        const p = decoded.slice(idx + 1);
        if (u === user && p === pass) return null; // pass
      }
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

// When Clerk is not configured (no CLERK_SECRET_KEY at build/runtime), the
// Clerk wrapper would throw. Fall back to Basic-Auth-only middleware in that
// case so scaffolding works before keys are provisioned.
const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);

const middleware = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      const basicDeny = checkBasicAuth(req);
      if (basicDeny) return basicDeny;

      if (isProtectedRoute(req)) {
        await auth.protect();
      }
      return NextResponse.next();
    })
  : (req: NextRequest) => {
      const basicDeny = checkBasicAuth(req);
      if (basicDeny) return basicDeny;
      return NextResponse.next();
    };

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
