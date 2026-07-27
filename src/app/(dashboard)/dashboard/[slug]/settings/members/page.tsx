import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getViewerOrgRole, canInviteMembers } from "@/lib/org-role";
import { listTenantMembers } from "./actions";
import MembersClient from "./MembersClient";
import DeleteAccountSection from "./DeleteAccountSection";
import PageHeader from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

/**
 * /{org-slug}/settings/members  (served as /dashboard/{slug}/settings/members)
 *
 * Tenant-side member management page.
 * モデルB（2026-07-03 CEO確定）:
 * - 運営 / 編集者: このページに入れる。編集者は招待+招待取消のみ（削除/役割変更は不可）。
 * - 閲覧者(member): タブ非表示 + 直URLはリダイレクト。サーバ側拒否は actions.ts が強制。
 * - メンバー削除・役割変更は運営(admin パネル)専用。
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantMembersPage({ params }: PageProps) {
  const { slug } = await params;

  // assertUserCanAccessClientBySlug returns notFound() if no access.
  const client = await assertUserCanAccessClientBySlug(slug);

  // org内ロールで入場制御。編集者以上のみ入場（閲覧者はダッシュボードへ戻す）。
  // Phase D item 8: previously a silent, unexplained redirect — the
  // destination now carries `?denied=members` so Overview can render why the
  // navigation didn't land here (see PermissionDeniedNotice in
  // dashboard/[slug]/page.tsx).
  const orgRole = await getViewerOrgRole(slug);
  if (!canInviteMembers(orgRole)) redirect(`/dashboard/${slug}?denied=members`);
  const canInvite = true; // ここに到達できるのは編集者以上のみ

  // A bare `catch { notFound() }` used to turn EVERY failure here into a 404 —
  // including the ordinary "this workspace has never had an invite issued, so
  // no organization row exists yet" case, which is setup state, not a missing
  // page. CEO hit exactly that on MSEC and reasonably read the 404 as a bug.
  // Distinguish the two: org_not_found gets an honest, designed state (Q4
  // vocabulary — 未設定 ≠ 取得失敗 ≠ 存在しない); anything else still 404s
  // rather than silently rendering a half-empty page.
  let data;
  try {
    data = await listTenantMembers(slug);
  } catch (err) {
    if (err instanceof Error && err.message === "org_not_found") {
      return (
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <PageHeader
            kicker="設定"
            title="メンバー"
            subtitle={`${client.label} · まだ設定されていません`}
          />
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              このワークスペースではまだメンバー管理が開始されていません。
              <br />
              最初の招待を発行すると自動的に有効になります。
            </CardContent>
          </Card>
        </div>
      );
    }
    notFound();
  }

  // 退会（アカウント削除）はクライアントユーザー本人のみ。運営（admin /
  // impersonation 中）には表示しない — API 側（/api/auth/delete-account）
  // でも kind "admin" は 403 で二重に拒否される。
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");
  const showDeleteAccount =
    viewerKind === "client" || viewerKind === "client-multi";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="text-xs text-muted-foreground">
          <Link
            href={`/dashboard/${slug}`}
            className="underline hover:text-foreground"
          >
            {client.label}
          </Link>
          {" / "}
          <span>設定</span>
          {" / "}
          <span>メンバー</span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          メンバー管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          このダッシュボードへのアクセス権を持つメンバーの管理と招待を行います。
        </p>
      </div>

      <MembersClient
        slug={slug}
        members={data.members}
        pendingInvites={data.pendingInvites}
        maxMembers={data.maxMembers}
        maxAdmins={data.maxAdmins}
        canInvite={canInvite}
      />

      {showDeleteAccount && <DeleteAccountSection />}
    </div>
  );
}
