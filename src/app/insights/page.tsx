import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "#site/content";

export const metadata: Metadata = {
  title: "Insights — Strategy × AI × Marketing の最新知見 | mixednuts inc.",
  description:
    "戦略・AI・マーケティング・ファイナンスの実践ノウハウを発信。AI-firstコンサルティングファームの知見を公開しています。",
};

const categoryColorMap: Record<string, string> = {
  AI: "art-ai",
  STRATEGY: "art-strategy",
  MARKETING: "art-marketing",
  FINANCE: "art-finance",
  ENGINEERING: "art-ai",
  "SEO / AIO": "art-marketing",
  ORGANIZATION: "art-strategy",
};

type ListItem = {
  slug: string;
  href: string | null;
  category: string;
  colorClass: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  author: string;
  hero?: string;
};

const upcomingArticles: ListItem[] = [
  {
    slug: "fpna-ai-monthly-close",
    href: null,
    category: "AI",
    colorClass: "art-ai",
    date: "2026.03.18",
    readTime: "8分",
    title: "FP&A × AI 自動化: 月次締め工数を70%削減した実装パターン",
    excerpt:
      "管理会計の月次クローズ作業にAIエージェントを組み込み、工数を大幅削減した事例。freee API連携とLLM集計の組み合わせを詳解。",
    author: "石井 希実",
  },
  {
    slug: "ma-dd-ai",
    href: null,
    category: "STRATEGY",
    colorClass: "art-strategy",
    date: "2026.03.05",
    readTime: "10分",
    title: "M&A デューデリジェンスをAIで加速する: 財務DDの新アプローチ",
    excerpt:
      "EDINETデータ自動取得からLLM分析まで。従来3週間かかっていた財務DDを5日に短縮した手法と、精度を担保するための人間チェックポイントを公開。",
    author: "石井 希実",
  },
  {
    slug: "prompt-engineering-guide",
    href: null,
    category: "MARKETING",
    colorClass: "art-marketing",
    date: "2026.02.26",
    readTime: "7分",
    title: "プロンプトエンジニアリングの実務ガイド: 再現性のある出力の作り方",
    excerpt:
      "「なんとなく動く」から「必ず動く」へ。本番投入できるプロンプトの設計原則と、評価フレームワークの構築方法を解説します。",
    author: "石井 希実",
  },
  {
    slug: "google-ads-ai-cpa",
    href: null,
    category: "MARKETING",
    colorClass: "art-marketing",
    date: "2026.02.14",
    readTime: "9分",
    title: "Google Ads × AI: 自動入札とAIクリエイティブで CPA を30%改善した方法",
    excerpt:
      "スマート入札の誤解と正しい使い方。AIクリエイティブ生成ツールの選定基準、A/Bテスト設計まで、実績ベースで解説。",
    author: "石井 希実",
  },
  {
    slug: "diversity-mix-ops",
    href: null,
    category: "FINANCE",
    colorClass: "art-finance",
    date: "2026.02.12",
    readTime: "6分",
    title: "多様性を成果に変える: 6つのバックグラウンドを\"ミックス\"する運営術",
    excerpt:
      "広告代理店・戦略ファーム・ビッグテック・クリエイター — 異なる専門性をどうまとめるか。チーム設計の実践から学んだ知見。",
    author: "石井 希実",
  },
];

const publishedArticles: ListItem[] = [...posts]
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((p) => ({
    slug: p.slug,
    href: p.permalink,
    category: p.category,
    colorClass: categoryColorMap[p.category] ?? "art-ai",
    date: p.date.replace(/-/g, "."),
    readTime: p.readTime,
    title: p.title,
    excerpt: p.excerpt,
    author: p.author,
    hero: p.hero,
  }));

// upcomingArticles は当面非表示（16 本の published 記事が揃ったため）
const articles: ListItem[] = [...publishedArticles];
void upcomingArticles; // 将来の予告枠として温存

