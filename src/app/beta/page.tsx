import type { Metadata } from "next";
import V6PageMotion from "@/components/V6PageMotion";
import { SplitWords } from "@/components/v6/KineticText";
import "./v6-beta.css";

export const metadata: Metadata = {
  title: "広告レポートダッシュボード（クローズドβ）| ミックスナッツ株式会社",
  description: "広告（Google/Yahoo/Meta 等）× GA4 × 売上を突合したレポートを、クライアント専用ダッシュボードで提供します。現在は招待制のクローズドβです。",
  alternates: { canonical: "/beta" },
  robots: { index: false, follow: false },
};

const FEATURES: Array<[string, string]> = [
  ["広告 × GA4 × 売上の突合レポート", "広告実績とアクセス解析・売上データを媒体・キャンペーン単位で確認できます。"],
  ["オフラインCVの統合", "電話・店舗・イベントなど、広告管理画面に載らないコンバージョンも取り込みます。"],
  ["目標管理", "チャネル別目標をアップロードし、目標対比と達成率に反映します。"],
  ["メンバー権限と招待", "閲覧者・編集者の権限を分け、複数メンバーを招待できます。"],
  ["データ鮮度の可視化", "最終更新日を確認し、遅延時はダッシュボード上に明示します。"],
];

export default function BetaPage() {
  return (
    <main className="beta-v6" data-v6-page>
      <V6PageMotion />
      <section className="beta-v6__hero" data-nav="dark">
        <p className="v6-hero-detail">Closed beta / Invitation only</p>
        <h1 className="v6-slam"><SplitWords words={["See", "what", "moves."]} /></h1>
        <p className="beta-v6__lead v6-hero-detail">広告・アクセス解析・売上を、ひとつの画面で。クライアント向けレポートダッシュボードです。</p>
      </section>
      <section className="beta-v6__body" data-nav="light">
        <header className="beta-v6__head v6-reveal"><span>Capability</span><h2>見える化で、<br />意思決定を前へ。</h2></header>
        <div className="beta-v6__features">{FEATURES.map(([title, desc], index) => <article className="v6-reveal" key={title}><span>{String(index + 1).padStart(2,"0")}</span><h3>{title}</h3><p>{desc}</p></article>)}</div>
      </section>
      <section className="beta-v6__cta" data-nav="dark"><p>Closed access</p><h2>利用をご希望の方へ</h2><p>現在は既存クライアント企業を対象に、招待制で提供しています。</p><a href="mailto:info@mixednuts-inc.com?subject=ダッシュボード利用希望">利用について問い合わせる →</a></section>
    </main>
  );
}
