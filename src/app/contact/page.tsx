import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";
import V6PageMotion from "@/components/V6PageMotion";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { SplitWords } from "@/components/v6/KineticText";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-contact.css";
import "./v6-contact-fixes.css";

const pageTitle = "Contact — まずは、話しましょう";
const pageDescription =
  "初回無料相談（60分）で、貴社の課題をヒアリングし最適なアプローチをご提案します。24時間以内にご返信します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/contact" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/contact" }),
};

const contactPageSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "@id": "https://mixednuts-inc.com/contact#webpage",
  url: "https://mixednuts-inc.com/contact",
  name: pageTitle,
  description: pageDescription,
  inLanguage: "ja-JP",
  isPartOf: { "@id": "https://mixednuts-inc.com/#website" },
  mainEntity: { "@id": "https://mixednuts-inc.com/#organization" },
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
]);

const steps = [
  ["01", "お問い合わせ", "フォームまたはメールで、現在地と相談したいテーマをお知らせください。"],
  ["02", "初回ヒアリング", "60分の無料相談で、課題・目標・時間軸をオンラインで整理します。"],
  ["03", "提案・始動", "必要な場合のみ、進め方と費用をご提案。合意後すぐに始動します。"],
];

export default function ContactPage() {
  return (
    <main className="contact-v6" data-v6-page>
      <JsonLd data={contactPageSchema} />
      <JsonLd data={breadcrumb} />
      <V6PageMotion />

      <section className="contact-v6__hero" data-nav="dark">
        <div className="contact-v6__crumb v6-hero-detail"><Link href="/">Home</Link><span>/</span>Contact</div>
        <p className="contact-v6__eyebrow v6-hero-detail">60-minute free consultation</p>
        <h1 className="contact-v6__title v6-slam"><SplitWords words={["Let's", "build", "growth."]} /></h1>
        <p className="contact-v6__lead v6-hero-detail">
          売り込みではなく、対話から。初回無料相談（60分）で課題を整理し、最適なアプローチを一緒に考えます。
        </p>
        <span className="contact-v6__index v6-hero-detail" aria-hidden="true">C/01</span>
      </section>

      <section className="contact-v6__body" data-nav="light">
        <div className="contact-v6__form-column v6-reveal">
          <div className="contact-v6__section-head">
            <span>Inquiry form</span>
            <h2>相談の入口を、<br />ここから。</h2>
          </div>
          <ContactForm />
        </div>

        <aside className="contact-v6__aside">
          <section className="contact-v6__aside-section v6-reveal">
            <p className="contact-v6__aside-label">What happens next</p>
            <div className="contact-v6__steps">
              {steps.map(([number, title, body]) => (
                <div className="contact-v6__step" key={number}>
                  <span>{number}</span><div><h3>{title}</h3><p>{body}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="contact-v6__aside-section v6-reveal">
            <p className="contact-v6__aside-label">Direct</p>
            <a className="contact-v6__email" href="mailto:hello@mixednuts-inc.com">hello@mixednuts-inc.com</a>
            <p>通常24時間以内に返信します（土日祝は翌営業日）。</p>
          </section>

          <section className="contact-v6__aside-section v6-reveal">
            <p className="contact-v6__aside-label">Company facts</p>
            <dl className="contact-v6__facts">
              <div><dt>Company</dt><dd>ミックスナッツ株式会社</dd></div>
              <div><dt>Office</dt><dd>東京都港区南青山3-8-40</dd></div>
              <div><dt>Visit</dt><dd>事前予約制</dd></div>
            </dl>
          </section>
        </aside>
      </section>
    </main>
  );
}