export default function InsightsPage() {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      <style>{`
        .filters {
          background: var(--off-white);
          padding: 32px 32px 0;
          position: sticky; top: 70px; z-index: 50;
          border-bottom: 1px solid rgba(10,10,10,0.08);
        }
        .filters-inner { max-width: 1280px; margin: 0 auto; display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding-bottom: 24px; }
        .filter-label { font-family: var(--font-sans-en); font-size: 11px; color: var(--gray-400); letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; margin-right: 8px; }
        .filter-btn { padding: 8px 16px; background: var(--off-white); border: 1px solid rgba(10,10,10,0.15); border-radius: 999px; font-size: 13px; color: var(--gray-600); transition: all 0.2s; text-decoration: none; }
        .filter-btn:hover, .filter-btn.active { background: var(--charcoal); color: var(--off-white); border-color: var(--charcoal); }

        .featured { background: var(--off-white); padding: 64px 32px; }
        .featured-inner { max-width: 1280px; margin: 0 auto; }
        .featured-card {
          display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
          background: var(--off-white-alt); border-radius: 24px; overflow: hidden;
          transition: all 0.3s; text-decoration: none; color: inherit;
        }
        .featured-card:hover { transform: translateY(-4px); box-shadow: 0 24px 48px rgba(10,10,10,0.08); }
        .featured-visual {
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, var(--charcoal-soft) 0%, var(--charcoal) 100%);
          position: relative; display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.4); font-size: 64px;
        }
        .featured-tag {
          position: absolute; top: 20px; left: 20px;
          background: var(--off-white); color: var(--charcoal);
          padding: 6px 14px; border-radius: 4px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em; font-family: var(--font-sans-en);
        }
        .featured-body { padding: 48px; display: flex; flex-direction: column; justify-content: center; }
        .featured-meta { display: flex; gap: 16px; font-size: 12px; color: var(--gray-400); font-family: var(--font-sans-en); margin-bottom: 16px; letter-spacing: 0.05em; }
        .featured-body h2 { font-family: 'Noto Sans JP', sans-serif; font-size: 30px; line-height: 1.4; font-weight: 900; margin-bottom: 20px; color: var(--charcoal); word-break: keep-all; }
        .featured-body p { color: var(--gray-600); font-size: 14px; line-height: 1.9; margin-bottom: 32px; }
        .featured-author { display: flex; align-items: center; gap: 12px; }
        .featured-author-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--charcoal), var(--charcoal-soft)); }
        .featured-author-name { font-size: 13px; font-weight: 600; color: var(--charcoal); }
        .featured-author-role { font-size: 11px; color: var(--gray-400); }

        .articles { background: var(--off-white-alt); padding: 64px 32px 120px; }
        .articles-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1280px; margin: 0 auto; }
        .article-card {
          background: var(--off-white); border: 1px solid rgba(10,10,10,0.08); border-radius: 16px;
          overflow: hidden; text-decoration: none; color: inherit;
          transition: all 0.3s; display: flex; flex-direction: column;
        }
        .article-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(10,10,10,0.08); border-color: var(--charcoal); }
        .article-visual {
          aspect-ratio: 16/9; position: relative;
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.3); font-size: 44px;
        }
        .art-ai { background: linear-gradient(135deg, var(--charcoal) 0%, var(--charcoal-soft) 100%); border-bottom: 2px solid var(--cyan); }
        .art-strategy { background: linear-gradient(135deg, var(--charcoal-soft) 0%, var(--charcoal) 100%); border-bottom: 2px solid var(--cyan); }
        .art-marketing { background: linear-gradient(135deg, var(--charcoal) 0%, #141414 100%); border-bottom: 2px solid var(--cyan); }
        .art-finance { background: linear-gradient(135deg, var(--charcoal) 0%, var(--charcoal-soft) 100%); border-bottom: 2px solid var(--cyan); }
        .article-tag-pos {
          position: absolute; top: 16px; left: 16px;
          background: var(--off-white); color: var(--charcoal);
          padding: 4px 10px; border-radius: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; font-family: var(--font-sans-en);
        }
        .article-body { padding: 24px; flex: 1; display: flex; flex-direction: column; }
        .article-meta { display: flex; gap: 12px; font-size: 11px; color: var(--gray-400); font-family: var(--font-sans-en); margin-bottom: 10px; }
        .article-body h3 { font-family: 'Noto Sans JP', sans-serif; font-size: 16px; font-weight: 700; line-height: 1.5; margin-bottom: 12px; color: var(--charcoal); flex: 1; }
        .article-excerpt { font-size: 12px; color: var(--gray-600); line-height: 1.7; margin-bottom: 16px; }
        .article-author-line { font-size: 11px; color: var(--gray-400); font-family: var(--font-sans-en); letter-spacing: 0.05em; padding-top: 12px; border-top: 1px solid rgba(10,10,10,0.08); }

        .newsletter {
          background: var(--charcoal); color: var(--off-white);
          padding: 120px 32px; position: relative; overflow: hidden;
        }
        .newsletter::before {
          content: ''; position: absolute; inset: 0;
          background-image: radial-gradient(circle at 30% 50%, rgba(0,217,255,0.15) 0%, transparent 50%);
        }
        .newsletter-inner { max-width: 720px; margin: 0 auto; text-align: center; position: relative; z-index: 2; }
        .newsletter h2 { font-family: 'Noto Sans JP', sans-serif; font-size: clamp(28px, 4vw, 42px); margin-bottom: 20px; color: var(--off-white); line-height: 1.3; word-break: keep-all; }
        .newsletter p { color: rgba(245,241,232,0.8); font-size: 15px; margin-bottom: 40px; line-height: 1.9; }
        .newsletter-form { display: flex; gap: 12px; max-width: 480px; margin: 0 auto; flex-wrap: wrap; justify-content: center; }
        .newsletter-form input { flex: 1; min-width: 200px; padding: 14px 20px; border: 1px solid rgba(245,241,232,0.2); background: rgba(245,241,232,0.05); color: var(--off-white); border-radius: 999px; font-size: 14px; font-family: inherit; }
        .newsletter-form input::placeholder { color: rgba(245,241,232,0.4); }
        .newsletter-form button { padding: 14px 28px; background: var(--cyan); color: var(--charcoal); border: none; border-radius: 999px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .newsletter-form button:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,217,255,0.4); }
        .newsletter-disclaimer { font-size: 11px; color: rgba(245,241,232,0.4); margin-top: 16px; }

        @media (max-width: 900px) {
          .featured-card { grid-template-columns: 1fr; }
          .articles-grid { grid-template-columns: 1fr; }
          .filters { position: static; }
        }
      `}</style>

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

      {/* Category filter - implementation Coming Soon */}
      <div className="filters" style={{ display: "none" }}>
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

      <section className="featured">
        <div className="featured-inner">
          {featured.href ? (
            <Link href={featured.href} className="featured-card">
              <FeaturedInner item={featured} />
            </Link>
          ) : (
            <div className="featured-card" style={{ cursor: "default", opacity: 0.78 }}>
              <FeaturedInner item={featured} />
            </div>
          )}
        </div>
      </section>

      <section className="articles">
        <div className="articles-grid">
          {rest.map((article) => {
            const inner = (
              <>
                <div
                  className={`article-visual ${article.colorClass}`}
                  style={
                    article.hero
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.08) 0%, rgba(10,10,10,0.28) 100%), url('${article.hero}')`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                >
                  <span className="article-tag-pos">{article.category}</span>
                  {!article.href && (
                    <span style={{ position: "absolute", top: 16, right: 16, padding: "4px 10px", background: "var(--off-white)", color: "var(--charcoal)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 999, textTransform: "uppercase" }}>
                      近日公開
                    </span>
                  )}
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
            if (article.href) {
              return (
                <Link key={article.slug} href={article.href} className="article-card">
                  {inner}
                </Link>
              );
            }
            return (
              <div key={article.slug} className="article-card" style={{ cursor: "default", opacity: 0.78 }}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section className="newsletter">
        <div className="newsletter-inner">
          <h2>メールニュースレター、準備中です。</h2>
          <p>
            月2回程度、戦略・AI・マーケティングの実践ノウハウをお届けする予定。
            広告・スパムは一切なし、いつでも解除できます。
          </p>
          <div className="newsletter-form">
            <span style={{
              padding: "14px 28px",
              background: "rgba(245,241,232,0.08)",
              border: "1px solid rgba(245,241,232,0.18)",
              color: "rgba(245,241,232,0.85)",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "0.08em",
            }}>Coming Soon</span>
          </div>
          <p className="newsletter-disclaimer">
            配信開始時期のお知らせご希望の方は、Contact フォームからご連絡ください。
          </p>
        </div>
      </section>
    </>
  );
}

function FeaturedInner({ item }: { item: ListItem }) {
  return (
    <>
      <div
        className="featured-visual"
        style={
          item.hero
            ? {
                backgroundImage: `linear-gradient(135deg, rgba(10,10,10,0.05) 0%, rgba(10,10,10,0.25) 100%), url('${item.hero}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="featured-tag">{item.category}</span>
        {!item.href && (
          <span style={{ position: "absolute", top: 20, right: 20, padding: "4px 10px", background: "var(--off-white)", color: "var(--charcoal)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", borderRadius: 999, textTransform: "uppercase" }}>
            近日公開
          </span>
        )}
      </div>
      <div className="featured-body">
        <div className="featured-meta">
          <span>{item.date}</span>
          <span>·</span>
          <span>{item.readTime}で読める</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.excerpt}</p>
        <div className="featured-author">
          <div className="featured-author-avatar" />
          <div>
            <div className="featured-author-name">{item.author}</div>
            <div className="featured-author-role">CEO / FOUNDER</div>
          </div>
        </div>
      </div>
    </>
  );
}
