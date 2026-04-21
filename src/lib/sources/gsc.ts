import "server-only";
import type { ClientConfig } from "@/config/clients";

/**
 * GSC mock. Phase 2 will swap in `searchanalytics.query`. Minimal shape —
 * the Overview screen only consumes aggregate monthly clicks/impressions
 * for the blended click-to-session ratio.
 */

export interface GscMonth {
  yearMonth: string;
  clicks: number;
  impressions: number;
  avgPosition: number;
}

export function getGscMonthly(_client: ClientConfig): GscMonth[] {
  const anchor = new Date("2026-04-21T00:00:00Z");
  const rows: GscMonth[] = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(anchor);
    d.setUTCMonth(d.getUTCMonth() - m);
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seasonal = 1 + Math.sin((d.getUTCMonth() / 12) * Math.PI * 2) * 0.2;
    rows.push({
      yearMonth: ym,
      clicks: Math.round(180_000 * seasonal),
      impressions: Math.round(2_400_000 * seasonal),
      avgPosition: Number((7.5 + Math.sin(m) * 0.4).toFixed(1)),
    });
  }
  return rows;
}
