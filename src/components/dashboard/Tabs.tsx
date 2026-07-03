"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  /** Show the レポート tab (BQ rpt_* views) — only clients with rpt_* marts
   *  (dozo / hs). Decided server-side in layout.tsx via isRptSupported. */
  showReport?: boolean;
  /** Show the メンバー / 目標設定 タブ — 編集者以上（owner/admin/editor +
   *  mixednuts admin）の場合のみ。layout.tsx が getViewerOrgRole →
   *  canInviteMembers で決定（2026-07-03）。目標設定も同じ編集者ゲート
   *  （閲覧者=member はタブ非表示・直URLはリダイレクト・操作はサーバ拒否）。 */
  showMembers?: boolean;
}

export default function DashboardTabs({ slug, showReport = false, showMembers = true }: Props) {
  const pathname = usePathname() || "";
  // Carry the active date-range selection (?preset/?cmp/?start/?end, managed by
  // DateRangePicker) onto every tab link so the period survives tab navigation —
  // matches Google Ads / Meta Ads where the date chip is global. Without this the
  // <Link> drops the query and each page falls back to its default range.
  const sp = useSearchParams();
  const qs = sp.toString();
  const tabs: Array<{ href: string; label: string }> = [
    { href: `/dashboard/${slug}`, label: "サマリー" },
    { href: `/dashboard/${slug}/ads`, label: "広告詳細" },
    { href: `/dashboard/${slug}/drill`, label: "フィルター詳細" },
    ...(showReport
      ? [{ href: `/dashboard/${slug}/report`, label: "レポート" }]
      : []),
    { href: `/dashboard/${slug}/insights`, label: "商品・検索" },
    // メンバー = Org 内のユーザー招待・管理。org内ロール member には非表示
    //（直URLも members/page.tsx がリダイレクト、操作は actions.ts が拒否）。
    ...(showMembers
      ? [{ href: `/dashboard/${slug}/settings/members`, label: "メンバー" }]
      : []),
    // 目標設定 = 月次目標の自己アップロード。編集者以上のみ（メンバーと同ゲート）。
    // 閲覧者=member には非表示（直URLは targets/page.tsx がリダイレクト、
    // 操作は actions.ts の assertCanEditTargets が拒否）。
    ...(showMembers
      ? [{ href: `/dashboard/${slug}/settings/targets`, label: "目標設定" }]
      : []),
  ];
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const isActive =
          t.href === `/dashboard/${slug}`
            ? pathname === t.href
            : pathname.startsWith(t.href);
        const href = qs ? `${t.href}?${qs}` : t.href;
        return (
          <Link
            key={t.href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative rounded-sm px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
