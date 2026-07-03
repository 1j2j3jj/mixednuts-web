"use client";

import { useState, useTransition } from "react";
import { createTenantInvites, revokeTenantInvite, type BulkInviteResult } from "./actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TenantMember, PendingInvite } from "./actions";

interface Props {
  slug: string;
  members: TenantMember[];
  pendingInvites: PendingInvite[];
  maxMembers: number | null;
  maxAdmins: number | null;
  /** 編集者以上か（招待フォーム + 招待取消の表示可否）。 */
  canInvite: boolean;
}

function roleLabel(role: string): string {
  if (role === "owner") return "オーナー";
  if (role === "admin" || role === "editor") return "編集者";
  return "閲覧者";
}

function roleBadgeVariant(role: string): "success" | "outline" | "secondary" {
  if (role === "owner") return "success";
  if (role === "admin" || role === "editor") return "outline";
  return "secondary";
}

export default function MembersClient({
  slug,
  members,
  pendingInvites,
  maxMembers,
  maxAdmins,
  canInvite,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "member">("member");
  const [bulkResult, setBulkResult] = useState<BulkInviteResult | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const totalMembers = members.length;
  const totalEditors = members.filter(
    (m) => m.role === "editor" || m.role === "admin" || m.role === "owner"
  ).length;

  const memberQuotaReached = maxMembers !== null && totalMembers >= maxMembers;
  const editorQuotaReached =
    inviteRole === "editor" && maxAdmins !== null && totalEditors >= maxAdmins;
  const inviteDisabled = memberQuotaReached || editorQuotaReached || !canInvite;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setBulkResult(null);
    setCopiedAll(false);
    startTransition(async () => {
      const res = await createTenantInvites(slug, inviteEmail, inviteRole);
      setBulkResult(res);
      // 全件が作成済み or skip（=残す理由なし）なら入力欄をクリア。
      if (res.ok && res.items.every((i) => i.ok || i.skipped)) setInviteEmail("");
    });
  }

  async function handleCopyAll() {
    const links = (bulkResult?.items ?? [])
      .filter((i) => i.ok && i.link)
      .map((i) => i.link as string);
    if (links.length === 0) return;
    try {
      await navigator.clipboard.writeText(links.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      // ignore
    }
  }

  function handleRevoke(invitationId: string) {
    setRevokeError(null);
    startTransition(async () => {
      const res = await revokeTenantInvite(slug, invitationId);
      if (!res.ok) setRevokeError(res.error ?? "取消に失敗しました");
      else window.location.reload();
    });
  }

  async function handleCopy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Quota summary */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
        <span className="text-neutral-600">
          メンバー:{" "}
          <span className={memberQuotaReached ? "font-semibold text-rose-600" : "font-semibold"}>
            {totalMembers}
          </span>
          {maxMembers !== null && (
            <span className="text-neutral-400"> / {maxMembers}</span>
          )}
        </span>
        <span className="text-neutral-600">
          編集者:{" "}
          <span className="font-semibold">{totalEditors}</span>
          {maxAdmins !== null && (
            <span className="text-neutral-400"> / {maxAdmins}</span>
          )}
        </span>
        {pendingInvites.length > 0 && (
          <span className="text-amber-600">
            招待承認待ち: {pendingInvites.length}
          </span>
        )}
      </div>

      {/* Current members */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          メンバー一覧
        </h2>
        <div className="rounded-lg border border-neutral-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ロール</TableHead>
                <TableHead>参加日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-sm text-neutral-400"
                  >
                    メンバーがまだいません
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name || "—"}</TableCell>
                    <TableCell className="text-sm text-neutral-600">{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(m.role)}>
                        {roleLabel(m.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {new Date(m.joinedAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">
            承認待ち招待
          </h2>
          {revokeError && (
            <p className="mb-2 text-sm text-rose-600">{revokeError}</p>
          )}
          <div className="rounded-lg border border-neutral-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>招待先</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>招待リンク</TableHead>
                  {canInvite && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(inv.role ?? "member")}>
                        {roleLabel(inv.role ?? "member")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {new Date(inv.expiresAt).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleCopy(inv.link)}
                        className="rounded bg-neutral-100 px-2 py-1 text-xs font-mono text-neutral-700 hover:bg-neutral-200"
                      >
                        {copiedLink === inv.link ? "コピーしました！" : "リンクをコピー"}
                      </button>
                    </TableCell>
                    {canInvite && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleRevoke(inv.id)}
                          disabled={isPending}
                          className="text-xs text-rose-600 underline hover:text-rose-800 disabled:opacity-40"
                        >
                          取消
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Invite form */}
      {canInvite && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">
            新規招待
          </h2>

          {memberQuotaReached && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              メンバー上限（{maxMembers}名）に達しています。招待するには運営にお問い合わせください。
            </div>
          )}

          <p className="mb-2 text-xs text-muted-foreground">
            複数のメールアドレスを貼り付け可（改行・カンマ・スペース区切り）。まとめて 1 つのロールで招待します。
          </p>
          <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <textarea
              required
              rows={3}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={"email@example.com\nother@example.com（複数可）"}
              disabled={inviteDisabled}
              className="min-w-[220px] flex-1 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex gap-2 sm:flex-col">
              <select
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "editor" | "member")
                }
                disabled={inviteDisabled}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="member">閲覧者</option>
                <option value="editor">編集者</option>
              </select>
              <button
                type="submit"
                disabled={inviteDisabled || isPending}
                title={
                  memberQuotaReached
                    ? "上限に達しています。運営にお問い合わせください。"
                    : editorQuotaReached
                    ? "編集者上限に達しています。"
                    : undefined
                }
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "送信中…" : "招待を発行"}
              </button>
            </div>
          </form>

          {bulkResult && (
            <div className="mt-3 space-y-2">
              {bulkResult.error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {bulkResult.error}
                </div>
              )}
              {bulkResult.items.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      発行 {bulkResult.items.filter((i) => i.ok).length} 件 / スキップ・失敗{" "}
                      {bulkResult.items.filter((i) => !i.ok).length} 件
                    </span>
                    {bulkResult.items.some((i) => i.ok && i.link) && (
                      <button
                        type="button"
                        onClick={handleCopyAll}
                        className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                      >
                        {copiedAll ? "コピーしました！" : "全リンクをコピー"}
                      </button>
                    )}
                  </div>
                  <div className="rounded-md border border-neutral-200 bg-white">
                    <ul className="divide-y divide-neutral-100 text-sm">
                      {bulkResult.items.map((item) => (
                        <li key={item.email} className="flex flex-wrap items-center gap-2 px-3 py-2">
                          <span className="min-w-[180px] flex-1 font-medium">{item.email}</span>
                          {item.ok && item.link ? (
                            <>
                              <code className="max-w-full break-all text-xs text-neutral-500">
                                {item.link}
                              </code>
                              <button
                                type="button"
                                onClick={() => item.link && handleCopy(item.link)}
                                className="text-xs underline"
                              >
                                {copiedLink === item.link ? "コピー済" : "コピー"}
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-xs ${
                                item.skipped ? "text-amber-700" : "text-rose-600"
                              }`}
                            >
                              {item.error ?? "失敗"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    発行したリンクを Slack / メールで送付してください（自動メール送信は近日対応予定）。
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
