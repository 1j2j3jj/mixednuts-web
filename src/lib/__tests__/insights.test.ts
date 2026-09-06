import { describe, it, expect } from "vitest";
import {
  isPublishedPost,
  publishedPosts,
  jstMidnightToUtcMs,
} from "@/lib/insights";

describe("jstMidnightToUtcMs", () => {
  it("converts 00:00 JST on a calendar date to 15:00 UTC the previous day", () => {
    // 2026-09-08 00:00 JST === 2026-09-07 15:00 UTC (JST is fixed UTC+9, no DST)
    expect(jstMidnightToUtcMs("2026-09-08")).toBe(
      Date.UTC(2026, 8, 7, 15, 0, 0),
    );
  });

  it("handles month rollover (day 1 -> previous month's last day at 15:00 UTC)", () => {
    // 2026-10-01 00:00 JST === 2026-09-30 15:00 UTC
    expect(jstMidnightToUtcMs("2026-10-01")).toBe(
      Date.UTC(2026, 8, 30, 15, 0, 0),
    );
  });

  it("ignores a trailing time/offset component and uses only Y-M-D", () => {
    expect(jstMidnightToUtcMs("2026-09-08T00:00:00.000Z")).toBe(
      jstMidnightToUtcMs("2026-09-08"),
    );
  });

  it("returns NaN for a malformed date string", () => {
    expect(Number.isNaN(jstMidnightToUtcMs("not-a-date"))).toBe(true);
    expect(Number.isNaN(jstMidnightToUtcMs(""))).toBe(true);
  });
});

describe("isPublishedPost", () => {
  it("hides a post with hidden: true regardless of date", () => {
    const post = { hidden: true, date: "2020-01-01" };
    expect(isPublishedPost(post, new Date("2030-01-01T00:00:00.000Z"))).toBe(
      false,
    );
  });

  it("is visible once `now` is exactly at the JST-midnight publish instant", () => {
    const post = { date: "2026-09-08" };
    const publishInstant = new Date(Date.UTC(2026, 8, 7, 15, 0, 0));
    expect(isPublishedPost(post, publishInstant)).toBe(true);
  });

  it("is still hidden one millisecond before the JST-midnight publish instant", () => {
    const post = { date: "2026-09-08" };
    const oneMsBefore = new Date(Date.UTC(2026, 8, 7, 14, 59, 59, 999));
    expect(isPublishedPost(post, oneMsBefore)).toBe(false);
  });

  it("timezone edge: a UTC-only reading of the date would wrongly show the post 9h early", () => {
    // If we (incorrectly) compared `now` against UTC midnight of the date
    // string, 2026-09-07T16:00:00Z (which is 2026-09-08 01:00 JST, i.e.
    // already published) would look unpublished because it's before
    // 2026-09-08T00:00:00Z. The JST-aware helper must treat it as published.
    const post = { date: "2026-09-08" };
    const jstOneAmOnPublishDay = new Date(Date.UTC(2026, 8, 7, 16, 0, 0));
    expect(isPublishedPost(post, jstOneAmOnPublishDay)).toBe(true);
  });

  it("hides a post whose publish date is still in the future", () => {
    const post = { date: "2026-09-15" };
    const beforePublish = new Date(Date.UTC(2026, 8, 10, 0, 0, 0));
    expect(isPublishedPost(post, beforePublish)).toBe(false);
  });

  it("fails open (visible) for a malformed date rather than silently hiding it", () => {
    const post = { date: "not-a-date" };
    expect(isPublishedPost(post, new Date())).toBe(true);
  });
});

describe("publishedPosts", () => {
  const now = new Date(Date.UTC(2026, 8, 10, 0, 0, 0)); // 2026-09-10 09:00 JST

  it("filters out hidden and future-dated posts while preserving order", () => {
    const posts = [
      { slug: "past", hidden: false, date: "2026-09-01" },
      { slug: "hidden-past", hidden: true, date: "2026-09-01" },
      { slug: "future", hidden: false, date: "2026-09-15" },
      { slug: "today", hidden: false, date: "2026-09-10" },
    ];
    expect(publishedPosts(posts, now).map((p) => p.slug)).toEqual([
      "past",
      "today",
    ]);
  });

  it("defaults `now` to the real current time when not provided", () => {
    const posts = [{ slug: "long-past", hidden: false, date: "2020-01-01" }];
    expect(publishedPosts(posts).map((p) => p.slug)).toEqual(["long-past"]);
  });
});
