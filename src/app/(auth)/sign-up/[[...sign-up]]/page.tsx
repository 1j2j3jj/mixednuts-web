import { SignUp } from "@clerk/nextjs";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Clerk's sign-up page. We don't actively promote self sign-up
 * (access is gated via email allowlist in /login/success), but the
 * page exists so Clerk's flows that redirect here work without a 404.
 * Users who sign up with an un-allowlisted email see our friendly
 * denial banner on /login after Clerk hands control back.
 */
export default function SignUpPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) notFound();
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <SignUp
        appearance={{
          elements: {
            rootBox: "shadow-none",
          },
        }}
        fallbackRedirectUrl="/login/success"
        signInUrl="/sign-in"
      />
    </div>
  );
}
