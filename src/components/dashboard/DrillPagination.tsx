"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  slug: string;
  currentPage: number;
  pageCount: number;
}

/**
 * Prev/Next control for the drill table's row window (G-3b, 2026-07-26).
 * State lives in the `dpage` URL searchParam — same pattern as
 * DrillFilters.tsx (facet filters) and DateRangePicker.tsx (period/compare):
 * router.replace() + useTransition() so the transition is a soft
 * client-side navigation, plus an always-mounted aria-live="polite" region
 * that announces "更新中…" while pending and clears when settled — the
 * exact convention Phase E established (see DrillFilters.tsx's E-4 comment)
 * rather than a bespoke pattern for this one control.
 *
 * This is deliberately the ONLY thing that changes: the full row set is
 * still computed and sorted server-side before this ever renders (see
 * @/lib/dashboard/drill-shared's paginateDrillRows) — clicking Prev/Next
 * only changes which already-sorted slice the next response renders.
 */
export default function DrillPagination({
  slug,
  currentPage,
  pageCount,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function goTo(page: number) {
    const clamped = Math.min(Math.max(1, page), pageCount);
    const params = new URLSearchParams(sp.toString());
    if (clamped <= 1) params.delete("dpage");
    else params.set("dpage", String(clamped));
    startTransition(() => {
      router.replace(`/dashboard/${slug}/drill?${params.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 w-6 p-0"
        onClick={() => goTo(currentPage - 1)}
        disabled={currentPage <= 1 || isPending}
        aria-label="前のページ"
      >
        <ChevronLeft aria-hidden="true" className="h-3 w-3" />
      </Button>
      <span className="tabular-nums">
        {currentPage} / {pageCount} ページ
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 w-6 p-0"
        onClick={() => goTo(currentPage + 1)}
        disabled={currentPage >= pageCount || isPending}
        aria-label="次のページ"
      >
        <ChevronRight aria-hidden="true" className="h-3 w-3" />
      </Button>
      <span aria-live="polite" className="text-muted-foreground">
        {isPending ? "更新中…" : ""}
      </span>
    </div>
  );
}
