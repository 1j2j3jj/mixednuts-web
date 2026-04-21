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

export type ClientId = "hs" | "msec" | "chakin" | "dozo";

export interface DataSource {
  kind: "google_sheets";
  sheetId: string;
  rawAdsRange: string;
  masterRange?: string;
  /** Range for the monthly targets / budget tab. Optional — when absent
   *  the dashboard falls back to ClientConfig.monthlyTargets (static). */
  targetsRange?: string;
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
      rawAdsRange: "シート1!A:L",
      // Populated by CEO on a new tab named `目標` — see lib/sources/target.ts.
      targetsRange: "目標!A:F",
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
