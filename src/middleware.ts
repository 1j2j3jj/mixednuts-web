import { NextRequest, NextResponse } from "next/server";

const REALM = 'Basic realm="mixednuts-web (construction)"';

export function middleware(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // If credentials are not configured, let traffic through (safety fallback)
  if (!user || !pass) return NextResponse.next();

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice(6).trim();
    // Edge runtime supports atob
    const decoded = atob(encoded);
    const idx = decoded.indexOf(":");
    if (idx !== -1) {
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export const config = {
  matcher: [
    // Match everything except Next.js internals and common asset conveniences
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
