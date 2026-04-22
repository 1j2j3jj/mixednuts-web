/**
 * Derive Clerk's Account Portal hosted URL from the publishable key.
 *
 * Publishable key format:   pk_(test|live)_<base64url of "<instance>$">
 * Decoded payload example:  deep-grouse-33.clerk.accounts.dev$
 * Account Portal host:      deep-grouse-33.accounts.dev
 *                                             ^ same instance slug, different subdomain
 *
 * We redirect to the Account Portal (hosted by Clerk on their domain)
 * for sign-in instead of embedding <SignIn /> on our domain. This
 * sidesteps the dev-browser-missing handshake that Clerk's dev instance
 * requires when embedded on non-localhost domains — fine for our
 * "production URL + test key" interim setup.
 *
 * Once we move to a Production instance (pk_live_ with verified
 * domain), we can swap this for the embedded <SignIn /> flow again.
 */

function b64urlDecode(s: string): string {
  let padded = s.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  if (typeof atob !== "undefined") return atob(padded);
  return Buffer.from(padded, "base64").toString("binary");
}

/** Return the Account Portal host (e.g. "deep-grouse-33.accounts.dev"),
 *  or null when the key is missing / malformed. */
export function clerkAccountPortalHost(): string | null {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return null;
  const m = pk.match(/^pk_(?:test|live)_(.+)$/);
  if (!m) return null;
  let decoded: string;
  try {
    decoded = b64urlDecode(m[1]);
  } catch {
    return null;
  }
  // decoded looks like "<instance>.clerk.accounts.dev$"; strip trailing $
  decoded = decoded.replace(/\$+$/, "");
  // Convert frontend-api host to Account Portal host:
  //   "<instance>.clerk.accounts.dev"  →  "<instance>.accounts.dev"
  const instanceMatch = decoded.match(/^([^.]+)\.clerk\.accounts\.dev$/);
  if (instanceMatch) return `${instanceMatch[1]}.accounts.dev`;
  // Production / custom frontend API — use as-is (Account Portal lives
  // at accounts.<yourdomain> by convention; assume already configured).
  return decoded.replace(/^clerk\./, "accounts.");
}

export function clerkSignInUrl(returnTo: string): string | null {
  const host = clerkAccountPortalHost();
  if (!host) return null;
  const url = new URL(`https://${host}/sign-in`);
  url.searchParams.set("redirect_url", returnTo);
  return url.toString();
}
