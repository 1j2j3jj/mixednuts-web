import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getViewerOrgRole, canInviteMembers } from "@/lib/org-role";
import { fetchClientTargetsLong, type TargetLongRow } from "@/lib/masters";
import {
  CLIENT_TARGETS_HEADER,
  RECOMMENDED_METRICS,
  TOTAL_CHANNEL,
} from "./targets-schema";
import TargetsClient from "./TargetsClient";

/**
 * /{org-slug}/settings/targets  (served as /dashboard/{slug}/settings/targets)
 *
 * クライアント自己アップロード（月次目標）。モデルB（2026-07-03）:
 * - 運営 / 編集者: 入場可。テンプレ DL / 現状 DL / アップロード→プレビュー→確定。
 * - 閲覧者(member): タブ非表示 + 直URLはダッシュボードへリダイレクト。
 *   サーバ側の書込拒否は actions.ts（assertCanEditTargets）が強制。
 *
 * 表示・投入とも自社 client_id に限定（他クライアントの目標は見えず書けない）。
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** 当月起点の 'YYYY-MM' を n 件（当月, 翌月, …）。 */
function upcomingMonths(count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1 + i;
    const yy = y + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    out.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return out;
}

/** CSV 用のセルエスケープ（RFC 4180）。 */
function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * long テンプレ（指標,チャネル,年月,値）。推奨 4 指標 × '全体' チャネル ×
 * 当月起点 12 か月ぶんの空欄行を用意（値だけ埋めてもらう）。チャネル別に分けたい
 * 場合は '全体' を organic / direct / 広告 等へ書き換えれば行を増やせる。
 */
function buildTemplateCsv(): string {
  const header = CLIENT_TARGETS_HEADER.join(",");
  const months = upcomingMonths(12);
  const lines: string[] = [];
  for (const metric of RECOMMENDED_METRICS) {
    for (const ym of months) {
      lines.push([metric, TOTAL_CHANNEL, ym, ""].map(csvCell).join(","));
    }
  }
  return `${header}\n${lines.join("\n")}\n`;
}

/** 現状の目標行（このクライアントのみ）を long 4 列 CSV 化。 */
function buildCurrentCsv(rows: TargetLongRow[]): string {
  const header = CLIENT_TARGETS_HEADER.join(",");
  if (rows.length === 0) return `${header}\n`;
  const body = rows
    .map((r) =>
      [
        r.metric,
        r.channel,
        // year_month は 'YYYY-MM-01' → 'YYYY-MM' に縮約（テンプレと同形式）。
        r.year_month ? r.year_month.slice(0, 7) : "",
        r.value,
      ]
        .map(csvCell)
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function fmtNum(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v).toLocaleString();
}

export default async function TenantTargetsPage({ params }: PageProps) {
  const { slug } = await params;

  // 404 on no access.
  const client = await assertUserCanAccessClientBySlug(slug);

  // 編集者以上のみ入場（閲覧者はダッシュボードへ戻す）。
  const orgRole = await getViewerOrgRole(slug);
  if (!canInviteMembers(orgRole)) redirect(`/dashboard/${slug}`);

  // 現状の目標（このクライアントのみ・long 形式）。BQ 未接続時は notFound で保護。
  let rows: TargetLongRow[];
  try {
    rows = await fetchClientTargetsLong(client.id);
  } catch {
    notFound();
  }

  const templateCsv = buildTemplateCsv();
  const currentCsv = buildCurrentCsv(rows);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="text-xs text-muted-foreground">
          <Link
            href={`/dashboard/${slug}`}
            className="underline hover:text-foreground"
          >
            {client.label}
          </Link>
          {" / "}
          <span>設定</span>
          {" / "}
          <span>目標設定</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">目標設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          月次の目標を long 形式（指標・チャネル・年月・値）の CSV でアップロードします。
          テンプレをダウンロードして数値を埋め、プレビューで検証してから確定してください。
          指標は セッション / 受注件数 / 受注金額 / 広告費用、チャネルは organic / direct /
          mail / referral / 広告、全体集計は「全体」を使います。
        </p>
      </div>

      <TargetsClient slug={slug} templateCsv={templateCsv} currentCsv={currentCsv} />

      {/* 現状表示（このクライアントのみ） */}
      <div className="rounded-md border bg-card">
        <div className="border-b px-4 py-2 text-sm font-medium">
          現在の目標（{rows.length} 件）
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">指標</th>
                <th className="p-2 text-left">チャネル</th>
                <th className="p-2 text-left">年月</th>
                <th className="p-2 text-right">値</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-muted-foreground"
                  >
                    データなし — テンプレ CSV をダウンロードして目標を登録してください
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.metric}</td>
                  <td className="p-2">{r.channel}</td>
                  <td className="p-2 font-mono text-xs">
                    {r.year_month ? r.year_month.slice(0, 7) : "—"}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {fmtNum(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
