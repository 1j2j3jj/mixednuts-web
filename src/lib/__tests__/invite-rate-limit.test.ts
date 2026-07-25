import { describe, it, expect } from "vitest";
import { getClientIp, checkIpBurst } from "../invite-rate-limit";

/**
 * Regression suite for the Item 2 fix (2026-07-25 post-audit review):
 * checkIpBurst existed since the original Phase F audit but had ZERO call
 * sites anywhere in the app — it was dead code, described by the Phase F
 * self-report as an active control ("a best-effort in-memory per-IP burst
 * limiter") when it provided no protection at all. It is now called from
 * assertInviteRateLimit at every invite-creation call site. This suite
 * covers the two pure functions that make up the fix: getClientIp (header
 * parsing) and checkIpBurst (the limiter logic itself). It does NOT cover
 * assertInviteRateLimit's DB-backed actor/org checks (unchanged, already
 * verified correct — see the Phase F audit) or the call sites themselves
 * (covered by this project's `tsc`/`next build` gates, which would fail if
 * a call site's destructured `ip` were missing or mistyped).
 *
 * Each test uses a distinct dummy IP string to avoid cross-test
 * contamination: checkIpBurst's hit-tracking Map is module-level state
 * that persists for the life of this test file's process, exactly as it
 * would across requests in one warm serverless instance.
 */

describe("getClientIp", () => {
  it("returns null when x-forwarded-for is absent", () => {
    expect(getClientIp(new Headers())).toBeNull();
  });

  it("returns null for an empty x-forwarded-for value", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "" }))).toBeNull();
  });

  it("returns the single IP when only one is present", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });

  it("returns the first (leftmost / original client) entry from a comma-separated chain", () => {
    expect(
      getClientIp(
        new Headers({
          "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178",
        }),
      ),
    ).toBe("203.0.113.5");
  });

  it("trims whitespace around the first entry", () => {
    expect(
      getClientIp(
        new Headers({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" }),
      ),
    ).toBe("203.0.113.5");
  });
});

describe("checkIpBurst", () => {
  it("never blocks when ip is null (e.g. local dev, or the header genuinely absent)", () => {
    for (let i = 0; i < 30; i++) {
      expect(checkIpBurst(null)).toBe(true);
    }
  });

  it("allows the first 15 calls for a fresh IP within the window", () => {
    const ip = "198.51.100.1";
    for (let i = 0; i < 15; i++) {
      expect(checkIpBurst(ip)).toBe(true);
    }
  });

  it("blocks the 16th call for the same IP within the window", () => {
    const ip = "198.51.100.2";
    for (let i = 0; i < 15; i++) {
      expect(checkIpBurst(ip)).toBe(true);
    }
    expect(checkIpBurst(ip)).toBe(false);
  });

  it("keeps blocking further calls once tripped, until the window rolls off", () => {
    const ip = "198.51.100.3";
    for (let i = 0; i < 16; i++) checkIpBurst(ip); // trip it
    expect(checkIpBurst(ip)).toBe(false);
    expect(checkIpBurst(ip)).toBe(false);
  });

  it("tracks each IP independently — one IP tripping the limit does not affect another", () => {
    const tripped = "198.51.100.4";
    const fresh = "198.51.100.5";
    for (let i = 0; i < 16; i++) checkIpBurst(tripped);
    expect(checkIpBurst(tripped)).toBe(false);
    expect(checkIpBurst(fresh)).toBe(true);
  });
});
