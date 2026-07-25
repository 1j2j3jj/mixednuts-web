import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format integer with thousands separator. */
export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("ja-JP");
}

/** Format currency in JPY. */
export function fmtJpy(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

/** Format percentage (input is decimal: 0.12 -> 12.0%). Thousands-separated
 *  (A-17): an extreme swing can push the formatted magnitude past 999 (e.g.
 *  a 1234% delta), same defect class as fmtRatioPct below — toLocaleString
 *  rounds to `digits` decimals exactly like the old toFixed did, it just
 *  also inserts the separator when the integer part warrants one. */
export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toLocaleString("ja-JP", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Format ratio where input is already a percentage number (300 -> 300%).
 *  Thousands-separated (A-17): giant blended-ROAS values render without a
 *  separator today — MSEC 30662%, dōzo 1555%, OGP 666% — confirmed on the
 *  live product. CEO decision: separators only, no x-multiple notation, no
 *  numerator redefinition (spec §2.1). toLocaleString with fixed
 *  min/maxFractionDigits reproduces toFixed's rounding exactly, so no
 *  rendered number's VALUE changes — only the separator is added. */
export function fmtRatioPct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("ja-JP", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

/** Safe divide: returns null when denominator is 0 or nullish. */
export function safeDiv(
  num: number | null | undefined,
  den: number | null | undefined,
): number | null {
  if (num == null || den == null || den === 0) return null;
  return num / den;
}
