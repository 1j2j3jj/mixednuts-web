"use client";
import { useCallback } from "react";

/**
 * Client-side tracker for /api/events. Fire-and-forget; failures are silently
 * swallowed so analytics never breaks UX.
 *
 * Usage:
 *   const track = useTrackEvent();
 *   track("page_view", { path: "/dashboard/hs", client_viewed: "hs" });
 *   track("export_csv", { client_viewed: "hs", query_params: { range: "28d" } });
 */
export function useTrackEvent() {
  return useCallback(
    async (event_type: string, payload?: Record<string, unknown>) => {
      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event_type, ...payload }),
          keepalive: true, // ensure send completes during page navigation
        });
      } catch {
        // swallow — analytics failure must never break UX
      }
    },
    [],
  );
}
