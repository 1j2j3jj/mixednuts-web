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
    { href: `/dashboard/${slug}`, label: "サマリー" },
    { href: `/dashboard/${slug}/ads`, label: "広告詳細" },
    { href: `/dashboard/${slug}/drill`, label: "フィルター詳細" },
    { href: `/dashboard/${slug}/insights`, label: "商品・検索" },
    // メンバー = Org 内のユーザー招待・管理。
    // クライアント Org Owner/Admin と mixednuts admin の両方がアクセス可。
    // ページ側 (/settings/members) で role ベースの読み取り専用 vs 編集可を切替。
    { href: `/dashboard/${slug}/settings/members`, label: "メンバー" },
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
