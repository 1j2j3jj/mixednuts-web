import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendInvitationEmail } from "../email";

/**
 * F-2 regression suite (Phase F security audit, 2026-07-25): the honest
 * email-send state model. sendInvitationEmail's `status` must distinguish
 * what we can actually assert (Resend's API accepted the request) from
 * what we cannot (delivery) — never claim "sent"/"delivered" beyond that.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

function setArgs() {
  return {
    to: "client@example.com",
    clientLabel: "テストクライアント",
    roleLabel: "閲覧者",
    acceptUrl:
      "https://dashboard.mixednuts-inc.com/api/auth/accept-invitation?id=x&token=y",
  };
}

describe("sendInvitationEmail — F-2 honest state transitions", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    process.env = { ...ORIGINAL_ENV };
  });

  it("no API key configured → not_configured, sent=false, no network call", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result).toEqual({
      sent: false,
      status: "not_configured",
      reason: "no_api_key",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Resend 2xx with a message id → accepted, sent=true, providerMessageId captured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "re_abc123" }),
    }) as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result.sent).toBe(true);
    expect(result.status).toBe("accepted");
    expect(result.providerMessageId).toBe("re_abc123");
    expect(result.reason).toBeUndefined();
  });

  it("Resend 2xx with a non-JSON/unexpected body → still accepted, no crash, no providerMessageId", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    }) as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result.sent).toBe(true);
    expect(result.status).toBe("accepted");
    expect(result.providerMessageId).toBeUndefined();
  });

  it("Resend non-2xx → failed, sent=false, reason carries only the status code (no body/secret)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ message: "rate limited" }),
    }) as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result).toEqual({
      sent: false,
      status: "failed",
      reason: "status:429",
    });
  });

  it("network/fetch throw → failed, sent=false, reason=fetch_failed", async () => {
    process.env.RESEND_API_KEY = "test-key";
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("ECONNRESET")) as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result).toEqual({
      sent: false,
      status: "failed",
      reason: "fetch_failed",
    });
  });

  it("never includes the API key or a secret-bearing URL in the reason string", async () => {
    process.env.RESEND_API_KEY = "sk_live_super_secret_value";
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    const result = await sendInvitationEmail(setArgs());

    expect(result.reason).toBe("status:401");
    expect(result.reason).not.toContain("sk_live_super_secret_value");
  });

  it("sends the Authorization header as a Bearer token, never the key in the body/URL", async () => {
    process.env.RESEND_API_KEY = "sk_test_123";
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "re_1" }),
    });
    global.fetch = fetchSpy as unknown as typeof fetch;

    await sendInvitationEmail(setArgs());

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer sk_test_123");
    expect(url).not.toContain("sk_test_123");
  });
});
