"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
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
      <div className="inline-flex rounded-md border">
        {REPORT_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => update(v.key)}
            className={`h-8 px-3 text-xs transition-colors ${
              active === v.key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {isPending && <span className="text-xs text-muted-foreground">更新中…</span>}
    </div>
  );
}
