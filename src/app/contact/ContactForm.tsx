"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export default function ContactForm() {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    // Honeypot — silently "succeed" without sending
    if ((formData.get("_honey") as string | null)?.trim()) {
      setState({ status: "success", message: "送信しました。" });
      return;
    }

    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setState({ status: "error", message: "フォームが設定されていません。管理者にお問い合わせください。" });
      return;
    }

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const message = (formData.get("message") as string | null)?.trim() ?? "";
    if (!name || !email || !message) {
      setState({ status: "error", message: "必須項目が未入力です。" });
      return;
    }

    const payload: Record<string, string> = {
      access_key: accessKey,
      name,
      email,
      company: (formData.get("company") as string | null) ?? "",
      role: (formData.get("role") as string | null) ?? "",
      phone: (formData.get("phone") as string | null) ?? "",
      subject: (formData.get("subject") as string | null) || `[mixednuts] ${name} 様より新規問い合わせ`,
      budget: (formData.get("budget") as string | null) ?? "",
      message,
      from_name: "mixednuts-inc.com",
      redirect: "false",
    };

    setState({ status: "submitting" });
    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (data.success) {
        setState({ status: "success", message: "お問い合わせを受け付けました。2営業日以内にご返信いたします。" });
        form.reset();
        return;
      }
      setState({ status: "error", message: data.message || "送信に失敗しました。時間をおいて再度お試しください。" });
    } catch {
      setState({ status: "error", message: "ネットワークエラーが発生しました。時間をおいて再度お試しください。" });
    }
  }

  if (state.status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 22, color: "var(--navy)", marginBottom: 12 }}>
          お問い合わせを受け付けました
        </h3>
        <p style={{ color: "#4B5563", fontSize: 14, lineHeight: 1.8 }}>{state.message}</p>
      </div>
    );
  }

  const pending = state.status === "submitting";

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

      <div className="form-group">
        <label>お名前 <span className="req">*</span></label>
        <input type="text" name="name" placeholder="山田 太郎" required />
      </div>
      <div className="form-group">
        <label>会社名 <span className="req">*</span></label>
        <input type="text" name="company" placeholder="株式会社サンプル" required />
      </div>
      <div className="form-group">
        <label>役職</label>
        <input type="text" name="role" placeholder="例: 事業開発責任者、CMO 等" />
      </div>
      <div className="form-group">
        <label>メールアドレス <span className="req">*</span></label>
        <input type="email" name="email" placeholder="your@company.com" required />
      </div>
      <div className="form-group">
        <label>電話番号（任意）</label>
        <input type="tel" name="phone" placeholder="090-1234-5678" />
      </div>
      <div className="form-group">
        <label>ご関心のあるサービス <span className="req">*</span></label>
        <select name="subject" required defaultValue="">
          <option value="">選択してください</option>
          <option value="Strategy">Strategy Consulting（戦略コンサル）</option>
          <option value="AI">AI Implementation（AI実装支援）</option>
          <option value="Marketing">Marketing &amp; Growth（マーケ成長支援）</option>
          <option value="All">3つ全てを横断で相談したい</option>
          <option value="Undecided">まだ決めきれていない／壁打ちしたい</option>
          <option value="Other">その他・ご相談</option>
        </select>
      </div>
      <div className="form-group">
        <label>予算目安</label>
        <select name="budget" defaultValue="">
          <option value="">選択してください</option>
          <option>〜¥100万（スポット案件）</option>
          <option>¥100万〜¥500万</option>
          <option>¥500万〜¥1,000万</option>
          <option>¥1,000万以上</option>
          <option>応相談</option>
        </select>
      </div>
      <div className="form-group">
        <label>ご相談内容 <span className="req">*</span></label>
        <textarea name="message" placeholder="現状の課題、達成したい状態、時間軸などをお聞かせください。" required />
      </div>
      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" required style={{ width: "auto" }} id="privacy" />
        <label htmlFor="privacy" style={{ margin: 0, fontSize: 12, color: "#4B5563", cursor: "pointer" }}>
          <Link href="/privacy" style={{ color: "var(--navy)", textDecoration: "underline" }}>プライバシーポリシー</Link>に同意する
        </label>
      </div>

      {state.status === "error" && (
        <div style={{ padding: "12px 16px", background: "#FEF2F2", color: "#991B1B", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {state.message}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="form-submit" disabled={pending}>
          {pending ? "送信中..." : "送信する →"}
        </button>
        <p className="form-note">
          ※ 2営業日以内にご返信いたします。<br />
          ※ 本フォームの情報は初回相談の準備のみに使用し、第三者に提供することはありません。
        </p>
      </div>
    </form>
  );
}
