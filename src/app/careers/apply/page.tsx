import type { Metadata } from "next";
import Link from "next/link";
import ApplyForm from "./ApplyForm";

export const metadata: Metadata = {
  title: "Careers Apply — 採用エントリー | mixednuts inc.",
  description:
    "mixednuts への採用エントリーフォーム。戦略・AI・マーケの各ポジションに応募いただけます。カジュアル面談の希望も受付中。",
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ position?: string }>;

export default async function CareersApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const { position } = await searchParams;

  return (
    <>
      <style>{`
        .apply-wrap { background: var(--off-white-alt); padding: 96px 32px 120px; }
        .apply-inner { max-width: 860px; margin: 0 auto; }
        .apply-card {
          background: var(--off-white);
          border: 1px solid rgba(10,10,10,0.08);
          border-radius: 20px;
          padding: 56px 64px;
          box-shadow: 0 16px 48px rgba(10,10,10,0.04);
        }
        .apply-form .form-section { margin-bottom: 40px; }
        .apply-form .form-section:last-of-type { margin-bottom: 24px; }
        .apply-form .form-section-title {
          font-family: 'Noto Sans JP', sans-serif;
          font-size: 15px;
          font-weight: 900;
          color: var(--charcoal);
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--charcoal);
          letter-spacing: 0.02em;
        }
        .apply-form .form-group { margin-bottom: 20px; }
        .apply-form .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .apply-form .form-row .form-group { margin-bottom: 0; }
        .apply-form label {
          display: block; font-size: 12px; color: var(--gray-600);
          margin-bottom: 6px; font-weight: 600; letter-spacing: 0.03em;
        }
        .apply-form .req { color: #C0392B; margin-left: 4px; }
        .apply-form input[type="text"],
        .apply-form input[type="email"],
        .apply-form input[type="url"],
        .apply-form input[type="tel"],
        .apply-form select,
        .apply-form textarea {
          width: 100%; padding: 12px 14px;
          border: 1px solid rgba(10,10,10,0.15);
          border-radius: 8px; font-size: 14px;
          font-family: inherit; transition: all 0.15s ease;
          background: var(--off-white); color: var(--charcoal);
        }
        .apply-form input:focus,
        .apply-form select:focus,
        .apply-form textarea:focus {
          outline: none; border-color: var(--cyan);
          box-shadow: 0 0 0 3px rgba(0,217,255,0.12);
        }
        .apply-form textarea { resize: vertical; min-height: 180px; line-height: 1.8; }
        .apply-form .form-consent {
          display: flex; align-items: flex-start; gap: 10px;
          margin: 32px 0 16px; padding: 16px; background: var(--off-white-alt);
          border: 1px solid rgba(10,10,10,0.08); border-radius: 10px;
        }
        .apply-form .form-consent input { width: auto; margin-top: 2px; }
        .apply-form .form-consent label {
          margin: 0; font-size: 13px; color: var(--gray-600);
          font-weight: 400; cursor: pointer; line-height: 1.6;
        }
        .apply-form .form-consent label a { color: var(--charcoal); text-decoration: underline; font-weight: 600; }
        .apply-form .form-error {
          padding: 12px 16px; background: #FEF2F2; color: #991B1B;
          border-radius: 8px; font-size: 13px; margin-bottom: 16px;
        }
        .apply-form .form-actions { margin-top: 32px; }
        .apply-form .form-submit {
          width: 100%; justify-content: center;
          background: var(--charcoal); color: var(--off-white);
          padding: 16px 32px; border-radius: 10px;
          font-weight: 700; font-size: 15px; border: none; cursor: pointer;
          transition: all 0.15s ease; display: flex; align-items: center; gap: 8px;
          font-family: inherit;
        }
        .apply-form .form-submit:hover:not(:disabled) { background: var(--cyan); color: var(--charcoal); transform: translateY(-2px); }
        .apply-form .form-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .apply-form .form-note {
          font-size: 12px; color: var(--gray-400); margin-top: 16px;
          line-height: 1.7; text-align: center;
        }

        @media (max-width: 780px) {
          .apply-card { padding: 40px 28px; }
          .apply-form .form-row { grid-template-columns: 1fr; gap: 0; }
          .apply-form .form-row .form-group { margin-bottom: 20px; }
        }
      `}</style>

      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / <Link href="/careers">Careers</Link> / Apply
          </div>
          <div className="page-hero-badge">Application</div>
          <h1>
            <span style={{ display: "block" }}>あなたの専門性を、</span>
            <span style={{ display: "block" }}>
              <span className="accent">ここで発揮する</span>。
            </span>
          </h1>
          <p className="lead">
            選考フローはカジュアル面談（30分）からスタート。職務経歴書は書類選考通過後にご提出いただきます。まずは簡単にご自身のご経歴とご興味を教えてください。
          </p>
        </div>
      </section>

      <section className="apply-wrap">
        <div className="apply-inner">
          <div className="apply-card">
            <ApplyForm initialPosition={position} />
          </div>
          <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "var(--gray-400)" }}>
            選考フローの詳細は <Link href="/careers#process" style={{ color: "var(--charcoal)", textDecoration: "underline" }}>Careers ページ</Link> でご確認いただけます。
          </p>
        </div>
      </section>
    </>
  );
}
