/**
 * Node-only half of the A-27 defence-in-depth safety net. Split out of
 * src/instrumentation.ts and dynamically imported ONLY under
 * `NEXT_RUNTIME === "nodejs"` (see instrumentation.ts) so that `process.on`
 * — a Node API unsupported in the Edge Runtime — never gets pulled into
 * the Edge Runtime bundle. Next.js statically analyses everything reachable
 * from instrumentation.ts's top-level import graph for edge-incompatible
 * APIs, regardless of runtime `if` guards around the *call site*; only a
 * dynamic `import()` behind that guard keeps this module out of the edge
 * bundle. (Confirmed: putting `process.on` directly in instrumentation.ts
 * built with the warning "A Node.js API is used (process.on) which is not
 * supported in the Edge Runtime" even though the call was already guarded.)
 *
 * WHY THIS EXISTS (read before touching):
 * Next.js's `unstable_cache` fires its cache-WRITE off as an un-awaited,
 * un-`.catch()`'d promise on a fresh cache miss (confirmed by reading this
 * repo's installed Next 16.2.4 —
 * node_modules/next/dist/server/web/spec-extension/unstable-cache.js — the
 * sibling "stale entry, background revalidate" branch a few lines above
 * DOES attach a `.catch()`, specifically "so we don't get an unhandled
 * promise rejection warning" per Next's own inline comment; the
 * fresh-cache-miss branch was not given the same protection). When that
 * write fails — e.g. the value is over Next's 2MB data-cache limit — the
 * rejection surfaces process-wide as an `unhandledRejection`, completely
 * outside the reach of any try/catch application code could write around
 * the call site. In dev this was observed to blank a page mid-render (a
 * client's Overview tab rendered a 166-character body instead of KPIs).
 *
 * The real fix is to never hand `unstable_cache` a value that can exceed
 * the limit (src/lib/sources/raw.ts — RAW_CACHE_LOOKBACK_DAYS + a byte-size
 * safety valve). This listener is DEFENCE IN DEPTH on top of that fix: if a
 * future change (a new cached value elsewhere, unexpected data growth
 * inside a window that was safe when last measured, etc.) ever trips the
 * same Next.js internal failure mode again, the request must degrade
 * gracefully — the data was already returned to the caller successfully;
 * only the background cache write failed — rather than crash.
 *
 * Scope / safety: this ONLY recognises Next's own cache-write failure
 * message shapes (see `isNextCacheWriteFailure` in src/lib/cache-safety.ts)
 * and swallows (logs a warning, does nothing else) just those. Anything
 * else is logged loudly via `console.error` and NOT silently discarded —
 * but note that registering ANY `unhandledRejection` listener disables
 * Node's default "print and terminate the process" behaviour for every
 * unhandled rejection process-wide (that's how the Node event works; there
 * is no way to opt in per-error). That trade-off is intentional for a
 * long-running, client-facing dashboard process: one stray unhandled
 * rejection anywhere in the app taking down every in-flight request for
 * every client is a worse failure mode than logging it loudly and staying
 * up.
 */
import { isNextCacheWriteFailure } from "@/lib/cache-safety";

let installed = false;

export function installUnhandledRejectionSafetyNet(): void {
  if (installed) return; // guard against duplicate registration (dev HMR, multiple imports)
  installed = true;

  process.on("unhandledRejection", (reason) => {
    if (isNextCacheWriteFailure(reason)) {
      console.warn(
        "[cache-safety] Suppressed an unstable_cache write failure (A-27 safety net) — " +
          "rendering was unaffected, only that one value was not persisted to the data " +
          "cache. See src/instrumentation-node.ts.",
        reason instanceof Error ? reason.message : reason,
      );
      return;
    }
    // Not a recognised cache-write failure: log loudly, but still don't
    // crash the process — see the module doc comment above for why.
    console.error("[unhandledRejection]", reason);
  });
}

installUnhandledRejectionSafetyNet();
