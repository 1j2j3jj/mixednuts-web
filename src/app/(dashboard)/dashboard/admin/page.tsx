import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLIENTS, CLIENT_IDS } from "@/config/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import HealthCheckButton from "./HealthCheckButton";
import CredentialGenerator from "./CredentialGenerator";
import { listEnvStatus, listClientAccess } from "./actions";

/**
 * Admin Management Panel — admin only.
 *
 * Lives at /dashboard/admin (not /admin top-level) so existing
 * dashboard-scope chrome + auth apply automatically. Middleware
 * already blocks non-admin viewers from this path by redirecting
 * clients to their own slug; `notFound()` below is defense-in-depth
 * for the case where middleware ever gets bypassed (e.g. local dev
 * without auth env).
 */
export const dynamic = "force-dynamic";

interface AccessColumnProps {
  title: string;
  subtitle: string;
  envKey: string;
  envHint: string;
  emptyLabel: string;
  items: Array<{ primary: string; secondary?: string }>;
  accent: "emerald" | "blue" | "slate";
}

function AccessColumn({ title, subtitle, envKey, envHint, emptyLabel, items, accent }: AccessColumnProps) {
  const accentDot =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "blue"
      ? "bg-blue-500"
      : "bg-slate-400";
  return (
    <div className="space-y-2">
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${accentDot}`} />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</div>
      </div>
      {items.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-300 bg-neutral-50 px-2 py-1.5 text-[11px] text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 rounded border border-neutral-200 bg-white px-2 py-1.5 text-xs"
            >
              <span className="truncate font-mono" title={it.primary}>
                {it.primary}
              </span>
              {it.secondary && (
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {it.secondary}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="text-[10px] text-muted-foreground">
        <span className="font-mono">{envKey}</span>
        <span className="ml-1">· {envHint}</span>
      </div>
    </div>
  );
}

export default async function AdminPanelPage() {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const envStatus = await listEnvStatus();
  const clientAccess = await listClientAccess();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Admin</div>
        <h1 className="text-2xl font-semibold tracking-tight">管理パネル</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          クライアント登録 · 接続ヘルスチェック · 認証情報の確認
          <Link href="/dashboard" className="ml-3 underline hover:text-foreground">
            ← Admin index に戻る
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">クライアント登録（{CLIENT_IDS.length} 件）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Subtitle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GA4 / GSC / ECCUBE</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLIENT_IDS.map((id) => {
                const c = CLIENTS[id];
                const hasGa4 = Boolean(c.ga4PropertyId);
                const hasGsc = Boolean(c.gscSiteUrl);
                const hasEccube = Boolean(c.dataSource?.eccubeSheetId);
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{c.label}</TableCell>
                    <TableCell className="font-mono text-xs">{c.slug}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.subtitle}</TableCell>
                    <TableCell>
                      {c.active ? (
                        <Badge variant="success">Live</Badge>
                      ) : (
                        <Badge variant="secondary">Soon</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      <span className={hasGa4 ? "" : "opacity-30 line-through"}>GA4</span>
                      {" / "}
                      <span className={hasGsc ? "" : "opacity-30 line-through"}>GSC</span>
                      {" / "}
                      <span className={hasEccube ? "" : "opacity-30 line-through"}>ECCUBE</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.active ? (
                        <Link href={`/dashboard/${c.slug}`} className="text-xs underline hover:text-foreground">
                          開く →
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-3 text-xs text-muted-foreground">
            クライアントの追加・slug 変更は
            <code className="mx-1 rounded bg-muted px-1 font-mono">src/config/clients.ts</code>
            で管理。DB 化は Phase 3。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ダッシュボード別アクセス権限</CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            各ダッシュボードに誰がログインできるか。管理者 (Admin) は全ダッシュボード閲覧可。
            クライアント OAuth は Google サインイン経由、クライアント ID/PW は Basic Auth / cookie ログイン経由。
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientAccess.map((c) => {
            const adminEntries = c.entries.filter((e) => e.kind === "admin-email");
            const oauthEntries = c.entries.filter((e) => e.kind === "client-email");
            const credEntries = c.entries.filter((e) => e.kind === "client-credential");
            return (
              <div key={c.clientId} className="rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">/{c.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.active ? (
                      <Badge variant="success">Live</Badge>
                    ) : (
                      <Badge variant="secondary">Soon</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {c.entries.length} アクセス権
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:grid-cols-3">
                  <AccessColumn
                    title="管理者"
                    subtitle="全ダッシュボード閲覧可"
                    envKey="ADMIN_EMAILS"
                    envHint="email をカンマ区切で追加"
                    emptyLabel="未登録"
                    items={adminEntries.map((e) => ({ primary: e.label }))}
                    accent="emerald"
                  />
                  <AccessColumn
                    title="クライアント OAuth"
                    subtitle="Google サインイン"
                    envKey={c.envKeys.oauthEmails}
                    envHint="email をカンマ区切で追加"
                    emptyLabel="OAuth 未設定"
                    items={oauthEntries.map((e) => ({ primary: e.label }))}
                    accent="blue"
                  />
                  <AccessColumn
                    title="クライアント ID/PW"
                    subtitle="Basic Auth / cookie"
                    envKey={c.envKeys.credential}
                    envHint="user:pass 形式で設定"
                    emptyLabel="未登録"
                    items={credEntries.map((e) => ({ primary: e.label, secondary: e.preview }))}
                    accent="slate"
                  />
                </div>
              </div>
            );
          })}
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <strong>追加・削除方法:</strong>{" "}
            現状は Vercel env から管理しています。
            <a
              href="https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline hover:text-amber-700"
            >
              Vercel Settings
            </a>
            で該当 env を編集 → 保存すれば即時反映（Redeploy 不要）。Better Auth
            の Organization 招待フローへの移行は{" "}
            <Link href="/dashboard/admin/invites" className="underline">
              /dashboard/admin/invites
            </Link>{" "}
            から段階的に。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">データソース接続ヘルスチェック</CardTitle>
        </CardHeader>
        <CardContent>
          <HealthCheckButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">認証情報（Vercel 環境変数）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>変数名</TableHead>
                <TableHead>区分</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">プレビュー</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envStatus.map((e) => (
                <TableRow key={e.key}>
                  <TableCell className="font-mono text-xs">{e.key}</TableCell>
                  <TableCell>
                    <Badge variant={e.target === "admin" ? "default" : e.target === "client" ? "secondary" : "outline"}>
                      {e.target}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {e.set ? (
                      <span className="text-xs text-emerald-700">✓ 登録済</span>
                    ) : (
                      <span className="text-xs text-rose-700">✗ 未登録</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {e.preview ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="space-y-2 border-t pt-4">
            <div className="text-sm font-medium">クライアント PW ローテート</div>
            <CredentialGenerator />
            <div className="text-xs text-muted-foreground">
              ※ Vercel への env 書き込みはこのパネルからは行いません（セキュリティ上、Vercel API
              トークンをアプリ環境に置かない方針）。生成した PW をコピー →
              <a
                href="https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline hover:text-foreground"
              >
                Vercel Settings
              </a>
              {" "}で該当 env を更新してください。
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">セッション情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Viewer kind:</span>{" "}
            <span className="font-mono text-xs">{h.get("x-viewer-kind")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Session cookie 有効期限:</span>{" "}
            <span className="text-xs">7日間（HMAC-SHA256 署名、HttpOnly, Secure, SameSite=Lax）</span>
          </div>
          <div>
            <span className="text-muted-foreground">Basic Auth フォールバック:</span>{" "}
            <span className="text-xs">
              並存（cookie 無しでも HTTP Authorization header で認証可）
            </span>
          </div>
          <div className="pt-2">
            <Link
              href="/api/auth/logout"
              prefetch={false}
              className="text-xs underline hover:text-foreground"
            >
              Logout (cookie 削除)
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
