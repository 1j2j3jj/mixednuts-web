import type { ReactElement } from "react";

/**
 * 共通 JSON-LD レンダラー。
 * layout.tsx や個別ページで呼び出して <head> 内に <script type="application/ld+json"> を出力する。
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }): ReactElement {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ============================================================
// サイト全体で使う共通 schema
// ============================================================

const SITE_URL = "https://mixednuts-inc.com";

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "ミックスナッツ株式会社",
  alternateName: "mixednuts Inc.",
  legalName: "ミックスナッツ株式会社",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/og-default.jpg`,
  description:
    "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供する AI-first コンサルティングファーム。",
  foundingDate: "2021",
  email: "hello@mixednuts-inc.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "南青山3-8-40",
    addressLocality: "港区",
    addressRegion: "東京都",
    postalCode: "107-0062",
    addressCountry: "JP",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@mixednuts-inc.com",
    contactType: "customer service",
    areaServed: "JP",
    availableLanguage: ["ja", "en"],
  },
  knowsAbout: [
    "AI implementation",
    "AI agent architecture",
    "Strategy consulting",
    "FP&A",
    "Growth marketing",
    "M&A due diligence",
    "SEO",
    "Generative AI",
    "LLM operations",
  ],
  slogan: "戦略 × AI × マーケティング",
  sameAs: [] as string[],
};

export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "mixednuts",
  description:
    "戦略・AI・マーケティングを一気通貫で提供する AI-first コンサルティングファーム。",
  inLanguage: "ja-JP",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

// ============================================================
// 汎用 Breadcrumb ビルダー
// ============================================================

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http") ? item.path : `${SITE_URL}${item.path}`,
    })),
  };
}
