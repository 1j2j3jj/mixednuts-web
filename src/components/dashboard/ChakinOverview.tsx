import type { ClientConfig } from "@/config/clients";
import {
  getChakinAnchorDate,
  getChakinDashboardData,
  type ChakinCampaignRow,
  type ChakinChannelRow,
  type ChakinMediaRow,
} from "@/lib/sources/bq-chakin";
import { getTargetsForMonth } from "@/lib/sources/target";
import { resolveFromSearchParams } from "@/lib/range";
import { fmtInt, fmtJpy, fmtPct, safeDiv } from "@/lib/utils";
import { fmtJstTime, jstDateString } from "@/lib/datetime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TOTAL_ROW_CLASS,
} from "@/components/ui/table";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import {
  CircleDollarSign,
  FileCheck2,
  Target,
  MousePointerClick,
  Coins,
  Percent,
} from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import RefreshButton from "@/components/dashboard/RefreshButton";
import PrintButton from "@/components/dashboard/PrintButton";
import AbsenceTableRow from "@/components/dashboard/AbsenceTableRow";
import ChakinDetailTabs, {
  type ChakinDetailView,
} from "@/components/dashboard/ChakinDetailTabs";
import ChakinCvSourceToggle from "@/components/dashboard/ChakinCvSourceToggle";
import { readChakinCvSource, type ChakinCvSource } from "@/lib/chakin-cv-source";
import { hasWarnReason } from "@/lib/fetch-warnings";

interface Props {
  client: ClientConfig;
  slug: string;
  searchParams: Record<string, string | undefined>;
}

const CHAKIN_CPA_TARGET_FALLBACK = 46_853;

