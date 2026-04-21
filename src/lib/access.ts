import { notFound } from "next/navigation";
import {
  type ClientConfig,
  type ClientId,
  getClient,
  getClientBySlug,
  INTERNAL_ADMIN_USER_IDS,
} from "@/config/clients";

interface CurrentUser {
  userId: string | null;
  primaryEmail?: string | null;
}

async function getCurrentUser(): Promise<CurrentUser> {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) return { userId: null };
  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  return { userId, primaryEmail };
}

export function canUserAccessClient(user: CurrentUser, client: ClientConfig): boolean {
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

/** Resolve a slug into a ClientConfig the current user is allowed to view. */
export async function assertUserCanAccessClientBySlug(slug: string): Promise<ClientConfig> {
  const client = getClientBySlug(slug);
  if (!client) notFound();
  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  if (!clerkConfigured) return client; // dev mode: no gate
  const user = await getCurrentUser();
  if (!canUserAccessClient(user, client)) notFound();
  return client;
}

/** Admin-index variant: resolves a ClientId, requires admin role. */
export async function assertUserCanAccessClient(clientId: string): Promise<ClientConfig> {
  const client = getClient(clientId);
  if (!client) notFound();
  const clerkConfigured = Boolean(process.env.CLERK_SECRET_KEY);
  if (!clerkConfigured) return client;
  const user = await getCurrentUser();
  if (!canUserAccessClient(user, client)) notFound();
  return client;
}

export async function listAccessibleClients(): Promise<ClientConfig[]> {
  const user = await getCurrentUser();
  const { CLIENTS } = await import("@/config/clients");
  return (Object.values(CLIENTS) as ClientConfig[]).filter((c) =>
    canUserAccessClient(user, c)
  );
}

export type { ClientId };
