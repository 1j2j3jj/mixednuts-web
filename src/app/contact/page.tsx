import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "./ContactForm";
import SystemMotionV6 from "../SystemMotionV6";
import { JsonLd, buildBreadcrumbSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import "../system-v6.css";

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

const flow = [
  ["01", "お問い合わせ", "フォームまたはメールにてご連絡ください。"],
  ["02", "初回ヒアリング（60分・無料）", "課題・目標・時間軸をオンラインでお聞きします。"],
  ["03", "提案・見積もり", "最適なアプローチと費用感をご提案します。"],
];

export default function ContactPage() {
  return (
    <div className="mn-v6 mn-system-v6 contact-v6">
      <JsonLd data={contactPageSchema} />
      <JsonLd data={breadcrumb} />
      <SystemMotionV6 canvas act={0} />

      <section className="v6-scene system-hero system-hero--contact" aria-labelledby="contact-title">
        <div className="v6-scene-inner system-hero-inner">
          <p className="system-breadcrumb"><Link href="/">Home</Link> / Contact</p>
          <div className="system-hero-copy">
            <p className="v6-kicker">60 Minute Free Consultation</p>
            <h1 id="contact-title" className="v6-en-display system-title">
              LET&apos;S BUILD<br /><span className="v6-accent">GROWTH.</span>
            </h1>
            <p className="system-lead">
              初回無料相談（60分）で、貴社の課題をヒアリングし、最適なアプローチをご提案します。24時間以内にご返信します。売り込みではなく、対話からはじめましょう。
            </p>
          </div>
        </div>
      </section>

      <section className="v6-scene v6-paper-scene system-paper" aria-labelledby="contact-form-title">
        <div className="v6-scene-inner system-paper-inner contact-layout">
          <div className="form-shell" data-v6-reveal>
            <p className="v6-kicker v6-kicker--paper">Start a Conversation</p>
            <h2 id="contact-form-title" className="v6-jp-heading">お問い合わせフォーム</h2>
            <ContactForm />
          </div>

          <aside className="contact-aside" aria-label="お問い合わせ後の流れ" data-v6-reveal>
            <div className="aside-block">
              <p className="v6-kicker v6-kicker--paper">What Happens Next</p>
              <h3 className="v6-jp-heading">ご相談から提案まで</h3>
            </div>
            {flow.map(([number, title, text]) => (
              <div className="flow-row" key={number}>
                <strong>{number}</strong>
                <div><h4>{title}</h4><p>{text}</p></div>
              </div>
            ))}
            <div className="aside-block">
              <p className="v6-kicker v6-kicker--paper">Direct Email</p>
              <h3><a href="mailto:hello@mixednuts-inc.com">hello@mixednuts-inc.com</a></h3>
              <p>通常24時間以内に返信いたします（土日祝は翌営業日）。</p>
            </div>
            <div className="aside-block">
              <p className="v6-kicker v6-kicker--paper">Company</p>
              <address>ミックスナッツ株式会社<br />〒107-0062 東京都港区南青山3-8-40<br />※ 訪問は事前予約制です</address>
            </div>
            <div className="aside-block">
              <p className="v6-kicker v6-kicker--paper">Explore</p>
              <p><Link href="/services">Services</Link>　<Link href="/works">Works</Link>　<Link href="/insights">Insights</Link></p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
