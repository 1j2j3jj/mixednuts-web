import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import V6PageMotion from "@/components/V6PageMotion";
import "./v6-login.css";

export const metadata: Metadata = {
  title: "Login | mixednuts Dashboard",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="login-v6" data-v6-page>
      <V6PageMotion />
      <section className="login-v6__band" data-nav="dark">
        <p>Client access</p><h1>LOGIN</h1><span aria-hidden="true">L/01</span>
      </section>
      <section className="login-v6__body" data-nav="light">
        <Suspense fallback={<p className="login-v6__loading">Loading…</p>}><LoginForm /></Suspense>
      </section>
    </main>
  );
}
