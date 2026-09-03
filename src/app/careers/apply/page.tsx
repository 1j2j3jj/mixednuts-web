import type { Metadata } from "next";
import Link from "next/link";
import ApplyForm from "./ApplyForm";
import V6PageMotion from "@/components/V6PageMotion";
import { SplitWords } from "@/components/v6/KineticText";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import "./v6-apply.css";

const pageTitle = "採用応募フォーム";
const pageDescription = "mixednutsの採用応募フォームです。希望する参画方法と専門領域、これまで動かしてきた仕事を入力でき、書類添付は任意で、カジュアル面談から選考を始めることもできます。";
export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/careers/apply" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/careers/apply" }),
};
const breadcrumb = buildBreadcrumbSchema([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }, { name: "Apply", path: "/careers/apply" }]);
const webPageSchema = buildWebPageSchema({ path: "/careers/apply", name: pageTitle, description: pageDescription });

export default async function CareersApplyPage({ searchParams }: { searchParams: Promise<{ position?: string }> }) {
  const { position } = await searchParams;
  return (
    <main className="apply-v6" data-v6-page>
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumb} />
      <V6PageMotion />
      <section className="apply-v6__hero" data-nav="dark">
        <nav className="apply-v6__crumb v6-hero-detail" aria-label="パンくずリスト"><ol style={{ display: "contents" }}><li style={{ display: "contents" }}><Link href="/">Home</Link></li><li style={{ display: "contents" }}><span>/</span><Link href="/careers">Careers</Link></li><li style={{ display: "contents" }}><span>/</span>Apply</li></ol></nav>
        <p className="apply-v6__eyebrow v6-hero-detail">Application</p>
        <h1 className="apply-v6__title v6-slam" aria-label="Make your move."><SplitWords words={["Make", "your", "move."]} /></h1>
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
