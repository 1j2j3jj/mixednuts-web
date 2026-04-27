/**
 * Flat list of all known client org slugs.
 *
 * This file is intentionally separate from clients.ts so the Edge
 * middleware can import just the slug list without pulling in the full
 * client config (which includes heavy imports like googleapis).
 *
 * Keep in sync with CLIENTS in src/config/clients.ts.
 * Generated from: Object.values(CLIENTS).map(c => c.slug)
 */
export const CLIENT_SLUGS: readonly string[] = [
  "x7k2q9", // hs    — 販促スタイル
  "p3w1z5", // chakin — 住友生命
  "n6t0f4", // dozo  — dōzo
  "a4m8r2", // msec  — MSEC
  "c5h9j2", // ogc   — OGC
  "g8f1b6", // ogp   — OGP
] as const;
