import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { assertUserCanAccessClientBySlug } from "@/lib/access";
import { listTenantMembers } from "./actions";
import MembersClient from "./MembersClient";

/**
 * /{org-slug}/settings/members  (served as /dashboard/{slug}/settings/members)
 *
 * Tenant-side member management page.
 * - Admin viewers: full access (invite, revoke, see all controls)
 * - Client Owner/Admin viewers: same controls
 * - Client Member viewers: read-only list + quota display
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantMembersPage({ params }: PageProps) {
  const { slug } = await params;

  // assertUserCanAccessClientBySlug returns notFound() if no access.
  const client = await assertUserCanAccessClientBySlug(slug);

  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");
  // Admin viewers and client admin/owner can manage members.
  // For simplicity in Phase 1: admin viewers always get full control.
  // Client viewers get full control for their own org (Owner/Admin roles
  // are not yet distinguished at cookie level, so we grant based on kind).
  const isAdmin = viewerKind === "admin" || viewerKind === "client" || viewerKind === "client-multi";

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
