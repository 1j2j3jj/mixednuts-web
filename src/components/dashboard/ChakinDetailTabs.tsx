"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import SegmentedControl from "@/components/dashboard/SegmentedControl";

export type ChakinDetailView = "media" | "campaign";

interface Props {
  slug: string;
  active: ChakinDetailView;
}

/**
 * Chakin-specific breakdown switcher (媒体別 / キャンペーン別).
 * Query state lives in `?detail=` and preserves all other date params.
 */
export default function ChakinDetailTabs({ slug, active }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(view: ChakinDetailView) {
    const params = new URLSearchParams(sp.toString());
    if (view === "media") params.delete("detail");
    else params.set("detail", view);

    startTransition(() => {
      const qs = params.toString();
      router.replace(`/dashboard/${slug}${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <SegmentedControl
        value={active}
        options={[
          { value: "media", label: "媒体別" },
          { value: "campaign", label: "キャンペーン別" },
        ]}
        onValueChange={(v) => update(v as ChakinDetailView)}
        ariaLabel="Chakin内訳切替"
        size="md"
      />
      {isPending && <span className="text-xs text-muted-foreground">更新中…</span>}
    </div>
  );
}
