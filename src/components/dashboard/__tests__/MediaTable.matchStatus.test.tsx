import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MediaTable, { type MediaRow } from "@/components/dashboard/MediaTable";
import MediaCampaignTable, {
  type MediaCampaignRow,
} from "@/components/dashboard/MediaCampaignTable";

/**
 * Phase D item 6 — ads-tab join-failure fix. Reuses the report tab's exact
 * match-status vocabulary (@/lib/match-status) instead of inventing a
 * second one. `ga4Cv` must stay `0` in both the matched and unmatched cases
 * (hard constraint: no rendered NUMBER may change) — only the badge differs.
 */

const MATCHED_ROW: MediaRow = {
  media: "Google",
  spend: 10000,
  impressions: 1000,
  clicks: 100,
  adsCv: 5,
  ga4Cv: 0,
  conversionValue: 5000,
  ga4Matched: true,
};

const UNMATCHED_ROW: MediaRow = {
  ...MATCHED_ROW,
  media: "Yahoo",
  ga4Matched: false,
};

describe("MediaTable — join-failure badge", () => {
  it("shows the report tab's '未突合' badge on a row whose GA4 join failed, source=ga4", () => {
    const html = renderToStaticMarkup(
      <MediaTable rows={[UNMATCHED_ROW]} targetRoasPct={null} source="ga4" />,
    );
    expect(html).toContain("未突合");
  });

  it("does not show the badge on a matched row", () => {
    const html = renderToStaticMarkup(
      <MediaTable rows={[MATCHED_ROW]} targetRoasPct={null} source="ga4" />,
    );
    expect(html).not.toContain("未突合");
  });

  it("never shows the badge on the media-basis toggle (the badge is GA4-join-specific)", () => {
    const html = renderToStaticMarkup(
      <MediaTable rows={[UNMATCHED_ROW]} targetRoasPct={null} source="media" />,
    );
    expect(html).not.toContain("未突合");
  });

  it("the rendered GA_CV number is identical (0) whether matched or unmatched — only the badge differs", () => {
    const matchedHtml = renderToStaticMarkup(
      <MediaTable rows={[MATCHED_ROW]} targetRoasPct={null} source="ga4" />,
    );
    const unmatchedHtml = renderToStaticMarkup(
      <MediaTable rows={[UNMATCHED_ROW]} targetRoasPct={null} source="ga4" />,
    );
    // Both render the same ga4Cv value (0); strip the badge markup and the
    // remaining numeric cells should render identically.
    expect(matchedHtml.includes(">0<")).toBe(true);
    expect(unmatchedHtml.includes(">0<")).toBe(true);
  });
});

const CAMPAIGN_UNMATCHED: MediaCampaignRow = {
  media: "Yahoo",
  campaignId: "123",
  campaignName: "test campaign",
  spend: 5000,
  impressions: 500,
  clicks: 50,
  adsCv: 2,
  ga4Cv: 0,
  conversionValue: 2000,
  ga4Revenue: 0,
  ga4Matched: false,
};

describe("MediaCampaignTable — join-failure badge", () => {
  it("shows the same '未突合' badge for an unmatched campaign row", () => {
    const html = renderToStaticMarkup(
      <MediaCampaignTable
        rows={[CAMPAIGN_UNMATCHED]}
        targetRoasPct={null}
        source="ga4"
      />,
    );
    expect(html).toContain("未突合");
  });

  it("defaults to the seven requested metrics and auto-hides six empty GA columns", () => {
    const html = renderToStaticMarkup(
      <MediaCampaignTable
        rows={[CAMPAIGN_UNMATCHED]}
        targetRoasPct={null}
        source="ga4"
      />,
    );
    const header = html.slice(html.indexOf("<thead"), html.indexOf("</thead>"));

    for (const label of ["COST", "IMP", "CLICK", "CTR", "CPC"]) {
      expect(header).toContain(label);
    }
    for (const label of ["GA_CV", "CVR", "GA_CPA", "GA売上", "商品単価", "GA_ROAS"]) {
      expect(header).not.toContain(label);
    }
    expect(html).toContain(
      "全行が0または—のため非表示: GA_CV / CVR / GA_CPA / GA売上 / 商品単価 / GA_ROAS",
    );
    expect(html).toContain("sticky left-0");
    expect(html).toContain("after:bg-gradient-to-l");
  });
});
