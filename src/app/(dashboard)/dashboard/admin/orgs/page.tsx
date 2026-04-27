import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrganisations } from "../invites/actions";

/**
 * /admin/orgs — 全テナント一覧（運営 admin 専用）
 *
 * Stripe の connected-accounts 一覧に相当。
 * 各 org の現在のメンバー数・招待待ち数・quota 設定・クォータ残を表示。
 * 詳細は /admin/orgs/{slug} へ（既存 /admin/clients/[id] の再マッピング）。
 */
export const dynamic = "force-dynamic";

export default async function AdminOrgsPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const orgs = await listOrganisations();
  const orgBySlug = new Map(orgs.map((o) => [o.slug, o]));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            <Link href="/dashboard/admin" className="underline hover:text-foreground">Admin</Link>
            {" / "}Orgs
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">テナント一覧</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全 {CLIENT_IDS.length} テナント — Organization ごとの状態とクォータ
          </p>
        </div>
        <Link
          href="/dashboard/admin/invites"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          招待を発行
        </Link>
      </div>

      {/* Orgs table */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>テナント</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">メンバー</TableHead>
              <TableHead className="text-right">招待待ち</TableHead>
              <TableHead className="text-right">上限 (M/A)</TableHead>
              <TableHead className="text-right">ステータス</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CLIENT_IDS.map((id) => {
              const cfg = CLIENTS[id];
              const org = orgBySlug.get(cfg.slug);
              const memberCount = org?.memberCount ?? 0;
              const pendingCount = org?.pendingInviteCount ?? 0;

              return (
                <TableRow key={id}>
                  <TableCell>
                    <div className="font-medium text-neutral-900">{cfg.label}</div>
                    <div className="text-xs text-neutral-500">{cfg.subtitle}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-neutral-500">
                    {cfg.slug}
                  </TableCell>
                  <TableCell className="text-right text-sm">{memberCount}</TableCell>
                  <TableCell className="text-right text-sm">
                    {pendingCount > 0 ? (
                      <span className="text-amber-600">{pendingCount}</span>
                    ) : (
                      <span className="text-neutral-400">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-neutral-500">
                    {/* quota display — populated in Step 5 */}
                    <span className="text-neutral-400">—</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {!cfg.active ? (
                      <Badge variant="secondary">未稼働</Badge>
                    ) : org ? (
                      <Badge variant="success">有効</Badge>
                    ) : (
                      <Badge variant="outline">未作成</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {cfg.active && (
                        <Link
                          href={`/dashboard/${cfg.slug}`}
                          className="text-xs text-neutral-500 underline hover:text-neutral-900"
                        >
                          表示
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/admin/clients/${id}`}
                        className="text-xs text-neutral-900 underline hover:text-neutral-600"
                      >
                        設定 →
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-neutral-500">
        各テナントの詳細設定・クォータ変更・メンバー管理は「設定 →」から。
        招待発行は右上ボタンまたは{" "}
        <Link href="/dashboard/admin/invites" className="underline">招待管理ページ</Link>
        から行います。
      </p>
    </div>
  );
}
