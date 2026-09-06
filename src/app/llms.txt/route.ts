import { posts } from "#site/content";
import { buildLlmsTxt } from "@/lib/llms-txt";

/**
 * /llms.txt — generated from the Velite `posts` collection so the Insights
 * list follows scheduled publishing (`isPublishedPost`, 00:00 JST on `date`)
 * without a deploy. Replaces the former hand-written `public/llms.txt`.
 *
 * `revalidate = 3600` matches `sitemap.ts` / `insights/[slug]` ISR: a post
 * whose `date` has arrived appears here within an hour. The build prerenders
 * this route to `.next/server/app/llms.txt.body`, which
 * `scripts/seo-postbuild-check.mjs` #10 reads.
 */
export const revalidate = 3600;

export function GET() {
  return new Response(buildLlmsTxt(posts), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
