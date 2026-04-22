"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvite, revokeInvite } from "./actions";
import type { ClientId } from "@/config/clients";

interface ClientOption {
  id: ClientId;
  label: string;
}

export default function InviteForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState<ClientId>(clients[0]?.id ?? ("hs" as ClientId));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [status, setStatus] = useState<{ kind: "ok"; link: string } | { kind: "err"; msg: string } | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const res = await createInvite({ clientId, email, role });
      if (!res.ok || !res.link) {
        setStatus({ kind: "err", msg: res.error ?? "招待の作成に失敗しました" });
        return;
      }
      setStatus({ kind: "ok", link: res.link });
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_140px_120px]">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value as ClientId)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          disabled={pending}
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
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
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {pending ? "送信中…" : "招待発行"}
        </button>
      </form>

      {status?.kind === "ok" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="font-medium">招待を作成しました（メール未送信 — 招待リンクをコピーして送付してください）:</div>
          <code className="mt-1 block break-all rounded bg-white p-2 text-emerald-700">{status.link}</code>
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
