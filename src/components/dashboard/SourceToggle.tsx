"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";
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
  const options = sources.map((value) => ({
    value,
    label: labelFor[value],
  }));

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
      <SegmentedControl
        value={src}
        options={options}
        onValueChange={set}
        ariaLabel="表示値"
      />
      {pending && <span className="text-muted-foreground">…</span>}
    </div>
  );
}
