import { describe, it, expect } from "vitest";
import {
  generateInviteToken,
  hashInviteToken,
  constantTimeEqual,
  buildInviteUrl,
  buildCombinedInviteUrl,
} from "../invite-token";

/**
 * F-3 regression suite (Phase F security audit, 2026-07-25): invite token
 * generation/hashing. The invitation `id` is a non-secret primary key;
 * these helpers produce and verify the SEPARATE bearer secret whose hash
 * (never the raw value) is what gets persisted.
 */

describe("generateInviteToken", () => {
  it("produces a URL-safe string with no padding/plus/slash characters", () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toContain("=");
    expect(t).not.toContain("+");
    expect(t).not.toContain("/");
  });

  it("is high-entropy: 100 generations are all unique", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generateInviteToken()),
    );
    expect(tokens.size).toBe(100);
  });

  it("decodes to 32 bytes (256 bits) of randomness", () => {
    const t = generateInviteToken();
    // base64url length for 32 bytes, no padding, is 43 chars.
    expect(t.length).toBe(43);
  });
});

describe("hashInviteToken", () => {
  it("is deterministic for the same input", async () => {
    const token = "fixed-test-token-value";
    const h1 = await hashInviteToken(token);
    const h2 = await hashInviteToken(token);
    expect(h1).toBe(h2);
  });

  it("produces a 64-char lowercase hex string (SHA-256)", async () => {
    const h = await hashInviteToken("anything");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different tokens hash to different values", async () => {
    const a = await hashInviteToken("token-a");
    const b = await hashInviteToken("token-b");
    expect(a).not.toBe(b);
  });

  it("the raw token is never recoverable from the hash (one-way, sanity check via non-reversibility of length)", async () => {
    const raw = generateInviteToken();
    const hash = await hashInviteToken(raw);
    expect(hash).not.toBe(raw);
    expect(hash.length).not.toBe(raw.length);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEqual("abc123", "abc124")).toBe(false);
  });

  it("returns false for different-length strings without throwing", () => {
    expect(constantTimeEqual("short", "a much longer string")).toBe(false);
  });

  it("verifies a real hash pair end-to-end (generate -> hash -> compare)", async () => {
    const raw = generateInviteToken();
    const storedHash = await hashInviteToken(raw);
    const providedHash = await hashInviteToken(raw);
    expect(constantTimeEqual(providedHash, storedHash)).toBe(true);

    const wrongHash = await hashInviteToken(generateInviteToken());
    expect(constantTimeEqual(wrongHash, storedHash)).toBe(false);
  });
});

describe("buildInviteUrl / buildCombinedInviteUrl", () => {
  it("builds a single-invite URL with both id and token query params", () => {
    const url = buildInviteUrl(
      "https://dashboard.example.com",
      "inv-1",
      "raw-token-1",
    );
    expect(url).toBe(
      "https://dashboard.example.com/api/auth/accept-invitation?id=inv-1&token=raw-token-1",
    );
  });

  it("URL-encodes id/token values that need it", () => {
    const url = buildInviteUrl(
      "https://dashboard.example.com",
      "inv 1",
      "tok+en/1",
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("id")).toBe("inv 1");
    expect(parsed.searchParams.get("token")).toBe("tok+en/1");
  });

  it("builds a combined multi-org URL with position-aligned ids/tokens", () => {
    const url = buildCombinedInviteUrl("https://dashboard.example.com", [
      { id: "a", token: "ta" },
      { id: "b", token: "tb" },
    ]);
    const parsed = new URL(url);
    expect(parsed.searchParams.get("ids")).toBe("a,b");
    expect(parsed.searchParams.get("tokens")).toBe("ta,tb");
  });
});
