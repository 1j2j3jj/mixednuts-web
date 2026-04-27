/**
 * Better Auth server-side instance.
 *
 * Plugins:
 *   - emailAndPassword — primary credential for invited users (Chakin etc.)
 *   - admin            — gives Nozomi (and future internal members) the
 *                        ability to manage users / impersonate / ban
 *   - organization     — multi-tenant container, used to scope clients
 *                        (1 org per client like Chakin / DOZO / HS) and
 *                        to send invitation emails to client-side users
 *
 * Social providers:
 *   - Google OAuth  — primary sign-in method (GOOGLE_OAUTH_CLIENT_ID/SECRET)
 *   - Microsoft Entra ID — secondary sign-in (MICROSOFT_ENTRA_CLIENT_ID/SECRET/TENANT_ID)
 *
 * Email sending: stubbed for now. The `sendInvitationEmail` callback writes
 * the magic link to console + persists it via the invitation row's `value`
 * column (better-auth core). Real email integration (Resend) is a v2 task
 * once Chakin invitation flow goes live.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { db } from "@/db/client";
import { schema } from "@/db/schema";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

const googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
const googleClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
const googleEnabled = Boolean(googleClientId && googleClientSecret);

const msClientId = process.env.MICROSOFT_ENTRA_CLIENT_ID ?? "";
const msClientSecret = process.env.MICROSOFT_ENTRA_CLIENT_SECRET ?? "";
const msTenantId = process.env.MICROSOFT_ENTRA_TENANT_ID ?? "common";
const msEnabled = Boolean(msClientId && msClientSecret);

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Build social providers object dynamically so unused providers don't
// generate empty config blocks that Better Auth might reject.
type SocialProviders = Parameters<typeof betterAuth>[0]["socialProviders"];
const socialProviders: SocialProviders = {};
if (googleEnabled) {
  socialProviders.google = {
    clientId: googleClientId,
    clientSecret: googleClientSecret,
  };
}
if (msEnabled) {
  socialProviders.microsoft = {
    clientId: msClientId,
    clientSecret: msClientSecret,
    tenantId: msTenantId,
  };
}

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // Auto-sign-in after registration so invited users land directly on
    // the dashboard. No verification email step (we verify via invitation
    // link instead).
    autoSignIn: true,
    requireEmailVerification: false,
  },
  socialProviders: Object.keys(socialProviders).length > 0 ? socialProviders : undefined,
  trustedOrigins: [
    baseURL,
    "https://www.mixednuts-inc.com",
    "https://mixednuts-inc.com",
  ],
  plugins: [
    admin({
      // Nozomi (and any future internal members) listed in ADMIN_EMAILS
      // automatically get role=admin on first sign-in.
      adminUserIds: [],
      // Better Auth's admin plugin reads role from the user table. We can't
      // gate by email at plugin init time — we map email→role in our own
      // post-OAuth bridge (/login/success) and write the role back via
      // a one-shot update. See bridge code for details.
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    organization({
      // Limit to 1 active org per session for now (Chakin-only invitation
      // flow). Lift if multi-org admin views are needed.
      allowUserToCreateOrganization: false,
      sendInvitationEmail: async ({ id, email, organization: org, inviter }) => {
        // Stub: log the invitation link so admins can copy/paste during
        // dev. Real email integration is a follow-up.
        const link = `${baseURL}/api/auth/accept-invitation?id=${id}`;
        console.info(
          `[invitation] org=${org.name} email=${email} inviter=${inviter.user.email}\n` +
          `[invitation] link=${link}`
        );
      },
    }),
  ],
});

/** Helpers for the bridge layer (login/success, admin pages). */
export function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

/** Whether Microsoft Entra ID provider is configured. */
export const msEntraEnabled = msEnabled;
