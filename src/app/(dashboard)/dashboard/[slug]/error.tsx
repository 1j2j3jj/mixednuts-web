"use client";

import { useEffect } from "react";

/**
 * Client-facing error boundary for /dashboard/[slug]/*. Previously an
 * upstream GA4 / Sheets / GSC failure produced the default Next.js
 * error page in English — disaster for an external-facing dashboard.
 *
 * Now: friendly localised copy + a Retry button. Errors are logged to
 * console so the admin can diagnose via Vercel logs.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send to console so it shows up in Vercel function logs.
    console.error("[dashboard/error.tsx]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold tracking-tight">データを取得できませんでした</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        GA4 / Google Sheets / GSC のいずれかで一時的な障害が発生した可能性があります。
        しばらくお待ちいただいてから再度お試しください。問題が継続する場合は
        <a href="/contact" className="ml-1 underline hover:text-foreground">
          サポート
        </a>
        までご連絡ください。
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          再試行
        </button>
        <a
          href="/dashboard"
          className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          トップへ戻る
        </a>
      </div>
    </div>
  );
}
