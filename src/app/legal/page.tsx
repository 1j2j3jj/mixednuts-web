import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal / 特定商取引法に基づく表記",
  description: "特定商取引法に基づく表記、サービス利用規約、免責事項。ミックスナッツ株式会社のサービスに関する法的情報。",
};

export default function LegalPage() {
  return (
    <>
      <style>{`
        .legal-hero { background: linear-gradient(180deg, #F9FAFB 0%, #fff 100%); padding: 140px 32px 64px; }
        .legal-hero-inner { max-width: 900px; margin: 0 auto; }
        .legal-hero h1 { font-family: var(--font-serif-jp); font-size: clamp(32px, 5vw, 48px); font-weight: 700; color: var(--navy); margin-bottom: 16px; line-height: 1.3; letter-spacing: -0.01em; }
        .legal-hero .lead { color: #4B5563; font-size: 15px; line-height: 1.9; }
        .legal-meta { display: flex; gap: 24px; flex-wrap: wrap; padding: 20px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; margin-top: 32px; font-size: 12px; color: #9CA3AF; letter-spacing: 0.05em; }
        .tab-nav { background: #fff; padding: 24px 32px; border-bottom: 1px solid #E5E7EB; position: sticky; top: 70px; z-index: 50; }
        .tab-nav-inner { max-width: 900px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; }
        .tab-link { padding: 10px 18px; background: #fff; border: 1px solid #D1D5DB; border-radius: 999px; font-size: 13px; color: #4B5563; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .tab-link:hover { background: var(--navy); color: #fff; border-color: var(--navy); }
        .legal-body { padding: 80px 32px 120px; background: #fff; }
        .legal-body-inner { max-width: 900px; margin: 0 auto; }
        .legal-body h2 { font-family: var(--font-serif-jp); font-size: 28px; font-weight: 700; color: var(--navy); margin: 56px 0 24px; padding-bottom: 16px; border-bottom: 2px solid var(--navy); scroll-margin-top: 150px; }
        .legal-body h3 { font-family: var(--font-serif-jp); font-size: 18px; font-weight: 700; color: var(--navy); margin: 32px 0 12px; }
        .legal-body p { font-size: 15px; line-height: 1.95; color: #1A1A1A; margin-bottom: 16px; }
        .legal-body ul, .legal-body ol { margin: 12px 0 24px 24px; }
        .legal-body ul li, .legal-body ol li { font-size: 15px; line-height: 1.95; color: #1A1A1A; margin-bottom: 8px; }
        .legal-table { width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; }
        .legal-table tr { border-bottom: 1px solid #E5E7EB; }
        .legal-table tr:last-child { border-bottom: none; }
        .legal-table th { background: #F9FAFB; color: var(--navy); font-weight: 700; padding: 18px 20px; font-size: 13px; text-align: left; letter-spacing: 0.05em; width: 220px; vertical-align: top; border-right: 1px solid #E5E7EB; }
        .legal-table td { padding: 18px 20px; font-size: 14px; line-height: 1.8; color: #1A1A1A; }
        .breadcrumb-legal { color: #9CA3AF; font-size: 12px; letter-spacing: 0.05em; margin-bottom: 20px; }
        .breadcrumb-legal a { color: inherit; text-decoration: none; }
        .breadcrumb-legal a:hover { color: var(--cyan); }
      `}</style>

      <section className="legal-hero">
        <div className="legal-hero-inner">
          <div className="breadcrumb-legal">
            <Link href="/">Home</Link> / Legal
          </div>
          <h1>Legal / 特定商取引法に基づく表記</h1>
          <p className="lead">
            特定商取引法に基づく表記、サービス利用規約、免責事項をまとめています。当社のサービスをご利用いただく際は、必ずご確認ください。
          </p>
          <div className="legal-meta">
            <span>制定日: 2021年4月19日</span>
            <span>最終改定日: 2026年4月17日</span>
            <span>版: v2.1</span>
          </div>
        </div>
      </section>

      <nav className="tab-nav">
        <div className="tab-nav-inner">
          <a href="#tokusho" className="tab-link">特定商取引法に基づく表記</a>
          <a href="#terms" className="tab-link">利用規約</a>
          <a href="#disclaimer" className="tab-link">免責事項</a>
          <a href="#copyright" className="tab-link">著作権・商標</a>
        </div>
      </nav>

      <section className="legal-body">
        <div className="legal-body-inner">

          <h2 id="tokusho">特定商取引法に基づく表記</h2>
          <p>特定商取引法（特定商取引に関する法律）に基づき、当社のサービス提供に関する情報を以下の通り表示します。</p>
          <table className="legal-table">
            <tbody>
              <tr><th>販売事業者名</th><td>ミックスナッツ株式会社<br />(mixednuts, Inc.)</td></tr>
              <tr><th>代表者</th><td>代表取締役 N.I.</td></tr>
              <tr><th>所在地</th><td>〒107-0062<br />東京都港区南青山3-8-40</td></tr>
              <tr><th>電話番号</th><td>お問い合わせフォームよりご連絡ください<br />※請求があった場合は遅滞なく開示します</td></tr>
              <tr><th>メールアドレス</th><td><a href="mailto:hello@mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>hello@mixednuts-inc.com</a></td></tr>
              <tr><th>ウェブサイト</th><td><a href="https://www.mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>https://www.mixednuts-inc.com</a></td></tr>
              <tr><th>販売価格</th><td>各サービスは個別見積にて提示します。<br />月額リテーナー: ¥500,000〜/月<br />スポット案件: ¥1,000,000〜<br />※ 金額は税抜表示。案件スコープに応じて個別調整します。</td></tr>
              <tr><th>商品代金以外の必要料金</th><td>業務委託契約に基づくコンサルティング報酬のみ。<br />経費が発生する場合（出張費、外部ツール代等）は事前に見積提示し、ご了承を得た上で請求します。</td></tr>
              <tr><th>支払い方法</th><td>銀行振込<br />※ 原則として月末締め翌月末払い。スポット案件は着手前に全額または分割払いを協議します。</td></tr>
              <tr><th>役務の提供時期</th><td>契約締結後、双方合意の開始日より提供開始。詳細は個別契約書に記載します。</td></tr>
              <tr><th>キャンセル・解約</th><td>月額リテーナー: 当月15日までに書面で申し出ることで翌月末に解約可能。<br />スポット案件: 着手前であれば全額返金。着手後は進捗に応じた清算を行います。</td></tr>
            </tbody>
          </table>

          <h2 id="terms">利用規約</h2>
          <h3>第1条（適用）</h3>
          <p>本規約は、ミックスナッツ株式会社（以下「当社」）が提供するコンサルティングサービス（以下「本サービス」）の利用に関する条件を定めるものです。本サービスのご利用にあたっては、本規約のすべての内容に同意していただく必要があります。</p>
          <h3>第2条（サービス内容）</h3>
          <p>本サービスは、戦略コンサルティング、AI実装支援、グロースマーケティング支援を中心としたコンサルティングサービスです。具体的な業務内容・スコープ・成果物は個別の業務委託契約書にて定めます。</p>
          <h3>第3条（秘密保持）</h3>
          <p>当社は、業務の遂行にあたり知り得たクライアントの機密情報を適切に管理し、第三者に開示しません。クライアントは、当社のノウハウ・ツール・プロセスを第三者に開示しないものとします。</p>
          <h3>第4条（知的財産権）</h3>
          <p>本サービスを通じて生成した成果物の知的財産権の帰属は、個別契約書にて定めます。当社が提供するフレームワーク・テンプレート・ツールの著作権は当社に帰属します。</p>
          <h3>第5条（禁止事項）</h3>
          <ul>
            <li>当社の許可なく成果物を第三者に再配布・販売すること</li>
            <li>当社のブランド・商標を無断で使用すること</li>
            <li>虚偽の情報を提供して本サービスを利用すること</li>
            <li>法令または公序良俗に反する目的で本サービスを利用すること</li>
          </ul>

          <h2 id="disclaimer">免責事項</h2>
          <p>当社は、本サービスを通じて提供するアドバイス・分析・提案が、クライアントの事業目標の達成を保証するものではありません。事業の成功は多くの要因に依存しており、当社のサービスはそれを支援するものです。</p>
          <p>当社は、以下の事項について責任を負いません:</p>
          <ul>
            <li>当社の提案に基づいてクライアントが行った意思決定の結果</li>
            <li>クライアントが提供した情報の正確性・完全性に起因する問題</li>
            <li>天災・法令改正・市場変動等の不可抗力によるサービス提供の遅延または変更</li>
            <li>第三者のサービス・ツール・プラットフォームの仕様変更・障害</li>
          </ul>
          <p>当社の損害賠償責任は、当該案件において受領した報酬総額を上限とします。</p>

          <h2 id="copyright">著作権・商標</h2>
          <p>本ウェブサイト上のすべてのコンテンツ（テキスト、画像、デザイン、ロゴ等）はミックスナッツ株式会社に帰属し、著作権法によって保護されています。</p>
          <p>「mixednuts」「ミックスナッツ」および関連するロゴは当社の商標です。無断使用を禁止します。</p>
          <p>本ウェブサイトのコンテンツを引用する場合は、出典を明記し、当社への事前連絡をお願いします。商業目的での無断転載・複製は禁止します。</p>
          <p>お問い合わせ: <a href="mailto:hello@mixednuts-inc.com" style={{color: 'var(--navy)', textDecoration: 'underline'}}>hello@mixednuts-inc.com</a></p>

        </div>
      </section>
    </>
  );
}
