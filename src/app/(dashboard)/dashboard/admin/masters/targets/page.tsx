import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchTargets, TARGET_COLUMNS } from "@/lib/masters";
import { rowsToCsv } from "@/lib/master-csv";
import { CsvUploader } from "../CsvUploader";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

export const dynamic = "force-dynamic";

/** Current month as 'YYYY-MM' (server tz; CEO edits month manually if needed). */
function currentYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Template pre-filled with every known client_id × the current month so the
 * CEO only fills numbers in (avoids mistyped client_id / year_month). Upsert is
 * keyed on (client_id, year_month), so this only touches the current month.
 */
function buildTemplateCsv(): string {
  const ym = currentYm();
  const header =
    "client_id,year_month,revenue_target,cv_target,ad_spend_budget,roas_target_pct,cpa_target,notes";
  const body = CLIENT_IDS.map((id) => `${id},${ym},,,,,,`).join("\n");
  return `${header}\n${body}\n`;
}

function fmt(v: number | null, type: "yen" | "int" | "pct"): string {
  if (v == null) return "—";
  if (type === "yen") return "¥" + Math.round(v).toLocaleString();
  if (type === "int") return Math.round(v).toLocaleString();
  return v.toFixed(1) + "%";
}

export default async function TargetsPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const rows = await fetchTargets();
  const currentCsv = rowsToCsv(TARGET_COLUMNS, rows);
  const templateCsv = buildTemplateCsv();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/dashboard/admin" className="underline hover:text-neutral-800">管理</Link>
          <span>/</span>
          <Link href="/dashboard/admin/masters" className="underline hover:text-neutral-800">マスタ管理</Link>
          <span>/</span>
          <span>月次目標</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">月次目標</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {rows.length} 行 / {CLIENT_IDS.length} クライアント
        </p>
      </div>

      <CsvUploader
        kind="targets"
        label="月次目標"
        templateName="targets"
        templateCsv={templateCsv}
        currentCsv={currentCsv}
      />

      <div className="rounded-md border border-neutral-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-600">
            <tr>
              <th className="p-2 text-left">client</th>
              <th className="p-2 text-left">year_month</th>
              <th className="p-2 text-right">revenue</th>
              <th className="p-2 text-right">cv</th>
              <th className="p-2 text-right">ad_budget</th>
              <th className="p-2 text-right">roas%</th>
              <th className="p-2 text-right">cpa</th>
              <th className="p-2 text-left">notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-neutral-400">データなし — CSV をアップロードしてください</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="p-2">{CLIENTS[r.client_id as keyof typeof CLIENTS]?.label ?? r.client_id}</td>
                <td className="p-2 font-mono text-xs">{r.year_month}</td>
                <td className="p-2 text-right">{fmt(r.revenue_target, "yen")}</td>
                <td className="p-2 text-right">{fmt(r.cv_target, "int")}</td>
                <td className="p-2 text-right">{fmt(r.ad_spend_budget, "yen")}</td>
                <td className="p-2 text-right">{fmt(r.roas_target_pct, "pct")}</td>
                <td className="p-2 text-right">{fmt(r.cpa_target, "yen")}</td>
                <td className="p-2 text-xs text-neutral-600">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
