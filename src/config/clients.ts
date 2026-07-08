/**
 * Client configuration registry — source of truth for tenant separation.
 *
 * URL strategy: every client-facing dashboard lives under /dashboard/[slug]
 * where `slug` is a short opaque string. Real client names never appear in
 * URLs or default UI chrome.
 *
 * Access control: middleware + assertUserCanAccessClientBySlug() in
 * src/lib/access.ts gate every page. Identity arrives via mn_session
 * cookie (set by either ID/PW form or the Better Auth → mn_session
 * bridge at /login/success) or by Basic Auth (legacy fallback).
 * notFound() (not 403) on deny, to avoid leaking which clients exist.
 */

export type ClientId = "hs" | "chakin" | "dozo" | "msec" | "ogc" | "ogp";

export interface DataSource {
  kind: "google_sheets";
  sheetId: string;
  rawAdsRange: string;
  masterRange?: string;
  /** ECCUBE daily aggregate sheet (shop-DB truth). Columns: 期間, 購入件数,
   *  性別内訳…, 購入合計, 購入平均. Used by src/lib/sources/eccube.ts.
   *  Omit for clients without an ECCUBE shop. */
  eccubeSheetId?: string;
  eccubeRange?: string;
}

/**
 * Monthly targets. Every field is nullable: null = 未設定（アップロードなし）で
 * UI は「—」を表示し達成率・ペース計算をスキップする。0 は「目標ゼロを設定した」
 * であり null と区別される。正本は BQ targets_long（self-upload）→ targets_monthly
 * （admin upload）。旧 計画 Sheet / 静的 config フォールバックは 2026-07-08 廃止。
 */
export interface MonthlyTargets {
  /** Revenue target in JPY for the current month. */
  revenue: number | null;
  /** Conversion count target. */
  conversions: number | null;
  /** Ad spend budget (cap). */
  adSpendBudget: number | null;
  /** Target blended ROAS as percentage (e.g. 300 = 300%). */
  roasPct: number | null;
  /** Target blended CPA in JPY (cost / CV incl. organic). */
  cpa: number | null;
}

export interface ClientConfig {
  id: ClientId;
  /** Opaque URL slug. Shared externally with the logged-in client. */
  slug: string;
  /** Full label. Shown only in the admin index and internal views. */
  label: string;
  subtitle: string;
  active: boolean;
  // アクセスの正本は 招待+org-role+Basic Auth。ドメイン許可リストは廃止(未使用dead config)
  dataSource: DataSource | null;
  /** GA4 property id (numeric string). Leave null to fall back to mock. */
  ga4PropertyId?: string | null;
  /** GSC site URL (including trailing slash for URL-prefix properties). */
  gscSiteUrl?: string | null;
  currency: "JPY";
}

