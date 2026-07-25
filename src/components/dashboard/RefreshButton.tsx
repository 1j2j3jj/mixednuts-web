"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshClientData } from "@/app/(dashboard)/dashboard/actions";

interface Props {
  clientId: string;
}

export default function RefreshButton({ clientId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await refreshClientData(clientId);
      if (!res.ok) {
        setError(res.message ?? "refresh failed");
        return;
      }
      // Pull fresh server-rendered data into the current view.
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* E-4: a static aria-label always wins over an element's visible text
          content when computing its accessible name, so this button was
          permanently announced as "更新" even while pending/"更新中…" was
          visible — the state change was silent to screen reader users. The
          aria-label is dropped (the visible text "更新"/"更新中…" already IS
          a correct accessible name on its own) and aria-live="polite" makes
          the transition itself get announced, matching the pattern
          DateRangePicker's live region already uses elsewhere. */}
      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        disabled={isPending}
        aria-live="polite"
        className="transition-colors hover:border-brand hover:text-brand-ink"
      >
        <RefreshCw
          aria-hidden="true"
          className={isPending ? "animate-spin motion-reduce:animate-none" : ""}
        />
        <span>{isPending ? "更新中…" : "更新"}</span>
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
