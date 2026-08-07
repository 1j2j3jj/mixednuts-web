import { describe, expect, it } from "vitest";
import { normalizeChakinCvSource, readChakinCvSource } from "@/lib/chakin-cv-source";

describe("chakin cv source normalization", () => {
  it("accepts valid values", () => {
    expect(normalizeChakinCvSource("graphene")).toBe("graphene");
    expect(normalizeChakinCvSource("ga4")).toBe("ga4");
    expect(normalizeChakinCvSource("media")).toBe("media");
  });

  it("falls back to graphene for invalid query values", () => {
    expect(normalizeChakinCvSource("unknown")).toBe("graphene");
    expect(normalizeChakinCvSource("")).toBe("graphene");
    expect(normalizeChakinCvSource(null)).toBe("graphene");
    expect(readChakinCvSource({ cv: "broken" })).toBe("graphene");
  });
});
