import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { getViewerOrgRole, canManageMembers } from "@/lib/org-role";
import { listTenantMembers } from "./actions";
import MembersClient from "./MembersClient";

/**
 * /{org-slug}/settings/members  (served as /dashboard/{slug}/settings/members)
 *
 * Tenant-side member management page.
 * - mixednuts admin / org Owner・Admin: full access (invite, revoke)
 * - org Member: このページ自体に入れない（タブ非表示 + 直URLはリダイレクト。
 *   2026-07-03 CEO決定。サーバ側の操作拒否は actions.ts が強制）
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantMembersPage({ params }: PageProps) {
  const { slug } = await params;

  // assertUserCanAccessClientBySlug returns notFound() if no access.
  const client = await assertUserCanAccessClientBySlug(slug);

  // org内ロールで入場制御（member はダッシュボードへ戻す）。
  const orgRole = await getViewerOrgRole(slug);
  if (!canManageMembers(orgRole)) redirect(`/dashboard/${slug}`);
  const isAdmin = true; // ここに到達できるのは管理側ロールのみ

  let data;
  try {
    data = await listTenantMembers(slug);
  } catch {
    notFound();
  }

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
        isAdmin={isAdmin}
      />
    </div>
  );
}
