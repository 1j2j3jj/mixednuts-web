"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import type { MetricSource } from "@/lib/source";

interface Props {
  /**
   * Which sources the current page can show. Default is 2-way (Ads / Drill
   * don't have ECCUBE data). Overview passes ["ga4","media","eccube"] to
   * surface the 3-way choice. When ECCUBE sheet isn't configured for the
   * client, caller should omit "eccube" so the button isn't shown.
   */
  sources?: MetricSource[];
}

/**
 * Source-of-truth toggle. Writes to `?src=ga4|media|eccube` so deep-link /
 * reload preserves the choice. Each page decides which cards respect the
 * toggle (MediaTable / BigKpiCard / Funnel etc. read it via readSource).
 */
export default function SourceToggle({ sources = ["ga4", "media"] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const src = (sp.get("src") as MetricSource) ?? "ga4";

  const labelFor: Record<MetricSource, string> = {
    ga4: "GA4",
    media: "媒体",
    eccube: "ECCUBE",
  };

  function set(v: MetricSource) {
    const params = new URLSearchParams(sp.toString());
    if (v === "ga4") params.delete("src");
    else params.set("src", v);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1 text-xs"
      data-print-hide="true"
    >
      <span className="text-muted-foreground">表示値</span>
      <div className="inline-flex items-center gap-0.5 rounded-md border bg-muted p-0.5">
        {sources.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => set(v)}
            aria-pressed={src === v}
            className={`h-6 rounded border-[1.5px] px-3 text-xs font-medium transition-colors ${
              src === v
                ? "border-brand-ink bg-brand/14 text-brand-deep"
                : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground"
            }`}
          >
            {labelFor[v]}
          </button>
        ))}
      </div>
      {pending && <span className="text-muted-foreground">…</span>}
    </div>
  );
}
