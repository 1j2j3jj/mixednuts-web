import { describe, it, expect } from "vitest";
import { clientHasEcommerce, CLIENTS } from "@/config/clients";

describe("clientHasEcommerce (Phase D item 1)", () => {
  it("defaults to true when hasEcommerce is unset — existing NO_DATA_FOR_PERIOD behaviour is preserved", () => {
    expect(clientHasEcommerce({ hasEcommerce: undefined })).toBe(true);
  });

  it("is true when hasEcommerce is explicitly true", () => {
    expect(clientHasEcommerce({ hasEcommerce: true })).toBe(true);
  });

  it("is false only when hasEcommerce is explicitly false", () => {
    expect(clientHasEcommerce({ hasEcommerce: false })).toBe(false);
  });

  it("chakin is configured with hasEcommerce: false (life-insurance leads, not product sales)", () => {
    expect(CLIENTS.chakin.hasEcommerce).toBe(false);
    expect(clientHasEcommerce(CLIENTS.chakin)).toBe(false);
  });

  it("every other client keeps the default (products table still renders NO_DATA_FOR_PERIOD, not a permanent label)", () => {
    for (const id of ["hs", "dozo", "msec", "ogc", "ogp"] as const) {
      expect(clientHasEcommerce(CLIENTS[id])).toBe(true);
    }
  });
});
