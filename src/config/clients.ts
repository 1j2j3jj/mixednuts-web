/**
 * Client configuration registry — source of truth for tenant separation.
 *
 * URL strategy: every client-facing dashboard lives under /dashboard/[slug]
 * where `slug` is a short opaque string. Real client names never appear in
 * URLs or default UI chrome.
 *
 * Access control: `assertUserCanAccessClient(clientId)` in each page checks
 * the authenticated Clerk user against `allowedUserIds` / `allowedEmailDomains`.
 * 404 (not 403) on deny, to avoid leaking which clients exist. Admin users
 * (INTERNAL_ADMIN_USER_IDS) bypass per-client allow lists.
 */

export type ClientId = "hs" | "chakin" | "dozo" | "msec" | "ogc" | "ogp";

export interface DataSource {
  kind: "google_sheets";
  sheetId: string;
  rawAdsRange: string;
  masterRange?: string;
  /** Optional: separate sheet id for targets. When omitted, falls back to
   *  `sheetId`. Useful when the CEO maintains a dedicated 計画 spreadsheet. */
  targetsSheetId?: string;
  /** Range for the monthly targets / budget tab (matrix format — see
   *  src/lib/sources/target.ts). Optional; falls back to static config. */
  targetsRange?: string;
  /** ECCUBE daily aggregate sheet (shop-DB truth). Columns: 期間, 購入件数,
   *  性別内訳…, 購入合計, 購入平均. Used by src/lib/sources/eccube.ts.
   *  Omit for clients without an ECCUBE shop. */
  eccubeSheetId?: string;
  eccubeRange?: string;
}

export interface MonthlyTargets {
  /** Revenue target in JPY for the current month. */
  revenue: number;
  /** Conversion count target. */
  conversions: number;
  /** Ad spend budget (cap). */
  adSpendBudget: number;
  /** Target blended ROAS as percentage (e.g. 300 = 300%). */
  roasPct: number;
  /** Target blended CPA in JPY (cost / CV incl. organic). */
  cpa: number;
}

export interface ClientConfig {
  id: ClientId;
  /** Opaque URL slug. Shared externally with the logged-in client. */
  slug: string;
  /** Full label. Shown only in the admin index and internal views. */
  label: string;
  subtitle: string;
  active: boolean;
  allowedUserIds: string[];
  allowedEmailDomains: string[];
  dataSource: DataSource | null;
  /** GA4 property id (numeric string). Leave null to fall back to mock. */
  ga4PropertyId?: string | null;
  /** GSC site URL (including trailing slash for URL-prefix properties). */
  gscSiteUrl?: string | null;
  currency: "JPY";
  monthlyTargets: MonthlyTargets;
}

export const INTERNAL_ADMIN_USER_IDS: string[] = [
  // e.g. "user_2abcDEF..." (Nozomi / Ishii). Populate once Clerk is live.
];

/**
 * Client registry. Slugs are deliberately unguessable; regenerate with
 * `openssl rand -hex 3` or similar if they need to be rotated. Inactive
 * clients are kept visible in the admin index to signal roadmap, but are
 * not reachable by slug until `active: true`.
 */
/**
 * Rollout order (confirmed 2026-04-22):
 *   1. hs      — 販促スタイル (live)
 *   2. chakin  — 住友生命 Chakin (next)
 *   3. dozo    — dōzo ソーシャルギフト (next)
 *   4. msec    — トレードワークス (後続)
 *   5. ogc     — Trans OGC サイト (後続)
 *   6. ogp     — Trans OGP サイト (後続)
 */
export const CLIENTS: Record<ClientId, ClientConfig> = {
  hs: {
    id: "hs",
    slug: "x7k2q9",
    label: "販促スタイル",
    subtitle: "株式会社トランス",
    active: true,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: {
      kind: "google_sheets",
      // 2026-04 switch — dedicated Google Ads ADG-grained export
      // (2024-10-01 → 2026-03-31 initial load; to be extended by recurring job).
      sheetId: "1BtOId6PtE6Qeq01jtytMKKinpGPtXVzx_Yrat_6YNlU",
      // 12 columns: 日 / 媒体 / CPN ID / CPN / ADG ID / ADG / 通貨 / 費用 /
      // imp / click / CV / CV値
      // Tab renamed from シート1 → Raw on 2026-04-22 after merging all
      // media (Google / Microsoft / Yahoo / meta) into a single raw feed.
      rawAdsRange: "Raw!A:L",
      // Targets live in a separate "HS_計画" spreadsheet maintained by the
      // CEO. Matrix layout (metric × channel × month) — parsed and pivoted
      // by src/lib/sources/target.ts.
      targetsSheetId: "11lOnn4vRPL3QA7GK9hbh-xtCtL6eXI4Cv4RetwIARic",
      targetsRange: "シート1!A:AA",
      // ECCUBE daily aggregate (shop DB). Data currently starts 2026-04-01.
      // Columns: 期間 / 購入件数 / 男/女/不明 / 会員×性別… / 購入合計 / 購入平均
      eccubeSheetId: "13zRWRzw8AEmrGi_0ubpp6Dqc8D_MnZJrJ3CHfI5lMXU",
      eccubeRange: "シート1!A:K",
    },
    ga4PropertyId: "302745512",
    gscSiteUrl: "https://www.hansoku-style.jp/",
    currency: "JPY",
    monthlyTargets: {
      revenue: 250_000_000,
      conversions: 1_200,
      adSpendBudget: 18_000_000,
      roasPct: 1_300,
      cpa: 15_000,
    },
  },
  chakin: {
    id: "chakin",
    slug: "p3w1z5",
    label: "Chakin",
    subtitle: "住友生命",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
    monthlyTargets: { revenue: 0, conversions: 0, adSpendBudget: 0, roasPct: 0, cpa: 0 },
  },
  dozo: {
    id: "dozo",
    slug: "n6t0f4",
    label: "dōzo",
    subtitle: "ソーシャルギフト",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
    monthlyTargets: { revenue: 0, conversions: 0, adSpendBudget: 0, roasPct: 0, cpa: 0 },
  },
  msec: {
    id: "msec",
    slug: "a4m8r2",
    label: "MSEC",
    subtitle: "トレードワークス",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
    monthlyTargets: { revenue: 0, conversions: 0, adSpendBudget: 0, roasPct: 0, cpa: 0 },
  },
  ogc: {
    id: "ogc",
    slug: "c5h9j2",
    label: "OGC",
    subtitle: "オリジナル&ギフト事業",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
    monthlyTargets: { revenue: 0, conversions: 0, adSpendBudget: 0, roasPct: 0, cpa: 0 },
  },
  ogp: {
    id: "ogp",
    slug: "g8f1b6",
    label: "OGP",
    subtitle: "販促プロ事業",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
    monthlyTargets: { revenue: 0, conversions: 0, adSpendBudget: 0, roasPct: 0, cpa: 0 },
  },
};

export const CLIENT_IDS = Object.keys(CLIENTS) as ClientId[];

export function getClient(id: string): ClientConfig | null {
  if (id in CLIENTS) return CLIENTS[id as ClientId];
  return null;
}

/** Resolve slug → ClientConfig. O(n) but n is tiny. */
export function getClientBySlug(slug: string): ClientConfig | null {
  for (const id of CLIENT_IDS) {
    if (CLIENTS[id].slug === slug) return CLIENTS[id];
  }
  return null;
}
