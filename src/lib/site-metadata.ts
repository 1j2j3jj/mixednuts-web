import type { Metadata } from "next";

/**
 * マーケティングサイト共通のメタデータ定数・ビルダー。
 *
 * 背景 (2026-07-24 SEO/AIO 監査):
 * Next.js の Metadata API は nested object (openGraph / twitter) を親子で
 * シャローマージしない。子セグメントが定義するとオブジェクトごと置換、
 * 未定義なら親レイアウトの値をまるごと継承する。その結果、
 * - openGraph 未定義ページ: og:title / og:url がルートの値のまま
 *   (実測: /services/ai の og:url = "https://mixednuts-inc.com")
 * - openGraph を部分定義したページ: og:site_name / og:locale / og:url が欠落し
 *   twitter:title がルートの "mixednuts" のまま (実測: insights 記事)
 * になっていた。本ヘルパーで全フィールドを毎ページ明示し、merge 挙動に依存しない。
 */

export const SITE_URL = "https://mixednuts-inc.com";
export const SITE_NAME = "mixednuts";

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export const OG_DEFAULT_IMAGE: OgImage = {
  url: "/og-default.jpg",
  width: 1200,
  height: 630,
  alt: "mixednuts - 戦略 × AI × マーケティング",
};

type PageOgInput = {
  /** og:title / twitter:title (テンプレート適用前の生テキスト) */
  title: string;
  description: string;
  /** canonical 相当のパス ("/" 始まり、必要なら percent-encoded)。metadataBase で絶対 URL に解決される */
  path: string;
  /** 省略時は og-default.jpg */
  images?: OgImage[];
  /** 記事ページのみ指定。og:type=article + published_time / author を出力する */
  article?: { publishedTime: string; modifiedTime?: string; authors: string[] };
};

/** ページ別 openGraph / twitter を一括生成する。全公開ページの metadata でこれを spread する。 */
export function buildPageOg({
  title,
  description,
  path,
  images,
  article,
}: PageOgInput): Pick<Metadata, "openGraph" | "twitter"> {
  const imgs = images && images.length > 0 ? images : [OG_DEFAULT_IMAGE];
  const base = {
    title,
    description,
    url: path,
    siteName: SITE_NAME,
    locale: "ja_JP",
    images: imgs,
  };
  return {
    openGraph: article
      ? {
          ...base,
          type: "article",
          publishedTime: article.publishedTime,
          modifiedTime: article.modifiedTime ?? article.publishedTime,
          authors: article.authors,
        }
      : { ...base, type: "website" },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imgs.map((i) => i.url),
    },
  };
}
