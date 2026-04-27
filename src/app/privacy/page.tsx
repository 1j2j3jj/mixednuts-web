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
        .info-box { background: #F9FAFB; border: 1px solid var(--border, #E5E7EB); padding: 20px 24px; border-radius: 4px; margin: 24px 0; font-size: 14px; line-height: 1.9; }
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
            <li>クラウドサービス事業者（Google Workspace, AWS, Cloudflare, Vercel Inc., Neon Inc., Web3Forms 等）</li>
            <li>会計・税務処理を目的とした税理士事務所・会計システム提供事業者</li>
            <li>請求・決済代行事業者</li>
            <li>カスタマーサポートシステム提供事業者</li>
          </ul>
          <p>当社は、委託先との間で個人情報の取扱いに関する契約を締結し、適切な監督を実施します。</p>

          <h2 id="sec5b">5-2. 外国にある第三者への個人情報の提供</h2>
          <p>当社は、サービス提供のため以下の外国にある第三者（クラウドサービス事業者）に個人情報の取扱いを委託します。本ウェブサイトのフォームをご利用いただくことで、これらの委託に同意いただいたものとみなします。</p>
          <table>
            <thead>
              <tr><th>事業者</th><th>所在国</th><th>用途</th></tr>
            </thead>
            <tbody>
              <tr><td>Vercel Inc.</td><td>米国</td><td>ウェブサイトホスティング、Edge Functions</td></tr>
              <tr><td>Neon Inc. (AWS us-east-1)</td><td>米国</td><td>認証データベース</td></tr>
              <tr><td>Web3Forms</td><td>米国</td><td>お問い合わせ・採用応募の通知配信</td></tr>
              <tr><td>Google LLC</td><td>米国</td><td>採用応募ファイル保存（Google Drive）、Google Workspace</td></tr>
            </tbody>
          </table>
          <p>各国の個人情報保護制度に関する情報は、個人情報保護委員会のウェブサイト（<a href="https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/" target="_blank" rel="noopener noreferrer">https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/</a>）にて確認できます。米国は十分性認定国ではないため、当社は個人情報保護委員会規則第 16 条に基づく相当措置（標準契約条項または GDPR 同等の保護水準の確認）を実施します。</p>

          <h2 id="sec5c">5-3. 採用応募情報の取扱い</h2>
          <p>採用応募フォームから取得する個人情報（氏名、連絡先、職務経歴書、履歴書等）は、採用選考の目的のみに使用します。</p>
          <ul>
            <li><strong>保存場所</strong>: Google Drive（米国 Google LLC が運営）</li>
            <li><strong>アクセス権限</strong>: 採用担当者および代表者のみ</li>
            <li><strong>保存期間</strong>: 不採用の場合、応募受付から 6 ヶ月経過後に削除します。採用の場合は雇用契約継続中保管します</li>
            <li><strong>第三者提供</strong>: 法令に基づく場合を除き、本人の同意なく第三者に提供しません</li>
          </ul>

          <h2 id="sec6">6. 安全管理措置</h2>
          <p>当社は、個人情報の漏洩、滅失、毀損の防止その他の安全管理のために、組織的・人的・物理的・技術的な安全管理措置を講じます。</p>
          <h3>組織的安全管理措置</h3>
          <ul>
            <li>個人情報の取扱いに関する責任者の設置</li>
            <li>個人情報の取扱状況の把握と監査</li>
            <li>漏洩等事案に対応する体制の整備</li>
          </ul>
          <h3>人的安全管理措置</h3>
          <ul>
            <li>個人情報の取扱いに関する社内規程の整備および周知</li>
            <li>従業者・業務委託先との秘密保持契約（NDA）の締結</li>
            <li>個人情報保護および情報セキュリティに関する定期的な研修の実施</li>
          </ul>
          <h3>物理的安全管理措置</h3>
          <ul>
            <li>個人情報を取り扱う区域への入退室管理</li>
            <li>機器・電子媒体・書類の盗難・紛失防止のための施錠管理</li>
            <li>機器・電子媒体・書類の廃棄時の復元不可能な処理</li>
          </ul>
          <h3>技術的安全管理措置</h3>
          <ul>
            <li>個人情報へのアクセス制御（アクセス権限の付与を業務上必要な範囲に限定）</li>
            <li>通信の暗号化（HTTPS / TLS）</li>
            <li>ファイル・データベースの暗号化</li>
            <li>監査ログの取得と定期的な点検</li>
            <li>多要素認証によるシステムアクセスの保護</li>
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

          <h2 id="sec9">9. 個人情報に関するお問い合わせ・開示請求</h2>
          <p>ご自身の個人情報の開示・訂正・追加・削除・利用停止・第三者提供記録の開示等をご希望の場合、または本プライバシーポリシーに関するご質問がある場合は、以下の窓口までご連絡ください。</p>
          <div className="info-box">
            <strong>個人情報お問い合わせ窓口</strong><br />
            ミックスナッツ株式会社<br />
            〒107-0062 東京都港区南青山3-8-40<br />
            Email: <a href="mailto:privacy@mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>privacy@mixednuts-inc.com</a><br />
            受付時間: 平日10:00–18:00（土日祝を除く）
          </div>
          <h3>開示請求の手続</h3>
          <ul>
            <li><strong>本人確認方法</strong>: ご本人様であることを確認するため、運転免許証・健康保険証・パスポート等の本人確認書類の写しの提示をお願いします（マスキング推奨）。代理人による請求の場合は、代理権を証明する書類（委任状）も併せてご提示ください。</li>
            <li><strong>手数料</strong>: 個人情報の開示請求にかかる手数料は<strong>無料</strong>です（個人情報保護法第 38 条）。</li>
            <li><strong>回答期限</strong>: ご請求受領後、原則として 14 日以内に対応します。本人確認・調査に時間を要する場合は、別途ご連絡します。</li>
            <li><strong>回答方法</strong>: メールまたは郵送にて回答します。請求時にご希望の方法をお知らせください。</li>
          </ul>

          <h2 id="sec10">10. プライバシーポリシーの変更</h2>
          <p>当社は、必要に応じて本プライバシーポリシーを変更することがあります。変更した場合は、当社ウェブサイト上で公表します。</p>
          <p>最新のプライバシーポリシーは、常に本ページにて公開しています。</p>
          <p style={{textAlign: 'right', marginTop: 48, fontSize: 13, color: '#9CA3AF'}}>以上</p>
        </div>
      </section>
    </>
  );
}
