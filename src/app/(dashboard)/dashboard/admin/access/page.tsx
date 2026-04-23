import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { listClientAccess } from "../actions";

/**
 * Access Matrix page — admin only.
 *
 * Shows which emails / credentials have access to which clients.
 * Rows = unique identities (emails + Basic Auth labels).
 * Columns = 6 clients.
 *
 * Click a cell to jump to the client's Access tab for editing.
 */
export const dynamic = "force-dynamic";

export default async function AccessMatrixPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const clientAccess = await listClientAccess();

  // Build a unique identity → per-client role map
  type CellValue = "admin" | "oauth" | "basic" | null;
  type IdentityKey = string; // email or "slug:basicauth"

  const identityMap = new Map<IdentityKey, { label: string; type: "email" | "basic" }>();
  const matrix = new Map<IdentityKey, Map<string, CellValue>>();

  for (const ca of clientAccess) {
    for (const entry of ca.entries) {
      let key: IdentityKey;
      let label: string;
      let type: "email" | "basic";

      if (entry.kind === "admin-email" || entry.kind === "client-email") {
        key = entry.label;
        label = entry.label;
        type = "email";
      } else {
        key = `${ca.clientId}:basic`;
        label = `${ca.slug} Basic Auth (${entry.label})`;
        type = "basic";
      }

      if (!identityMap.has(key)) {
        identityMap.set(key, { label, type });
        matrix.set(key, new Map());
      }

      const row = matrix.get(key)!;
      const value: CellValue =
        entry.kind === "admin-email"
          ? "admin"
          : entry.kind === "client-email"
          ? "oauth"
          : "basic";

      // Admin emails apply to all clients
      if (entry.kind === "admin-email") {
        for (const id of CLIENT_IDS) {
          row.set(id, "admin");
        }
      } else {
        row.set(ca.clientId, value);
      }
    }
  }

  const identities = Array.from(identityMap.entries());

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/dashboard/admin" className="underline hover:text-foreground">
            管理パネル
          </Link>
          {" / "}
          <span>アクセスMatrix</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">アクセスMatrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全クライアント × アイデンティティのアクセス権限一覧。
          セルをクリックするとクライアントの設定ページに移動します。
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-200 ring-1 ring-emerald-400" />
          <span>admin (全クライアント閲覧可)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-blue-200 ring-1 ring-blue-400" />
          <span>oauth (Google サインイン)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-neutral-200 ring-1 ring-neutral-400" />
          <span>basic (ID/PW 認証)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-white ring-1 ring-neutral-200" />
          <span>— (アクセスなし)</span>
        </div>
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-md border border-neutral-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="px-3 py-2 text-left font-medium text-neutral-700 w-56">
                アイデンティティ
              </th>
              {CLIENT_IDS.map((id) => {
                const c = CLIENTS[id];
                return (
                  <th
                    key={id}
                    className="px-3 py-2 text-center font-medium text-neutral-700"
                  >
                    <div>{c.label}</div>
                    <div className="font-normal text-muted-foreground">/{c.slug}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {identities.length === 0 ? (
              <tr>
                <td
                  colSpan={CLIENT_IDS.length + 1}
                  className="px-3 py-4 text-center text-muted-foreground"
                >
                  アクセス設定がありません
                </td>
              </tr>
            ) : (
              identities.map(([key, identity]) => {
                const row = matrix.get(key);
                return (
                  <tr key={key} className="hover:bg-neutral-50/50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                            identity.type === "email" ? "bg-blue-500" : "bg-neutral-400"
                          }`}
                        />
                        <span className="font-mono truncate max-w-48" title={identity.label}>
                          {identity.label}
                        </span>
                      </div>
                    </td>
                    {CLIENT_IDS.map((clientId) => {
                      const cell = row?.get(clientId) ?? null;
                      return (
                        <td key={clientId} className="px-3 py-2 text-center">
                          <Link
                            href={`/dashboard/admin/clients/${clientId}?tab=access`}
                            className="block"
                          >
                            <CellBadge value={cell} />
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-muted-foreground">
        アクセス権限の変更はクライアント設定の「アクセス管理」タブから。
        env ベースの変更は{" "}
        <a
          href="https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Vercel Settings
        </a>
        {" "}から。
      </div>
    </div>
  );
}

function CellBadge({ value }: { value: "admin" | "oauth" | "basic" | null }) {
  if (value === "admin") {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
        admin
      </span>
    );
  }
  if (value === "oauth") {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-800 ring-1 ring-blue-200">
        oauth
      </span>
    );
  }
  if (value === "basic") {
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200">
        basic
      </span>
    );
  }
  return <span className="text-neutral-300">—</span>;
}
