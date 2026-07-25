/**
 * Shared absence vocabulary (Phase D, survey: `WORKTREE` task notes /
 * proposedVocabulary). A client-facing dashboard slot (KPI value, chart
 * body, table body) that cannot show a real number must resolve to exactly
 * ONE of a small closed set of reasons — never let the caller re-derive
 * "is this absent" from a number happening to equal zero after the fact.
 *
 * Five states in total, but only four carry copy here:
 *   1. NO_DATA_FOR_PERIOD — real source, zero rows for the selected range.
 *   2. MEASURED_ZERO      — a real, present value of 0. Rendered UNCHANGED
 *                           by the existing formatters (fmtInt/fmtJpy/...);
 *                           this module is never invoked for that case.
 *   3. SOURCE_UNAVAILABLE — split into "permission" / "fetch_failed",
 *                           reusing `FetchWarnReason` from fetch-warnings.ts
 *                           (the one place this distinction already existed,
 *                           on the report tab) rather than inventing a
 *                           second taxonomy.
 *   4. NOT_CONFIGURED     — permanent, business-model absence (no GSC
 *                           property, no GA4 property, no overall-CV
 *                           source). Deliberately NOT alarming — no
 *                           amber/warning treatment.
 *   5. NO_PERMISSION      — viewer role on an editor-only surface. Handled
 *                           by `permissionCopy` below, separately, since it
 *                           is a navigation state rather than a data state.
 *
 * Pure module (no server-only, no React) so both server components and
 * vitest can use it directly.
 */

import type { FetchWarnReason } from "@/lib/fetch-warnings";

/** The reasons a data-bearing slot can be absent for. Deliberately closed —
 *  add a new copy branch here rather than inventing an ad-hoc string at a
 *  call site. */
export type AbsenceReason =
  FetchWarnReason | "not_configured" | "no_data_period";

export interface AbsenceCopy {
  /** Short, bold headline for the slot. */
  title: string;
  /** One or two sentences of explanation / next step. */
  body: string;
  /** "warning" = amber treatment (something is actually wrong, an admin or
   *  retry can fix it). "neutral" = expected/permanent state, no alarm. */
  tone: "warning" | "neutral";
}

/** Renders `absenceCopy("no_data_period")`'s body with a concrete next step
 *  when the caller can supply one — a real date the client can act on beats
 *  a vague "try another period" (A-21 ledger note). */
export interface NoDataPeriodDetail {
  /** Human label of the period that had no rows, e.g. "2019-01-01〜01-07". */
  periodLabel?: string;
  /** Earliest date this client's data is actually known to start, if known. */
  sinceDate?: string;
}

/** Optional free-text elaboration for `not_configured` — e.g. "この
 *  クライアントは自社ECを持たないため対象外" — appended after the generic
 *  sentence. Keep it a single factual clause, not new vocabulary. */
export type NotConfiguredDetail = string;

/**
 * Resolve the copy for a given reason. `permission`/`fetch_failed` copy is
 * copied verbatim from the report tab's existing 3-way branch
 * (report/page.tsx) — that copy has already been reviewed, reuse it rather
 * than writing a second version that could drift.
 */
export function absenceCopy(
  reason: AbsenceReason,
  detail?: NoDataPeriodDetail | NotConfiguredDetail,
): AbsenceCopy {
  switch (reason) {
    case "permission":
      return {
        title: "データにアクセスできません（権限エラー）",
        body: "データ基盤への権限が不足しているため取得できませんでした。期間を変更しても解消しません。管理者に連絡してください。",
        tone: "warning",
      };
    case "fetch_failed":
      return {
        title: "データの取得に失敗しました",
        body: "一時的なエラーでデータを取得できませんでした（表示されている他の数値は古いキャッシュの可能性があります）。時間をおいて再読み込みするか、右上の「更新」を実行してください。解消しない場合は管理者に連絡してください。",
        tone: "warning",
      };
    case "not_configured": {
      const extra = typeof detail === "string" && detail ? `${detail}` : null;
      return {
        title: "このクライアントでは未設定です",
        body: extra
          ? `${extra}のため、このデータは対象外です。`
          : "このデータソースは連携設定がされていないため、恒常的に表示できません。",
        tone: "neutral",
      };
    }
    case "no_data_period":
    default: {
      const d = detail && typeof detail === "object" ? detail : undefined;
      const since = d?.sinceDate
        ? `データ集計期間: ${d.sinceDate}〜。選択期間を変更してください。`
        : "上部の「期間」を広げるか別の期間に変更してください。データ連携直後は反映まで時間がかかる場合があります。";
      return {
        title: d?.periodLabel
          ? `この期間（${d.periodLabel}）はデータがありません`
          : "この期間はデータがありません",
        body: since,
        tone: "neutral",
      };
    }
  }
}

/**
 * Precedence rule for which state applies (mirrors report/page.tsx's
 * existing branch order, generalized): permission -> configuration ->
 * connection/fetch -> row-count -> real value. Callers that already have a
 * `warnings: string[]` (bq-raw/bq-rpt style) or a `reason` field on a
 * Ga4Result-style envelope pass it straight through; this helper exists so
 * the ordering itself lives in one place instead of being re-decided ad hoc
 * per component.
 */
export function resolveAbsence(input: {
  /** true when this client has no source configured at all (no
   *  ga4PropertyId / gscSiteUrl / equivalent). */
  notConfigured?: boolean;
  /** machine-readable reason already classified upstream (permission /
   *  fetch_failed), if the fetch threw. */
  fetchReason?: FetchWarnReason;
  /** row count actually returned for the selected period/query. */
  rowCount: number;
}): AbsenceReason | null {
  if (input.notConfigured) return "not_configured";
  if (input.fetchReason) return input.fetchReason;
  if (input.rowCount === 0) return "no_data_period";
  return null;
}

/** Copy for the NO_PERMISSION (state 5) navigation case — a viewer role
 *  hitting an editor-only surface. Separate from `absenceCopy` because it
 *  describes a navigation outcome, not a data slot. */
export function permissionDeniedCopy(
  surface: "targets" | "members",
): AbsenceCopy {
  const label = surface === "targets" ? "目標設定" : "メンバー管理";
  return {
    title: "この操作には編集者権限が必要です",
    body: `${label}ページは閲覧者（メンバー）権限では利用できません。編集者権限が必要な場合は管理者にご連絡ください。`,
    tone: "neutral",
  };
}
