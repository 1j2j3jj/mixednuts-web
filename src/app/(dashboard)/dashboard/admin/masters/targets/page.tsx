import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchTargets, TARGET_COLUMNS } from "@/lib/masters";
import { rowsToCsv } from "@/lib/master-csv";
import { CsvUploader } from "../CsvUploader";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";

export const dynamic = "force-dynamic";

const TEMPLATE_CSV = `client_id,year_month,revenue_target,cv_target,ad_spend_budget,roas_target_pct,cpa_target,notes
hs,2026-04-01,80000000,800,12000000,300,15000,GW施策込み
hs,2026-05-01,75000000,750,11000000,300,14700,
dozo,2026-04-01,18000000,180,3000000,250,16700,母の日
ogc,2026-04-01,15000000,150,2000000,250,13000,
ogp,2026-04-01,16000000,160,2500000,250,15600,
`;

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
        templateCsv={TEMPLATE_CSV}
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
