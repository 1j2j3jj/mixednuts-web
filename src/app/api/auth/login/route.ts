import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import { signSession, COOKIE_NAME, TTL_SECONDS } from "@/lib/auth-cookie";

/** POST /api/auth/login
 *
 *  Request: { user: string, pass: string }
 *  Success (200): { ok: true, redirect: string }
 *                 + Set-Cookie mn_session=<signed>; HttpOnly; Secure; SameSite=Lax
 *  Failure (401): { ok: false, error: string }
 *
 *  Rate limiting isn't implemented here (out of scope for v1). If brute
 *  force becomes a concern, add IP-level throttling via Vercel Edge
 *  middleware or an external rate-limit service.
 */
export async function POST(req: NextRequest) {
  let body: { user?: string; pass?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid request" }, { status: 400 });
  }
  const user = String(body.user ?? "").trim();
  const pass = String(body.pass ?? "");
  if (!user || !pass) {
    return NextResponse.json({ ok: false, error: "ID とパスワードを入力してください" }, { status: 400 });
  }

  const auth = await verifyCredentials(user, pass);
  if (auth.kind === "deny") {
    // Short artificial delay helps against rapid brute force loops.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json(
      { ok: false, error: "ID またはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  const token =
    auth.kind === "admin"
      ? await signSession({ kind: "admin" })
      : await signSession({ kind: "client", clientId: auth.clientId, slug: auth.slug });
  const redirect = auth.kind === "admin" ? "/dashboard" : `/dashboard/${auth.slug}`;

  const res = NextResponse.json({ ok: true, redirect });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });
  return res;
}
