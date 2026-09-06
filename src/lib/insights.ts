/**
 * Shared visibility rules for Insights posts.
 *
 * Two independent reasons a post must not appear in any public surface
 * (listing, tag pages + tag counts, article page, sitemap, RSS/llms.txt,
 * structured data): explicit `hidden: true`, or a scheduled `date` that is
 * still in the future relative to `now`.
 *
 * All Insights surfaces must filter through `isPublishedPost` /
 * `publishedPosts` instead of re-implementing `!post.hidden` inline, so a
 * new scheduled-publishing rule (or a future third rule) only needs to
 * change in one place.
 *
 * ## Timezone contract (2026-09 decision)
 *
 * Frontmatter `date` is a plain `YYYY-MM-DD` calendar date with no time or
 * offset (see `velite.config.ts`'s `s.isodate()` field and every existing
 * `content/insights/*.mdx` frontmatter). That date is authored and read by
 * a JST-based team (mixednuts is a Tokyo company; readers are JP-based), so
 * the only unambiguous interpretation is: **the post publishes at 00:00
 * JST on that calendar date** — not 00:00 UTC, and not "whenever the
 * server's local midnight happens to be" (Vercel build/serverless runtimes
 * run in UTC, so `new Date("2026-09-08")` naively parses as 2026-09-08
 * 00:00 UTC, which is already 2026-09-08 09:00 JST — nine hours *after*
 * the intended publish instant, not before it).
 *
 * JST is a fixed UTC+9 offset with no DST, so "00:00 JST on day D" is
 * always exactly "15:00 UTC on day D-1". `jstMidnightToUtcMs` computes
 * that instant directly from the Y/M/D components so it is correct
 * regardless of which timezone the process evaluating it happens to run
 * in.
 */

export type SchedulablePost = {
  hidden?: boolean;
  date: string;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * Parses a `YYYY-MM-DD[...]` date string as 00:00 JST on that calendar date
 * and returns the equivalent UTC epoch milliseconds.
 *
 * Only the leading `YYYY-MM-DD` component is used; any trailing time/offset
 * (e.g. if a date ever arrives as a full ISO datetime string) is ignored,
 * because the publishing contract is defined in terms of the JP calendar
 * date, not a literal timestamp.
 *
 * @returns epoch ms, or `NaN` if the string does not start with a
 *   `YYYY-MM-DD` date.
 */
export function jstMidnightToUtcMs(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // 00:00 JST on Y-M-D === 15:00 UTC on Y-M-(D-1). Date.UTC handles the
  // month/day rollover (e.g. day=1 -> previous month) correctly.
  return Date.UTC(year, month - 1, day, 0, 0, 0) - JST_OFFSET_MS;
}

/**
 * Returns true when a post should be visible to the public right now.
 *
 * @param post - any Velite Insights post (or subset with `hidden`/`date`)
 * @param now - injectable clock for tests; defaults to the real current time
 */
export function isPublishedPost(
  post: SchedulablePost,
  now: Date = new Date(),
): boolean {
  if (post.hidden) return false;
  const publishAtMs = jstMidnightToUtcMs(post.date);
  if (Number.isNaN(publishAtMs)) return true; // malformed date: fail open, don't hide silently
  return publishAtMs <= now.getTime();
}

/**
 * Filters a post list down to only what is currently publishable.
 * Preserves input order.
 */
export function publishedPosts<T extends SchedulablePost>(
  posts: T[],
  now: Date = new Date(),
): T[] {
  return posts.filter((post) => isPublishedPost(post, now));
}
