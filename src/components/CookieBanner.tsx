"use client";
/**
 * Cookie / 外部送信通知バナー（改正電気通信事業法 外部送信規律 / 個情法 28 条）
 *
 * 表示条件: localStorage キー `mn_cookie_consent` に値がない初回訪問時
 * 操作:
 *   - 「同意して続行」: consent="all" を保存
 *   - 「分析を拒否」  : consent="essential-only" を保存（GA4 / GTM の発火を抑制）
 * 互換性: 同意保存後は 365 日間バナーを再表示しない
 */
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "mn_cookie_consent";
const TTL_DAYS = 365;

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setVisible(true);
        return;
      }
      const { ts } = JSON.parse(raw) as { value: string; ts: number };
      const expired = Date.now() - ts > TTL_DAYS * 86400_000;
      if (expired) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function save(value: "all" | "essential-only") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, ts: Date.now() }));
      // GA4 / GTM の opt-out: window dataLayer に consent イベントを push
      // gtag consent mode v2 互換
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      if (value === "essential-only") {
        w.dataLayer.push({
          event: "consent_update",
          ad_storage: "denied",
          analytics_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
      } else {
        w.dataLayer.push({
          event: "consent_update",
          ad_storage: "granted",
          analytics_storage: "granted",
          ad_user_data: "granted",
          ad_personalization: "granted",
        });
      }
    } catch {
      // localStorage が使えない環境（Safari Private 等）は無視
    }
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie および外部送信に関する通知"
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 720,
        margin: "0 auto",
        zIndex: 9999,
        background: "var(--charcoal, #0A0A0A)",
        color: "var(--off-white, #F5F1E8)",
        padding: "20px 24px",
        borderRadius: 16,
        boxShadow: "0 24px 48px rgba(0,0,0,0.24)",
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      <p style={{ margin: 0, marginBottom: 14, wordBreak: "keep-all" }}>
        当サイトでは、サイトの利用状況の分析・広告効果測定のため、Google Analytics・
        Google Tag Manager 等を通じて Cookie および利用者情報を Google LLC（米国）等の外部事業者に送信します。
        詳細は{" "}
        <Link href="/privacy#sec5b" style={{ color: "var(--off-white, #F5F1E8)", textDecoration: "underline" }}>
          プライバシーポリシー（外国にある第三者への提供）
        </Link>{" "}
        をご確認ください。
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => save("all")}
          style={{
            background: "var(--off-white, #F5F1E8)",
            color: "var(--charcoal, #0A0A0A)",
            border: "none",
            padding: "10px 22px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          同意して続行
        </button>
        <button
          type="button"
          onClick={() => save("essential-only")}
          style={{
            background: "transparent",
            color: "var(--off-white, #F5F1E8)",
            border: "1px solid rgba(245,241,232,0.3)",
            padding: "10px 22px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          分析を拒否（必須のみ）
        </button>
      </div>
    </div>
  );
}
