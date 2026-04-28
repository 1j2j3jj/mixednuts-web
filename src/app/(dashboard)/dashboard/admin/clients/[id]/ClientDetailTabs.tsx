"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ClientConfig, ClientId } from "@/config/clients";
import type { ClientAccess } from "../../actions";
import type { OrgSummary, InviteRow, MemberRow } from "../../invites/actions";
import type { EnvStatus } from "../../actions";
import { createInvite, revokeInvite, removeMember, activateMember } from "../../invites/actions";
import { generateClientPassword, updateOrgQuota } from "../../actions";
import type { OrgQuota } from "../../actions";
import HealthCheckButton from "../../HealthCheckButton";

type Tab = "overview" | "access" | "quota" | "datasources" | "credentials" | "danger";

interface Props {
  clientId: ClientId;
  client: ClientConfig;
  access: ClientAccess | null;
  org: OrgSummary | null;
  pendingInvites: InviteRow[];
  orgMembers: MemberRow[];
  credStatus: EnvStatus | null;
  quota: OrgQuota;
}

// ---------------------------------------------------------------------------
// Copy button utility
// ---------------------------------------------------------------------------
function CopyButton({ text, label = "コピー" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function doCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs hover:bg-neutral-50"
    >
      {copied ? "コピー済" : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ client }: { client: ClientConfig }) {
  const ds = client.dataSource;
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
        クライアント設定は現在 <code className="font-mono">src/config/clients.ts</code> で管理されています。
        編集するには Vercel にデプロイ後 git commit が必要です（Phase 3 で DB 化予定）。
      </div>

      <div className="grid gap-3 text-sm">
        <Row label="Label" value={client.label} />
        <Row label="Slug" value={`/${client.slug}`} mono />
        <Row label="Subtitle" value={client.subtitle} />
        <Row label="Status" value={client.active ? "Active (Live)" : "Inactive (Pending)"} />
        <Row label="Currency" value={client.currency} />
      </div>

      <div>
        <h3 className="text-sm font-medium text-neutral-900">月次目標（フォールバック値）</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          通常は目標 Sheet が優先されます。Sheet 未設定時のフォールバック。
        </p>
        <div className="grid gap-2 text-sm">
          <Row label="Revenue" value={`¥${client.monthlyTargets.revenue.toLocaleString()}`} />
          <Row label="Conversions" value={`${client.monthlyTargets.conversions}`} />
          <Row label="Ad Spend Budget" value={`¥${client.monthlyTargets.adSpendBudget.toLocaleString()}`} />
          <Row label="Target ROAS" value={`${client.monthlyTargets.roasPct}%`} />
          <Row label="Target CPA" value={`¥${client.monthlyTargets.cpa.toLocaleString()}`} />
        </div>
      </div>

      {ds && (
        <div>
          <h3 className="text-sm font-medium text-neutral-900">Data Source 設定</h3>
          <div className="mt-2 grid gap-2 text-sm">
            <Row label="Sheet ID (Raw Ads)" value={ds.sheetId} mono />
            {ds.targetsSheetId && <Row label="Sheet ID (Targets)" value={ds.targetsSheetId} mono />}
            {ds.eccubeSheetId && <Row label="Sheet ID (ECCUBE)" value={ds.eccubeSheetId} mono />}
            {client.ga4PropertyId && <Row label="GA4 Property ID" value={client.ga4PropertyId} mono />}
            {client.gscSiteUrl && <Row label="GSC Site URL" value={client.gscSiteUrl} mono />}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-48 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className={`flex-1 text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Access Tab (KEY PAGE per CEO)
// ---------------------------------------------------------------------------
function AccessTab({
  clientId,
  client,
  access,
  org,
  pendingInvites,
  orgMembers,
}: {
  clientId: ClientId;
  client: ClientConfig;
  access: ClientAccess | null;
  org: OrgSummary | null;
  pendingInvites: InviteRow[];
  orgMembers: MemberRow[];
}) {
  const router = useRouter();
  const [invPending, startInvTransition] = useTransition();
  const [revPending, startRevTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  const [invEmail, setInvEmail] = useState("");
  const [invRole, setInvRole] = useState<"admin" | "member">("member");
  const [invResult, setInvResult] = useState<
    { kind: "ok"; link: string } | { kind: "err"; msg: string } | null
  >(null);

  function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInvResult(null);
    startInvTransition(async () => {
      const res = await createInvite({ clientId, email: invEmail, role: invRole });
      if (!res.ok || !res.link) {
        setInvResult({ kind: "err", msg: res.error ?? "招待の作成に失敗しました" });
        return;
      }
      setInvResult({ kind: "ok", link: res.link });
      setInvEmail("");
      router.refresh();
    });
  }

  const adminEntries = access?.entries.filter((e) => e.kind === "admin-email") ?? [];
  const oauthEntries = access?.entries.filter((e) => e.kind === "client-email") ?? [];
  const credEntries = access?.entries.filter((e) => e.kind === "client-credential") ?? [];

  return (
    <div className="space-y-6">
      {/* Section 1: Invite form (inline, top) */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">新規招待を発行</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Better Auth の Organization 招待。発行後はリンクをコピーして Slack / メールで送付。
        </p>
        <form onSubmit={submitInvite} className="flex flex-wrap gap-2">
          <input
            type="email"
            required
            placeholder="invitee@example.com"
            value={invEmail}
            onChange={(e) => setInvEmail(e.target.value)}
            disabled={invPending}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm min-w-0"
          />
          <select
            value={invRole}
            onChange={(e) => setInvRole(e.target.value as "admin" | "member")}
            disabled={invPending}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="member">閲覧者</option>
            <option value="admin">管理者</option>
          </select>
          <button
            type="submit"
            disabled={invPending}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {invPending ? "送信中…" : "招待発行"}
          </button>
        </form>

        {invResult?.kind === "ok" && (
          <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-1 text-xs font-medium text-emerald-900">
              招待を作成しました — 以下のリンクをコピーして送付してください
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-emerald-700">
                {invResult.link}
              </code>
              <CopyButton text={invResult.link} label="リンクをコピー" />
            </div>
          </div>
        )}
        {invResult?.kind === "err" && (
          <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
            {invResult.msg}
          </div>
        )}
      </div>

      {/* Section 2: Pending invitations */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          承認待ち招待 ({pendingInvites.length})
        </h3>
        {pendingInvites.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">承認待ちの招待はありません。</p>
        ) : (
          <div className="mt-2 divide-y rounded-md border border-neutral-200">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 font-medium">{inv.email}</span>
                <span className="text-xs text-muted-foreground">
                  {inv.role === "admin" ? "管理者" : "閲覧者"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {inv.expiresAt.toLocaleDateString("ja-JP")} まで
                </span>
                <div className="flex items-center gap-2">
                  <CopyButton text={inv.link} label="リンクをコピー" />
                  <button
                    type="button"
                    disabled={revPending}
                    onClick={() =>
                      startRevTransition(async () => {
                        await revokeInvite(inv.id);
                        router.refresh();
                      })
                    }
                    className="rounded border border-rose-300 bg-white px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    取消
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Organization members (Better Auth) */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Organizationメンバー ({orgMembers.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Better Auth の Organization に参加済みのメンバー。
          {!org && " ※ まだ Organization が作成されていません。招待を発行すると自動作成されます。"}
        </p>
        {orgMembers.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            参加済みメンバーはまだいません。上の招待フォームから招待を発行し、相手が承認するとここに表示されます。
          </p>
        ) : (
          <div className="mt-2 divide-y rounded-md border border-neutral-200">
            {orgMembers.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.email}</div>
                  {m.name && m.name !== m.email && (
                    <div className="text-xs text-muted-foreground truncate">{m.name}</div>
                  )}
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  m.role === "owner"
                    ? "bg-neutral-900 text-white"
                    : m.role === "admin"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-neutral-100 text-neutral-700"
                }`}>
                  {m.role === "owner" ? "オーナー" : m.role === "admin" ? "管理者" : "閲覧者"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.joinedAt.toLocaleDateString("ja-JP")} 参加
                </span>
                {m.blockedAt && (
                  <span
                    className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                    title={`${m.blockedAt.toLocaleDateString("ja-JP")} ブロック (6 ヶ月以上未ログイン)`}
                  >
                    ブロック中
                  </span>
                )}
                {m.lastLoginAt && (
                  <span className="text-xs text-muted-foreground">
                    最終 {m.lastLoginAt.toLocaleDateString("ja-JP")}
                  </span>
                )}
                {m.blockedAt && (
                  <button
                    type="button"
                    disabled={removePending}
                    onClick={() =>
                      startRemoveTransition(async () => {
                        await activateMember(m.id);
                        router.refresh();
                      })
                    }
                    className="rounded border border-emerald-300 bg-white px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                  >
                    アクティベート
                  </button>
                )}
                {m.role !== "owner" && (
                  <button
                    type="button"
                    disabled={removePending}
                    onClick={() =>
                      startRemoveTransition(async () => {
                        await removeMember(m.id);
                        router.refresh();
                      })
                    }
                    className="rounded border border-rose-300 bg-white px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Env-based access (CLIENT_EMAILS + CLIENT_AUTH) */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">環境変数ベースのアクセス</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Vercel env で管理している OAuth メールアドレスと Basic Auth クレデンシャル。
        </p>
        <div className="divide-y rounded-md border border-neutral-200">
          {/* Admin emails */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-700">管理者 (ADMIN_EMAILS)</span>
              <span className="text-xs text-muted-foreground">{adminEntries.length} 件</span>
            </div>
            {adminEntries.map((e, i) => (
              <div key={i} className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono">{e.label}</span>
              </div>
            ))}
          </div>

          {/* OAuth emails */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-700">
                Google OAuth ({access?.envKeys.oauthEmails})
              </span>
              <span className="text-xs text-muted-foreground">{oauthEntries.length} 件</span>
            </div>
            {oauthEntries.length === 0 ? (
              <div className="mt-1 text-xs text-muted-foreground">未設定</div>
            ) : (
              oauthEntries.map((e, i) => (
                <div key={i} className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-mono">{e.label}</span>
                </div>
              ))
            )}
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              変更:{" "}
              <a
                href="https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Vercel Settings
              </a>
              {" "}で <code className="font-mono">{access?.envKeys.oauthEmails}</code> を編集
            </div>
          </div>

          {/* Credential */}
          <div className="px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-700">
                Basic Auth ({access?.envKeys.credential})
              </span>
              <span className="text-xs text-muted-foreground">{credEntries.length} 件</span>
            </div>
            {credEntries.map((e, i) => (
              <div key={i} className="mt-1 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span className="text-xs font-mono">{e.label}</span>
                {e.preview && (
                  <span className="text-[10px] text-muted-foreground font-mono">{e.preview}</span>
                )}
              </div>
            ))}
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              ローテートは「Credentials」タブから
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Sources Tab
// ---------------------------------------------------------------------------
function DataSourcesTab({ client }: { client: ClientConfig }) {
  const ds = client.dataSource;

  type SourceDef = {
    name: string;
    configured: boolean;
    link?: string;
    hint?: string;
  };

  const sources: SourceDef[] = [
    {
      name: "広告 Raw Sheet",
      configured: Boolean(ds?.sheetId),
      link: ds?.sheetId
        ? `https://docs.google.com/spreadsheets/d/${ds.sheetId}/edit`
        : undefined,
      hint: ds?.sheetId ? ds.sheetId : "未設定",
    },
    {
      name: "目標 Sheet (Targets)",
      configured: Boolean(ds?.targetsSheetId),
      link: ds?.targetsSheetId
        ? `https://docs.google.com/spreadsheets/d/${ds.targetsSheetId}/edit`
        : undefined,
      hint: ds?.targetsSheetId ?? "未設定",
    },
    {
      name: "ECCUBE Sheet",
      configured: Boolean(ds?.eccubeSheetId),
      link: ds?.eccubeSheetId
        ? `https://docs.google.com/spreadsheets/d/${ds.eccubeSheetId}/edit`
        : undefined,
      hint: ds?.eccubeSheetId ?? "未設定",
    },
    {
      name: "GA4",
      configured: Boolean(client.ga4PropertyId),
      link: client.ga4PropertyId
        ? `https://analytics.google.com/analytics/web/#/p${client.ga4PropertyId}/reports/intelligenthome`
        : undefined,
      hint: client.ga4PropertyId ?? "未設定",
    },
    {
      name: "Google Search Console",
      configured: Boolean(client.gscSiteUrl),
      link: client.gscSiteUrl
        ? `https://search.google.com/search-console?resource_id=${encodeURIComponent(client.gscSiteUrl)}`
        : undefined,
      hint: client.gscSiteUrl ?? "未設定",
    },
  ];

  const configuredCount = sources.filter((s) => s.configured).length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {configuredCount}/{sources.length} ソース設定済み
      </div>

      <div className="divide-y rounded-md border border-neutral-200">
        {sources.map((s) => (
          <div key={s.name} className="flex items-center gap-3 px-3 py-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                s.configured ? "bg-emerald-500" : "bg-neutral-300"
              }`}
            />
            <span className="w-40 shrink-0 text-sm font-medium text-neutral-800">{s.name}</span>
            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
              {s.hint}
            </span>
            {s.configured && s.link && (
              <a
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs hover:bg-neutral-50"
              >
                開く ↗
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Health check button */}
      <div className="pt-2">
        <div className="mb-2 text-sm font-medium">接続テスト</div>
        <HealthCheckButton />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credentials Tab
// ---------------------------------------------------------------------------
function CredentialsTab({
  clientId,
  credStatus,
}: {
  clientId: ClientId;
  credStatus: EnvStatus | null;
}) {
  const [pw, setPw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setCopied(false);
    setConfirmed(false);
    startTransition(async () => {
      const next = await generateClientPassword();
      setPw(next);
      // Auto-copy
      try {
        await navigator.clipboard.writeText(next);
        setCopied(true);
      } catch {
        // clipboard access may fail in some browsers
      }
    });
  }

  async function doCopy() {
    if (!pw) return;
    try {
      await navigator.clipboard.writeText(pw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  const envKey = `CLIENT_AUTH_${clientId.toUpperCase()}`;
  const vercelUrl = `https://vercel.com/mixednuts-8dc5d7a1/mixednuts-web/settings/environment-variables`;

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">現在のクレデンシャル</h3>
        <div className="mt-2 rounded-md border border-neutral-200 px-3 py-2">
          <div className="flex items-center justify-between">
            <code className="font-mono text-xs">{envKey}</code>
            {credStatus?.set ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-700">✓ 登録済</span>
                {credStatus.preview && (
                  <code className="font-mono text-xs text-muted-foreground">
                    {credStatus.preview}
                  </code>
                )}
              </div>
            ) : (
              <span className="text-xs text-rose-700">✗ 未登録</span>
            )}
          </div>
        </div>
      </div>

      {/* Rotation flow */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">パスワードをローテート</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          新しいパスワードを生成 → Vercel env を更新してください。
          古いパスワードは Vercel に保存するまで有効です。
        </p>

        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={pending}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {pending ? "生成中…" : pw ? "再生成" : "新PW生成"}
            </button>
            {pw && !confirmed && (
              <>
                <code className="rounded bg-neutral-100 px-2 py-1 font-mono text-sm">{pw}</code>
                <button
                  type="button"
                  onClick={doCopy}
                  className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-50"
                >
                  {copied ? "コピー済 ✓" : "コピー"}
                </button>
              </>
            )}
            {confirmed && (
              <span className="text-xs text-emerald-700">保存を確認しました。フィンガープリントが更新されます。</span>
            )}
          </div>

          {pw && !confirmed && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <div className="font-medium">次の手順で Vercel env を更新してください:</div>
              <ol className="list-decimal ml-4 space-y-1">
                <li>パスワードはクリップボードにコピー済です（されていない場合は上のコピーボタンを）</li>
                <li>
                  <a
                    href={vercelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Vercel Settings を開く ↗
                  </a>
                </li>
                <li>
                  <code className="font-mono">{envKey}</code> を探して編集
                </li>
                <li>
                  値を <code className="font-mono">{clientId}:{"{new_password}"}</code> 形式で更新して保存
                </li>
                <li>下の「保存を確認」ボタンを押す</li>
              </ol>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmed(true);
                    setPw(null);
                  }}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Vercel に保存しました
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-muted-foreground">
        セキュリティ上、このパネルは Vercel API トークンを持ちません。
        env の書き込みは必ず Vercel Dashboard で人間が行います。
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quota Tab
// ---------------------------------------------------------------------------
function QuotaTab({
  client,
  quota,
}: {
  client: ClientConfig;
  quota: OrgQuota;
}) {
  const [maxMembers, setMaxMembers] = useState<string>(
    quota.maxMembers !== null ? String(quota.maxMembers) : ""
  );
  const [maxAdmins, setMaxAdmins] = useState<string>(
    quota.maxAdmins !== null ? String(quota.maxAdmins) : ""
  );
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const mm = maxMembers.trim() === "" ? null : parseInt(maxMembers, 10);
    const ma = maxAdmins.trim() === "" ? null : parseInt(maxAdmins, 10);
    if ((mm !== null && (isNaN(mm) || mm < 1)) || (ma !== null && (isNaN(ma) || ma < 1))) {
      setResult({ ok: false, error: "正の整数を入力するか空欄（制限なし）にしてください" });
      return;
    }
    startTransition(async () => {
      const res = await updateOrgQuota(client.slug, mm, ma);
      setResult(res);
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        クォータは Organization 単位で設定します。
        <code className="mx-1 font-mono">null</code>（空欄）= 制限なし。
        変更はテナント側の招待フォームに即時反映されます。
      </div>

      {quota.orgId === null && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Organization がまだ作成されていません。招待を一件発行すると自動作成されます。
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
            最大メンバー数
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="制限なし"
              disabled={quota.orgId === null}
              className="w-32 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-neutral-500">
              現在: {quota.maxMembers !== null ? `${quota.maxMembers} 名` : "制限なし"}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            メンバー + 管理者の合計上限。
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-neutral-600">
            最大管理者数
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={maxAdmins}
              onChange={(e) => setMaxAdmins(e.target.value)}
              placeholder="制限なし"
              disabled={quota.orgId === null}
              className="w-32 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none disabled:opacity-50"
            />
            <span className="text-xs text-neutral-500">
              現在: {quota.maxAdmins !== null ? `${quota.maxAdmins} 名` : "制限なし"}
            </span>
          </div>
          <p className="text-xs text-neutral-500">
            Admin ロールの上限（Owner は対象外）。
          </p>
        </div>

        {result && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              result.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {result.ok ? "クォータを更新しました" : result.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || quota.orgId === null}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "保存中…" : "保存"}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Danger Zone Tab
// ---------------------------------------------------------------------------
function DangerZoneTab({ client }: { client: ClientConfig }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <h3 className="text-sm font-semibold text-rose-900">クライアントを非アクティブにする</h3>
        <p className="mt-1 text-xs text-rose-800">
          <code className="font-mono">active: false</code> に変更します。
          <code className="mx-1 font-mono">src/config/clients.ts</code>
          を直接編集して commit &amp; deploy してください（Phase 3 で UI から変更可能予定）。
        </p>
        <div className="mt-2 text-xs text-rose-800">
          現在の状態:{" "}
          <code className="font-mono">{client.active ? "active: true" : "active: false"}</code>
        </div>
      </div>

      <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
        <h3 className="text-sm font-semibold text-rose-900">Better Auth Organization を削除する</h3>
        <p className="mt-1 text-xs text-rose-800">
          Organization を削除するとメンバーシップと招待が全て削除されます。
          招待済みのユーザーはダッシュボードにアクセスできなくなります。
          現在は Neon Database を直接操作して削除してください（Phase 3 で UI から可能予定）。
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "概要" },
  { id: "access", label: "アクセス管理" },
  { id: "quota", label: "クォータ" },
  { id: "datasources", label: "データソース" },
  { id: "credentials", label: "クレデンシャル" },
  { id: "danger", label: "Danger Zone" },
];

export default function ClientDetailTabs({
  clientId,
  client,
  access,
  org,
  pendingInvites,
  orgMembers,
  credStatus,
  quota,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("access");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-muted-foreground hover:text-neutral-700"
            } ${t.id === "danger" ? "ml-auto text-rose-600 hover:text-rose-700" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === "overview" && <OverviewTab client={client} />}
        {activeTab === "access" && (
          <AccessTab
            clientId={clientId}
            client={client}
            access={access}
            org={org}
            pendingInvites={pendingInvites}
            orgMembers={orgMembers}
          />
        )}
        {activeTab === "quota" && <QuotaTab client={client} quota={quota} />}
        {activeTab === "datasources" && <DataSourcesTab client={client} />}
        {activeTab === "credentials" && (
          <CredentialsTab clientId={clientId} credStatus={credStatus} />
        )}
        {activeTab === "danger" && <DangerZoneTab client={client} />}
      </div>
    </div>
  );
}
