import type { ReactElement } from "react";
import { OG_DEFAULT_IMAGE, SITE_URL, absoluteUrl } from "@/lib/site-metadata";

/**
 * 共通 JSON-LD レンダラー。
 * layout.tsx や個別ページで呼び出して <head> 内に <script type="application/ld+json"> を出力する。
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}): ReactElement {
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

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "mixednuts Inc.",
  alternateName: "ミックスナッツ株式会社",
  legalName: "ミックスナッツ株式会社",
  url: SITE_URL,
  // logo は実ロゴ (1500x281 ワードマーク、両辺 112px 以上の Google 要件充足) を指す。
  // 従来は OGP バナー (og-default.jpg 1200x630) を指しておりナレッジパネル用ロゴとして不適切だった
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/logo.png`,
    width: 1500,
    height: 281,
  },
  image: `${SITE_URL}/og-default.jpg`,
  description:
    "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供する AI-first コンサルティングファーム。",
  foundingDate: "2021",
  founder: { "@id": `${SITE_URL}/team/ceo#person` },
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
  // sameAs: E-E-A-T Authoritativeness のために外部 SNS/プロフィール URL を列挙
  // 理由: 空配列はナレッジパネル化・AIO 引用の Authoritativeness 強化を阻害する
  // GitHub は 1j2j3jj/mixednuts-web リポの所有者として確認済
  // LinkedIn / Twitter は CEO 確認待ち — 確定後に追加すること
  sameAs: ["https://github.com/1j2j3jj"] as string[],
};

export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "mixednuts Inc.",
  description:
    "戦略・AI・マーケティングを一気通貫で提供する AI-first コンサルティングファーム。",
  inLanguage: "ja",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

// ============================================================
// 汎用 Breadcrumb ビルダー
// ============================================================

export function buildBreadcrumbSchema(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(items.at(-1)?.path ?? "/")}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path.startsWith("http")
        ? item.path
        : `${SITE_URL}${item.path}`,
    })),
  };
}


export function buildWebPageSchema({
  type = "WebPage",
  path,
  name,
  description,
  mainEntity,
  mainEntityList,
  image,
  about,
}: {
  type?: string;
  path: string;
  name: string;
  description: string;
  mainEntity?: Record<string, unknown>;
  mainEntityList?: Record<string, unknown>;
  image?: string;
  about?: Record<string, unknown>;
}): Record<string, unknown> {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: "ja",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: absoluteUrl(image ?? OG_DEFAULT_IMAGE.url),
      width: OG_DEFAULT_IMAGE.width,
      height: OG_DEFAULT_IMAGE.height,
    },
    ...(mainEntity ? { mainEntity } : {}),
    ...(mainEntityList ? { mainEntity: mainEntityList } : {}),
    ...(about ? { about } : {}),
  };
}
