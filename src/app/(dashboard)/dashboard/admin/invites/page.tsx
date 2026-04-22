import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import InviteForm, { RevokeButton } from "./InviteForm";
import { listOrganisations, listPendingInvites, type OrgSummary } from "./actions";

/**
 * Better Auth Organization invitation panel — admin only.
 *
 * Lists every BA organisation, shows member + pending-invite counts,
 * and provides a form to issue new invitations. Auto-creates an org
 * for each active client on first invite (handled inside `createInvite`).
 *
 * Email sending is stubbed for v1 — the admin copy/pastes the magic
 * link from the table to send via Slack / mail. Once Resend is wired
 * the pending-invites table will say "Sent" instead of "Copy link".
 */
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const [orgs, pending] = await Promise.all([listOrganisations(), listPendingInvites()]);

  const orgBySlug = new Map<string, OrgSummary>();
  for (const o of orgs) orgBySlug.set(o.slug, o);

  const clientOptions = CLIENT_IDS.filter((id) => CLIENTS[id].active).map((id) => ({
    id,
    label: CLIENTS[id].label,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <div className="text-xs text-neutral-500">
          <Link href="/dashboard/admin" className="underline">
            ← Admin Panel
          </Link>
        </div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">招待管理</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Better Auth の Organization 招待フローでクライアント担当者にダッシュボードのアクセス権を発行します。
          発行直後はリンクが画面に表示されるので、Slack / メールで送付してください
          （メール自動送信は今後実装予定）。
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">新規招待を発行</CardTitle>
        </CardHeader>
        <CardContent>
          <InviteForm clients={clientOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">クライアント別 Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>クライアント</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">メンバー</TableHead>
                <TableHead className="text-right">承認待ち</TableHead>
                <TableHead className="text-right">ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENT_IDS.map((id) => {
                const cfg = CLIENTS[id];
                const o = orgBySlug.get(cfg.slug);
                return (
                  <TableRow key={id}>
                    <TableCell>
                      <div className="font-medium text-neutral-900">{cfg.label}</div>
                      <div className="text-xs text-neutral-500">{cfg.subtitle}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{cfg.slug}</TableCell>
                    <TableCell className="text-right">{o?.memberCount ?? 0}</TableCell>
                    <TableCell className="text-right">{o?.pendingInviteCount ?? 0}</TableCell>
                    <TableCell className="text-right">
                      {!cfg.active ? (
                        <Badge variant="secondary">未稼働</Badge>
                      ) : o ? (
                        <Badge>有効</Badge>
                      ) : (
                        <Badge variant="outline">未作成</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-neutral-500">
            ※「未作成」の状態でも、上のフォームから招待を発行すれば自動的に Organization が作成されます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">承認待ち招待 ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-xs text-neutral-500">承認待ちの招待はありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>招待先</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>招待リンク</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email}</TableCell>
                    <TableCell>{p.role === "admin" ? "管理者" : "閲覧者"}</TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {p.expiresAt.toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <code className="block max-w-md truncate rounded bg-neutral-50 px-2 py-1 text-xs text-neutral-700">
                        {p.link}
                      </code>
                    </TableCell>
                    <TableCell>
                      <RevokeButton id={p.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
