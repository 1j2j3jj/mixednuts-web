import type { Metadata } from "next";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailV6 from "../ServiceDetailV6";
import "../v6-services.css";

const pageTitle = "戦略・経営管理支援 — 事業計画・FP&A・M&A";
const pageDescription =
  "事業会社の経営企画・FP&Aと、広告・グロースの実務経験を生かし、中期経営計画、予実管理、投資評価、M&A、新規事業、組織設計を経営判断から実行まで支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/strategy" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/strategy" }),
};

const strategyWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("strategy")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/strategy#service",
  name: "Strategy Consulting",
  serviceType: "Strategy / FP&A / M&A",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description: "中期経営計画、FP&A/予実管理、M&A戦略・デューデリジェンス、新規事業立上げ、取締役会付議支援まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/strategy",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Strategy", path: "/services/strategy" },
]);
const webPageSchema = buildWebPageSchema({ path: "/services/strategy", name: pageTitle, description: pageDescription });

const offerings = [
  { num: "01", title: "中期経営計画・事業戦略", desc: "3-5年の中期経営計画策定から単年度事業計画まで。市場分析、競合マッピング、ポジショニング設計、成長ドライバーの特定まで、数字に落としたロードマップを作ります。" },
  { num: "02", title: "FP&A / 予実管理設計", desc: "財務計画・予実分析の仕組みを設計・構築します。月次締め、取締役会付議、KPI設計、AIを使った自動化まで。CFO機能を外部から提供します。" },
  { num: "03", title: "M&A 戦略・デューデリジェンス", desc: "買収候補の発掘から財務DD、法務DD連携、バリュエーション（DCF・マルチプル）、意思決定支援まで。検討に必要な論点を整理し、判断材料を組み立てます。" },
  { num: "04", title: "投資評価・バリュエーション", desc: "DCF、コンパラブル分析、フットボールチャート、シナリオ感応度分析。投資判断の根拠を多角的に構築します。上場・未上場の双方に対応。" },
  { num: "05", title: "新規事業立ち上げ支援", desc: "ICP定義、仮説検証設計、MVP策定、Gate Review、ピボット判断まで。PMF達成後の本格投入準備まで伴走し、AI活用でリサーチ工程を短縮します。" },
  { num: "06", title: "組織設計・PMO", desc: "事業の成長フェーズに合わせた組織設計、KPI体系の再構築、プロジェクト管理体制の整備。複数部門の横串調整も担います。" },
];

export default function ServiceStrategyPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumb} />
      <ServiceDetailV6
        act="ACT I"
        theme="black"
        word="Strategy"
        eyebrow="Strategy consulting"
        headline={<><span>意思決定の質を、</span><br /><span>数倍に引き上げる。</span></>}
        lead="事業戦略、新規事業、M&A、経営管理まで。分厚い報告書ではなく、明日からの行動に変換するロードマップ。事業会社の経営企画・FP&A と、広告・グロースの最前線を経験したメンバーが、経営判断の中枢に入り込みます。"
        offerings={offerings}
        offeringsTitle={<><span>戦略コンサルティング</span><br /><span>の6領域。</span></>}
        offeringsLead="経営判断の全段階で、データとAIを使った意思決定支援を提供します。"
        cases={strategyWorks}
        ctaTitle={<><span>経営判断を、</span><br /><span>もっと確信を持って。</span></>}
        ctaBody="初回相談で、貴社の経営課題をヒアリングします。まずは話すことから始めましょう。"
      />
    </>
  );
}
