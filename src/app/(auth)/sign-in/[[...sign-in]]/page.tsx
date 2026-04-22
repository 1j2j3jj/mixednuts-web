import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Clerk's sign-in page. Catch-all route so Clerk's internal flows
 * (email verification link, OAuth callback, reset password, etc.) all
 * route into the same component. Post-sign-in redirect is set in the
 * Clerk dashboard (Configure → Paths) to /login/success where we
 * bridge Clerk's identity into our HttpOnly cookie.
 */
export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) notFound();
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "shadow-none",
          },
        }}
        fallbackRedirectUrl="/login/success"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
