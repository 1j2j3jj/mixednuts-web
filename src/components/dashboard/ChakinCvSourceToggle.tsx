"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";
import {
  normalizeChakinCvSource,
  type ChakinCvSource,
} from "@/lib/chakin-cv-source";

const OPTIONS: Array<{ value: ChakinCvSource; label: string }> = [
  { value: "graphene", label: "グラフェンCV" },
  { value: "ga4", label: "GA4CV" },
  { value: "media", label: "媒体CV" },
];

export default function ChakinCvSourceToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const cv = normalizeChakinCvSource(sp.get("cv"));

  function set(v: ChakinCvSource) {
    const params = new URLSearchParams(sp.toString());
    if (v === "graphene") params.delete("cv");
    else params.set("cv", v);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="inline-flex items-center gap-2 text-xs" data-print-hide="true">
      <span className="text-muted-foreground">CVソース</span>
      <SegmentedControl
        value={cv}
        options={OPTIONS}
        onValueChange={(v) => set(v as ChakinCvSource)}
        ariaLabel="CVソース"
      />
      {pending && <span className="text-muted-foreground">…</span>}
    </div>
  );
}
