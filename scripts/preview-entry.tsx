import React from "react";
import { createRoot } from "react-dom/client";
import BigKpiCard from "@/components/dashboard/BigKpiCard";
import ChannelTargetTable from "@/components/dashboard/ChannelTargetTable";
import GoalGauge from "@/components/dashboard/GoalGauge";
import DeviceBar from "@/components/dashboard/DeviceBar";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import MediaCampaignTable from "@/components/dashboard/MediaCampaignTable";
import MediaTable from "@/components/dashboard/MediaTable";

const expectedProgress = 0.645;
const channelRows = [
  { channel: "広告", revenue: 9_497_160, revenueTarget: 12_834_000, conversions: 645, conversionsTarget: 872 },
  { channel: "referral", revenue: 4_632_390, revenueTarget: 8_127_000, conversions: 315, conversionsTarget: 553 },
  { channel: "organic", revenue: 2_487_600, revenueTarget: 6_219_000, conversions: 168, conversionsTarget: 419 },
  { channel: "direct", revenue: 1_626_560, revenueTarget: 5_083_000, conversions: 111, conversionsTarget: 348 },
  { channel: "email", revenue: 904_640, revenueTarget: 4_112_000, conversions: 61, conversionsTarget: 276 },
];

const dailyTrendRows = Array.from({ length: 21 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, index + 1));
  return {
    date: date.toISOString().slice(0, 10),
    cost: 520_000 + index * 31_500,
    conversions: 18 + (index % 7) * 3,
    conversionValue: 1_900_000 + index * 82_000,
    clicks: 2_800 + index * 120,
  };
});

const monthlyChannels = ["Paid Search", "Organic Search", "Direct"] as const;
const monthlyRows = Array.from({ length: 12 }, (_, monthIndex) => {
  const month = ((monthIndex + 8) % 12) + 1;
  const year = monthIndex < 4 ? 2025 : 2026;
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  return monthlyChannels.map((channel, channelIndex) => ({
    yearMonth,
    channel,
    sessions: 18_000 + monthIndex * 1_200 + channelIndex * 5_500,
    conversions: 210 + monthIndex * 11 + channelIndex * 48,
    revenue: 4_100_000 + monthIndex * 240_000 + channelIndex * 1_250_000,
    secondary: {},
    newUsers: 0,
    returningUsers: 0,
  }));
}).flat();

const campaignRows = Array.from({ length: 13 }, (_, index) => ({
  media: index % 3 === 0 ? "Google" : index % 3 === 1 ? "Yahoo" : "meta",
  campaignId: `campaign-${index + 1}`,
  campaignName: `2026_${String(index + 1).padStart(2, "0")}_獲得キャンペーン`,
  spend: 1_850_000 - index * 87_000,
  impressions: 820_000 - index * 21_000,
  clicks: 16_400 - index * 430,
  adsCv: 190 - index * 5,
  ga4Cv: 0,
  conversionValue: 6_300_000 - index * 120_000,
  ga4Revenue: 0,
  ga4Matched: false,
}));

const oversizedRoasRow = {
  ...campaignRows[0],
  campaignId: "roas-17756",
  campaignName: "ROAS表記確認 17,756%",
  spend: 10_000,
  adsCv: 12,
  conversionValue: 1_775_600,
  ga4Matched: true,
};

