/**
 * Client configuration registry — source of truth for tenant separation.
 *
 * Access control model:
 *   - Every /dashboard/[clientId] page calls `assertUserCanAccessClient(clientId)`
 *     in its layout/page.
 *   - That helper checks the authenticated Clerk user against `allowedUserIds`
 *     and `allowedEmailDomains` on the client record.
 *   - 404 (not "forbidden") is returned on mismatch to avoid leaking which
 *     clients exist. Internal mixednuts admins (INTERNAL_ADMIN_USER_IDS) see
 *     everything.
 *
 * Adding a new client is a 3-step process:
 *   1) Add an entry here with `active: false`.
 *   2) Wire the data source (Google Sheet / DB / API).
 *   3) Flip `active: true` once the dashboard page renders real data.
 */

export type ClientId = "hs" | "msec" | "chakin" | "dozo";

export interface DataSource {
  /** Kind of source — extend as Phase 2 adds GA4/GSC/Ads API. */
  kind: "google_sheets";
  /** Google Sheets fileId. */
  sheetId: string;
  /** A1 notation for the raw ads tab (e.g. "HS_Raw_Ads!A:K"). */
  rawAdsRange: string;
  /** A1 notation for the master tab (campaign / adgroup metadata). */
  masterRange?: string;
}

export interface ClientConfig {
  id: ClientId;
  /** Display name shown in sidebar, page title, etc. */
  label: string;
  /** Short subtitle (e.g. parent company, domain). */
  subtitle: string;
  /** When false, the dashboard route renders a "Coming soon" placeholder. */
  active: boolean;
  /**
   * Phase 1: gate access by exact Clerk user ID (`user_xxxxx`).
   * Phase 2: switch to organisation/role claims once Clerk Org is provisioned.
   */
  allowedUserIds: string[];
  /** Optional: auto-grant access to any user whose primary email matches. */
  allowedEmailDomains: string[];
  dataSource: DataSource | null;
  /** Currency for display formatting. MVP = JPY only. */
  currency: "JPY";
}

/**
 * Internal mixednuts admins — can see every client regardless of
 * `allowedUserIds`. Populate via Clerk dashboard once users exist.
 */
export const INTERNAL_ADMIN_USER_IDS: string[] = [
  // e.g. "user_2abcDEF..." (Nozomi / Ishii)
];

/**
 * Client registry. HS is the Phase 1 MVP; others are placeholders
 * intentionally kept visible in the sidebar so the horizontal-expansion
 * story is legible to anyone viewing the dashboard.
 */
export const CLIENTS: Record<ClientId, ClientConfig> = {
  hs: {
    id: "hs",
    label: "販促スタイル",
    subtitle: "株式会社トランス",
    active: true,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: {
      kind: "google_sheets",
      // Daily Report 統合 sheet. CEO is preparing a dedicated master sheet;
      // the id here may be replaced when that is ready.
      sheetId: "1b2Z_3-IrcOvyKn9diRANdSt42cHY_uuxvb3kbVitziE",
      rawAdsRange: "HS_Raw_Ads!A:K",
      // masterRange: "HS_Master!A:Z" — TBD by CEO
    },
    currency: "JPY",
  },
  msec: {
    id: "msec",
    label: "MSEC",
    subtitle: "トレードワークス",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
  },
  chakin: {
    id: "chakin",
    label: "Chakin",
    subtitle: "住友生命",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
  },
  dozo: {
    id: "dozo",
    label: "dōzo",
    subtitle: "ソーシャルギフト",
    active: false,
    allowedUserIds: [],
    allowedEmailDomains: ["mixednuts-inc.com"],
    dataSource: null,
    currency: "JPY",
  },
};

export const CLIENT_IDS = Object.keys(CLIENTS) as ClientId[];

export function getClient(id: string): ClientConfig | null {
  if (id in CLIENTS) return CLIENTS[id as ClientId];
  return null;
}
