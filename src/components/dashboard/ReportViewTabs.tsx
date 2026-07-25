"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";
import { REPORT_VIEWS, type ReportViewKey } from "@/lib/report-views";

interface Props {
  slug: string;
  active: ReportViewKey;
}

/**
 * Granularity switcher for the report screen. State lives in the URL
 * (?view=daily|media|cpn|adg) so deep links share the same view; all other
 * params (date range preset etc.) are preserved. Same button-group pattern
 * as DrillFilters' 集計単位 switcher.
 */
export default function ReportViewTabs({ slug, active }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(view: ReportViewKey) {
    const params = new URLSearchParams(sp.toString());
    if (view === "daily") params.delete("view");
    else params.set("view", view);
    startTransition(() => {
      const qs = params.toString();
      router.replace(`/dashboard/${slug}/report${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        value={active}
        options={REPORT_VIEWS.map((view) => ({
          value: view.key,
          label: view.label,
        }))}
        onValueChange={update}
        ariaLabel="レポート表示単位"
        size="md"
      />
      {isPending && <span className="text-xs text-muted-foreground">更新中…</span>}
    </div>
  );
}
