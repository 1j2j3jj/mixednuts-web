import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChannelStackedBar from "@/components/dashboard/ChannelStackedBar";
import GscQueryTable from "@/components/dashboard/GscQueryTable";
import ProductRanking from "@/components/dashboard/ProductRanking";
import LandingPageTable from "@/components/dashboard/LandingPageTable";
import DeviceBar from "@/components/dashboard/DeviceBar";
import ChannelTrendChart from "@/components/dashboard/ChannelTrendChart";
import NewVsRepeatChart from "@/components/dashboard/NewVsRepeatChart";
import DailyTrendChart from "@/components/dashboard/DailyTrendChart";
import FunnelChart from "@/components/dashboard/FunnelChart";
import type { ChannelMonth, ChannelDay, DeviceTotals } from "@/lib/sources/ga4";
import type { DailySeriesPoint } from "@/lib/metrics";

/**
 * Phase D — "cover ... that a chart/table with zero rows renders the
 * designed state rather than nothing" (WORKTREE task). Uses the same
 * dependency-free renderToStaticMarkup approach as
 * BigKpiCard.invariant.test.tsx (no jsdom/testing-library in this repo).
 */

const SAMPLE_MONTH: ChannelMonth = {
  yearMonth: "2026-06",
  channel: "Paid Search",
  sessions: 100,
  conversions: 5,
  revenue: 10000,
  secondary: {},
  newUsers: 10,
  returningUsers: 5,
};

describe("ChannelStackedBar — A-21 empty state", () => {
  it("renders the shared absence copy instead of an empty chart when data=[]", () => {
    const html = renderToStaticMarkup(<ChannelStackedBar data={[]} />);
    expect(html).toContain("この期間はデータがありません");
    // The chart canvas (ResponsiveContainer wrapper) must NOT be present —
    // otherwise this would be exactly A-21's "title+toggle then an empty
    // ~500px void" failure mode.
    expect(html).not.toContain("recharts-responsive-container");
  });

  it("keeps the metric toggle visible in the empty state (title/controls stay — only the body is replaced)", () => {
    const html = renderToStaticMarkup(<ChannelStackedBar data={[]} />);
    expect(html).toContain("セッション");
    expect(html).toContain("CV");
  });

  it("renders the real chart (no absence copy) when data is non-empty", () => {
    const html = renderToStaticMarkup(
      <ChannelStackedBar data={[SAMPLE_MONTH]} />,
    );
    expect(html).not.toContain("この期間はデータがありません");
  });

  it("distinguishes not_configured from a genuine empty period", () => {
    const html = renderToStaticMarkup(
      <ChannelStackedBar data={[]} absenceReason="not_configured" />,
    );
    expect(html).toContain("このクライアントでは未設定です");
    expect(html).not.toContain("この期間はデータがありません");
  });
});

describe("GscQueryTable — empty state distinguishes absence reasons", () => {
  it("renders NO_DATA_FOR_PERIOD copy when rows=[] and no reason given (a genuine real-zero result)", () => {
    const html = renderToStaticMarkup(<GscQueryTable rows={[]} />);
    expect(html).toContain("この期間はデータがありません");
  });

  it("renders the permission-error copy (verbatim, reused from the report tab) when reason=permission", () => {
    const html = renderToStaticMarkup(
      <GscQueryTable rows={[]} absenceReason="permission" />,
    );
    expect(html).toContain("データにアクセスできません（権限エラー）");
  });

  it("renders normally (no absence copy) when rows are present", () => {
    const html = renderToStaticMarkup(
      <GscQueryTable
        rows={[
          { query: "test", clicks: 1, impressions: 10, ctr: 0.1, position: 3 },
        ]}
      />,
    );
    expect(html).not.toContain("この期間はデータがありません");
  });
});

describe("ProductRanking — mock-leak fix: empty result renders absence copy, never fabricated rows", () => {
  it("renders the not_configured copy instead of any product row when the source has no rows and reason=not_configured", () => {
    const html = renderToStaticMarkup(
      <ProductRanking rows={[]} absenceReason="not_configured" />,
    );
    expect(html).toContain("このクライアントでは未設定です");
    // The formerly-hardcoded fabricated catalogue must never appear.
    expect(html).not.toContain("防災7点セット");
    expect(html).not.toContain("オリジナル タンブラー");
  });

  it("Phase D item 1: a permanent business-model absence (e.g. chakin) states the reason plainly and never advises widening the period", () => {
    const html = renderToStaticMarkup(
      <ProductRanking
        rows={[]}
        absenceReason="not_configured"
        absenceDetail="自社ECサイトを保有しない事業"
      />,
    );
    expect(html).toContain(
      "自社ECサイトを保有しない事業のため、このデータは対象外です。",
    );
    // The period-widening advice from NO_DATA_FOR_PERIOD must never appear
    // here — that advice can never resolve a permanent, structural absence.
    expect(html).not.toContain("期間を広げる");
    expect(html).not.toContain("この期間はデータがありません");
  });
});

