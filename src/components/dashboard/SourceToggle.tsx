"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export type MetricSource = "ga4" | "media";

/**
 * Two-state switch used on Ads / Drill to flip CV / 売上 / CPA / ROAS /
 * 商品単価 between GA4-side (default) and 媒体-side (ad-platform reported)
 * values. Writes to `?src=ga4|media` so deep-link / reload preserves choice.
 */
export default function SourceToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const src = (sp.get("src") as MetricSource) ?? "ga4";

  function set(v: MetricSource) {
    const params = new URLSearchParams(sp.toString());
    if (v === "ga4") params.delete("src");
    else params.set("src", v);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="inline-flex items-center gap-1 text-xs" data-print-hide="true">
      <span className="text-muted-foreground">表示値</span>
      <div className="inline-flex overflow-hidden rounded-md border">
        {(
          [
            { v: "ga4" as const, label: "GA4" },
            { v: "media" as const, label: "媒体" },
          ]
        ).map(({ v, label }) => (
          <button
            key={v}
            type="button"
            onClick={() => set(v)}
            className={`h-7 px-3 text-xs transition-colors ${
              src === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {pending && <span className="text-muted-foreground">…</span>}
    </div>
  );
}

/** Helper to read the source from a server component's searchParams. */
export function readSource(sp: { src?: string }): MetricSource {
  return sp.src === "media" ? "media" : "ga4";
}
