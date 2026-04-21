"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { PRESETS, COMPARES } from "@/lib/range";

interface Props {
  /** Default preset if the URL doesn't set one. */
  defaultPreset?: (typeof PRESETS)[number]["key"];
  /** Default compare if the URL doesn't set one. */
  defaultCompare?: (typeof COMPARES)[number]["key"];
}

/**
 * Two-dropdown picker for date range preset + comparison. Writes directly to
 * URL searchParams so the selection is shareable and survives hard reloads.
 */
export default function DateRangePicker({
  defaultPreset = "last28",
  defaultCompare = "prev",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const preset = sp.get("preset") ?? defaultPreset;
  const compare = sp.get("cmp") ?? defaultCompare;
  const start = sp.get("start") ?? "";
  const end = sp.get("end") ?? "";

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") params.delete(k);
      else params.set(k, v);
    }
    // Clear custom dates when preset != custom, to keep the URL tidy.
    if (patch.preset && patch.preset !== "custom") {
      params.delete("start");
      params.delete("end");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-print-hide="true">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">期間</label>
        <select
          value={preset}
          onChange={(e) => update({ preset: e.target.value })}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={start}
            onChange={(e) => update({ start: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
          <span className="text-xs text-muted-foreground">〜</span>
          <input
            type="date"
            value={end}
            onChange={(e) => update({ end: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm"
          />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted-foreground">比較</label>
        <select
          value={compare}
          onChange={(e) => update({ cmp: e.target.value })}
          className="h-8 rounded-md border bg-background px-2 text-sm"
        >
          {COMPARES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      {isPending && <span className="text-xs text-muted-foreground">更新中…</span>}
    </div>
  );
}
