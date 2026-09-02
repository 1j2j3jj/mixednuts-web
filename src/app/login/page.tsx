import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import "../system-v6.css";

export const metadata: Metadata = { title: "Login | mixednuts Dashboard", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="mn-v6 mn-system-v6 login-v6">
      <section className="v6-scene system-hero">
        <div className="v6-scene-inner system-hero-inner login-shell">
          <div className="login-intro"><p className="v6-kicker">Client Access</p><h1 className="v6-en-display">PRIVATE<br />SCREENING.</h1><p>クライアント専用ダッシュボード。招待されたアカウントでサインインしてください。</p></div>
          <div className="login-panel"><Suspense fallback={<p>Loading…</p>}><LoginForm /></Suspense></div>
        </div>
      </section>
    </div>
  );
}
