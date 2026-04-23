import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { Badge } from "@/components/ui/badge";
import { listClientAccess } from "./actions";

/**
 * Admin Panel Index — admin only.
 *
 * Shows 6 client cards with traffic-light status + quick links.
 * Replaces the old monolithic single-page layout (347 lines).
 * Sub-pages: /clients/[id], /access, /invites, /health
 */
export const dynamic = "force-dynamic";

/** Traffic light status for a client card. */
function trafficLight(active: boolean, hasDataSource: boolean): {
  color: "green" | "yellow" | "gray";
  label: string;
} {
  if (active && hasDataSource) return { color: "green", label: "Live" };
  if (active) return { color: "yellow", label: "Partial" };
  return { color: "gray", label: "Inactive" };
}

function TrafficDot({ color }: { color: "green" | "yellow" | "gray" }) {
  const cls =
    color === "green"
      ? "bg-emerald-500"
      : color === "yellow"
      ? "bg-amber-400"
      : "bg-neutral-400";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

export default async function AdminIndexPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const clientAccess = await listClientAccess();
  const accessByClientId = new Map(clientAccess.map((c) => [c.clientId, c]));

  const activeCount = CLIENT_IDS.filter((id) => CLIENTS[id].active).length;
  const pendingCount = CLIENT_IDS.length - activeCount;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Admin</div>
          <h1 className="text-2xl font-semibold tracking-tight">管理パネル</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {CLIENT_IDS.length} clients · {activeCount} active · {pendingCount} pending
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/admin/access"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            アクセスMatrix
          </Link>
          <Link
            href="/dashboard/admin/health"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            ヘルスチェック
          </Link>
          <Link
            href="/dashboard/admin/invites"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
          >
            招待管理
          </Link>
        </div>
      </div>

      {/* Client cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CLIENT_IDS.map((id) => {
          const c = CLIENTS[id];
          const access = accessByClientId.get(id);
          const hasDataSource = Boolean(c.dataSource);
          const { color, label } = trafficLight(c.active, hasDataSource);

          // Count sources
          const ds = c.dataSource;
          const sourceCount = ds
            ? [ds.sheetId, ds.targetsSheetId, ds.eccubeSheetId, c.ga4PropertyId, c.gscSiteUrl].filter(Boolean).length
            : [c.ga4PropertyId, c.gscSiteUrl].filter(Boolean).length;
          const maxSources = 5;

          // Member count: BA org members + credential entries
          const memberCount = access?.entries.length ?? 0;

          return (
            <div
              key={id}
              className="rounded-lg border border-neutral-200 bg-white shadow-sm"
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  <TrafficDot color={color} />
                  <span className="font-medium text-neutral-900">{c.label}</span>
                  <span className="text-xs text-muted-foreground">{c.subtitle}</span>
                </div>
                <Badge
                  variant={color === "green" ? "success" : color === "yellow" ? "outline" : "secondary"}
                >
                  {label}
                </Badge>
              </div>

              {/* Card body */}
              <div className="space-y-1 px-4 py-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Slug</span>
                  <code className="font-mono text-neutral-700">/{c.slug}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Data sources</span>
                  <span className={sourceCount > 0 ? "text-emerald-700" : "text-neutral-400"}>
                    {sourceCount}/{maxSources} configured
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Access entries</span>
                  <span>{memberCount} configured</span>
                </div>
              </div>

              {/* Card footer */}
              <div className="flex gap-2 border-t border-neutral-100 px-4 py-3">
                {c.active ? (
                  <Link
                    href={`/dashboard/${c.slug}`}
                    className="flex-1 rounded-md bg-neutral-900 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-neutral-800"
                  >
                    ダッシュボードを開く
                  </Link>
                ) : (
                  <span className="flex-1 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-center text-xs text-muted-foreground">
                    未稼働
                  </span>
                )}
                <Link
                  href={`/dashboard/admin/clients/${id}`}
                  className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-center text-xs font-medium hover:bg-neutral-50"
                >
                  設定
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick links / nav footer */}
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/admin/invites" className="underline hover:text-foreground">
            招待管理 (Better Auth)
          </Link>
          <Link href="/dashboard/admin/access" className="underline hover:text-foreground">
            アクセスMatrix (全クライアント × メール)
          </Link>
          <Link href="/dashboard/admin/health" className="underline hover:text-foreground">
            ヘルスチェック (データソース接続)
          </Link>
          <a
            href="https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            Vercel Env Settings ↗
          </a>
        </div>
      </div>
    </div>
  );
}
