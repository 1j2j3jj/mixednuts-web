import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP, Playfair_Display, Inter, Archivo } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

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
  openGraph: {
    title: "mixednuts — 戦略 × AI × マーケティング",
    description: "戦略コンサルティング、AIエージェント導入、グロースマーケティングを統合提供するAI-firstコンサルファーム。",
    url: "https://mixednuts-inc.com",
    siteName: "mixednuts",
    locale: "ja_JP",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "mixednuts", description: "戦略 × AI × マーケティング" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable} ${playfair.variable} ${inter.variable} ${archivo.variable}`}>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
