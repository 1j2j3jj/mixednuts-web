import { fmtRatioPct } from "@/lib/utils";

export const ROAS_MULTIPLIER_THRESHOLD_PCT = 1_000;

export function formatRoas(valuePct: number | null): string {
  if (valuePct != null && valuePct > ROAS_MULTIPLIER_THRESHOLD_PCT) {
    return `×${Math.round(valuePct / 100).toLocaleString()}`;
  }
  return fmtRatioPct(valuePct, 0);
}
