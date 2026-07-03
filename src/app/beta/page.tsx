import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "広告レポートダッシュボード（クローズドβ）| ミックスナッツ株式会社",
  description:
    "広告（Google/Yahoo/Meta 等）× GA4 × 売上を突合した週次・月次レポートを、クライアント専用ダッシュボードで提供します。現在は招待制のクローズドβです。",
  alternates: { canonical: "/beta" },
};

/**
 * 限定招待LP（Batch5）。ナビ/フッターには意図的にリンクしない未リンクページ —
 * CEO 確認後に導線を追加する。コピーは実装済み機能のみ（誇張禁止 / calibration）。
 */
const FEATURES: Array<[string, string]> = [
  [
    "広告 × GA4 × 売上の突合レポート",
    "Google / Yahoo / Meta / Microsoft の広告実績と GA4・売上データを媒体・キャンペーン単位で自動突合。日次・週次・月次で確認できます。",
  ],
  [
    "オフラインCVの統合",
    "電話・店舗・イベントなど広告管理画面に載らないコンバージョンを取り込み、月次レポートに反映します。",
  ],
  [
    "目標管理",
    "月次目標（チャネル別対応）を CSV で自己アップロードし、ダッシュボードの目標対比・達成率に即時反映します。",
  ],
  [
    "メンバー権限と招待",
    "閲覧者・編集者の2ロール。メールアドレスを貼り付けるだけで複数メンバーをまとめて招待でき、招待メールは自動送信されます。",
  ],
  [
    "データ鮮度の可視化",
    "データの最終更新日を毎朝自動チェックし、遅延時はダッシュボード上に明示します。古い数字を最新と誤認させません。",
  ],
];

export default function BetaPage() {
  return (
    <main
      style={{
        background: "#F5F1E8",
        minHeight: "100vh",
        color: "#0A0A0A",
        padding: "140px 24px 80px",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Closed Beta — 招待制
        </p>
        <h1
          style={{
            fontSize: "clamp(32px, 6vw, 56px)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: 20,
          }}
        >
          広告レポート
          <br />
          ダッシュボード
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.9, marginBottom: 40, maxWidth: 620 }}>
          ミックスナッツ株式会社がコンサルティングクライアント向けに提供する、
          広告・アクセス解析・売上を1画面に統合したレポートダッシュボードです。
          現在は招待制のクローズドβとして、既存クライアント企業を対象に運用しています。
        </p>

        <div style={{ display: "grid", gap: 20, marginBottom: 48 }}>
          {FEATURES.map(([title, desc]) => (
            <section
              key={title}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E0D5",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: "#3A3A3A" }}>{desc}</p>
            </section>
          ))}
        </div>

        <section
          style={{
            background: "#0A0A0A",
            color: "#F5F1E8",
            borderRadius: 12,
            padding: "28px 28px 32px",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            利用をご希望の方へ
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, marginBottom: 20, color: "#D8D2C4" }}>
            クローズドβ期間中は、当社のコンサルティングクライアント企業さまを対象に
            招待制で提供しています。ご興味のある方は下記までお問い合わせください。
          </p>
          <a
            href="mailto:info@mixednuts-inc.com?subject=ダッシュボード利用希望"
            style={{
              display: "inline-block",
              background: "#00D9FF",
              color: "#0A0A0A",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
            }}
          >
            利用について問い合わせる
          </a>
          <p style={{ fontSize: 12, marginTop: 16, color: "#8A8574" }}>
            ミックスナッツ株式会社 / info@mixednuts-inc.com
          </p>
        </section>
      </div>
    </main>
  );
}
