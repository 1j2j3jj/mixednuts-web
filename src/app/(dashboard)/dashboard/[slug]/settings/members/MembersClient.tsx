"use client";

import { useState, useTransition } from "react";
import { createTenantInvite, revokeTenantInvite } from "./actions";
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
  /** Whether the current viewer is admin (can revoke & see all controls) */
  isAdmin: boolean;
}

function roleLabel(role: string): string {
  if (role === "owner") return "オーナー";
  if (role === "admin") return "管理者";
  return "メンバー";
}

function roleBadgeVariant(role: string): "success" | "outline" | "secondary" {
  if (role === "owner") return "success";
  if (role === "admin") return "outline";
  return "secondary";
}

export default function MembersClient({
  slug,
  members,
  pendingInvites,
  maxMembers,
  maxAdmins,
  isAdmin,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteResult, setInviteResult] = useState<{
    ok: boolean;
    link?: string;
    error?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const totalMembers = members.length;
  const totalAdmins = members.filter(
    (m) => m.role === "admin" || m.role === "owner"
  ).length;

  const memberQuotaReached = maxMembers !== null && totalMembers >= maxMembers;
  const adminQuotaReached =
    inviteRole === "admin" && maxAdmins !== null && totalAdmins >= maxAdmins;
  const inviteDisabled = memberQuotaReached || adminQuotaReached || !isAdmin;

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteResult(null);
    startTransition(async () => {
      const res = await createTenantInvite(slug, inviteEmail, inviteRole);
      setInviteResult(res);
      if (res.ok) setInviteEmail("");
    });
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
          管理者:{" "}
          <span className="font-semibold">{totalAdmins}</span>
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
                  {isAdmin && <TableHead></TableHead>}
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
                    {isAdmin && (
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
      {isAdmin && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">
            新規招待
          </h2>

          {memberQuotaReached && (
            <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              メンバー上限（{maxMembers}名）に達しています。招待するには運営にお問い合わせください。
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={inviteDisabled}
              className="min-w-[220px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as "admin" | "member")
              }
              disabled={inviteDisabled}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="member">メンバー</option>
              <option value="admin">管理者</option>
            </select>
            <button
              type="submit"
              disabled={inviteDisabled || isPending}
              title={
                memberQuotaReached
                  ? "上限に達しています。運営にお問い合わせください。"
                  : adminQuotaReached
                  ? "管理者上限に達しています。"
                  : undefined
              }
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "送信中…" : "招待を発行"}
            </button>
          </form>

          {inviteResult && (
            <div
              className={`mt-3 rounded-md border px-4 py-3 text-sm ${
                inviteResult.ok
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
              }`}
            >
              {inviteResult.ok ? (
                <>
                  <span className="font-medium">招待リンクを発行しました。</span>
                  <br />
                  <code className="mt-1 block break-all text-xs">
                    {inviteResult.link}
                  </code>
                  <button
                    type="button"
                    onClick={() => inviteResult.link && handleCopy(inviteResult.link)}
                    className="mt-2 text-xs underline"
                  >
                    クリップボードにコピー
                  </button>
                </>
              ) : (
                inviteResult.error
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