function pct(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return (a - b) / b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function cpaForDisplay(cost: number, cv: number): number | null {
  if (cv <= 0) return null;
  if (cost <= 0) return null;
  return cost / cv;
}

function splitChannelRows(rows: ChakinChannelRow[]) {
  const ordered = ["広告", "アライアンス", "非広告", "不明"] as const;
  const map = new Map(rows.map((row) => [row.channelGroup, row]));
  const complete = ordered.map(
    (group) =>
      map.get(group) ?? {
        channelGroup: group,
        validCv: 0,
        cost: 0,
        avgMonthlyPremium: null,
        cpa: null,
      },
  );

  const primary = complete.filter((row) => row.channelGroup !== "不明");
  const unknown = complete.find((row) => row.channelGroup === "不明") ?? {
    channelGroup: "不明" as const,
    validCv: 0,
    cost: 0,
    avgMonthlyPremium: null,
    cpa: null,
  };
  return { primary, unknown, complete };
}

function cvForSummary(source: ChakinCvSource, data: Awaited<ReturnType<typeof getChakinDashboardData>>["data"]): number {
  if (source === "ga4") return data.funnel.ga4Complete;
  if (source === "media") return data.funnel.mediaCv;
  return data.adValidCv;
}

function cvForMediaRow(source: ChakinCvSource, row: ChakinMediaRow): number {
  if (source === "ga4") return row.ga4Complete;
  if (source === "media") return row.platformCv;
  return row.validCv;
}

function cvForCampaignRow(source: ChakinCvSource, row: ChakinCampaignRow): number {
  if (source === "ga4") return row.ga4Complete;
  if (source === "media") return row.platformCv;
  return row.validCv;
}

export default async function ChakinOverview({
  client,
  slug,
  searchParams,
}: Props) {
  const source = readChakinCvSource(searchParams);
  const anchorResult = await getChakinAnchorDate(client.id);
  const anchor = anchorResult.anchorDate ?? jstDateString();
  const rr = resolveFromSearchParams(
    searchParams,
    { preset: "thisMonth", compare: "prev" },
    anchor,
  );

  const [current, previous, targets] = await Promise.all([
    getChakinDashboardData(client.id, rr.current),
    rr.previous
      ? getChakinDashboardData(client.id, rr.previous)
      : Promise.resolve(null),
    getTargetsForMonth(client, rr.current.start.slice(0, 7)),
  ]);

  const currentFetchFailed =
    hasWarnReason(current.warnings, "permission") ||
    hasWarnReason(current.warnings, "fetch_failed");
  const previousFetchFailed =
    previous != null &&
    (hasWarnReason(previous.warnings, "permission") ||
      hasWarnReason(previous.warnings, "fetch_failed"));
  const anchorFetchFailed =
    hasWarnReason(anchorResult.warnings, "permission") ||
    hasWarnReason(anchorResult.warnings, "fetch_failed");

  const detailView: ChakinDetailView =
    searchParams.detail === "campaign" ? "campaign" : "media";

  const fetchedAt = Math.max(
    anchorResult.fetchedAt,
    current.fetchedAt,
    previous?.fetchedAt ?? 0,
  );
  const fetchedAtLabel = fmtJstTime(fetchedAt);
  const sourceLatest = anchorResult.sourceLatestDates;
  const sourceCvLatest =
    source === "graphene"
      ? sourceLatest.graphene
      : source === "ga4"
        ? sourceLatest.ga4
        : sourceLatest.ads;
  const commonConfirmedEnd =
    sourceLatest.ads && sourceCvLatest ? minDate(sourceLatest.ads, sourceCvLatest) : null;
  const currentKpiRange =
    commonConfirmedEnd != null
      ? { start: rr.current.start, end: minDate(rr.current.end, commonConfirmedEnd) }
      : rr.current;
  const previousKpiRange =
    rr.previous && commonConfirmedEnd != null
      ? { start: rr.previous.start, end: minDate(rr.previous.end, commonConfirmedEnd) }
      : rr.previous;
  const [currentKpi, previousKpi] = await Promise.all([
    getChakinDashboardData(client.id, currentKpiRange),
    previousKpiRange
      ? getChakinDashboardData(client.id, previousKpiRange)
      : Promise.resolve(null),
  ]);

  const currentData = current.data;
  const previousData = !previousFetchFailed ? (previous?.data ?? null) : null;
  const currentKpiData = !currentFetchFailed ? currentKpi.data : currentData;
  const previousKpiData =
    !previousFetchFailed && previousKpi != null ? previousKpi.data : previousData;

  const cvCurrent = cvForSummary(source, currentKpiData);
  const cvPrevious = previousKpiData ? cvForSummary(source, previousKpiData) : null;

  const cpaCurrent = cpaForDisplay(currentKpiData.adCost, cvCurrent);
  const cpaPrevious = previousKpiData
    ? cpaForDisplay(previousKpiData.adCost, cvForSummary(source, previousKpiData))
    : null;
  const cvrCurrent = safeDiv(cvCurrent, currentKpiData.adClicks);
  const cvrPrevious = previousKpiData
    ? safeDiv(cvForSummary(source, previousKpiData), previousKpiData.adClicks)
    : null;
  const cpcCurrent = safeDiv(currentData.adCost, currentData.adClicks);
  const cpcPrevious = previousData
    ? safeDiv(previousData.adCost, previousData.adClicks)
    : null;

  const cpaTarget = targets.cpa ?? CHAKIN_CPA_TARGET_FALLBACK;

  const { primary: primaryChannels, unknown, complete: allChannels } =
    splitChannelRows(currentData.channelRows);
  const channelTotals = {
    validCv: allChannels.reduce((sum, row) => sum + row.validCv, 0),
    cost: allChannels.reduce((sum, row) => sum + row.cost, 0),
  };

  const campaignRows = currentKpiData.campaignRows.slice(0, 30);

  const failureMessage = hasWarnReason(current.warnings, "permission")
    ? "データ連携の権限エラーにより、この期間の実績を表示できません。管理者に連絡してください。"
    : "データ取得に失敗したため、この期間の実績を表示できません。時間をおいて再読み込みしてください。";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {anchorFetchFailed && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            基準日の取得に失敗したため、一部の期間比較が正確でない可能性があります。
          </div>
        )}
        {previousFetchFailed && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            比較期間のデータ取得に失敗したため、前期間比較は表示していません。
          </div>
        )}
        <PageHeader
          kicker="サマリー"
          title={<span className="break-keep">Chakin 申込ダッシュボード · {rr.presetLabel}</span>}  // 語中改行防止（A-2）
          subtitle={
            <>
              {rr.current.start} 〜 {rr.current.end}
              {rr.previous && (
                <>
                  {" · "}
                  {rr.compareLabel}: {rr.previous.start} 〜 {rr.previous.end}
                </>
              )}
            </>
          }
          controls={
            <>
              <ChakinCvSourceToggle />
              <div className="text-xs text-muted-foreground">画面更新日時 {fetchedAtLabel}</div>
              <PrintButton />
              <RefreshButton clientId={client.id} />
            </>
          }
        />
      </div>

      {currentFetchFailed ? (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          {failureMessage}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <BigKpiCard
              label="COST"
              icon={CircleDollarSign}
              value={fmtJpy(currentData.adCost)}
              caption={
                previousData ? `${rr.compareLabel} ${fmtJpy(previousData.adCost)}` : "比較対象なし"
              }
              lowerIsBetter
              comparison={
                previousData
                  ? {
                      label: rr.compareLabel,
                      delta: pct(currentData.adCost, previousData.adCost),
                    }
                  : undefined
              }
              hue="chart-5"
            />
            <BigKpiCard
              label="CV"
              icon={FileCheck2}
              value={fmtInt(cvCurrent)}
              caption={
                source === "graphene"
                  ? "申込完了・有効（基幹）"
                  : source === "ga4"
                    ? "GA4の申込完了イベント"
                    : "媒体計上CV"
              }
              comparison={
                cvPrevious != null
                  ? {
                      label: rr.compareLabel,
                      delta: pct(cvCurrent, cvPrevious),
                    }
                  : undefined
              }
              hue="chart-3"
            />
            <BigKpiCard
              label="CPA"
              icon={Target}
              value={fmtJpy(cpaCurrent)}
              caption={
                source === "graphene"
                  ? targets.cpa != null
                    ? `目標 ${fmtJpy(cpaTarget)}`
                    : `目標 ${fmtJpy(cpaTarget)}（社内設定）`
                  : "目標対比なし"
              }
              lowerIsBetter
              comparison={
                cpaPrevious != null
                  ? {
                      label: rr.compareLabel,
                      delta: pct(cpaCurrent, cpaPrevious),
                    }
                  : undefined
              }
              hue="chart-2"
            />
            <BigKpiCard
              label="CLICK"
              icon={MousePointerClick}
              value={fmtInt(currentData.adClicks)}
              caption={
                previousData
                  ? `${rr.compareLabel} ${fmtInt(previousData.adClicks)}`
                  : "比較対象なし"
              }
              comparison={
                previousData
                  ? {
                      label: rr.compareLabel,
                      delta: pct(currentData.adClicks, previousData.adClicks),
                    }
                  : undefined
              }
              hue="chart-6"
            />
            <BigKpiCard
              label="CPC"
              icon={Coins}
              value={fmtJpy(cpcCurrent)}
              caption={cpcPrevious != null ? `${rr.compareLabel} ${fmtJpy(cpcPrevious)}` : "比較対象なし"}
              lowerIsBetter
              comparison={
                cpcPrevious != null
                  ? {
                      label: rr.compareLabel,
                      delta: pct(cpcCurrent, cpcPrevious),
                    }
                  : undefined
              }
              hue="chart-1"
            />
            <BigKpiCard
              label="CVR"
              icon={Percent}
              value={fmtPct(cvrCurrent, 2)}
              caption={cvrPrevious != null ? `${rr.compareLabel} ${fmtPct(cvrPrevious, 2)}` : "比較対象なし"}
              comparison={
                cvrPrevious != null
                  ? {
                      label: rr.compareLabel,
                      delta: pct(cvrCurrent, cvrPrevious),
                    }
                  : undefined
              }
              hue="chart-4"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div>
              定義: CPA = 広告費 ÷
              {source === "graphene"
                ? " グラフェンCV(広告)"
                : source === "ga4"
                  ? " GA4 CV"
                  : " 媒体CV"}
              {" / "}
              CVR = 同CV ÷ クリック数（共通確定日まで）
            </div>
            <div>
              CVソースは数え方が異なるため件数の水準も異なります（媒体CVは各媒体管理画面の計上で入口指標や重複を含み、GA4CVはサイト上の完了イベント、グラフェンCVは基幹システムの成立ベース）。件数の大小はデータ不良ではありません。
            </div>
            <div>
              ソース別最新日: 媒体費 {sourceLatest.ads ?? "—"} / グラフェンCV{" "}
              {sourceLatest.graphene ?? "—"} / GA4CV {sourceLatest.ga4 ?? "—"}
              {commonConfirmedEnd ? ` / 共通確定日 ${commonConfirmedEnd}` : ""}
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            チャネル区分テーブルは、チャネル情報がグラフェンCVにのみ存在するためグラフェン基準で固定表示です。
          </div>

          <div className="rounded-md border">
            <div className="border-b px-4 py-3">
              <div className="text-sm font-semibold">チャネル区分（グラフェンCV固定）</div>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>チャネル</TableHead>
                    <TableHead className="text-right">CV</TableHead>
                    <TableHead className="text-right">COST</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {primaryChannels.map((row) => (
                    <TableRow key={row.channelGroup}>
                      <TableCell className="font-medium whitespace-nowrap">{row.channelGroup}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtInt(row.validCv)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtJpy(row.cost)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{fmtJpy(row.cpa)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-amber-50/60">
                    <TableCell className="font-semibold whitespace-nowrap">不明（独立表示）</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmtInt(unknown.validCv)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">—</TableCell>
                    <TableCell className="text-right whitespace-nowrap">—</TableCell>
                  </TableRow>
                  <TableRow className={TOTAL_ROW_CLASS}>
                    <TableCell scope="row">合計（不明含む）</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmtInt(channelTotals.validCv)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{fmtJpy(channelTotals.cost)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">—</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-3 text-xs text-muted-foreground">
                「非広告」には、広告クリック後にパラメータを失って流入元を判別できなかった申込が含まれます。
                そのため広告の実際の貢献は、この区分表示では保守的（小さめ）に見える場合があります。
              </div>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="flex flex-row flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
              <div>
                <div className="text-sm font-semibold">媒体別・キャンペーン別（広告チャネル）</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  CV・CPA・CVR は上部の CV ソース切替に連動します。COST・CLICK・CPC は共通です。
                </div>
              </div>
              <ChakinDetailTabs slug={slug} active={detailView} />
            </div>
            <div className="p-4">
              {detailView === "media" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>媒体</TableHead>
                      <TableHead className="text-right">COST</TableHead>
                      <TableHead className="text-right">CLICK</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">CV</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                      <TableHead className="text-right">CVR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentKpiData.mediaRows.length === 0 && (
                      <AbsenceTableRow
                        colSpan={7}
                        reason="no_data_period"
                        detail={{ periodLabel: `${rr.current.start} 〜 ${rr.current.end}` }}
                      />
                    )}
                    {currentKpiData.mediaRows.map((row) => {
                      const cv = cvForMediaRow(source, row);
                      const cpa = cpaForDisplay(row.cost, cv);
                      const cvr = safeDiv(cv, row.clicks);
                      return (
                        <TableRow key={row.media}>
                          <TableCell className="font-medium whitespace-nowrap">{row.media}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(row.cost)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(row.clicks)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(safeDiv(row.cost, row.clicks))}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(cv)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(cpa)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtPct(cvr, 2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {currentKpiData.mediaRows.length > 0 && (() => {
                      const totalCost = currentKpiData.mediaRows.reduce((sum, row) => sum + row.cost, 0);
                      const totalClicks = currentKpiData.mediaRows.reduce((sum, row) => sum + row.clicks, 0);
                      const totalCv = currentKpiData.mediaRows.reduce(
                        (sum, row) => sum + cvForMediaRow(source, row),
                        0,
                      );
                      const totalCpa = cpaForDisplay(totalCost, totalCv);
                      return (
                        <TableRow className={TOTAL_ROW_CLASS}>
                          <TableCell scope="row">合計</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(totalCost)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(totalClicks)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(safeDiv(totalCost, totalClicks))}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(totalCv)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(totalCpa)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtPct(safeDiv(totalCv, totalClicks), 2)}</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>媒体</TableHead>
                      <TableHead>キャンペーン</TableHead>
                      <TableHead className="text-right">COST</TableHead>
                      <TableHead className="text-right">CLICK</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">CV</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                      <TableHead className="text-right">CVR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignRows.length === 0 && (
                      <AbsenceTableRow
                        colSpan={8}
                        reason="no_data_period"
                        detail={{ periodLabel: `${rr.current.start} 〜 ${rr.current.end}` }}
                      />
                    )}
                    {campaignRows.map((row, index) => {
                      const cv = cvForCampaignRow(source, row);
                      const cpa = cpaForDisplay(row.cost, cv);
                      const cvr = safeDiv(cv, row.clicks);
                      return (
                        <TableRow key={`${row.media}:${row.campaignName}:${index}`}>
                          <TableCell className="whitespace-nowrap">{row.media}</TableCell>
                          <TableCell className="max-w-[320px] truncate" title={row.campaignName}>
                            {row.campaignName}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(row.cost)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(row.clicks)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(safeDiv(row.cost, row.clicks))}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(cv)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(cpa)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtPct(cvr, 2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {campaignRows.length > 0 && (() => {
                      const totalCost = campaignRows.reduce((sum, row) => sum + row.cost, 0);
                      const totalClicks = campaignRows.reduce((sum, row) => sum + row.clicks, 0);
                      const totalCv = campaignRows.reduce(
                        (sum, row) => sum + cvForCampaignRow(source, row),
                        0,
                      );
                      const totalCpa = cpaForDisplay(totalCost, totalCv);
                      return (
                        <TableRow className={TOTAL_ROW_CLASS}>
                          <TableCell scope="row">合計（表示分）</TableCell>
                          <TableCell>広告費の大きい順・上位{campaignRows.length}件</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(totalCost)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(totalClicks)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(safeDiv(totalCost, totalClicks))}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtInt(totalCv)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtJpy(totalCpa)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">{fmtPct(safeDiv(totalCv, totalClicks), 2)}</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
