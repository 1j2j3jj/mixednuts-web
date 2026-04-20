import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Insights — Strategy × AI × Marketing の最新知見 | mixednuts inc.",
  description:
    "戦略・AI・マーケティング・ファイナンスの実践ノウハウを発信。AI-firstコンサルティングファームの知見を公開しています。",
};

const articles = [
  {
    slug: "ai-first-org",
    category: "AI",
    colorClass: "art-ai",
    date: "2026.04.10",
    readTime: "12分",
    title: "AI-First 組織のつくり方: 120体のエージェントを統制する6原則",
    excerpt:
      "自社で運用する120体超のAIエージェント組織の設計思想を公開。C-Suite・部門Head・Workerの3階層構造、委任ルール、Calibrationルールまで解説。",
    author: "N.I.",
  },
  {
    slug: "#",
    category: "AI",
    colorClass: "art-ai",
    date: "2026.03.18",
    readTime: "8分",
    title: "FP&A × AI 自動化: 月次締め工数を70%削減した実装パターン",
    excerpt:
      "管理会計の月次クローズ作業にAIエージェントを組み込み、工数を大幅削減した事例。freee API連携とLLM集計の組み合わせを詳解。",
    author: "N.I.",
  },
  {
    slug: "#",
    category: "STRATEGY",
    colorClass: "art-strategy",
    date: "2026.03.05",
    readTime: "10分",
    title: "M&A デューデリジェンスをAIで加速する: 財務DDの新アプローチ",
    excerpt:
      "EDINETデータ自動取得からLLM分析まで。従来3週間かかっていた財務DDを5日に短縮した手法と、精度を担保するための人間チェックポイントを公開。",
    author: "N.I.",
  },
  {
    slug: "#",
    category: "MARKETING",
    colorClass: "art-marketing",
    date: "2026.02.26",
    readTime: "7分",
    title: "プロンプトエンジニアリングの実務ガイド: 再現性のある出力の作り方",
    excerpt:
      "「なんとなく動く」から「必ず動く」へ。本番投入できるプロンプトの設計原則と、評価フレームワークの構築方法を解説します。",
    author: "N.I.",
  },
  {
    slug: "#",
    category: "MARKETING",
    colorClass: "art-marketing",
    date: "2026.02.14",
    readTime: "9分",
    title: "Google Ads × AI: 自動入札とAIクリエイティブで CPA を30%改善した方法",
    excerpt:
      "スマート入札の誤解と正しい使い方。AIクリエイティブ生成ツールの選定基準、A/Bテスト設計まで、実績ベースで解説。",
    author: "N.I.",
  },
  {
    slug: "#",
    category: "FINANCE",
    colorClass: "art-finance",
    date: "2026.02.12",
    readTime: "6分",
    title: "多様性を成果に変える: 6つのバックグラウンドを&quot;ミックス&quot;する運営術",
    excerpt:
      "広告代理店・戦略ファーム・ビッグテック・クリエイター — 異なる専門性をどうまとめるか。チーム設計の実践から学んだ知見。",
    author: "N.I.",
  },
];

