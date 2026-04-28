import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MastersHub() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">マスタ管理</h1>
        <p className="mt-1 text-sm text-neutral-600">
          月次目標・外部CV・キャンペーンマスタの編集（全置換 CSV アップロード）
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/admin/masters/targets"
          className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50"
        >
          <div className="text-base font-semibold">月次目標</div>
          <p className="mt-1 text-xs text-neutral-600">
            client × 月次の売上 / CV / 予算 / ROAS / CPA 目標
          </p>
        </Link>

        <Link
          href="/dashboard/admin/masters/external-cv"
          className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50"
        >
          <div className="text-base font-semibold">外部CV</div>
          <p className="mt-1 text-xs text-neutral-600">
            電話 / 来店 / オフラインフォームなど API で取れない CV (hs/dozo/ogc/ogp)
          </p>
        </Link>

        <Link
          href="/dashboard/admin/masters/campaigns"
          className="rounded-md border border-neutral-300 bg-white p-4 hover:bg-neutral-50"
        >
          <div className="text-base font-semibold">キャンペーンマスタ</div>
          <p className="mt-1 text-xs text-neutral-600">
            UTM ⇄ プラットフォーム ID マッピング (媒体 × CPN / ADG / 広告 単位)
          </p>
        </Link>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <h2 className="font-semibold text-neutral-800">運用ルール</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
          <li>アップロードは <strong>全置換</strong>（TRUNCATE + INSERT）。過去分も書き換え可能。</li>
          <li>履歴は直近のみ保持。変更履歴は <Link href="/dashboard/admin/audit" className="underline">監査ログ</Link> で確認。</li>
          <li>キャンペーンマスタは粒度可変: CPN レベル / ADG レベル / 広告レベル混在可。マスタが無い CPN は既存 ga4MatchKey フォールバックで動く。</li>
        </ul>
      </div>
    </div>
  );
}
