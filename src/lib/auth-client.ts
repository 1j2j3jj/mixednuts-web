/**
 * Better Auth client-side helper. Used by the React login form to call
 * sign-in / sign-up / sign-out endpoints from the browser.
 *
 * Plugins registered here MUST mirror the server config (src/lib/auth.ts)
 * — otherwise tree-shaking removes the client-side handlers and you get
 * 404s on /api/auth/sign-in/social etc.
 */
"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // baseURL omitted — defaults to current origin, which is what we want.
  plugins: [adminClient(), organizationClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
