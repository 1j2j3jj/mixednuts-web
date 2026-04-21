"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
}

export default function DashboardTabs({ slug }: Props) {
  const pathname = usePathname() || "";
  const tabs: Array<{ href: string; label: string }> = [
    { href: `/dashboard/${slug}`, label: "Overview" },
    { href: `/dashboard/${slug}/ads`, label: "Ads" },
    { href: `/dashboard/${slug}/drill`, label: "Drilldown" },
  ];
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const isActive =
          t.href === `/dashboard/${slug}`
            ? pathname === t.href
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "relative px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
