import type { Metadata } from "next";
import { works, CASES_COMING_SOON } from "@/data/works";
import { JsonLd, buildBreadcrumbSchema, buildWebPageSchema } from "@/components/JsonLd";
import { buildPageOg } from "@/lib/site-metadata";
import ServiceDetailV6 from "../ServiceDetailV6";
import "../v6-services.css";

const pageTitle = "マーケティング支援 — 広告・SEO・グロース";
const pageDescription =
  "広告・グロースの実務経験を基に、広告運用、SEO・AIO、ファネル設計、LTV・CAC分析、コンテンツ、計測基盤を統合し、日次の可視化と継続改善まで支援します。";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services/marketing" },
  ...buildPageOg({ title: pageTitle, description: pageDescription, path: "/services/marketing" }),
};

const marketingWorks = CASES_COMING_SOON
  ? []
  : works.filter((work) => !work.hidden && work.services.includes("marketing")).slice(0, 3);

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://mixednuts-inc.com/services/marketing#service",
  name: "Marketing & Growth",
  serviceType: "Growth Marketing / Ad Operations",
  provider: { "@id": "https://mixednuts-inc.com/#organization" },
  description: "広告運用（Google/Meta/TikTok）、グロースマーケ設計、SEO/AIO戦略、LTV/CAC最適化、コンテンツマーケ、ブランド戦略まで統合提供。",
  areaServed: "JP",
  audience: { "@type": "BusinessAudience", audienceType: "Enterprise" },
  url: "https://mixednuts-inc.com/services/marketing",
};

const breadcrumb = buildBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "Marketing", path: "/services/marketing" },
]);
const webPageSchema = buildWebPageSchema({ path: "/services/marketing", name: pageTitle, description: pageDescription });

const offerings = [
  { num: "01", title: "広告運用（Google / Meta / TikTok）", desc: "キャンペーン構造の設計から入札戦略、クリエイティブ最適化まで。AIを活用した自動入札設定と、人間の目によるCV品質管理を組み合わせ、ROASとCPAの両立を目指します。" },
  { num: "02", title: "SEO / AIO 戦略", desc: "Google AI Overviews 対応の構造化データ実装、E-E-A-T強化、LLMO対策を包括的に実行。検索意図分析からコンテンツ設計、内部リンク最適化まで一気通貫で支援します。" },
  { num: "03", title: "グロースマーケティング設計", desc: "ファネル全体を可視化し、ボトルネックを特定。AARRRフレームワーク、コホート分析、KPIツリー設計を通じて、成長の再現性を構築します。" },
  { num: "04", title: "LTV / CAC 最適化", desc: "顧客獲得コストと顧客生涯価値のバランスを最適化。サブスク型ビジネス、D2C、SaaSに対応したユニットエコノミクス分析と施策立案を行います。" },
  { num: "05", title: "コンテンツマーケティング", desc: "SNSコンテンツ戦略、ブログ・メディア設計、動画広告クリエイティブ制作。AIで量を確保し、人間が品質をコントロールするプロセスで効率と効果を両立します。" },
  { num: "06", title: "計測・分析基盤", desc: "GA4設定、GTM最適化、拡張コンバージョン実装、アトリビューション設計。「データが信頼できる」状態を作り、意思決定の精度を上げます。" },
];

const aiMarketingRows = [
  { num: "01", title: "AI クリエイティブ生成", desc: "画像・動画・テキストのクリエイティブ生成をAIで効率化し、人間が品質をコントロールしながら勝ちパターンを検証します。" },
  { num: "02", title: "自動分析・レポーティング", desc: "広告媒体とアクセス解析のデータを収集・分析し、レポーティングを自動化。人間が判断に集中できる状態を作ります。" },
  { num: "03", title: "検索意図・SEO 分析", desc: "キーワードの検索意図分類、競合コンテンツ分析、構造化データ最適化をAIで支援し、戦略判断につなげます。" },
];

export default function ServiceMarketingPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={webPageSchema} />
      <JsonLd data={breadcrumb} />
      <ServiceDetailV6
        act="ACT III"
        theme="navy"
        word="Marketing"
        eyebrow="Marketing & growth"
        headline={<><span>評論家ではなく、</span><br /><span>現場で実行する</span><br /><span>チーム。</span></>}
        lead="広告・グロースの実務経験を持つメンバーが、広告運用とグロース戦略を統合提供。AIクリエイティブ生成、自動入札、検索意図分析を組み込んだ、再現性のある成長設計です。"
        metric={{ value: "6", label: "稼働中の専用ダッシュボード", note: "広告と売上を日次で更新" }}
        offerings={offerings}
        offeringsTitle={<><span>グロース</span><br /><span>マーケティングの6領域。</span></>}
        offeringsLead="数字を起点に、何を実行するかと、その理由を明確にします。"
        secondary={{ label: "AI × Marketing", title: <><span>AIで、マーケを</span><br /><span>進化させる。</span></>, lead: "自動化できる工程を効率化し、人間はより高度な判断に集中します。", rows: aiMarketingRows }}
        cases={marketingWorks}
        ctaTitle={<><span>成長の再現性を、</span><br /><span>一緒に設計する。</span></>}
        ctaBody="広告費の無駄をなくし、LTVを高め、オーガニックを育てる。初回相談から始めましょう。"
      />
    </>
  );
}