describe("LandingPageTable — empty state", () => {
  it("renders absence copy rather than a silently-empty tbody", () => {
    const html = renderToStaticMarkup(<LandingPageTable rows={[]} />);
    expect(html).toContain("この期間はデータがありません");
  });
});

/**
 * Phase D item 2 sweep: DeviceBar / ChannelTrendChart / NewVsRepeatChart /
 * DailyTrendChart / FunnelChart all had the same A-21 failure mode as
 * ChannelStackedBar (empty data -> a silently blank body with only the
 * card/toggle chrome visible) but had not received the fix. Same assertion
 * shape as the ChannelStackedBar suite above: absence copy present when
 * empty, absent when real data is supplied.
 */

const SAMPLE_DEVICE: DeviceTotals = {
  device: "mobile",
  sessions: 100,
  conversions: 5,
  revenue: 10000,
};

describe("DeviceBar — empty state", () => {
  it("renders absence copy instead of a bare empty wrapper when rows=[]", () => {
    const html = renderToStaticMarkup(<DeviceBar rows={[]} />);
    expect(html).toContain("この期間はデータがありません");
  });

  it("distinguishes not_configured from a genuine empty period", () => {
    const html = renderToStaticMarkup(
      <DeviceBar rows={[]} absenceReason="not_configured" />,
    );
    expect(html).toContain("このクライアントでは未設定です");
  });

  it("renders the real device bars (no absence copy) when rows are present", () => {
    const html = renderToStaticMarkup(<DeviceBar rows={[SAMPLE_DEVICE]} />);
    expect(html).not.toContain("この期間はデータがありません");
    expect(html).toContain("モバイル");
  });
});

const SAMPLE_CHANNEL_DAY: ChannelDay = {
  date: "2026-06-01",
  channel: "Paid Search",
  sessions: 100,
  conversions: 5,
  revenue: 10000,
  secondary: {},
};

describe("ChannelTrendChart — empty state", () => {
  it("renders the shared absence copy instead of an empty chart when data=[]", () => {
    const html = renderToStaticMarkup(<ChannelTrendChart data={[]} />);
    expect(html).toContain("この期間はデータがありません");
    expect(html).not.toContain("recharts-responsive-container");
  });

  it("keeps the metric/granularity toggles visible in the empty state", () => {
    const html = renderToStaticMarkup(<ChannelTrendChart data={[]} />);
    expect(html).toContain("SESSION");
    expect(html).toContain("週");
  });

  it("renders the real chart (no absence copy) when data is non-empty", () => {
    const html = renderToStaticMarkup(
      <ChannelTrendChart data={[SAMPLE_CHANNEL_DAY]} />,
    );
    expect(html).not.toContain("この期間はデータがありません");
  });
});

describe("NewVsRepeatChart — empty state", () => {
  it("renders absence copy instead of an empty chart when data=[]", () => {
    const html = renderToStaticMarkup(<NewVsRepeatChart data={[]} />);
    expect(html).toContain("この期間はデータがありません");
    expect(html).not.toContain("recharts-responsive-container");
  });

  it("renders the real chart (no absence copy) when data is non-empty", () => {
    const html = renderToStaticMarkup(
      <NewVsRepeatChart
        data={[{ yearMonth: "2026-06", new: 10, returning: 5 }]}
      />,
    );
    expect(html).not.toContain("この期間はデータがありません");
  });
});

const SAMPLE_DAILY_POINT: DailySeriesPoint = {
  date: "2026-06-01",
  cost: 305,
  conversions: 0,
  conversionValue: 0,
  clicks: 7,
};

describe("DailyTrendChart — empty state", () => {
  it("renders absence copy instead of an empty chart when data=[]", () => {
    const html = renderToStaticMarkup(<DailyTrendChart data={[]} />);
    expect(html).toContain("この期間はデータがありません");
    expect(html).not.toContain("recharts-responsive-container");
  });

  it("renders the real chart (no absence copy) when data is non-empty, and does not turn a measured zero into an absence marker", () => {
    const html = renderToStaticMarkup(
      <DailyTrendChart data={[SAMPLE_DAILY_POINT]} />,
    );
    expect(html).not.toContain("この期間はデータがありません");
  });
});

describe("FunnelChart — empty state", () => {
  it("renders absence copy instead of `return null` (a literally silent blank) when stages=[]", () => {
    const html = renderToStaticMarkup(<FunnelChart stages={[]} />);
    expect(html).toContain("この期間はデータがありません");
  });

  it("renders the real funnel (no absence copy) when stages are present", () => {
    const html = renderToStaticMarkup(
      <FunnelChart stages={[{ label: "Imp", value: 1000 }]} />,
    );
    expect(html).not.toContain("この期間はデータがありません");
    expect(html).toContain("Imp");
  });
});
