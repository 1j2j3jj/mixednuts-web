"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitContact, type ContactFormState } from "./actions";

const initialState: ContactFormState = { status: "idle" };

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  if (state.status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h3 style={{ fontFamily: "var(--font-serif-jp)", fontSize: 22, color: "var(--navy)", marginBottom: 12 }}>
          お問い合わせを受け付けました
        </h3>
        <p style={{ color: "#4B5563", fontSize: 14, lineHeight: 1.8 }}>
          {state.message ?? "2営業日以内にご返信いたします。"}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
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
        <select name="subject" required>
          <option value="">選択してください</option>
          <option value="Strategy">Strategy Consulting（戦略コンサル）</option>
          <option value="AI">AI Implementation（AI実装支援）</option>
          <option value="Marketing">Marketing &amp; Growth（マーケ成長支援）</option>
          <option value="All">3つ全て / まだ未決</option>
          <option value="Other">その他・ご相談</option>
        </select>
      </div>
      <div className="form-group">
        <label>予算目安</label>
        <select name="budget">
          <option>選択してください</option>
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
