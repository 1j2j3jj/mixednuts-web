"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface Props {
  slug: string;
  /** Unique media values available for filter. */
  medias: string[];
  campaigns: Array<{ id: string; name: string; media: string }>;
}

/**
 * Filter bar for the drilldown screen. State lives in URL searchParams so
 * deep links share the same view. Uses plain <select> elements to avoid
 * pulling in a form library for the Phase 1 sample.
 */
export default function DrillFilters({ slug, medias, campaigns }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const media = sp.get("media") ?? "";
  const campaign = sp.get("campaign") ?? "";
  const brandGeneral = sp.get("bg") ?? "";
  const granularity = sp.get("g") ?? "day";

  const filteredCampaigns = media ? campaigns.filter((c) => c.media === media) : campaigns;

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Reset dependent filters when media changes.
    if (key === "media") params.delete("campaign");
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
        <label className="mb-1 block text-xs text-muted-foreground">Brand/General</label>
        <select
          value={brandGeneral}
          onChange={(e) => update("bg", e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">すべて</option>
          <option value="Brand">Brand</option>
          <option value="General">General</option>
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
