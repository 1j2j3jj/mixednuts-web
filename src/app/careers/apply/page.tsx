import type { Metadata } from "next";
import Link from "next/link";
import ApplyForm from "./ApplyForm";
import V6PageMotion from "@/components/V6PageMotion";
import { SplitWords } from "@/components/v6/KineticText";
import "./v6-apply.css";

export const metadata: Metadata = {
  title: "Apply — mixednuts Careers",
  description: "mixednuts の採用応募フォーム。カジュアル面談から始められます。",
  alternates: { canonical: "/careers/apply" },
};

export default async function CareersApplyPage({ searchParams }: { searchParams: Promise<{ position?: string }> }) {
  const { position } = await searchParams;
  return (
    <main className="apply-v6" data-v6-page>
      <V6PageMotion />
      <section className="apply-v6__hero" data-nav="dark">
        <div className="apply-v6__crumb v6-hero-detail"><Link href="/">Home</Link><span>/</span><Link href="/careers">Careers</Link><span>/</span>Apply</div>
        <p className="apply-v6__eyebrow v6-hero-detail">Application</p>
        <h1 className="apply-v6__title v6-slam"><SplitWords words={["Make", "your", "move."]} /></h1>
        <p className="apply-v6__lead v6-hero-detail">完成された応募書類より、これまで何を動かしてきたか。まずは、あなたの専門性と興味を教えてください。</p>
      </section>
      <section className="apply-v6__body" data-nav="light">
        <header className="apply-v6__head v6-reveal"><span>Entry form</span><h2>応募情報</h2><p>書類は任意です。カジュアル面談から始めることもできます。</p></header>
        <div className="apply-v6__form v6-reveal"><ApplyForm initialPosition={position} /></div>
        <p className="apply-v6__back"><Link href="/careers#process">選考フローを確認する →</Link></p>
      </section>
    </main>
  );
}