export const INTERNAL_ADMIN_USER_IDS: string[] = [
  // Reserved for future per-user admin override list. Currently empty —
  // admin status is decided at sign-in time via env ADMIN_EMAILS (see
  // src/lib/role-resolver.ts).
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
    dataSource: {
      kind: "google_sheets",
      // 2026-04 switch — dedicated Google Ads ADG-grained export
      // (2024-10-01 → 2026-03-31 initial load; to be extended by recurring job).
      sheetId: "1BtOId6PtE6Qeq01jtytMKKinpGPtXVzx_Yrat_6YNlU",
      // 12 columns: 日 / 媒体 / CPN ID / CPN / ADG ID / ADG / 通貨 / 費用 /
      // imp / click / CV / CV値
      // 2026-04-23: switched from Sheet (Raw tab, CEO-managed CSV paste) to
      // API automation — `Google_AdGroup_Raw` is the Google Ads export target
      // (export_hs_adgroup_daily.py) and also receives Windsor appends for
      // Microsoft and meta. Yahoo rows land here once Yahoo JP connector is
      // stable. The old `Raw` tab is archived as `Raw_archive_20260423`.
      rawAdsRange: "Google_AdGroup_Raw!A:L",
      // ECCUBE daily aggregate (shop DB). Data currently starts 2026-04-01.
      // Columns: 期間 / 購入件数 / 男/女/不明 / 会員×性別… / 購入合計 / 購入平均
      eccubeSheetId: "13zRWRzw8AEmrGi_0ubpp6Dqc8D_MnZJrJ3CHfI5lMXU",
      eccubeRange: "シート1!A:K",
    },
    ga4PropertyId: "302745512",
    gscSiteUrl: "https://www.hansoku-style.jp/",
    currency: "JPY",
  },
  chakin: {
    id: "chakin",
    slug: "p3w1z5",
    label: "Chakin",
    subtitle: "住友生命保険相互会社",
    active: true,
    dataSource: {
      kind: "google_sheets",
      // Header-only sheet — dashboard renders "no data" / "pending" state
      // until export_chakin_adgroup_daily.py is created (awaiting CEO to
      // provide the Google Ads customer ID; FUSION/ラクスル operate the ads).
      sheetId: "1-BAW0ZfucnifZlZY7D12lqajQuUfxk31JPZrASESoN0",
      rawAdsRange: "Google_AdGroup_Raw!A:L",
      // NOTE: Chakin is lead-gen (申込), not e-commerce.
      // CV definition = "lead", not "purchase".
      // No GSC (gscSiteUrl: null). No ECCUBE — uses Graphene CRM (Phase 2).
    },
    ga4PropertyId: "263217673",
    gscSiteUrl: null, // GSC not provided by client
    currency: "JPY",
  },
  dozo: {
    id: "dozo",
    slug: "n6t0f4",
    label: "dōzo",
    subtitle: "株式会社大和",
    active: true,
    dataSource: {
      kind: "google_sheets",
      // Produced by scripts/integrations/google_ads/export_dozo_adgroup_daily.py
      // Google Ads ADG daily (2025-01-01 → rolling). 1,210 rows as of 2026-04-23.
      // Yahoo / Meta / Microsoft to be layered in later via Windsor.ai.
      sheetId: "1P__iGeogJ14z9mP8PV7bs9I3YOWlITpW965iZMRNjJQ",
      rawAdsRange: "Google_AdGroup_Raw!A:L",
      // No ECCUBE integration — Shopify-based sales source (Phase 2.5).
    },
    ga4PropertyId: "311951480",
    gscSiteUrl: "https://dozo-gift.com/",
    currency: "JPY",
  },
  msec: {
    id: "msec",
    slug: "a4m8r2",
    label: "MSEC",
    subtitle: "株式会社トレードワークス",
    active: true,
    dataSource: {
      kind: "google_sheets",
      // MSEC Google Ads ADG-grained export produced by
      // scripts/integrations/google_ads/export_msec_adgroup_daily.py
      // (2025-08-06 first spend date → rolling to today).
      sheetId: "1BiKvl6UwzdFEVSGuhYHtpP4Pn2TFQylTWInVPptL63E",
      rawAdsRange: "Google_AdGroup_Raw!A:L",
      // No ECCUBE integration for MSEC Phase 1 — tracked for Phase 2.
    },
    ga4PropertyId: "283300882",
    // ⚠ markless.jp is an sc-domain property; SA currently returns 403 because
    // it has not been added as a siteRestrictedUser. Until CEO adds
    // ai-agent@ai-agent-mixednuts.iam.gserviceaccount.com as "Restricted"
    // to the markless.jp Search Console property, this field will silently
    // fall back to mock data (see src/lib/sources/gsc.ts error handler).
    gscSiteUrl: "sc-domain:markless.jp",
    currency: "JPY",
  },
  ogc: {
    id: "ogc",
    slug: "c5h9j2",
    label: "OGC",
    subtitle: "株式会社トランス",
    active: true,
    dataSource: {
      kind: "google_sheets",
      // Produced by scripts/integrations/google_ads/export_ogc_adgroup_daily.py
      // Google Ads ADG daily (2024-10-01 → rolling). 4,972 rows as of 2026-04-22.
      // Yahoo / Microsoft / Meta to be layered in later via Windsor.ai.
      sheetId: "1M7kBdmfZjwWdBuhwEpjtazKk5sH-5Gx9dmNvwWHhg7k",
      rawAdsRange: "Google_AdGroup_Raw!A:L",
      // ECCUBE integration: Phase 2.5 — eccubeSheetId TBD
    },
    ga4PropertyId: "355191254",
    // URL-prefix property (trailing slash present) — SA has access.
    gscSiteUrl: "https://original-goods.com/",
    currency: "JPY",
  },
  ogp: {
    id: "ogp",
    slug: "g8f1b6",
    label: "OGP",
    subtitle: "株式会社トランス",
    active: true,
    dataSource: {
      kind: "google_sheets",
      // Produced by scripts/integrations/google_ads/export_ogp_adgroup_daily.py
      // Google Ads ADG daily (2024-10-01 → rolling). 5,011 rows as of 2026-04-22.
      // Yahoo / Microsoft / Meta to be layered in later via Windsor.ai.
      sheetId: "14UGdtURCkmL1FY-5zY7rcpIry4zpcPRyVEYQQHFmrZA",
      rawAdsRange: "Google_AdGroup_Raw!A:L",
    },
    ga4PropertyId: "302724388",
    gscSiteUrl: "https://originalgoods.press/",
    currency: "JPY",
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
