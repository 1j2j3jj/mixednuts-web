"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

/**
 * Client-side login form. Two paths:
 *
 *  1) ID/PW (legacy CLIENT_AUTH_<ID> env-based) — POSTs to /api/auth/login
 *     which sets the mn_session cookie directly. Used by HS today.
 *
 *  2) Google OAuth (Better Auth) — calls authClient.signIn.social() which
 *     redirects to Google, comes back to /api/auth/callback/google
 *     (Better Auth handler), then to /login/success which reads the BA
 *     session, maps the email to a role, and sets mn_session.
 *
 * Once Chakin/DOZO move to invitation flow (Better Auth Email/PW in DB
 * instead of CLIENT_AUTH_<ID> env), the ID/PW form below will route to
 * authClient.signIn.email() instead. Keeping both for now to avoid
 * breaking HS.
 */
export default function LoginForm() {
  const sp = useSearchParams();
  const redirectParam = sp.get("next");
  const oauthError = sp.get("error");
  const deniedEmail = sp.get("email");
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED);

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(
    oauthError === "not_allowed"
      ? `Google アカウント${deniedEmail ? `(${deniedEmail})` : ""} はこのダッシュボードへのアクセス権限がありません。ID/PW でログインするか、管理者にお問い合わせください。`
      : oauthError === "oauth_no_email" || oauthError === "no_session"
      ? "Google ログインが完了しませんでした。再試行してください。"
      : oauthError?.startsWith("ba_error:")
      ? "認証サーバーでエラーが発生しました。時間を置いて再試行してください。"
      : null
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, pass }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "ログインに失敗しました");
        setLoading(false);
        return;
      }
      const target = redirectParam && redirectParam.startsWith("/dashboard") ? redirectParam : data.redirect;
      // Force a full navigation so the cookie is picked up by middleware on
      // the next server round-trip (router.push keeps the current RSC payload).
      window.location.href = target;
    } catch {
      setError("通信エラーが発生しました。しばらくしてから再度お試しください。");
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setOauthLoading(true);
    try {
      // Better Auth redirects to Google, then to /api/auth/callback/google,
      // then to callbackURL. /login/success reads the BA session and bridges
      // it into our mn_session cookie.
      await signIn.social({
        provider: "google",
        callbackURL: "/login/success",
        errorCallbackURL: "/login?error=oauth_no_email",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Google サインインに失敗しました: ${msg}`);
      setOauthLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="mixednuts Inc." className="h-8 w-auto" />
          <span className="text-base font-semibold tracking-tight text-neutral-900">mixednuts</span>
        </Link>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-neutral-900">
          Client Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          ログイン情報をお持ちのお客様はこちらからサインインしてください
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <label htmlFor="user" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
            ID
          </label>
          <input
            id="user"
            name="user"
            type="text"
            autoComplete="username"
            required
            autoFocus
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="client_id"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="pass" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
            Password
          </label>
          <input
            id="pass"
            name="pass"
            type="password"
            autoComplete="current-password"
            required
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "サインイン中…" : "サインイン"}
        </button>

        {/* OAuth section — Better Auth signIn.social() handles the Google
            round-trip; the post-OAuth bridge at /login/success maps the
            verified email to a role and sets the same mn_session cookie
            as the ID/PW path. */}
        <div className="flex items-center gap-2 pt-2 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          <span>または</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>
        {googleEnabled ? (
          <button
            type="button"
            onClick={onGoogle}
            disabled={oauthLoading}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            {oauthLoading ? "リダイレクト中…" : "Google でサインイン"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="準備中 — Google OAuth Client ID/Secret を設定すると有効化されます"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-400 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Google でサインイン（準備中）
          </button>
        )}
      </form>

      <div className="text-center text-xs text-neutral-500">
        アクセスに関するお問い合わせは{" "}
        <Link href="/contact" className="underline hover:text-neutral-900">
          Contact
        </Link>
        {" "}までご連絡ください。
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09a6.6 6.6 0 010-4.18V7.07H2.18a11 11 0 000 9.86l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}
