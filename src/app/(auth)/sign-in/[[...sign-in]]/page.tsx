import { notFound, redirect } from "next/navigation";
import { clerkSignInUrl } from "@/lib/clerk-url";

export const dynamic = "force-dynamic";

/**
 * Sign-in entry point. Instead of embedding <SignIn /> on our domain
 * (which triggers the dev-browser-missing handshake on Clerk's dev
 * instance when hosted at non-localhost URLs), we redirect to Clerk's
 * Account Portal (hosted by Clerk on their domain). Clerk handles the
 * OAuth dance there, then bounces back to /login/success with a
 * handshake parameter which our clerkMiddleware processes to set the
 * Clerk session cookie on our domain.
 *
 * This keeps dev instance usable on the production URL without waiting
 * for DNS-verified Production instance setup. When we upgrade to a
 * Production instance with a verified custom domain we can swap back
 * to the embedded <SignIn /> for a same-origin branded flow.
 */
export default function SignInPage() {
  const target = clerkSignInUrl("https://www.mixednuts-inc.com/login/success");
  if (!target) notFound();
  redirect(target);
}
