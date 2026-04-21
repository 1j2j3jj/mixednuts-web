"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshClientData } from "@/app/(dashboard)/dashboard/[clientId]/actions";

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
      <Button size="sm" variant="outline" onClick={onClick} disabled={isPending} aria-label="Refresh">
        <RefreshCw className={isPending ? "animate-spin" : ""} />
        <span>{isPending ? "更新中…" : "更新"}</span>
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
