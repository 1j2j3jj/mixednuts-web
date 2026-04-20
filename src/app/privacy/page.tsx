import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "ミックスナッツ株式会社のプライバシーポリシー（個人情報保護方針）。個人情報の取扱い、利用目的、第三者提供、クッキー等について。",
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        .legal-hero { background: linear-gradient(180deg, #F9FAFB 0%, #fff 100%); padding: 140px 32px 64px; }
        .legal-hero-inner { max-width: 900px; margin: 0 auto; }
        .legal-hero h1 { font-family: var(--font-serif-jp); font-size: clamp(32px, 5vw, 48px); font-weight: 700; color: var(--navy); margin-bottom: 16px; line-height: 1.3; letter-spacing: -0.01em; }
        .legal-hero .lead { color: #4B5563; font-size: 15px; line-height: 1.9; }
        .legal-meta { display: flex; gap: 24px; flex-wrap: wrap; padding: 20px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-top: 32px; font-size: 12px; color: #9CA3AF; letter-spacing: 0.05em; }
        .legal-body { padding: 80px 32px 120px; background: #fff; }
        .legal-body-inner { max-width: 900px; margin: 0 auto; }
        .toc { background: #F9FAFB; border-radius: 12px; padding: 32px; margin-bottom: 64px; border: 1px solid #E5E7EB; }
        .toc h3 { font-size: 11px; color: #9CA3AF; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; margin-bottom: 16px; }
        .toc ol { list-style: none; counter-reset: toc; padding: 0; }
        .toc ol li { counter-increment: toc; padding: 6px 0; font-size: 14px; }
        .toc ol li::before { content: counter(toc, decimal-leading-zero) " — "; color: var(--cyan); font-weight: 700; }
        .toc ol li a { color: var(--navy); text-decoration: none; transition: color 0.2s; }
        .toc ol li a:hover { color: var(--cyan); }
        .legal-body h2 { font-family: var(--font-serif-jp); font-size: 24px; line-height: 1.4; font-weight: 700; color: var(--navy); margin: 56px 0 20px; padding-bottom: 12px; border-bottom: 2px solid var(--navy); scroll-margin-top: 100px; }
        .legal-body h3 { font-family: var(--font-serif-jp); font-size: 18px; font-weight: 700; color: var(--navy); margin: 32px 0 12px; }
        .legal-body p { font-size: 15px; line-height: 1.95; color: #1A1A1A; margin-bottom: 16px; }
        .legal-body ul, .legal-body ol.numbered { margin: 12px 0 24px 24px; }
        .legal-body ul li, .legal-body ol.numbered li { font-size: 15px; line-height: 1.95; color: #1A1A1A; margin-bottom: 8px; }
        .info-box { background: #F9FAFB; border-left: 4px solid var(--cyan); padding: 20px 24px; border-radius: 4px; margin: 24px 0; font-size: 14px; line-height: 1.9; }
        .info-box strong { color: var(--navy); }
        .legal-body table { width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
        .legal-body table th, .legal-body table td { padding: 14px 16px; border: 1px solid #E5E7EB; font-size: 14px; text-align: left; line-height: 1.7; }
        .legal-body table th { background: #F9FAFB; color: var(--navy); font-weight: 700; }
        .breadcrumb-priv { color: #9CA3AF; font-size: 12px; letter-spacing: 0.05em; margin-bottom: 20px; }
        .breadcrumb-priv a { color: inherit; text-decoration: none; }
        .breadcrumb-priv a:hover { color: var(--cyan); }
      `}</style>

      <section className="legal-hero">
        <div className="legal-hero-inner">
          <div className="breadcrumb-priv">
            <Link href="/">Home</Link> / プライバシーポリシー
          </div>
          <h1>プライバシーポリシー</h1>
          <p className="lead">
            ミックスナッツ株式会社（以下「当社」）は、お客様の個人情報を適切に取り扱うことの社会的責任を認識し、個人情報保護法およびその他の関連法令を遵守するとともに、以下の方針に従って個人情報を適切に取り扱います。
          </p>
          <div className="legal-meta">
            <span>制定日: 2021年4月19日</span>
            <span>最終改定日: 2026年4月17日</span>
            <span>版: v3.0</span>
          </div>
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-body-inner">
          <div className="toc">
            <h3>目次</h3>
            <ol>
              <li><a href="#sec1">個人情報の定義</a></li>
              <li><a href="#sec2">収集する個人情報</a></li>
              <li><a href="#sec3">利用目的</a></li>
              <li><a href="#sec4">第三者への提供</a></li>
              <li><a href="#sec5">個人情報の委託</a></li>
              <li><a href="#sec6">安全管理措置</a></li>
              <li><a href="#sec7">クッキー（Cookie）の使用</a></li>
              <li><a href="#sec8">AI ツール利用時の取扱い</a></li>
              <li><a href="#sec9">個人情報に関するお問い合わせ</a></li>
              <li><a href="#sec10">プライバシーポリシーの変更</a></li>
            </ol>
          </div>

          <h2 id="sec1">1. 個人情報の定義</h2>
          <p>本プライバシーポリシーにおける「個人情報」とは、個人情報の保護に関する法律に規定する「個人情報」を意味し、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、メールアドレスその他の記述等により特定の個人を識別できる情報および個人識別符号が含まれる情報を指します。</p>

          <h2 id="sec2">2. 収集する個人情報</h2>
          <p>当社は、以下の場合に個人情報を収集します。</p>
          <ul>
            <li>当社ウェブサイトのお問い合わせフォームをご利用いただいた場合</li>
            <li>当社のサービス・コンサルティング契約を締結した場合</li>
            <li>当社主催のセミナー、ウェビナー、イベントにお申し込みいただいた場合</li>
            <li>当社のニュースレター・メールマガジンにご登録いただいた場合</li>
            <li>採用応募をいただいた場合</li>
            <li>電話・メール・チャットでお問い合わせいただいた場合</li>
          </ul>
          <p>収集する情報は、お名前・会社名・役職・メールアドレス・電話番号・ご相談内容・応募書類等です。</p>

          <h2 id="sec3">3. 利用目的</h2>
          <p>当社は、収集した個人情報を以下の目的で利用します。</p>
          <ol className="numbered">
            <li>お問い合わせへの回答、ご相談への対応</li>
            <li>コンサルティングサービスの提供および契約の履行</li>
            <li>お客様への各種ご案内・連絡・通知</li>
            <li>請求書の発行・入金管理</li>
            <li>セミナー・イベントの運営</li>
            <li>ニュースレター・メールマガジンの配信</li>
            <li>採用選考および採用業務の遂行</li>
            <li>当社サービスの改善・新サービスの開発</li>
            <li>法令・ガイドラインの遵守</li>
          </ol>
          <p>当社は、上記の目的を超えて個人情報を利用する場合、事前にご本人の同意を得ます。</p>

          <h2 id="sec4">4. 第三者への提供</h2>
          <p>当社は、以下の場合を除き、ご本人の同意なしに個人情報を第三者に提供しません。</p>
          <ul>
            <li>法令に基づく場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
          </ul>

          <h2 id="sec5">5. 個人情報の委託</h2>
          <p>当社は、利用目的の達成に必要な範囲で、個人情報の取扱いを第三者に委託することがあります。主な委託先は以下の通りです。</p>
          <ul>
            <li>クラウドサービス事業者（Google Workspace, AWS, Cloudflare 等）</li>
            <li>会計・税務処理を目的とした税理士事務所・会計システム提供事業者</li>
            <li>請求・決済代行事業者</li>
            <li>カスタマーサポートシステム提供事業者</li>
          </ul>

          <h2 id="sec6">6. 安全管理措置</h2>
          <p>当社は、個人情報の漏洩、滅失、毀損の防止その他の安全管理のために、組織的・人的・物理的・技術的な安全管理措置を講じます。</p>
          <h3>組織的安全管理措置</h3>
          <ul>
            <li>個人情報の取扱いに関する責任者の設置</li>
            <li>個人情報の取扱状況の把握と監査</li>
            <li>漏洩等事案に対応する体制の整備</li>
          </ul>
          <h3>技術的安全管理措置</h3>
          <ul>
            <li>個人情報へのアクセス制御（アクセス権限の付与を業務上必要な範囲に限定）</li>
            <li>通信の暗号化（HTTPS / TLS）</li>
            <li>ファイル・データベースの暗号化</li>
            <li>監査ログの取得と定期的な点検</li>
          </ul>

          <h2 id="sec7">7. クッキー（Cookie）の使用</h2>
          <p>当社ウェブサイトでは、サービス向上のためクッキー（Cookie）を使用しています。</p>
          <table>
            <thead>
              <tr><th>カテゴリ</th><th>目的</th><th>オプトアウト</th></tr>
            </thead>
            <tbody>
              <tr><td>必須</td><td>ウェブサイトの基本機能</td><td>不可（ブラウザ設定で無効化可能）</td></tr>
              <tr><td>分析</td><td>Google Analytics によるアクセス解析</td><td>ブラウザ設定またはオプトアウトツール</td></tr>
              <tr><td>広告</td><td>Google Ads / Meta Pixel によるリターゲティング</td><td>各プラットフォームのオプトアウトツール</td></tr>
            </tbody>
          </table>

          <h2 id="sec8">8. AI ツール利用時の取扱い</h2>
          <div className="info-box">
            <strong>当社の AI 利用ポリシー:</strong> 当社は自社業務およびクライアント支援業務において、Claude (Anthropic)、ChatGPT (OpenAI)、Gemini (Google) 等の大規模言語モデルを活用しています。
          </div>
          <ul>
            <li>お客様の機密情報を AI ツールに入力する際は、学習に利用されない契約プラン（Enterprise 契約等）を選択します</li>
            <li>個人を特定できる情報は、匿名化・仮名化してから AI に渡します</li>
            <li>AI の出力結果は人間が必ずレビュー・検証してから成果物として利用します</li>
            <li>クライアント契約時に NDA を締結し、AI 利用時のデータ取扱いについても明確化します</li>
          </ul>

          <h2 id="sec9">9. 個人情報に関するお問い合わせ</h2>
          <p>ご自身の個人情報の開示・訂正・削除・利用停止等をご希望の場合、または本プライバシーポリシーに関するご質問がある場合は、以下の窓口までご連絡ください。</p>
          <div className="info-box">
            <strong>個人情報お問い合わせ窓口</strong><br />
            ミックスナッツ株式会社<br />
            〒107-0062 東京都港区南青山3-8-40<br />
            Email: <a href="mailto:privacy@mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>privacy@mixednuts-inc.com</a><br />
            受付時間: 平日10:00–18:00（土日祝を除く）
          </div>

          <h2 id="sec10">10. プライバシーポリシーの変更</h2>
          <p>当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更した場合は、当社ウェブサイト上で公表します。</p>
          <p>最新のプライバシーポリシーは、常に本ページにて公開しています。</p>
          <p style={{textAlign: 'right', marginTop: 48, fontSize: 13, color: '#9CA3AF'}}>以上</p>
        </div>
      </section>
    </>
  );
}
