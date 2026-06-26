import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "#site/content";

export const metadata: Metadata = {
  title: "Insights — Strategy × AI × Marketing の最新知見 | mixednuts inc.",
  description:
    "戦略・AI・マーケティング・ファイナンスの実践ノウハウを発信。AI-firstコンサルティングファームの知見を公開しています。",
  alternates: { canonical: "/insights" },
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
  thumbNumber?: string;
  thumbLabel?: string;
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
  .filter((p) => !p.hidden)
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .map((p) => ({
    slug: p.slug,
    href: p.permalink,
    category: p.category,
    colorClass: categoryColorMap[p.category] ?? "art-ai",
    date: p.date.slice(0, 10).replace(/-/g, "."),
    readTime: p.readTime,
    title: p.title,
    excerpt: p.excerpt,
    author: p.author,
    hero: p.hero,
    thumbNumber: p.thumbNumber,
    thumbLabel: p.thumbLabel,
  }));

// upcomingArticles は当面非表示（16 本の published 記事が揃ったため）
const articles: ListItem[] = [...publishedArticles];
void upcomingArticles; // 将来の予告枠として温存

// CSS custom property in an inline style (React needs the cast)
const heroVar = (src: string) => ({ ["--img"]: `url(${src})` } as React.CSSProperties);

export default function InsightsPage() {
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <>
      {/*
        Page-scoped extras: the v4 .art vocabulary ships .art / .art-img /
        .art-cat / .art-body(.date/h4). The Insights index also surfaces an
        excerpt, an author line, a "coming soon" badge, the cyan thumb number /
        label overlay, and a wider featured card. Those few page-specific bits
        are defined here, scoped under .mn-v4 (the page is rendered inside the
        V4Shell .mn-v4 dark scope) so they inherit the v4 design tokens.
      */}
      <style>{`
        .mn-v4 .art-img.hasbg{display:block}
        .mn-v4 .art-excerpt{font-size:13px;line-height:1.85;color:#52525B;margin:12px 0 0}
        .mn-v4 .art-author{margin-top:16px;padding-top:14px;border-top:1px solid rgba(10,10,10,.08);font-family:var(--font-sans-en);font-size:11px;letter-spacing:.05em;color:#9CA3AF}
        .mn-v4 .art-soon{position:absolute;top:14px;right:14px;padding:5px 11px;background:#fff;color:#0A0A0A;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.08em}
        .mn-v4 .thumb-overlay{position:absolute;right:16px;bottom:14px;display:flex;flex-direction:column;align-items:flex-end;gap:3px;pointer-events:none;text-align:right}
        .mn-v4 .thumb-number{font-family:var(--font-display,'Archivo');font-size:clamp(28px,3.4vw,44px);font-weight:900;line-height:1;letter-spacing:-.02em;color:var(--cyan,#00D9FF)}
        .mn-v4 .thumb-label{font-family:var(--font-serif-jp);font-size:11px;font-weight:700;letter-spacing:.05em;color:rgba(255,255,255,.96);text-shadow:0 1px 4px rgba(0,0,0,.6)}
        .mn-v4 .art.art-feature{grid-column:1/-1}
        .mn-v4 .art.art-feature .art-img{aspect-ratio:21/8}
        .mn-v4 .art.art-feature .art-body h4{font-size:clamp(22px,2.6vw,30px)}
        .mn-v4 .art.art-feature .thumb-number{font-size:clamp(40px,5vw,72px)}
        .mn-v4 .art.art-feature .thumb-label{font-size:13px}
        @media(max-width:760px){.mn-v4 .art.art-feature .art-img{aspect-ratio:16/10}}
      `}</style>

      {/* ===== SUBHERO ===== */}
      <header className="subhero">
        <canvas
          className="hero-fx fxgen"
          data-count="60"
          data-interactive
          aria-hidden="true"
        />
        <div
          className="hero-orb o1"
          data-parallax="0.34"
          data-mouse="0.05"
          aria-hidden="true"
        />
        <div
          className="hero-orb o2"
          data-parallax="0.22"
          data-mouse="0.035"
          aria-hidden="true"
        />
        <div className="hero-veil" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap subhero-inner">
          <div className="crumb reveal">
            <Link href="/">Home</Link> / Insights
          </div>
          <div className="eyebrow reveal">
            <i className="pulse" /> Knowledge · Insights
          </div>
          <h1 className="big-title-jp reveal">
            実践から生まれる
            <br />
            <em>知見</em>を届ける。
          </h1>
          <p className="subhero-lead reveal">
            戦略・AI・マーケティング・ファイナンスの最前線で得た知見を公開。
            「使えるノウハウ」だけを、実体験ベースで書いています。
          </p>
        </div>
      </header>

      {/* ===== ARTICLES ===== */}
      <section className="sec white">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow dark">
              <i className="pulse" /> Field Notes
            </div>
            <h2 className="title">
              Field <em>notes</em>.
            </h2>
          </div>
          <div className="art-grid">
            {featured && (
              <ArticleCard item={featured} feature />
            )}
            {rest.map((article) => (
              <ArticleCard key={article.slug} item={article} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA / NEWSLETTER ===== */}
      <section className="cta">
        <div
          className="cta-photo"
          data-parallax="0.16"
          aria-hidden="true"
          style={heroVar("/brand/manifesto_bg.jpg")}
        />
        <canvas className="cta-fx fxgen" data-count="46" aria-hidden="true" />
        <div className="cta-glow" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <div className="wrap cta-inner">
          <div className="eyebrow reveal">
            <i className="pulse" /> Newsletter
          </div>
          <h2 className="cta-h reveal">
            月2回、実践
            <br />
            <em>ノウハウ</em>を。
          </h2>
          <p className="reveal">
            戦略・AI・マーケティングの一次情報を、メールでお届けします。
            広告・スパムは一切なし。いつでも解除できます。
          </p>
          <Link href="/contact" className="btn btn-cyan btn-lg magnetic reveal">
            <span>配信開始をお知らせする</span>
            <i className="arr">↗</i>
          </Link>
          <p
            className="reveal"
            style={{ fontSize: 13, opacity: 0.6, marginTop: 16 }}
          >
            配信開始のお知らせを希望する方は、Contact からどうぞ。
          </p>
        </div>
      </section>
    </>
  );
}

function ArticleCard({ item, feature }: { item: ListItem; feature?: boolean }) {
  const inner = (
    <>
      <div
        className={`art-img ${item.colorClass}`}
        style={
          item.hero
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(5,6,10,0.10) 0%, rgba(5,6,10,0.52) 100%), url('${item.hero}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="art-cat">{item.category}</span>
        {item.thumbNumber && (
          <div className="thumb-overlay">
            <span className="thumb-number">{item.thumbNumber}</span>
            {item.thumbLabel && (
              <span className="thumb-label">{item.thumbLabel}</span>
            )}
          </div>
        )}
        {!item.href && <span className="art-soon">近日公開</span>}
      </div>
      <div className="art-body">
        <div className="date">
          {item.date} · {item.readTime}
        </div>
        <h4>{item.title}</h4>
        <p className="art-excerpt">{item.excerpt}</p>
        <div className="art-author">By {item.author}</div>
      </div>
    </>
  );

  const className = `art reveal${feature ? " art-feature" : ""}`;

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={{ cursor: "default", opacity: 0.78 }}>
      {inner}
    </div>
  );
}
