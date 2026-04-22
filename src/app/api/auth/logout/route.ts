import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth-cookie";

/** POST /api/auth/logout
 *
 *  Clears the session cookie and redirects to /login. Basic Auth cached
 *  credentials live in the browser's auth-cache and can only be cleared
 *  by closing the browser — clients who never used Basic Auth (all
 *  external clients, by design) get a clean logout via cookie alone.
 */
export async function POST(req: NextRequest) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

export async function GET(req: NextRequest) {
  // Allow logout via simple link too (so we can put <a href="/api/auth/logout">
  // in the UI without a form).
  return POST(req);
}
