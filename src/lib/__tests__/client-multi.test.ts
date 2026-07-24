import { describe, expect, it } from "vitest";
import { resolveClientMultiSwitchRedirect } from "@/lib/client-multi";

describe("resolveClientMultiSwitchRedirect", () => {
  it("redirects to /dashboard/select when session is missing", () => {
    expect(resolveClientMultiSwitchRedirect(null, "x7k2q9")).toBe("/dashboard/select");
  });

  it("redirects to /dashboard/select for non-multi sessions", () => {
    expect(
      resolveClientMultiSwitchRedirect(
        { kind: "client", clientId: "hs", slug: "x7k2q9" },
        "g8f1b6",
      ),
    ).toBe("/dashboard/select");
  });

  it("redirects to target slug when it is in availableSlugs", () => {
    expect(
      resolveClientMultiSwitchRedirect(
        {
          kind: "client-multi",
          currentSlug: "x7k2q9",
          availableSlugs: ["x7k2q9", "c5h9j2", "g8f1b6"],
          email: "agency@example.com",
        },
        "g8f1b6",
      ),
    ).toBe("/dashboard/g8f1b6");
  });

  it("never falls back to currentSlug when target is not allowed", () => {
    expect(
      resolveClientMultiSwitchRedirect(
        {
          kind: "client-multi",
          currentSlug: "x7k2q9",
          availableSlugs: ["x7k2q9", "c5h9j2", "g8f1b6"],
        },
        "not-allowed",
      ),
    ).toBe("/dashboard/select");
  });
});