export default function InsightsPage() {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <style>{`
        .filters {
          background: var(--white);
          padding: 32px 32px 0;
          position: sticky; top: 70px; z-index: 50;
          border-bottom: 1px solid #E5E7EB;
        }
        .filters-inner { max-width: 1280px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-bottom: 24px; }
        .filter-label { font-family: 'Inter', sans-serif; font-size: 11px; color: #9CA3AF; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-right: 8px; }
        .filter-btn { padding: 8px 16px; background: var(--white); border: 1px solid #D1D5DB; border-radius: 999px; font-size: 13px; color: #4B5563; transition: all 0.2s; text-decoration: none; }
        .filter-btn:hover, .filter-btn.active { background: var(--navy); color: var(--white); border-color: var(--navy); }

        .featured { background: var(--white); padding: 64px 32px; }
        .featured-inner { max-width: 1280px; margin: 0 auto; }
        .featured-card {
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
          background: #F9FAFB; border-radius: 24px; overflow: hidden;
          transition: all 0.3s; text-decoration: none; color: inherit;
        }
        .featured-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(11,22,52,0.08); }
        .featured-visual {
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #064A5C 0%, var(--navy) 100%);
          position: relative; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.4); font-size: 64px;
        }
        .featured-tag {
          position: absolute; top: 20px; left: 20px;
          background: rgba(255,255,255,0.9); color: var(--navy);
          padding: 6px 14px; border-radius: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; font-family: 'Inter', sans-serif;
        }
        .featured-body { padding: 48px; display: flex; flex-direction: column; justify-content: center; }
        .featured-meta { display: flex; gap: 16px; font-size: 12px; color: #9CA3AF; font-family: 'Inter', sans-serif; margin-bottom: 16px; letter-spacing: 0.05em; }
        .featured-body h2 { font-family: 'Noto Serif JP', serif; font-size: 32px; line-height: 1.4; font-weight: 700; margin-bottom: 20px; color: var(--navy); }
        .featured-body p { color: #4B5563; font-size: 14px; line-height: 1.9; margin-bottom: 32px; }
        .featured-author { display: flex; align-items: center; gap: 12px; }
        .featured-author-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--navy), var(--burgundy)); }
        .featured-author-name { font-size: 13px; font-weight: 600; color: var(--navy); }
        .featured-author-role { font-size: 11px; color: #9CA3AF; }

        .articles { background: #F9FAFB; padding: 64px 32px 120px; }
        .articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1280px; margin: 0 auto; }
        .article-card {
          background: var(--white); border: 1px solid #E5E7EB; border-radius: 16px;
          overflow: hidden; text-decoration: none; color: inherit;
          transition: all 0.3s; display: flex; flex-direction: column;
        }
        .article-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(11,22,52,0.08); border-color: var(--navy); }
        .article-visual {
          aspect-ratio: 16/9; position: relative;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.3); font-size: 44px;
        }
        .art-ai { background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%); border-bottom: 2px solid var(--cyan); }
        .art-strategy { background: linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%); border-bottom: 2px solid var(--cyan); }
        .art-marketing { background: linear-gradient(135deg, #0A0A0A 0%, #141414 100%); border-bottom: 2px solid var(--cyan); }
        .art-finance { background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%); border-bottom: 2px solid var(--cyan); }
        .article-tag-pos {
          position: absolute; top: 16px; left: 16px;
          background: rgba(255,255,255,0.95); color: var(--navy);
          padding: 4px 10px; border-radius: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; font-family: 'Inter', sans-serif;
        }
        .article-body { padding: 24px; flex: 1; display: flex; flex-direction: column; }
        .article-meta { display: flex; gap: 12px; font-size: 11px; color: #9CA3AF; font-family: 'Inter', sans-serif; margin-bottom: 10px; }
        .article-body h3 { font-family: 'Noto Serif JP', serif; font-size: 17px; font-weight: 700; line-height: 1.5; margin-bottom: 12px; color: var(--charcoal); flex: 1; }
        .article-excerpt { font-size: 13px; color: #4B5563; line-height: 1.7; margin-bottom: 16px; }
        .article-author-line { font-size: 11px; color: #9CA3AF; font-family: 'Inter', sans-serif; letter-spacing: 0.05em; padding-top: 12px; border-top: 1px solid #E5E7EB; }

        .newsletter {
          background: var(--navy); color: var(--white);
          padding: 120px 32px; position: relative; overflow: hidden;
        }
        .newsletter::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle at 30% 50%, rgba(0,180,216,0.15) 0%, transparent 50%);
        }
        .newsletter-inner { max-width: 720px; margin: 0 auto; text-align: center; position: relative; z-index: 2; }
        .newsletter h2 { font-family: 'Noto Serif JP', serif; font-size: clamp(28px, 4vw, 42px); margin-bottom: 20px; color: var(--white); line-height: 1.3; }
        .newsletter p { color: rgba(255,255,255,0.8); font-size: 15px; margin-bottom: 40px; line-height: 1.9; }
        .newsletter-form { display: flex; gap: 12px; max-width: 480px; margin: 0 auto; flex-wrap: wrap; }
        .newsletter-form input { flex: 1; min-width: 200px; padding: 14px 20px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: var(--white); border-radius: 999px; font-size: 14px; font-family: inherit; }
        .newsletter-form input::placeholder { color: rgba(255,255,255,0.4); }
        .newsletter-form button { padding: 14px 28px; background: var(--cyan); color: var(--navy); border: none; border-radius: 999px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .newsletter-form button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,180,216,0.4); }
        .newsletter-disclaimer { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 16px; }

        @media (max-width: 900px) {
          .featured-card { grid-template-columns: 1fr; }
          .articles-grid { grid-template-columns: 1fr; }
          .filters { position: static; }
        }
      `}</style>

      {/* HERO */}
      <section className="page-hero">
        <div className="page-hero-inner">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / Insights
          </div>
          <div className="page-hero-badge">Knowledge</div>
          <h1>
            実践から生まれる<br />
            <span className="accent">知見</span>を届ける。
          </h1>
          <p className="lead">
            戦略・AI・マーケティング・ファイナンスの最前線で得た知見を公開。
            「使えるノウハウ」だけを、実体験ベースで書いています。
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="filters">
        <div className="filters-inner">
          <span className="filter-label">Filter</span>
          <span className="filter-btn active">All</span>
          <span className="filter-btn">AI</span>
          <span className="filter-btn">Strategy</span>
          <span className="filter-btn">Marketing</span>
          <span className="filter-btn">Finance</span>
          <span className="filter-btn">Organization</span>
        </div>
      </div>

      {/* FEATURED */}
      <section className="featured">
        <div className="featured-inner">
          <Link href={`/insights/${featured.slug}`} className="featured-card">
            <div className="featured-visual">
              <span className="featured-tag">{featured.category}</span>
              🤖
            </div>
            <div className="featured-body">
              <div className="featured-meta">
                <span>{featured.date}</span>
                <span>·</span>
                <span>{featured.readTime}で読める</span>
              </div>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <div className="featured-author">
                <div className="featured-author-avatar" />
                <div>
                  <div className="featured-author-name">{featured.author}</div>
                  <div className="featured-author-role">CEO / FOUNDER</div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ARTICLES GRID */}
      <section className="articles">
        <div className="articles-grid">
          {rest.map((article) => {
            const isAvailable = article.slug !== "#";
            const inner = (
              <>
                <div className={`article-visual ${article.colorClass}`}>
                  <span className="article-tag-pos">{article.category}</span>
                  {!isAvailable && (
                    <span style={{ position: "absolute", top: 16, right: 16, padding: "4px 10px", background: "rgba(255,255,255,0.92)", color: "#0B1634", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 999, textTransform: "uppercase" }}>
                      近日公開
                    </span>
                  )}
                  {article.colorClass === "art-ai" ? "🤖" : article.colorClass === "art-strategy" ? "📊" : article.colorClass === "art-marketing" ? "📈" : "💹"}
                </div>
                <div className="article-body">
                  <div className="article-meta">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3>{article.title}</h3>
                  <p className="article-excerpt">{article.excerpt}</p>
                  <div className="article-author-line">By {article.author}</div>
                </div>
              </>
            );
            if (isAvailable) {
              return (
                <Link key={article.title} href={`/insights/${article.slug}`} className="article-card">
                  {inner}
                </Link>
              );
            }
            return (
              <div key={article.title} className="article-card" style={{ cursor: "default", opacity: 0.78 }}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter">
        <div className="newsletter-inner">
          <h2>最新の知見を、メールでお届けします。</h2>
          <p>
            月2回程度、実践的なノウハウをまとめてお届け。
            広告・スパムは一切なし。いつでも解除できます。
          </p>
          <div className="newsletter-form">
            <input type="email" placeholder="your@email.com" />
            <button type="button">購読する</button>
          </div>
          <p className="newsletter-disclaimer">
            登録することで、プライバシーポリシーに同意したものとみなされます。
          </p>
        </div>
      </section>
    </>
  );
}
