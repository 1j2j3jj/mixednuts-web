"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";
import { cn } from "@/lib/utils";

interface Props {
  /** Client IDs the signed-in user is allowed to see. Empty when Clerk is not configured. */
  accessibleClientIds: string[];
}

export default function DashboardSidebar({ accessibleClientIds }: Props) {
  const pathname = usePathname() || "";
  const hasGate = accessibleClientIds.length > 0;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <Link href="/" className="flex h-14 items-center gap-2 border-b px-4">
        {/* Keep the brand mark small; do not use the full wordmark here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="mixednuts Inc." className="h-6 w-auto" />
        <span className="text-sm font-semibold tracking-tight">mixednuts</span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Clients
        </div>
        <ul className="space-y-0.5">
          {CLIENT_IDS.map((id: ClientId) => {
            const c = CLIENTS[id];
            // If Clerk is on, hide clients the user can't access.
            // If Clerk is off (dev), show all so the UI is navigable.
            const allowed = !hasGate || accessibleClientIds.includes(id);
            if (!allowed) return null;

            const href = c.active ? `/dashboard/${id}` : undefined;
            const isActive = pathname === href || pathname.startsWith(`/dashboard/${id}/`);
            const base =
              "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors";
            const inner = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{c.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.subtitle}</span>
                </span>
                {!c.active && (
                  <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Soon
                  </span>
                )}
              </>
            );
            if (href) {
              return (
                <li key={id}>
                  <Link
                    href={href}
                    className={cn(base, "hover:bg-accent", isActive && "bg-accent text-accent-foreground")}
                  >
                    {inner}
                  </Link>
                </li>
              );
            }
            return (
              <li key={id}>
                <div className={cn(base, "cursor-not-allowed opacity-60")}>{inner}</div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-3 text-[10px] leading-relaxed text-muted-foreground">
        Phase 1 MVP · Google Sheets
      </div>
    </aside>
  );
}
