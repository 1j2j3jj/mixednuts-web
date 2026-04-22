/**
 * Better Auth catch-all route handler. Mounts the entire BA HTTP API
 * (sign-in, sign-up, sign-out, social callbacks, organization, etc.)
 * under /api/auth/*.
 *
 * Coexistence note:
 *   /api/auth/login  → our existing ID/PW form handler (more specific
 *                      route wins in Next.js)
 *   /api/auth/logout → our existing handler (clears mn_session)
 *   /api/auth/*      → Better Auth (everything else)
 *
 * BA's own paths use kebab-case (sign-in, sign-out, sign-up, callback/google,
 * etc.), so there's no collision with our snake-case `login`/`logout`.
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