function PreviewApp() {
  return (
    <div className="dashboard-scope">
      <main className="min-h-screen space-y-6 bg-background p-6">
        <section className="space-y-3">
          <h1 className="text-xl font-bold">Dashboard P1 Preview</h1>
          <div className="kpi-card-grid grid grid-cols-6 gap-4">
            <BigKpiCard
              label="広告費"
              value="¥21,962,887"
              caption="前期間 ¥19,560,165"
              comparison={{ label: "前期間比", delta: 0.123 }}
              lowerIsBetter
              sparkline={[2_611_420, 3_028_711, 2_844_905, 3_391_682, 3_207_145]}
              sparkFormat="jpy"
              sparkTone="negative"
            />
            <BigKpiCard
              label="広告費（申込ベース・広告チャネル）"
              value="¥19,560,165"
              caption="広告チャネル集計"
              comparison={{ label: "前期間比", delta: -0.054 }}
              sparkline={[2_488_441, 2_760_810, 2_935_207, 2_681_144, 2_894_563]}
              sparkFormat="jpy"
            />
            <BigKpiCard
              label="セッション"
              value="133,400"
              caption="デバイス合計"
              comparison={{ label: "前期間比", delta: 0.031 }}
              sparkline={[17_805, 19_422, 18_976, 20_115, 21_004]}
            />
            <BigKpiCard
              label="グラフェンCV"
              value="0"
              caption="比較対象なし"
              unavailableMessage="CVソース最新 2026-07-06"
            />
            <BigKpiCard
              label="CV"
              value="1,284"
              caption="比較対象なし"
              sparkline={[181, 203, 176, 219, 205]}
            />
            <BigKpiCard
              label="コンバージョン（広告経由）"
              value="0"
              caption="前期間 0"
              comparison={{ label: "前期間比", delta: null }}
              sparkline={[0, 0, 0, 0, 0]}
            />
          </div>
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">チャネル別 目標vs実績（当月）</h2>
          <ChannelTargetTable rows={channelRows} expectedProgress={expectedProgress} progressNote="経過20日/31日（65%）" />
        </section>

        <section className="grid grid-cols-3 gap-4">
          <GoalGauge label="売上達成" actual="¥19,148,350" target="¥36,375,000" ratio={19_148_350 / 36_375_000} expectedProgress={expectedProgress} />
          <GoalGauge label="CV達成" actual="1,284" target="2,853" ratio={1_284 / 2_853} expectedProgress={expectedProgress} />
          <GoalGauge label="広告予算消化" actual="¥21,962,887" target="¥38,531,381" ratio={21_962_887 / 38_531_381} expectedProgress={expectedProgress} budgetPacing />
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">デバイス</h2>
          <DeviceBar rows={[
            { device: "desktop", sessions: 106_073, conversions: 1_011, revenue: 16_842_390 },
            { device: "mobile", sessions: 26_838, conversions: 268, revenue: 2_257_470 },
            { device: "tablet", sessions: 489, conversions: 5, revenue: 48_490 },
          ]} />
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">日次推移（最終日は進行中）</h2>
          <DailyTrendChart data={dailyTrendRows} inProgressDate="2026-08-21" height={288} title="日次推移（21日）" />
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">月次スタックバー（最終月は進行中）</h2>
          <ChannelStackedBar data={monthlyRows} inProgressMonth="2026-08" height={288} title="月次チャネル別（12ヶ月）" />
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">媒体別キャンペーン（既定列）</h2>
          <MediaCampaignTable rows={campaignRows} targetRoasPct={1_300} source="media" />
        </section>

        <section className="rounded-card border bg-card p-4 shadow-card">
          <h2 className="mb-3 text-sm font-semibold">ROAS 17,756% 表記確認</h2>
          <MediaTable
            rows={[{
              media: oversizedRoasRow.media,
              spend: oversizedRoasRow.spend,
              impressions: oversizedRoasRow.impressions,
              clicks: oversizedRoasRow.clicks,
              adsCv: oversizedRoasRow.adsCv,
              ga4Cv: 0,
              conversionValue: oversizedRoasRow.conversionValue,
              ga4Revenue: 0,
              ga4Matched: true,
            }]}
            targetRoasPct={1_300}
            source="media"
          />
        </section>
      </main>
    </div>
  );
}

const root = document.getElementById("preview-root");
if (!root) throw new Error("Preview root was not found.");

createRoot(root).render(<PreviewApp />);
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      document.documentElement.dataset.previewReady = "true";
    }, 1200);
  });
});
