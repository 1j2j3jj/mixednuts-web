"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  slug: string;
  medias: string[];
  campaigns: Array<{ id: string; name: string; media: string }>;
  adgroups: Array<{ id: string; name: string; campaignId: string }>;
}

/**
 * Filter bar for the drilldown screen. State lives in URL searchParams so
 * deep links share the same view. Cascade: media → campaign → adgroup. A
 * deeper filter auto-clears when an ancestor changes.
 */
export default function DrillFilters({ slug, medias, campaigns, adgroups }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const media = sp.get("media") ?? "";
  const campaign = sp.get("campaign") ?? "";
  const adgroup = sp.get("adgroup") ?? "";
  const granularity = sp.get("g") ?? "day";

  const filteredCampaigns = media ? campaigns.filter((c) => c.media === media) : campaigns;
  const filteredAdgroups = campaign ? adgroups.filter((a) => a.campaignId === campaign) : [];

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Cascade cleanup: clearing an ancestor clears its descendants.
    if (key === "media") {
      params.delete("campaign");
      params.delete("adgroup");
    } else if (key === "campaign") {
      params.delete("adgroup");
    }
    startTransition(() => {
      router.replace(`/dashboard/${slug}/drill?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3 text-sm">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">媒体</label>
        <select
          value={media}
          onChange={(e) => update("media", e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">すべて</option>
          {medias.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">キャンペーン</label>
        <select
          value={campaign}
          onChange={(e) => update("campaign", e.target.value)}
          className="h-8 min-w-[200px] rounded-md border bg-background px-2 text-sm"
        >
          <option value="">すべて</option>
          {filteredCampaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">広告グループ</label>
        <select
          value={adgroup}
          onChange={(e) => update("adgroup", e.target.value)}
          disabled={!campaign}
          className="h-8 min-w-[200px] rounded-md border bg-background px-2 text-sm disabled:opacity-50"
        >
          <option value="">{campaign ? "すべて" : "先にキャンペーンを選択"}</option>
          {filteredAdgroups.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">集計単位</label>
        <div className="inline-flex rounded-md border">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => update("g", g)}
              className={`h-8 px-3 text-xs transition-colors ${
                granularity === g ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {g === "day" ? "日" : g === "week" ? "週" : "月"}
            </button>
          ))}
        </div>
      </div>
      {isPending && <span className="text-xs text-muted-foreground">更新中…</span>}
    </div>
  );
}
