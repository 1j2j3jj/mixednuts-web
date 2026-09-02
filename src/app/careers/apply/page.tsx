import type { Metadata } from "next";
import Link from "next/link";
import ApplyForm from "./ApplyForm";
import SystemMotionV6 from "../../SystemMotionV6";
import "../../system-v6.css";

export const metadata: Metadata = {
  title: "Careers Apply — 採用エントリー | mixednuts inc.",
  description: "mixednuts への採用エントリーフォーム。戦略・AI・マーケの各ポジションに応募いただけます。カジュアル面談の希望も受付中。",
  robots: { index: false, follow: true },
};

type SearchParams = Promise<{ position?: string }>;

export default async function CareersApplyPage({ searchParams }: { searchParams: SearchParams }) {
  const { position } = await searchParams;
  return (
    <div className="mn-v6 mn-system-v6 apply-v6">
      <SystemMotionV6 />
      <section className="v6-scene system-hero system-hero--compact" aria-labelledby="apply-title">
        <div className="v6-scene-inner system-hero-inner">
          <p className="system-breadcrumb"><Link href="/">Home</Link> / <Link href="/careers">Careers</Link> / Apply</p>
          <div className="system-hero-copy">
            <p className="v6-kicker">Application</p>
            <h1 id="apply-title" className="v6-jp-heading system-title system-title--jp">あなたの専門性を、<br /><span className="v6-accent">ここで発揮する。</span></h1>
            <p className="system-lead">選考フローはカジュアル面談（30分）からスタート。まずは簡単にご自身のご経歴とご興味を教えてください。</p>
          </div>
        </div>
      </section>
      <section className="v6-scene v6-paper-scene system-paper">
        <div className="v6-scene-inner system-paper-inner apply-layout">
          <div className="form-shell" data-v6-reveal><p className="v6-kicker v6-kicker--paper">Entry Form</p><h2 className="v6-jp-heading">採用エントリー</h2><ApplyForm initialPosition={position} /></div>
          <aside className="contact-aside" data-v6-reveal><div className="aside-block"><p className="v6-kicker v6-kicker--paper">Before You Apply</p><h3 className="v6-jp-heading">選考について</h3><p>2営業日以内にご連絡します。書類選考通過後、30分のカジュアル面談からスタートします。</p></div><div className="aside-block"><p><Link href="/careers#process">選考フローの詳細を見る →</Link></p></div></aside>
        </div>
      </section>
    </div>
  );
}
