/**
 * Next.js instrumentation entrypoint — runs once at server boot, under
 * every runtime (nodejs + edge). Kept intentionally thin and edge-safe: the
 * actual A-27 safety-net logic (which uses `process.on`, a Node-only API)
 * lives in src/instrumentation-node.ts and is reached only via a dynamic
 * `import()` gated on `NEXT_RUNTIME === "nodejs"`, so it never gets pulled
 * into the Edge Runtime bundle. See src/instrumentation-node.ts for the
 * full "why this exists" writeup.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
