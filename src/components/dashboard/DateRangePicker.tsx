"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange, ArrowLeftRight } from "lucide-react";
import ControlSelect from "@/components/dashboard/ControlSelect";
import ControlDateInput from "@/components/dashboard/ControlDateInput";
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
        <ControlSelect
          id="range-preset"
          aria-label="表示期間"
          icon={<CalendarRange />}
          value={preset}
          disabled={isPending}
          onChange={(e) => update({ preset: e.target.value })}
        >
          {PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </ControlSelect>
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-1.5">
          <label htmlFor="range-start" className="sr-only">
            開始日
          </label>
          <ControlDateInput
            id="range-start"
            aria-label="開始日"
            value={start}
            disabled={isPending}
            onChange={(e) => update({ start: e.target.value })}
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            〜
          </span>
          <label htmlFor="range-end" className="sr-only">
            終了日
          </label>
          <ControlDateInput
            id="range-end"
            aria-label="終了日"
            value={end}
            disabled={isPending}
            onChange={(e) => update({ end: e.target.value })}
          />
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <label
          htmlFor="range-compare"
          className="text-xs text-muted-foreground"
        >
          比較
        </label>
        <ControlSelect
          id="range-compare"
          aria-label="比較対象"
          icon={<ArrowLeftRight />}
          value={compare}
          disabled={isPending}
          onChange={(e) => update({ cmp: e.target.value })}
        >
          {COMPARES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </ControlSelect>
      </div>
      <span aria-live="polite" className="text-xs text-muted-foreground">
        {isPending ? "更新中…" : ""}
      </span>
    </div>
  );
}
