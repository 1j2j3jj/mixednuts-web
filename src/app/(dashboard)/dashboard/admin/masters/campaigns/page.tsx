import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchCampaignMaster, CAMPAIGN_MASTER_COLUMNS } from "@/lib/masters";
import { rowsToCsv } from "@/lib/master-csv";
import { CsvUploader } from "../CsvUploader";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";

export const dynamic = "force-dynamic";

const TEMPLATE_CSV = `media,platform_campaign_id,platform_adgroup_id,platform_ad_id,utm_source,utm_medium,utm_campaign,utm_content,utm_term,campaign_type,active_from,active_to,notes
meta,120210xxx,,,facebook,cpc,spring2026,,,digital,2026-03-01,,CPN レベル
meta,120210yyy,123abc,,facebook,cpc,gw2026,carousel_a,,digital,2026-04-25,,ADG レベル
microsoft,518730332,,,bing,cpc,brand_2026,,,digital,2026-01-01,,
yahoo,7338xxx,,,yahoo,cpc,awareness_2026q2,,,digital,2026-04-01,,
tv,tv-cm-spring,,,tv,offline,tvspring2026,,,broadcast,2026-04-01,2026-05-31,フジ系列
`;

interface PageProps {
  searchParams: Promise<{ client?: string }>;
}

export default async function CampaignMasterPage({ searchParams }: PageProps) {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const sp = await searchParams;
  const clientId = (sp.client && (CLIENT_IDS as readonly string[]).includes(sp.client)
    ? sp.client
    : "hs") as ClientId;

  const rows = await fetchCampaignMaster(clientId);
  const currentCsv = rowsToCsv(CAMPAIGN_MASTER_COLUMNS, rows);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/dashboard/admin" className="underline hover:text-neutral-800">管理</Link>
          <span>/</span>
          <Link href="/dashboard/admin/masters" className="underline hover:text-neutral-800">マスタ管理</Link>
          <span>/</span>
          <span>キャンペーンマスタ</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">キャンペーンマスタ</h1>
        <p className="mt-1 text-xs text-neutral-600">
          UTM ⇄ プラットフォーム ID の対応表。粒度可変 (媒体 / CPN / ADG / 広告)。
          マスタ無いCPNは既存 ga4MatchKey フォールバックで動く。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CLIENT_IDS.map((cid) => {
          const isActive = cid === clientId;
          return (
            <Link
              key={cid}
              href={`/dashboard/admin/masters/campaigns?client=${cid}`}
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
        kind="campaign_master"
        clientId={clientId}
        label={`キャンペーンマスタ (${CLIENTS[clientId].label})`}
        templateName={`campaign-master-${clientId}`}
        templateCsv={TEMPLATE_CSV}
        currentCsv={currentCsv}
      />

      <div className="overflow-x-auto rounded-md border border-neutral-300 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="p-2 text-left">media</th>
              <th className="p-2 text-left">cpn_id</th>
              <th className="p-2 text-left">adg_id</th>
              <th className="p-2 text-left">ad_id</th>
              <th className="p-2 text-left">utm_source</th>
              <th className="p-2 text-left">utm_medium</th>
              <th className="p-2 text-left">utm_campaign</th>
              <th className="p-2 text-left">utm_content</th>
              <th className="p-2 text-left">type</th>
              <th className="p-2 text-left">active</th>
              <th className="p-2 text-left">notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={11} className="p-4 text-center text-neutral-400">データなし</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-neutral-200">
                <td className="p-2">{r.media}</td>
                <td className="p-2 font-mono">{r.platform_campaign_id ?? "*"}</td>
                <td className="p-2 font-mono">{r.platform_adgroup_id ?? "*"}</td>
                <td className="p-2 font-mono">{r.platform_ad_id ?? "*"}</td>
                <td className="p-2">{r.utm_source ?? "—"}</td>
                <td className="p-2">{r.utm_medium ?? "—"}</td>
                <td className="p-2">{r.utm_campaign ?? "—"}</td>
                <td className="p-2">{r.utm_content ?? "—"}</td>
                <td className="p-2">{r.campaign_type ?? "—"}</td>
                <td className="p-2 text-neutral-500">
                  {r.active_from ?? "—"}{r.active_to ? ` 〜 ${r.active_to}` : ""}
                </td>
                <td className="p-2 text-neutral-600">{r.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
