import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login | mixednuts Dashboard",
  robots: { index: false, follow: false },
};

// LoginForm uses useSearchParams (reads `?next=`) which requires a
// Suspense boundary when the page is statically rendered. The boundary
// also keeps the static shell displayable while the form's JS hydrates.
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
