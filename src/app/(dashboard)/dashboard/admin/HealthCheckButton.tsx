"use client";

import { useState, useTransition } from "react";
import { runAllHealthChecks, type ClientHealth } from "./actions";

/**
 * Interactive health-check runner. Fires server action, renders per-
 * client × per-source status grid. Kept as a client component so the
 * admin can re-run without a full page refresh (server action returns
 * fresh data each click; no caching).
 */
export default function HealthCheckButton() {
  const [results, setResults] = useState<ClientHealth[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await runAllHealthChecks();
        setResults(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? "実行中…" : results ? "再実行" : "接続テスト実行"}
        </button>
        {results && (
          <span className="text-xs text-muted-foreground">
            {results.length} クライアント × 最大 5 ソース
          </span>
        )}
      </div>
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </div>
      )}
      {results && (
        <div className="space-y-4">
          {results.map((c) => (
            <div key={c.clientId} className="rounded-md border">
              <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-sm">
                <div className="font-medium">
                  {c.label}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">/{c.slug}</span>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${
                    c.active ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {c.active ? "active" : "inactive"}
                </span>
              </div>
              <ul className="divide-y">
                {c.results.map((r) => (
                  <li key={r.source} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        r.status === "ok"
                          ? "bg-emerald-500"
                          : r.status === "fail"
                          ? "bg-rose-500"
                          : "bg-neutral-300"
                      }`}
                    />
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">{r.source}</span>
                    <span className="flex-1 truncate font-mono text-xs">{r.detail}</span>
                    {r.latencyMs != null && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {r.latencyMs}ms
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
