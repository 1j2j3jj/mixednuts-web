import type { Metadata } from "next";
import "../system-v6.css";

export const metadata: Metadata = {
  title: "広告レポートダッシュボード — Closed Beta | mixednuts inc.",
  description: "広告・GA4・売上データを統合し、目標対比・オフラインCV・メンバー権限をクライアント専用ダッシュボードで提供します。現在は招待制のクローズドβです。",
  alternates: { canonical: "/beta" },
  robots: { index: false, follow: false },
};

const FEATURES: Array<[string, string]> = [
  ["広告 × GA4 × 売上の突合レポート", "Google / Yahoo / Meta / Microsoft の広告実績と GA4・売上データを媒体・キャンペーン単位で自動突合。日次・週次・月次で確認できます。"],
  ["オフラインCVの統合", "電話・店舗・イベントなど広告管理画面に載らないコンバージョンを取り込み、月次レポートに反映します。"],
  ["目標管理", "月次目標（チャネル別対応）を CSV で自己アップロードし、ダッシュボードの目標対比・達成率に即時反映します。"],
  ["メンバー権限と招待", "閲覧者・編集者の2ロール。メールアドレスを貼り付けるだけで複数メンバーをまとめて招待でき、招待メールは自動送信されます。"],
  ["データ鮮度の可視化", "データの最終更新日を毎朝自動チェックし、遅延時はダッシュボード上に明示します。古い数字を最新と誤認させません。"],
];

export default function BetaPage() {
  return (
    <div className="mn-v6 mn-system-v6 beta-v6">
      <section className="v6-scene system-hero system-hero--compact"><div className="v6-scene-inner system-hero-inner"><div className="system-hero-copy"><p className="v6-kicker">Closed Beta · Invitation Only</p><h1 className="v6-jp-heading system-title system-title--jp">広告レポート<br /><span className="v6-accent">ダッシュボード</span></h1><p className="system-lead">広告・アクセス解析・売上を1画面に統合したレポートダッシュボードです。現在は招待制のクローズドβとして、既存クライアント企業を対象に運用しています。</p></div></div></section>
      <section className="v6-scene v6-paper-scene system-paper"><div className="v6-scene-inner system-paper-inner"><header className="system-section-head"><p className="v6-kicker v6-kicker--paper">Current Features</p><h2 className="v6-jp-heading">数字を、判断できる<br />状態に整える。</h2></header><div className="position-list">{FEATURES.map(([title, desc], index) => <article className="position-item" key={title}><div className="position-main"><p className="v6-kicker v6-kicker--paper">0{index + 1}</p><h3 className="v6-jp-heading">{title}</h3><p className="system-section-lead">{desc}</p></div></article>)}</div></div></section>
      <section className="v6-scene system-ink-cta"><div className="v6-scene-inner"><div><p className="v6-kicker">Invitation</p><h2 className="v6-jp-heading">利用をご希望の方へ</h2><p className="system-lead">クローズドβ期間中は、当社のコンサルティングクライアント企業さまを対象に招待制で提供しています。</p></div><a className="v6-button v6-button--paper" href="mailto:info@mixednuts-inc.com?subject=ダッシュボード利用希望">利用について問い合わせる</a></div></section>
    </div>
  );
}
