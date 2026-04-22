import { notFound, redirect } from "next/navigation";
import { clerkAccountPortalHost } from "@/lib/clerk-url";

export const dynamic = "force-dynamic";

/** Mirror of /sign-in — redirects to Clerk's hosted Account Portal.
 *  Self sign-up isn't promoted in our UI, but Clerk's flows may route
 *  users here after e.g. email-link verification; keeping the same
 *  Portal redirect keeps the experience consistent. */
export default function SignUpPage() {
  const host = clerkAccountPortalHost();
  if (!host) notFound();
  const url = new URL(`https://${host}/sign-up`);
  url.searchParams.set("redirect_url", "https://www.mixednuts-inc.com/login/success");
  redirect(url.toString());
}
