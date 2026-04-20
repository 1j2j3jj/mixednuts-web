import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_JP, Noto_Serif_JP, Playfair_Display, Inter, Archivo } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { JsonLd, organizationSchema, webSiteSchema } from "@/components/JsonLd";

const GTM_ID = "GTM-MS76PXZZ";
const GA4_ID = "G-4XTN8TREFM";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"], weight: ["400","500","700"], variable: "--font-noto-sans-jp", display: "swap" });
const notoSerifJP = Noto_Serif_JP({ subsets: ["latin"], weight: ["400","700","900"], variable: "--font-noto-serif-jp", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400","700","900"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-inter", display: "swap" });
const archivo = Archivo({ subsets: ["latin"], weight: ["800","900"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://mixednuts-inc.com"),
  title: {
    default: "mixednuts — 戦略 × AI × マーケティング",
    template: "%s | mixednuts",
  },
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
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
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable} ${playfair.variable} ${inter.variable} ${archivo.variable}`}>
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
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
