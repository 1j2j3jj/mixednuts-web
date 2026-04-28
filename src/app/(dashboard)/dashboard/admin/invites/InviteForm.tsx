"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvite, createInvites, revokeInvite } from "./actions";
import type { ClientId } from "@/config/clients";

interface ClientOption {
  id: ClientId;
  label: string;
}

type InviteResult =
  | { kind: "ok-single"; link: string }
  | { kind: "ok-bulk"; results: Array<{ clientId: ClientId; label: string; link?: string; error?: string; ok: boolean }> }
  | { kind: "err"; msg: string }
  | null;

export default function InviteForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Multi-select state. Default: first client pre-selected for backward compat.
  const [selectedIds, setSelectedIds] = useState<Set<ClientId>>(
    () => new Set(clients[0]?.id ? [clients[0].id] : [])
  );
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [status, setStatus] = useState<InviteResult>(null);

  const labelOf = (id: ClientId) =>
    clients.find((c) => c.id === id)?.label ?? String(id);

  function toggle(id: ClientId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(clients.map((c) => c.id)));
  }
  function clearAll() {
    setSelectedIds(new Set());
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (selectedIds.size === 0) {
      setStatus({ kind: "err", msg: "クライアントを少なくとも 1 件選択してください" });
      return;
    }
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      // Single-client path keeps the existing inline UX (one link, copyable).
      if (ids.length === 1) {
        const res = await createInvite({ clientId: ids[0], email, role });
        if (!res.ok || !res.link) {
          setStatus({ kind: "err", msg: res.error ?? "招待の作成に失敗しました" });
          return;
        }
        setStatus({ kind: "ok-single", link: res.link });
        setEmail("");
        router.refresh();
        return;
      }
      // Multi-client: bulk action returns per-org outcomes.
      const res = await createInvites({ clientIds: ids, email, role });
      const enriched = res.results.map((r) => ({
        clientId: r.clientId,
        label: labelOf(r.clientId),
        link: r.link,
        error: r.error,
        ok: r.ok,
      }));
      setStatus({ kind: "ok-bulk", results: enriched });
      if (res.ok) {
        setEmail("");
      }
      router.refresh();
    });
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="space-y-3">
        {/* Multi-select client picker */}
        <div className="rounded-md border border-neutral-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-700">
              対象クライアント
              <span className="ml-2 font-normal text-neutral-500">
                {selectedCount > 0 ? `${selectedCount} 件選択中` : "未選択"}
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                disabled={pending}
                className="rounded border border-neutral-300 bg-white px-2 py-0.5 hover:bg-neutral-50"
              >
                全選択
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={pending}
                className="rounded border border-neutral-300 bg-white px-2 py-0.5 hover:bg-neutral-50"
              >
                クリア
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {clients.map((c) => {
              const checked = selectedIds.has(c.id);
              return (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-xs transition ${
                    checked
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    disabled={pending}
                    className="h-3 w-3"
                  />
                  <span className="truncate">{c.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Email + role + submit row */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px_120px]">
          <input
            type="email"
            required
            placeholder="invitee@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "member")}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            disabled={pending}
          >
            <option value="member">閲覧者</option>
            <option value="admin">管理者</option>
          </select>
          <button
            type="submit"
            disabled={pending || selectedCount === 0}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {pending ? "送信中…" : selectedCount > 1 ? `${selectedCount} 件 招待発行` : "招待発行"}
          </button>
        </div>
      </form>

      {status?.kind === "ok-single" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="font-medium">
            招待を作成しました（メール未送信 — 招待リンクをコピーして送付してください）:
          </div>
          <code className="mt-1 block break-all rounded bg-white p-2 text-emerald-700">
            {status.link}
          </code>
        </div>
      )}

      {status?.kind === "ok-bulk" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="mb-2 font-medium">
            一括招待結果（{status.results.filter((r) => r.ok).length} / {status.results.length} 件 成功）:
          </div>
          <ul className="space-y-2">
            {status.results.map((r) => (
              <li key={r.clientId} className="rounded bg-white p-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.label}</span>
                  <span className={r.ok ? "text-emerald-700" : "text-rose-700"}>
                    {r.ok ? "✓" : "✗"}
                  </span>
                </div>
                {r.link && (
                  <code className="mt-1 block break-all text-emerald-700">
                    {r.link}
                  </code>
                )}
                {r.error && (
                  <div className="mt-1 text-rose-700">{r.error}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status?.kind === "err" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
          {status.msg}
        </div>
      )}
    </div>
  );
}

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard blocked in some contexts
    }
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className="shrink-0 rounded border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
    >
      {copied ? "コピー済 ✓" : "コピー"}
    </button>
  );
}

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revokeInvite(id);
          router.refresh();
        })
      }
      className="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
    >
      取消
    </button>
  );
}
