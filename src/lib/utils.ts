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

/** Format percentage (input is decimal: 0.12 -> 12.0%). */
export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

/** Format ratio where input is already a percentage number (300 -> 300%). */
export function fmtRatioPct(n: number | null | undefined, digits = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

/** Safe divide: returns null when denominator is 0 or nullish. */
export function safeDiv(num: number | null | undefined, den: number | null | undefined): number | null {
  if (num == null || den == null || den === 0) return null;
  return num / den;
}
