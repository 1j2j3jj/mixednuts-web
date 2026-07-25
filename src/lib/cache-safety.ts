/**
 * Pure classification for A-27's defence-in-depth safety net (see
 * src/instrumentation-node.ts for where this is actually wired up, and
 * src/lib/sources/raw.ts for the primary size fix this backs up).
 *
 * Kept in its own edge-runtime-safe file (no Node APIs) so it can be
 * imported from src/instrumentation.ts's top-level module graph without
 * pulling `process.on` into the Edge Runtime bundle — Next.js statically
 * analyses everything reachable from instrumentation.ts's import graph for
 * edge-incompatible APIs, even code paths only ever *called* under a
 * `NEXT_RUNTIME === "nodejs"` guard at runtime (confirmed: an earlier
 * version of this fix that put `process.on` directly in instrumentation.ts
 * built with the WARN "A Node.js API is used (process.on) which is not
 * supported in the Edge Runtime" — see instrumentation-node.ts for the fix).
 */

const NEXT_CACHE_WRITE_FAILURE_PATTERN =
  /failed to set next\.js data cache|can not be cached/i;

export function isNextCacheWriteFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return NEXT_CACHE_WRITE_FAILURE_PATTERN.test(message);
}
