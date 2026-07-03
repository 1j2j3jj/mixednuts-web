import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getViewerOrgRole, canInviteMembers } from "@/lib/org-role";
import { fetchTargets } from "@/lib/masters";
import { CLIENT_TARGETS_HEADER } from "./targets-schema";
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

/** 当月起点 12 行・空欄のテンプレ（年月だけ埋める）。 */
function buildTemplateCsv(): string {
  const header = CLIENT_TARGETS_HEADER.join(",");
  const body = upcomingMonths(12)
    .map((ym) => `${ym},,,,,`)
    .join("\n");
  return `${header}\n${body}\n`;
}

/** 現状の目標行（このクライアントのみ）を 6 列 CSV 化。 */
function buildCurrentCsv(
  rows: Array<{
    year_month: string;
    revenue_target: number | null;
    cv_target: number | null;
    ad_spend_budget: number | null;
    roas_target_pct: number | null;
    cpa_target: number | null;
  }>,
): string {
  const header = CLIENT_TARGETS_HEADER.join(",");
  if (rows.length === 0) return `${header}\n`;
  const body = rows
    .map((r) =>
      [
        // year_month は 'YYYY-MM-01' → 'YYYY-MM' に縮約（テンプレと同形式）。
        r.year_month ? r.year_month.slice(0, 7) : "",
        r.revenue_target,
        r.cv_target,
        r.ad_spend_budget,
        r.roas_target_pct,
        r.cpa_target,
      ]
        .map(csvCell)
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function fmt(v: number | null, type: "yen" | "int" | "pct"): string {
  if (v == null) return "—";
  if (type === "yen") return "¥" + Math.round(v).toLocaleString();
  if (type === "int") return Math.round(v).toLocaleString();
  return v.toFixed(1) + "%";
}

export default async function TenantTargetsPage({ params }: PageProps) {
  const { slug } = await params;

  // 404 on no access.
  const client = await assertUserCanAccessClientBySlug(slug);

  // 編集者以上のみ入場（閲覧者はダッシュボードへ戻す）。
  const orgRole = await getViewerOrgRole(slug);
  if (!canInviteMembers(orgRole)) redirect(`/dashboard/${slug}`);

  // 現状の目標（このクライアントのみ）。BQ 未接続時は notFound で保護。
  let rows;
  try {
    rows = await fetchTargets(client.id);
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
          月次の売上・CV・広告予算などの目標を CSV でアップロードします。テンプレを
          ダウンロードして数値を埋め、プレビューで検証してから確定してください。
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
                <th className="p-2 text-left">年月</th>
                <th className="p-2 text-right">売上目標</th>
                <th className="p-2 text-right">CV目標</th>
                <th className="p-2 text-right">広告予算</th>
                <th className="p-2 text-right">目標ROAS</th>
                <th className="p-2 text-right">目標CPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-muted-foreground"
                  >
                    データなし — テンプレ CSV をダウンロードして目標を登録してください
                  </td>
                </tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-mono text-xs">
                    {r.year_month ? r.year_month.slice(0, 7) : "—"}
                  </td>
                  <td className="p-2 text-right">{fmt(r.revenue_target, "yen")}</td>
                  <td className="p-2 text-right">{fmt(r.cv_target, "int")}</td>
                  <td className="p-2 text-right">
                    {fmt(r.ad_spend_budget, "yen")}
                  </td>
                  <td className="p-2 text-right">
                    {fmt(r.roas_target_pct, "pct")}
                  </td>
                  <td className="p-2 text-right">{fmt(r.cpa_target, "yen")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
