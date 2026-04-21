/**
 * Date-range + comparison resolver. Pure functions. Kept framework-free so
 * it can be imported from both server pages and the client picker.
 *
 * URL params:
 *   ?preset=<PresetKey>
 *   ?cmp=<CompareKey>
 * When either is missing the caller's `defaults` fill in. When `preset` is
 * "custom" the `start` / `end` params are read instead.
 */

export const PRESETS = [
  { key: "last7", label: "直近7日" },
  { key: "last28", label: "直近28日" },
  { key: "thisMonth", label: "当月" },
  { key: "lastMonth", label: "先月" },
  { key: "last3m", label: "過去3ヶ月" },
  { key: "last6m", label: "過去6ヶ月" },
  { key: "last12m", label: "過去12ヶ月" },
  { key: "custom", label: "カスタム" },
] as const;

export const COMPARES = [
  { key: "prev", label: "前期間" },
  { key: "prevYear", label: "前年同期" },
  { key: "none", label: "比較なし" },
] as const;

export type PresetKey = (typeof PRESETS)[number]["key"];
export type CompareKey = (typeof COMPARES)[number]["key"];

export interface DateRange {
  start: string; // ISO yyyy-mm-dd
  end: string; // ISO yyyy-mm-dd, inclusive
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}
function addMonths(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return toIso(d);
}
function startOfMonth(iso: string): string {
  const d = parseIso(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}
function endOfMonth(iso: string): string {
  const d = parseIso(iso);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Days between two ISO dates (inclusive). */
export function rangeLength(r: DateRange): number {
  const s = parseIso(r.start).getTime();
  const e = parseIso(r.end).getTime();
  return Math.round((e - s) / 86_400_000) + 1;
}

export function presetLabel(p: PresetKey): string {
  return PRESETS.find((x) => x.key === p)?.label ?? p;
}
export function compareLabel(c: CompareKey): string {
  return COMPARES.find((x) => x.key === c)?.label ?? c;
}

/** Resolve a preset into a concrete DateRange anchored at `anchor` (the
 *  latest data date). End is inclusive. For "custom" the caller must
 *  provide explicit start/end via the custom override. */
export function resolvePreset(preset: PresetKey, anchor: string, custom?: DateRange): DateRange {
  switch (preset) {
    case "last7":
      return { start: addDays(anchor, -6), end: anchor };
    case "last28":
      return { start: addDays(anchor, -27), end: anchor };
    case "thisMonth":
      return { start: startOfMonth(anchor), end: anchor };
    case "lastMonth": {
      const prevAny = addMonths(anchor, -1);
      return { start: startOfMonth(prevAny), end: endOfMonth(prevAny) };
    }
    case "last3m":
      return { start: addMonths(anchor, -3), end: anchor };
    case "last6m":
      return { start: addMonths(anchor, -6), end: anchor };
    case "last12m":
      return { start: addMonths(anchor, -12), end: anchor };
    case "custom":
      if (custom && custom.start && custom.end) return custom;
      // Fallback when custom lacks one endpoint — treat as last28.
      return { start: addDays(anchor, -27), end: anchor };
  }
}

/** Resolve a comparison window relative to `cur`. */
export function resolveCompare(compare: CompareKey, cur: DateRange): DateRange | null {
  if (compare === "none") return null;
  if (compare === "prev") {
    const len = rangeLength(cur);
    return { end: addDays(cur.start, -1), start: addDays(cur.start, -len) };
  }
  // prevYear: shift both endpoints by -1 year.
  return {
    start: addMonths(cur.start, -12),
    end: addMonths(cur.end, -12),
  };
}

export interface ResolvedRange {
  anchor: string;
  preset: PresetKey;
  compare: CompareKey;
  current: DateRange;
  previous: DateRange | null;
  compareLabel: string;
  presetLabel: string;
}

/** One-call resolver for server pages. Reads `?preset=`, `?cmp=`, and when
 *  preset=custom also `?start=` / `?end=`. */
export function resolveFromSearchParams(
  sp: { preset?: string; cmp?: string; start?: string; end?: string },
  defaults: { preset: PresetKey; compare: CompareKey },
  anchor: string
): ResolvedRange {
  const preset = (PRESETS.find((p) => p.key === sp.preset)?.key ?? defaults.preset) as PresetKey;
  const compare = (COMPARES.find((c) => c.key === sp.cmp)?.key ?? defaults.compare) as CompareKey;
  const custom =
    preset === "custom" && sp.start && sp.end ? { start: sp.start, end: sp.end } : undefined;
  const current = resolvePreset(preset, anchor, custom);
  const previous = resolveCompare(compare, current);
  return {
    anchor,
    preset,
    compare,
    current,
    previous,
    compareLabel: compareLabel(compare),
    presetLabel: presetLabel(preset),
  };
}
