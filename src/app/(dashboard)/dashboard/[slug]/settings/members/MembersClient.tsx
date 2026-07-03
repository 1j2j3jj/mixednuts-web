"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTenantInvites, revokeTenantInvite } from "./actions";
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

// メールアドレスの簡易バリデーション（チップの正/不正の見た目分けに使う。
// 最終判定はサーバ側 createTenantInvites が行う）。
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

export default function MembersClient({
  slug,
  members,
  pendingInvites,
  maxMembers,
  maxAdmins,
  canInvite,
}: Props) {
  const router = useRouter();
  // Gmail 風チップ入力: 確定済みアドレス(chips) + 入力中(draft)。
  const [chips, setChips] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "member">("member");
  const [isPending, startTransition] = useTransition();
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  // 発行直後の控えめな成功トースト（自動で消える）。冗長な結果パネルは廃止し、
  // 承認待ち一覧を唯一の一覧ソースにした（CEO 指摘: 一時パネルの二重表示解消）。
  const [toast, setToast] = useState<string | null>(null);
  // スキップ/失敗の理由だけは一覧に載らないためインラインで簡潔に表示する。
  const [issues, setIssues] = useState<{ email: string; reason: string }[]>([]);
  // 送信状況の永続化（sentAt 列追加）は deferred。当面はこのセッション中に
  // 発行したメールと送信可否・時刻をクライアント側に保持し、承認待ち一覧の
  // 「送信状況」列に ✉送信済み(日時) を出す。リロードで消えるのは許容。
  const [sentInfo, setSentInfo] = useState<
    Record<string, { sent: boolean; at: number }>
  >({});

  const totalMembers = members.length;
  const totalEditors = members.filter(
    (m) => m.role === "editor" || m.role === "admin" || m.role === "owner"
  ).length;

  const memberQuotaReached = maxMembers !== null && totalMembers >= maxMembers;
  const editorQuotaReached =
    inviteRole === "editor" && maxAdmins !== null && totalEditors >= maxAdmins;
  const inviteDisabled = memberQuotaReached || editorQuotaReached || !canInvite;

  // 生文字列（貼り付け/入力）を区切り、重複を除いてチップに追加する。
  function addTokens(raw: string) {
    const toks = raw
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (toks.length > 0) {
      setChips((prev) => {
        const seen = new Set(prev.map((c) => c.toLowerCase()));
        const next = [...prev];
        for (const t of toks) {
          if (!seen.has(t.toLowerCase())) {
            seen.add(t.toLowerCase());
            next.push(t);
          }
        }
        return next;
      });
    }
    setDraft("");
  }

  function removeChip(target: string) {
    setChips((prev) => prev.filter((c) => c !== target));
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    // 入力中の draft も取り込む。
    const all = [...chips];
    const d = draft.trim();
    if (d && !all.some((c) => c.toLowerCase() === d.toLowerCase())) all.push(d);
    if (all.length === 0) return;
    setIssues([]);
    const payload = all.join(",");
    startTransition(async () => {
      const res = await createTenantInvites(slug, payload, inviteRole);
      if (res.error) {
        setToast(null);
        setIssues([{ email: "", reason: res.error }]);
        return;
      }
      const created = res.items.filter((i) => i.ok);
      const failed = res.items.filter((i) => !i.ok);
      // スキップ/失敗はインラインに簡潔表示（成功分は一覧へ集約）。
      setIssues(
        failed.map((i) => ({ email: i.email, reason: i.error ?? "失敗" }))
      );
      // このセッションでの送信状況を記録（承認待ち一覧の「送信状況」列に反映）。
      if (created.length > 0) {
        const now = Date.now();
        setSentInfo((prev) => {
          const next = { ...prev };
          for (const i of created) {
            next[i.email.toLowerCase()] = { sent: !!i.emailSent, at: now };
          }
          return next;
        });
        setToast(`${created.length}件の招待を発行しました`);
        setTimeout(() => setToast(null), 4000);
        // 承認待ち一覧を即更新（サーバから最新の pending を再取得）。
        router.refresh();
      }
      // 発行できた or 全件スキップ済みなら入力欄をクリア。
      if (created.length > 0 || res.items.every((i) => i.ok || i.skipped)) {
        setChips([]);
        setDraft("");
      }
    });
  }

  function handleRevoke(invitationId: string) {
    setRevokeError(null);
    startTransition(async () => {
      const res = await revokeTenantInvite(slug, invitationId);
      if (!res.ok) setRevokeError(res.error ?? "取消に失敗しました");
      else router.refresh();
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
                <TableHead scope="col">名前</TableHead>
                <TableHead scope="col">メールアドレス</TableHead>
                <TableHead scope="col">ロール</TableHead>
                <TableHead scope="col">参加日</TableHead>
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
                  <TableHead scope="col">招待先</TableHead>
                  <TableHead scope="col">ロール</TableHead>
                  <TableHead scope="col">送信状況</TableHead>
                  <TableHead scope="col">有効期限</TableHead>
                  <TableHead scope="col">招待リンク</TableHead>
                  {canInvite && <TableHead scope="col"><span className="sr-only">操作</span></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => {
                  const sent = sentInfo[inv.email.toLowerCase()];
                  return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(inv.role ?? "member")}>
                        {roleLabel(inv.role ?? "member")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {sent ? (
                        sent.sent ? (
                          <span className="font-medium text-emerald-600">
                            ✉ 送信済み{" "}
                            <span className="font-normal text-neutral-400">
                              {new Date(sent.at).toLocaleString("ja-JP", {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                        ) : (
                          <span className="text-amber-600">リンク発行のみ</span>
                        )
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
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
                  );
                })}
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
            メールアドレスを入力または貼り付け（Enter・カンマ・スペース・改行で区切ってチップ化）。まとめて 1 つのロールで招待します。
          </p>
          <form onSubmit={handleInvite} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div
              onClick={() => document.getElementById("invite-chip-input")?.focus()}
              className={`flex min-h-[46px] min-w-[220px] flex-1 flex-wrap items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2 py-1.5 focus-within:border-neutral-900 ${
                inviteDisabled ? "cursor-not-allowed opacity-50" : "cursor-text"
              }`}
            >
              {chips.map((c) => {
                const ok = isValidEmail(c);
                return (
                  <span
                    key={c}
                    title={ok ? c : "メールアドレスの形式が正しくない可能性があります"}
                    className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
                      ok
                        ? "border-neutral-300 bg-neutral-100 text-neutral-800"
                        : "border-rose-300 bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span className="truncate">{c}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeChip(c);
                      }}
                      disabled={inviteDisabled}
                      aria-label={`${c} を削除`}
                      className="shrink-0 text-neutral-400 hover:text-neutral-700"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              <input
                id="invite-chip-input"
                type="text"
                value={draft}
                disabled={inviteDisabled}
                onChange={(e) => {
                  const v = e.target.value;
                  // 区切り文字が入ったら即チップ化。
                  if (/[\s,;]/.test(v)) addTokens(v);
                  else setDraft(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTokens(draft);
                  } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
                    setChips((prev) => prev.slice(0, -1));
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  addTokens(e.clipboardData.getData("text"));
                }}
                onBlur={() => {
                  if (draft.trim()) addTokens(draft);
                }}
                placeholder={chips.length ? "" : "email@example.com（複数可）"}
                className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
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
                disabled={
                  inviteDisabled ||
                  isPending ||
                  (chips.length === 0 && draft.trim() === "")
                }
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

          {/* 控えめな成功トースト（数秒で自動消滅）。発行済みは上の
              「承認待ち招待」一覧に集約され、リンクコピー・送信状況・取消は
              そこで行う（一時パネルの二重表示を廃止）。 */}
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
            >
              <span aria-hidden="true">✓</span>
              <span>
                {toast}。承認待ち招待の一覧で送信状況とリンクを確認できます。
              </span>
            </div>
          )}

          {/* スキップ / 失敗の理由だけインライン表示（成功分は一覧へ）。 */}
          {issues.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="mb-1 font-medium">
                発行できなかった招待（{issues.length}件）
              </p>
              <ul className="space-y-0.5 text-xs">
                {issues.map((it, i) => (
                  <li key={`${it.email}-${i}`}>
                    {it.email && (
                      <span className="font-medium">{it.email}: </span>
                    )}
                    {it.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            招待メールは招待先へ自動送信されます（送信元:
            dashboard@mixednuts-inc.com）。手動送付用のリンクは「承認待ち招待」
            一覧からコピーできます。
          </p>
        </div>
      )}
    </div>
  );
}
