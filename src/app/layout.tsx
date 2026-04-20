import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import FooterMono from "@/components/FooterMono";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});
const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});
const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mixednuts-inc.com"),
  title: {
    default: "mixednuts — Strategy × AI × Marketing",
    template: "%s | mixednuts",
  },
  description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
  openGraph: {
    title: "mixednuts — Strategy × AI × Marketing",
    description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
    url: "https://mixednuts-inc.com",
    siteName: "mixednuts",
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "mixednuts", description: "Strategy × AI × Marketing" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${fraunces.variable} ${geist.variable} ${geistMono.variable} ${notoSansJP.variable} ${notoSerifJP.variable}`}
      style={{
        // Map Next.js CSS var names to our design tokens
        // so `var(--font-display)` / `var(--font-body)` resolve.
        ["--font-display" as string]: `var(--font-fraunces), "YuMincho", "Noto Serif JP", serif`,
        ["--font-body" as string]: `var(--font-geist), "YuGothic", "Hiragino Sans", "Noto Sans JP", sans-serif`,
        ["--font-mono" as string]: `var(--font-geist-mono), ui-monospace, monospace`,
      }}
    >
      <body>
        <NavBar />
        {children}
        <FooterMono />
      </body>
    </html>
  );
}
