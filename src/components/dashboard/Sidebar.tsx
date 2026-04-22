"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";
import { cn } from "@/lib/utils";

type ViewerKind = "admin" | "client" | "none";

interface Props {
  /** Admin viewers see every active account and the Admin index link.
   *  Client viewers see only the account that matches their credential
   *  (clientSlug) — no other tenants leak into the sidebar.
   *  "none" is the dev-time fallback (no auth configured) and shows the
   *  full list so scaffolding still works. */
  viewerKind: ViewerKind;
  /** Slug of the currently-authenticated client (required when kind="client"). */
  clientSlug?: string | null;
}

export default function DashboardSidebar({ viewerKind, clientSlug }: Props) {
  const pathname = usePathname() || "";

  // Compute the visible accounts list. For clients, scope to own tenant only.
  const visibleIds: ClientId[] =
    viewerKind === "client"
      ? CLIENT_IDS.filter((id) => CLIENTS[id].slug === clientSlug)
      : CLIENT_IDS;

  const showAdminLink = viewerKind === "admin" || viewerKind === "none";

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-card">
      <Link href="/" className="flex h-14 items-center gap-2 border-b px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="mixednuts Inc." className="h-6 w-auto" />
        <span className="text-sm font-semibold tracking-tight">mixednuts</span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {viewerKind === "client" ? "Dashboard" : "Accounts"}
        </div>
        <ul className="space-y-0.5">
          {visibleIds.map((id) => {
            const c = CLIENTS[id];
            const href = c.active ? `/dashboard/${c.slug}` : undefined;
            const isActive = pathname.startsWith(`/dashboard/${c.slug}`);
            // Admin sees opaque slug tails (avoids inadvertently shoulder
            // -surfing tenant names off the CEO's screen). Clients see their
            // own name since they already know who they are.
            const label =
              viewerKind === "client" ? c.label : `Account · ${c.slug.slice(-4)}`;
            const base =
              "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors";
            const inner = (
              <>
                <span className="truncate font-medium">{label}</span>
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

        {showAdminLink && (
          <div className="mt-4 px-2 text-xs">
            <Link href="/dashboard" className="text-muted-foreground hover:underline">
              ← Admin index
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t p-3 text-[10px] leading-relaxed text-muted-foreground">
        Phase 1 · multi-tenant
      </div>
    </aside>
  );
}
