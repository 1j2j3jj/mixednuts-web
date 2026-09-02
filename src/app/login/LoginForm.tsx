"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";

/**
 * Login form — redesigned with OAuth-primary layout (2026-04-27).
 *
 * Layout (top → bottom):
 *   1) [G] Continue with Google    — primary CTA (large, full-width)
 *   2) [M] Continue with Microsoft — secondary CTA (smaller)
 *   3) ─── or ───
 *   4) Email + Password form       — fallback for legacy clients (HS etc.)
 *
 * Sign-in paths:
 *   Google/Microsoft OAuth → Better Auth signIn.social() → /api/auth/callback/{provider}
 *     → /login/success (bridge) → mn_session cookie → dashboard
 *   Email/PW → /api/auth/login (legacy env-cred check) → mn_session → dashboard
 *     OR Better Auth emailAndPassword for invited org members (future)
 *
 * Microsoft Entra ID:
 *   Enabled when NEXT_PUBLIC_MICROSOFT_ENTRA_ENABLED=1 is set.
 *   Server-side config: MICROSOFT_ENTRA_CLIENT_ID/SECRET/TENANT_ID.
 *   callbackURL follows same bridge pattern as Google.
 */
export default function LoginForm() {
  const sp = useSearchParams();
  const redirectParam = sp.get("next");
  const invitationHint = sp.get("invitation_hint");
  const oauthError = sp.get("error");
  const deniedEmail = sp.get("email");
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED);
  const msEnabled = Boolean(process.env.NEXT_PUBLIC_MICROSOFT_ENTRA_ENABLED);

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(
    oauthError === "not_allowed"
      ? `Google/Microsoft アカウント${deniedEmail ? ` (${deniedEmail})` : ""} はこのダッシュボードへのアクセス権限がありません。メールアドレスとパスワードでログインするか、管理者にお問い合わせください。`
      : oauthError === "oauth_no_email" || oauthError === "no_session"
      ? "ログインが完了しませんでした。再試行してください。"
      : oauthError?.startsWith("ba_error:")
      ? "認証サーバーでエラーが発生しました。時間を置いて再試行してください。"
      : oauthError?.startsWith("invitation:")
      ? oauthError.slice("invitation:".length)
      : null
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  // Build the callbackURL for OAuth flows, threading invitation next-param through.
  function buildCallbackURL(provider: "google" | "microsoft"): string {
    void provider; // future use: per-provider callback variations
    if (redirectParam && redirectParam.startsWith("/api/auth/accept-invitation")) {
      return `/login/success?next=${encodeURIComponent(redirectParam)}`;
    }
    return "/login/success";
  }

  async function onGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: buildCallbackURL("google"),
        errorCallbackURL: "/login?error=oauth_no_email",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Google サインインに失敗しました: ${msg}`);
      setGoogleLoading(false);
    }
  }

  async function onMicrosoft() {
    setError(null);
    setMsLoading(true);
    try {
      await signIn.social({
        provider: "microsoft",
        callbackURL: buildCallbackURL("microsoft"),
        errorCallbackURL: "/login?error=oauth_no_email",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Microsoft サインインに失敗しました: ${msg}`);
      setMsLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Legacy path: POST /api/auth/login with user/pass (env-based CLIENT_AUTH_<ID>).
      // The `user` field accepts either the client_id shorthand OR an email.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: email, pass }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "ログインに失敗しました");
        setLoading(false);
        return;
      }
      const target =
        redirectParam && redirectParam.startsWith("/api/auth/accept-invitation")
          ? redirectParam
          : redirectParam && redirectParam.startsWith("/dashboard")
          ? redirectParam
          : data.redirect;
      window.location.href = target;
    } catch {
      setError("通信エラーが発生しました。しばらくしてから再度お試しください。");
      setLoading(false);
    }
  }

  const anyOAuthLoading = googleLoading || msLoading;

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Brand header */}
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
          サインインしてダッシュボードを開く
        </p>
      </div>

      {/* Invitation hint banner */}
      {invitationHint && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="font-medium">招待を受け取りました。</span>{" "}
          <span className="font-mono text-xs">{invitationHint}</span>{" "}
          として招待されたアカウントでサインインしてください。
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
        >
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        {/* Primary CTA: Google */}
        {googleEnabled ? (
          <button
            type="button"
            onClick={onGoogle}
            disabled={anyOAuthLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {googleLoading ? "リダイレクト中…" : "Continue with Google"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            title="準備中 — Google OAuth Client ID/Secret を設定すると有効化されます"
            className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-400 disabled:cursor-not-allowed"
          >
            <GoogleIcon className="h-5 w-5 opacity-50" />
            Continue with Google（設定中）
          </button>
        )}

        {/* Secondary CTA: Microsoft */}
        {msEnabled ? (
          <button
            type="button"
            onClick={onMicrosoft}
            disabled={anyOAuthLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MicrosoftIcon className="h-4 w-4" />
            {msLoading ? "リダイレクト中…" : "Continue with Microsoft"}
          </button>
        ) : null}

        {/* Divider */}
        <div className="flex items-center gap-3 py-1 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          <span>または</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        {/* Email + Password fallback */}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
            >
              メールアドレス / ID
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="pass"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-500"
              >
                パスワード
              </label>
            </div>
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
          <button
            type="submit"
            disabled={loading || anyOAuthLoading}
            className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "サインイン中…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-neutral-500">
        アクセスに関するお問い合わせは{" "}
        <Link href="/contact" className="underline hover:text-neutral-900">
          Contact
        </Link>{" "}
        までご連絡ください。
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09a6.6 6.6 0 010-4.18V7.07H2.18a11 11 0 000 9.86l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
    </svg>
  );
}
