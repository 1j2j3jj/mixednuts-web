import { notFound } from "next/navigation";
import {
  type ClientConfig,
  type ClientId,
  getClient,
  INTERNAL_ADMIN_USER_IDS,
} from "@/config/clients";

/**
 * Minimal shape of the Clerk `auth()` return value we rely on. Keeping this
 * local means files that don't call Clerk (e.g. Storybook, tests) don't pull
 * in the SDK.
 */
interface CurrentUser {
  userId: string | null;
  primaryEmail?: string | null;
}

/**
 * Resolve the current Clerk user into a plain { userId, primaryEmail } shape.
 * Lazily imported so that pages which don't need auth (public marketing
 * pages) are not forced to initialise Clerk at module load.
 */
async function getCurrentUser(): Promise<CurrentUser> {
  // Lazy import: keep Clerk out of the public-site bundle graph.
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return { userId: null };

  // currentUser() is a second round-trip; we only need the email, so fetch
  // it only for the membership check.
  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  return { userId, primaryEmail };
}

/**
 * Authorisation check for a specific client dashboard. Returns `null` on 404
 * (instead of `throw notFound()`) so callers can compose the check.
 */
export function canUserAccessClient(
  user: CurrentUser,
  client: ClientConfig
): boolean {
  if (!user.userId) return false;
  if (INTERNAL_ADMIN_USER_IDS.includes(user.userId)) return true;
  if (client.allowedUserIds.includes(user.userId)) return true;
  if (user.primaryEmail) {
    const domain = user.primaryEmail.split("@")[1]?.toLowerCase();
    if (domain && client.allowedEmailDomains.map((d) => d.toLowerCase()).includes(domain)) {
      return true;
    }
  }
  return false;
}

/**
 * Page-level guard. Use in server components:
 *
 *   const client = await assertUserCanAccessClient(params.clientId);
 *
 * Returns the resolved ClientConfig on success, or triggers Next.js 404.
 * 404 (not 403) is intentional — we don't leak which clients exist.
 */
export async function assertUserCanAccessClient(clientId: string): Promise<ClientConfig> {
  const client = getClient(clientId);
  if (!client) notFound();

  const user = await getCurrentUser();
  if (!canUserAccessClient(user, client)) notFound();
  return client;
}

/**
 * Returns the list of clients the current user can see. Used by the sidebar
 * to hide inaccessible clients.
 */
export async function listAccessibleClients(): Promise<ClientConfig[]> {
  const user = await getCurrentUser();
  const { CLIENTS } = await import("@/config/clients");
  return (Object.values(CLIENTS) as ClientConfig[]).filter((c) =>
    canUserAccessClient(user, c)
  );
}

export type { ClientId };
