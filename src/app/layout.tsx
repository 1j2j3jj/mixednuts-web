import type { Metadata } from "next";
import Script from "next/script";
import { Archivo, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import "./site-v6.css";
import SiteChrome from "@/components/SiteChrome";
import CookieBanner from "@/components/CookieBanner";
import { JsonLd, organizationSchema, webSiteSchema } from "@/components/JsonLd";

const GTM_ID = "GTM-MS76PXZZ";
const GA4_ID = "G-4XTN8TREFM";

const archivo = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const zen = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  variable: "--font-zen",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mixednuts-inc.com"),
  title: {
    default: "mixednuts — 戦略 × AI × マーケティング",
    template: "%s | mixednuts",
  },
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
  // canonical: layout では設定しない。各ページの page.tsx / generateMetadata で個別に設定する
  // (ここで固定すると全ページが apex root を canonical と宣言してしまう)
  robots: { index: true, follow: true },
  openGraph: {
    title: "mixednuts — 戦略 × AI × マーケティング",
    description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
    url: "https://mixednuts-inc.com",
    siteName: "mixednuts",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "mixednuts - 戦略 × AI × マーケティング" }],
  },
  twitter: { card: "summary_large_image", title: "mixednuts", description: "戦略 × AI × マーケティング", images: ["/og-default.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${archivo.variable} ${zen.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');
        `}</Script>
        {/* GA4 (direct, in addition to GTM for reliability) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA4_ID}');
        `}</Script>
        {/* Organization + WebSite structured data (all pages) */}
        <JsonLd data={organizationSchema} />
        <JsonLd data={webSiteSchema} />
      </head>
      <body>
        {/* GTM noscript fallback */}
        <noscript>
          <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <SiteChrome>{children}</SiteChrome>
        <CookieBanner />
      </body>
    </html>
  );
}
