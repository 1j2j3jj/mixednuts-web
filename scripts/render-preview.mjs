import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const previewDir = path.join(root, "preview");
// Turbopack emits compiled CSS under .next/static/chunks/*.css; the webpack
// builder used .next/static/css. Walk .next/static so either layout works.
const cssDir = path.join(root, ".next", "static");

function listCssFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listCssFiles(fullPath) : [fullPath];
    })
    .filter((file) => file.endsWith(".css"))
    .sort();
}

const cssFiles = listCssFiles(cssDir);
if (cssFiles.length === 0) {
  throw new Error(
    "No compiled CSS found under .next/static. Run `npm run build` first.",
  );
}

const bundleFile = path.join(
  root,
  ".next",
  "cache",
  "render-preview-components.mjs",
);
fs.mkdirSync(path.dirname(bundleFile), { recursive: true });
await build({
  absWorkingDir: root,
  stdin: {
    contents: `
      export { default as BigKpiCard } from "./src/components/dashboard/BigKpiCard.tsx";
      export { default as ChannelTargetTable } from "./src/components/dashboard/ChannelTargetTable.tsx";
      export { default as GoalGauge } from "./src/components/dashboard/GoalGauge.tsx";
      export { default as DeviceBar } from "./src/components/dashboard/DeviceBar.tsx";
      export { default as DailyTrendChart } from "./src/components/dashboard/DailyTrendChart.tsx";
      export { default as ChannelStackedBar } from "./src/components/dashboard/ChannelStackedBar.tsx";
      export { default as MediaCampaignTable } from "./src/components/dashboard/MediaCampaignTable.tsx";
      export { default as MediaTable } from "./src/components/dashboard/MediaTable.tsx";
    `,
    loader: "tsx",
    resolveDir: root,
    sourcefile: "render-preview-entry.tsx",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  plugins: [
    {
      name: "static-sparkline",
      setup(buildApi) {
        buildApi.onResolve(
          { filter: /^@\/components\/dashboard\/Sparkline$/ },
          () => ({ path: "static-sparkline", namespace: "preview" }),
        );
        buildApi.onLoad(
          { filter: /.*/, namespace: "preview" },
          () => ({
            loader: "tsx",
            resolveDir: root,
            contents: `
              export default function StaticSparkline({ values, height = 28, tone = "default", title }) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min || 1;
                const points = values.map((value, index) => {
                  const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
                  const y = 28 - ((value - min) / range) * 24;
                  return x + "," + y;
                }).join(" ");
                const stroke = tone === "positive"
                  ? "var(--positive)"
                  : tone === "negative"
                    ? "var(--negative)"
                    : "var(--brand)";
                return (
                  <svg viewBox="0 0 100 32" width="100%" height={height} role="img" aria-label={title} preserveAspectRatio="none">
                    {title && <title>{title}</title>}
                    <polyline
                      fill="none"
                      points={points}
                      stroke={stroke}
                      strokeDasharray={tone === "negative" ? "4 3" : undefined}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                );
              }
            `,
          }),
        );
      },
    },
  ],
  outfile: bundleFile,
  tsconfig: path.join(root, "tsconfig.json"),
});
const {
  BigKpiCard,
  ChannelTargetTable,
  GoalGauge,
  DeviceBar,
  DailyTrendChart,
  ChannelStackedBar,
  MediaCampaignTable,
  MediaTable,
} = await import(`${pathToFileURL(bundleFile).href}?v=${Date.now()}`);
fs.rmSync(bundleFile);

const h = React.createElement;
const expectedProgress = 0.645;
const channelRows = [
  {
    channel: "広告",
    revenue: 9_497_160,
    revenueTarget: 12_834_000,
    conversions: 645,
    conversionsTarget: 872,
  },
  {
    channel: "referral",
    revenue: 4_632_390,
    revenueTarget: 8_127_000,
    conversions: 315,
    conversionsTarget: 553,
  },
  {
    channel: "organic",
    revenue: 2_487_600,
    revenueTarget: 6_219_000,
    conversions: 168,
    conversionsTarget: 419,
  },
  {
    channel: "direct",
    revenue: 1_626_560,
    revenueTarget: 5_083_000,
    conversions: 111,
    conversionsTarget: 348,
  },
  {
    channel: "email",
    revenue: 904_640,
    revenueTarget: 4_112_000,
    conversions: 61,
    conversionsTarget: 276,
  },
];

const kpiCards = [
  h(BigKpiCard, {
    key: "cost",
    label: "COST",
    value: "¥21,962,887",
    caption: "前期間 ¥19,560,165",
    comparison: { label: "前期間比", delta: 0.123 },
    lowerIsBetter: true,
    sparkline: [2_611_420, 3_028_711, 2_844_905, 3_391_682, 3_207_145],
    sparkFormat: "jpy",
    sparkTone: "negative",
  }),
  h(BigKpiCard, {
    key: "graphene-cost",
    label: "広告費（グラフェン）",
    value: "¥19,560,165",
    caption: "広告チャネル集計",
    comparison: { label: "前期間比", delta: -0.054 },
    sparkline: [2_488_441, 2_760_810, 2_935_207, 2_681_144, 2_894_563],
    sparkFormat: "jpy",
  }),
  h(BigKpiCard, {
    key: "sessions",
    label: "SESSION (GA4)",
    value: "133,400",
    caption: "デバイス合計",
    comparison: { label: "前期間比", delta: 0.031 },
    sparkline: [17_805, 19_422, 18_976, 20_115, 21_004],
  }),
  h(BigKpiCard, {
    key: "unavailable",
    label: "グラフェンCV",
    value: "0",
    caption: "比較対象なし",
    unavailableMessage:
      "この期間の確定データはまだ届いていません（CVソース最新: 2026-07-06）",
  }),
  h(BigKpiCard, {
    key: "no-comparison",
    label: "CV",
    value: "1,284",
    caption: "比較対象なし",
    sparkline: [181, 203, 176, 219, 205],
  }),
  h(BigKpiCard, {
    key: "zero-sparkline",
    label: "GA_CV",
    value: "0",
    caption: "前期間 0",
    comparison: { label: "前期間比", delta: null },
    sparkline: [0, 0, 0, 0, 0],
  }),
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

const monthlyChannels = ["Paid Search", "Organic Search", "Direct"];
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

const app = h(
  "div",
  { className: "dashboard-scope" },
  h(
    "main",
    { className: "min-h-screen space-y-6 bg-background p-6" },
    h(
      "section",
      { className: "space-y-3" },
      h("h1", { className: "text-xl font-bold" }, "Dashboard P1 Preview"),
      h(
        "div",
        { className: "kpi-card-grid grid grid-cols-6 gap-4" },
        ...kpiCards,
      ),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h(
        "h2",
        { className: "mb-3 text-sm font-semibold" },
        "チャネル別 目標vs実績（当月）",
      ),
      h(ChannelTargetTable, {
        rows: channelRows,
        expectedProgress,
        progressNote: "経過20日/31日（65%）",
      }),
    ),
    h(
      "section",
      { className: "grid grid-cols-3 gap-4" },
      h(GoalGauge, {
        label: "売上達成",
        actual: "¥19,148,350",
        target: "¥36,375,000",
        ratio: 19_148_350 / 36_375_000,
        expectedProgress,
      }),
      h(GoalGauge, {
        label: "CV達成",
        actual: "1,284",
        target: "2,853",
        ratio: 1_284 / 2_853,
        expectedProgress,
      }),
      h(GoalGauge, {
        label: "広告予算消化",
        actual: "¥21,962,887",
        target: "¥38,531,381",
        ratio: 21_962_887 / 38_531_381,
        expectedProgress,
        budgetPacing: true,
      }),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h("h2", { className: "mb-3 text-sm font-semibold" }, "デバイス"),
      h(DeviceBar, {
        rows: [
          {
            device: "desktop",
            sessions: 106_073,
            conversions: 1_011,
            revenue: 16_842_390,
          },
          {
            device: "mobile",
            sessions: 26_838,
            conversions: 268,
            revenue: 2_257_470,
          },
          {
            device: "tablet",
            sessions: 489,
            conversions: 5,
            revenue: 48_490,
          },
        ],
      }),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h("h2", { className: "mb-3 text-sm font-semibold" }, "日次推移（最終日は進行中）"),
      h(DailyTrendChart, {
        data: dailyTrendRows,
        inProgressDate: "2026-08-21",
        width: 1120,
        height: 288,
        title: "日次推移（21日）",
      }),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h("h2", { className: "mb-3 text-sm font-semibold" }, "月次スタックバー（最終月は進行中）"),
      h(ChannelStackedBar, {
        data: monthlyRows,
        inProgressMonth: "2026-08",
        width: 1120,
        height: 288,
        title: "月次チャネル別（12ヶ月）",
      }),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h("h2", { className: "mb-3 text-sm font-semibold" }, "媒体別キャンペーン（13行・空6列を自動非表示）"),
      h(MediaCampaignTable, {
        rows: campaignRows,
        targetRoasPct: 1_300,
        source: "ga4",
      }),
    ),
    h(
      "section",
      { className: "rounded-card border bg-card p-4 shadow-card" },
      h("h2", { className: "mb-3 text-sm font-semibold" }, "ROAS 17,756% 表記確認"),
      h(MediaTable, {
        rows: [{
          media: oversizedRoasRow.media,
          spend: oversizedRoasRow.spend,
          impressions: oversizedRoasRow.impressions,
          clicks: oversizedRoasRow.clicks,
          adsCv: oversizedRoasRow.adsCv,
          ga4Cv: 0,
          conversionValue: oversizedRoasRow.conversionValue,
          ga4Revenue: 0,
          ga4Matched: true,
        }],
        targetRoasPct: 1_300,
        source: "media",
      }),
    ),
  ),
);

// Inlined rather than <link>-ed: the compiled CSS lives outside preview/,
// so a static server rooted at preview/ can never resolve a relative href.
// Inlining keeps the artifact self-contained and openable from anywhere.
const cssLinks = `<style>\n${cssFiles
  .map((file) => fs.readFileSync(file, "utf-8"))
  .join("\n")}\n</style>`;
const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dashboard P1 Preview</title>
    ${cssLinks}
  </head>
  <body>
    ${renderToStaticMarkup(app)}
  </body>
</html>
`;

fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, "index.html"), html);
console.log(
  `Rendered preview/index.html with ${cssFiles.length} compiled stylesheet(s).`,
);
