import { describe, it, expect } from "vitest";
import { isNextCacheWriteFailure } from "@/lib/cache-safety";
import { installUnhandledRejectionSafetyNet } from "@/instrumentation-node";
import { register } from "@/instrumentation";

/**
 * A-27 defence-in-depth (see src/instrumentation-node.ts top-of-file
 * comment): Next's unstable_cache fires its cache-write as an unawaited,
 * un-.catch()'d promise, so a write failure (e.g. over the 2MB limit)
 * surfaces as a process-wide unhandledRejection that no application-level
 * try/catch can intercept. This listener is the safety net that stops that
 * from ever blanking a page.
 *
 * The logic is split across two files specifically so instrumentation.ts
 * (loaded under BOTH the nodejs and edge runtimes) never statically
 * references `process.on` (a Node-only API) — see instrumentation.ts /
 * instrumentation-node.ts doc comments. These tests cover both halves.
 */

describe("isNextCacheWriteFailure (src/lib/cache-safety.ts)", () => {
  it("matches the exact message shape from the A-27 incident", () => {
    const err = new Error(
      "Failed to set Next.js data cache for unstable_cache /dashboard/c5h9j2 …, items over 2MB can not be cached (6068595 bytes)",
    );
    expect(isNextCacheWriteFailure(err)).toBe(true);
  });

  it("matches on either half of the pattern independently", () => {
    expect(
      isNextCacheWriteFailure(
        new Error("Failed to set Next.js data cache for foo"),
      ),
    ).toBe(true);
    expect(
      isNextCacheWriteFailure(
        new Error("items over 2MB can not be cached (123 bytes)"),
      ),
    ).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isNextCacheWriteFailure(new Error("CAN NOT BE CACHED"))).toBe(true);
  });

  it("does not match unrelated errors — must not become a catch-all", () => {
    expect(isNextCacheWriteFailure(new Error("ECONNRESET"))).toBe(false);
    expect(isNextCacheWriteFailure(new Error("permission denied"))).toBe(false);
    expect(
      isNextCacheWriteFailure(
        new Error("TypeError: cannot read properties of undefined"),
      ),
    ).toBe(false);
    expect(
      isNextCacheWriteFailure(new Error("BigQuery: Not found: Table x")),
    ).toBe(false);
  });

  it("handles non-Error throwables without throwing", () => {
    expect(isNextCacheWriteFailure("can not be cached")).toBe(true);
    expect(isNextCacheWriteFailure(undefined)).toBe(false);
    expect(isNextCacheWriteFailure(null)).toBe(false);
    expect(isNextCacheWriteFailure(42)).toBe(false);
  });
});

describe("installUnhandledRejectionSafetyNet (src/instrumentation-node.ts)", () => {
  it("installs exactly one unhandledRejection listener, idempotently across repeated calls", () => {
    // Importing the module already installed one (its own module-level
    // side effect, mirroring what a real server boot does) — calling it
    // again here (dev HMR / multiple instrumentation triggers) must not
    // add a second one.
    const before = process.listenerCount("unhandledRejection");
    installUnhandledRejectionSafetyNet();
    installUnhandledRejectionSafetyNet();
    expect(process.listenerCount("unhandledRejection")).toBe(before);
  });
});

describe("register() (src/instrumentation.ts) — runtime dispatch", () => {
  const originalRuntime = process.env.NEXT_RUNTIME;

  it("does not throw under the nodejs runtime (dynamically imports instrumentation-node)", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await expect(register()).resolves.toBeUndefined();
    process.env.NEXT_RUNTIME = originalRuntime;
  });

  it("does not throw under the edge runtime (skips the node-only import)", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await expect(register()).resolves.toBeUndefined();
    process.env.NEXT_RUNTIME = originalRuntime;
  });
});
