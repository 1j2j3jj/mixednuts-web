import "server-only";
import { db } from "@/db/client";
import { user as userTable } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Update user.last_login_at = now() for inactivity-based membership lifecycle.
 *
 * Called from auth bridges:
 *   - /login/success         (Google OAuth)
 *   - /api/auth/accept-invitation (initial onboarding)
 *   - /api/auth/login        (email/password)
 *
 * Failure here must NOT block the login flow — the cron's idle threshold is
 * 6 months, so a single missed update is harmless. Errors are logged.
 *
 * @param userId Better Auth user.id (from session.user.id)
 */
export async function recordLogin(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await db
      .update(userTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(userTable.id, userId));
  } catch (err) {
    console.error("[last-login] update failed (non-fatal):", err);
  }
}
