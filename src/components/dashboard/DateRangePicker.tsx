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
  defaultPreset = "thisMonth",
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
    <div
      className={`flex flex-wrap items-center gap-2 text-sm transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
      data-print-hide="true"
      aria-busy={isPending}
    >
      <div className="flex items-center gap-1.5">
        <label htmlFor="range-preset" className="text-xs text-muted-foreground">
          期間
        </label>
        <select
          id="range-preset"
          aria-label="表示期間"
          value={preset}
          disabled={isPending}
          onChange={(e) => update({ preset: e.target.value })}
          className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
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
            aria-label="開始日"
            value={start}
            disabled={isPending}
            onChange={(e) => update({ start: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">〜</span>
          <input
            type="date"
            aria-label="終了日"
            value={end}
            disabled={isPending}
            onChange={(e) => update({ end: e.target.value })}
            className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <label htmlFor="range-compare" className="text-xs text-muted-foreground">
          比較
        </label>
        <select
          id="range-compare"
          aria-label="比較対象"
          value={compare}
          disabled={isPending}
          onChange={(e) => update({ cmp: e.target.value })}
          className="h-8 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
        >
          {COMPARES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {isPending ? "更新中…" : ""}
      </span>
    </div>
  );
}
