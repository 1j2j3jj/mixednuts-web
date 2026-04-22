import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Login | mixednuts Dashboard",
  robots: { index: false, follow: false },
};

/**
 * Public login page — exempt from Basic Auth via middleware matcher.
 * Lets existing clients log in with their per-client credentials without
 * seeing the browser's native Basic Auth popup. Admin can also log in
 * here instead of triggering the popup on the marketing site.
 *
 * Future: "Continue with Google" button will appear here once Clerk /
 * Google OAuth is wired. Internal users (mixednuts staff) will use OAuth;
 * external clients will keep the ID/PW form.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <LoginForm />
    </div>
  );
}
