"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Megaphone, Layers, ListTree } from "lucide-react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";
import ControlSelect from "@/components/dashboard/ControlSelect";

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
export default function DrillFilters({
  slug,
  medias,
  campaigns,
  adgroups,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const media = sp.get("media") ?? "";
  const campaign = sp.get("campaign") ?? "";
  const adgroup = sp.get("adgroup") ?? "";
  const granularity = sp.get("g") ?? "day";

  const filteredCampaigns = media
    ? campaigns.filter((c) => c.media === media)
    : campaigns;
  const filteredAdgroups = campaign
    ? adgroups.filter((a) => a.campaignId === campaign)
    : [];

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
        <label
          htmlFor="drill-media"
          className="mb-1 block text-xs text-muted-foreground"
        >
          媒体
        </label>
        <ControlSelect
          id="drill-media"
          icon={<Megaphone />}
          value={media}
          onChange={(e) => update("media", e.target.value)}
        >
          <option value="">すべて</option>
          {medias.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </ControlSelect>
      </div>
      <div>
        <label
          htmlFor="drill-campaign"
          className="mb-1 block text-xs text-muted-foreground"
        >
          キャンペーン
        </label>
        <ControlSelect
          id="drill-campaign"
          icon={<Layers />}
          value={campaign}
          onChange={(e) => update("campaign", e.target.value)}
          wrapperClassName="min-w-[200px]"
          className="w-full"
        >
          <option value="">すべて</option>
          {filteredCampaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </ControlSelect>
      </div>
      <div>
        <label
          htmlFor="drill-adgroup"
          className="mb-1 block text-xs text-muted-foreground"
        >
          広告グループ
        </label>
        <ControlSelect
          id="drill-adgroup"
          icon={<ListTree />}
          value={adgroup}
          onChange={(e) => update("adgroup", e.target.value)}
          disabled={!campaign}
          wrapperClassName="min-w-[200px]"
          className="w-full"
        >
          <option value="">
            {campaign ? "すべて" : "先にキャンペーンを選択"}
          </option>
          {filteredAdgroups.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </ControlSelect>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          集計単位
        </label>
        <SegmentedControl
          value={granularity}
          options={[
            { value: "day", label: "日" },
            { value: "week", label: "週" },
            { value: "month", label: "月" },
          ]}
          onValueChange={(value) => update("g", value)}
          ariaLabel="集計単位"
          size="md"
        />
      </div>
      {/* E-4: was conditionally MOUNTED (only present in the DOM while
          pending), which some screen readers miss entirely — an aria-live
          region only reliably announces changes to content already present
          when the change happens. Always rendered now, matching
          DateRangePicker's identical pattern; empty text when not pending is
          visually and behaviourally unchanged from the old absent element. */}
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {isPending ? "更新中…" : ""}
      </span>
    </div>
  );
}
