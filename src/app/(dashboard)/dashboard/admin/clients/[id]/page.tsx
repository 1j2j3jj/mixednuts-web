import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CLIENTS, type ClientId } from "@/config/clients";
import { Badge } from "@/components/ui/badge";
import { listClientAccess, listEnvStatus, getOrgQuota } from "../../actions";
import { listOrganisations, listPendingInvites, listOrgMembersForClient, type MemberRow } from "../../invites/actions";
import ClientDetailTabs from "./ClientDetailTabs";

/**
 * Client detail page — admin only.
 *
 * Google Ads-style per-client landing page with 5 tabs:
 *   Overview / Access / Data sources / Credentials / Danger zone
 *
 * CEO emphasis: Access tab is the operational center.
 * Invite / remove / address send all live here, not scattered.
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") notFound();

  const { id } = await params;
  const client = CLIENTS[id as ClientId];
  if (!client) notFound();

  const clientId = id as ClientId;

  // Fetch all needed data in parallel
  const [clientAccess, envStatus, orgs, pendingInvites, orgMembers, quota] = await Promise.all([
    listClientAccess(),
    listEnvStatus(),
    listOrganisations(),
    listPendingInvites(),
    listOrgMembersForClient(client.slug),
    getOrgQuota(client.slug),
  ]);

  const access = clientAccess.find((c) => c.clientId === clientId);
  const org = orgs.find((o) => o.slug === client.slug);

  // Filter invites for this client's org
  const clientPendingInvites = org
    ? pendingInvites.filter((i) => i.organizationId === org.id)
    : [];

  // Env key for this client's credential
  const credKey = `CLIENT_AUTH_${clientId.toUpperCase()}`;
  const credStatus = envStatus.find((e) => e.key === credKey);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="text-xs text-muted-foreground">
          <Link href="/dashboard/admin" className="underline hover:text-foreground">
            管理パネル
          </Link>
          {" / "}
          <span>{client.label}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{client.label}</h1>
          <Badge variant={client.active ? "success" : "secondary"}>
            {client.active ? "Live" : "Inactive"}
          </Badge>
          <code className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono text-muted-foreground">
            /{client.slug}
          </code>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{client.subtitle}</p>
      </div>

      {/* Tabs — client component handles tab switching */}
      <ClientDetailTabs
        clientId={clientId}
        client={client}
        access={access ?? null}
        org={org ?? null}
        pendingInvites={clientPendingInvites}
        orgMembers={orgMembers}
        credStatus={credStatus ?? null}
        quota={quota}
      />
    </div>
  );
}
