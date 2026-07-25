import { describe, it, expect } from "vitest";
import { clientHasTargets, CLIENTS } from "@/config/clients";

describe("clientHasTargets (C3-f / A-18 follow-up)", () => {
  it("defaults to true when hasTargets is unset — existing empty-state behaviour is preserved", () => {
    expect(clientHasTargets({ hasTargets: undefined })).toBe(true);
  });

  it("is true when hasTargets is explicitly true", () => {
    expect(clientHasTargets({ hasTargets: true })).toBe(true);
  });

  it("is false only when hasTargets is explicitly false", () => {
    expect(clientHasTargets({ hasTargets: false })).toBe(false);
  });

  it("MSEC is configured with hasTargets: false (no target-setting workflow)", () => {
    expect(CLIENTS.msec.hasTargets).toBe(false);
    expect(clientHasTargets(CLIENTS.msec)).toBe(false);
  });

  it("every other client keeps the default (goal section still renders for them)", () => {
    for (const id of ["hs", "chakin", "dozo", "ogc", "ogp"] as const) {
      expect(clientHasTargets(CLIENTS[id])).toBe(true);
    }
  });
});
