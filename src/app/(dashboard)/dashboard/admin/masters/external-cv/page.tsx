import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchExternalCv, EXTERNAL_CV_COLUMNS, CLIENTS_WITH_EXTERNAL_CV } from "@/lib/masters";
import { rowsToCsv } from "@/lib/master-csv";
import { CsvUploader } from "../CsvUploader";
import { CLIENTS, type ClientId } from "@/config/clients";

export const dynamic = "force-dynamic";

const TEMPLATE_CSV = `date,cv_source,media,campaign_id,conversions,conversions_value,notes
2026-04-15,phone,tv,tv-cm-spring,12,1200000,TV-CM経由電話
2026-04-15,store,offline,,5,580000,中目黒店ウォークイン
2026-04-20,offline_form,event,,8,640000,新宿フェア
`;

interface PageProps {
  searchParams: Promise<{ client?: string }>;
}

export default async function ExternalCvPage({ searchParams }: PageProps) {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const sp = await searchParams;
  const clientId = (sp.client && CLIENTS_WITH_EXTERNAL_CV.includes(sp.client as ClientId)
    ? sp.client
    : "hs") as ClientId;

  const rows = await fetchExternalCv(clientId);
  const currentCsv = rowsToCsv(EXTERNAL_CV_COLUMNS, rows);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/dashboard/admin" className="underline hover:text-neutral-800">管理</Link>
          <span>/</span>
          <Link href="/dashboard/admin/masters" className="underline hover:text-neutral-800">マスタ管理</Link>
          <span>/</span>
          <span>外部CV</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">外部CV</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {CLIENTS_WITH_EXTERNAL_CV.map((cid) => {
          const isActive = cid === clientId;
          return (
            <Link
              key={cid}
              href={`/dashboard/admin/masters/external-cv?client=${cid}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : "border border-neutral-300 bg-white hover:bg-neutral-50"
              }`}
            >
              {CLIENTS[cid].label}
            </Link>
          );
        })}
      </div>

      <p className="text-sm text-neutral-600">
        {CLIENTS[clientId].label}: {rows.length} 行
      </p>

      <CsvUploader
        kind="external_cv"
        clientId={clientId}
        label={`外部CV (${CLIENTS[clientId].label})`}
        templateName={`external-cv-${clientId}`}
        templateCsv={TEMPLATE_CSV}
        currentCsv={currentCsv}
      />

      <div className="rounded-md border border-neutral-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-600">
            <tr>
              <th className="p-2 text-left">date</th>
              <th className="p-2 text-left">cv_source</th>
              <th className="p-2 text-left">media</th>
              <th className="p-2 text-left">campaign_id</th>
              <th className="p-2 text-right">CV</th>
              <th className="p-2 text-right">CV value</th>
              <th className="p-2 text-left">notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-neutral-400">データなし</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="p-2 font-mono text-xs">{r.date}</td>
                <td className="p-2">{r.cv_source}</td>
                <td className="p-2 text-xs text-neutral-600">{r.media ?? "—"}</td>
                <td className="p-2 font-mono text-xs">{r.campaign_id ?? "—"}</td>
                <td className="p-2 text-right">{r.conversions.toLocaleString()}</td>
                <td className="p-2 text-right">
                  {r.conversions_value != null ? "¥" + Math.round(r.conversions_value).toLocaleString() : "—"}
                </td>
                <td className="p-2 text-xs text-neutral-600">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
