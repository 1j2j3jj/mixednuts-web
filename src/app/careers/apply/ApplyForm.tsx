"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { positions, CASUAL_INTERVIEW_SLUG, type Position } from "@/data/careers";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

export default function ApplyForm({ initialPosition }: { initialPosition?: string }) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  const initialSlug = useMemo(() => {
    if (!initialPosition) return "";
    if (initialPosition === CASUAL_INTERVIEW_SLUG) return CASUAL_INTERVIEW_SLUG;
    const match = positions.find((p) => p.slug === initialPosition);
    return match ? match.slug : "";
  }, [initialPosition]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if ((formData.get("_honey") as string | null)?.trim()) {
      setState({ status: "success", message: "応募を受け付けました。" });
      return;
    }

    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setState({ status: "error", message: "フォームが設定されていません。管理者にお問い合わせください。" });
      return;
    }

    const name = (formData.get("name") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const positionSlug = (formData.get("position") as string | null)?.trim() ?? "";
    const motivation = (formData.get("motivation") as string | null)?.trim() ?? "";

    if (!name || !email || !positionSlug || !motivation) {
      setState({ status: "error", message: "必須項目が未入力です。" });
      return;
    }

    const pos: Position | undefined = positions.find((p) => p.slug === positionSlug);
    const positionLabel =
      positionSlug === CASUAL_INTERVIEW_SLUG
        ? "カジュアル面談希望（ポジション未定）"
        : pos?.title ?? positionSlug;

    const payload: Record<string, string> = {
      access_key: accessKey,
      name,
      email,
      subject: `[Careers] ${positionLabel} — ${name} 様よりご応募`,
      from_name: "mixednuts-inc.com (careers)",
      ポジション: positionLabel,
      氏名: name,
      メールアドレス: email,
      LinkedIn: (formData.get("linkedin") as string | null) ?? "",
      ポートフォリオ: (formData.get("portfolio") as string | null) ?? "",
      現職: (formData.get("current_company") as string | null) ?? "",
      現職役職: (formData.get("current_role") as string | null) ?? "",
      応募理由: motivation,
      稼働開始可能時期: (formData.get("availability") as string | null) ?? "",
      希望勤務形態: (formData.get("work_style") as string | null) ?? "",
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
        setState({
          status: "success",
          message:
            "ご応募を受け付けました。2営業日以内にご連絡いたします。書類選考通過後、カジュアル面談（30分）にご案内します。",
        });
        form.reset();
        return;
      }
      setState({
        status: "error",
        message: data.message || "送信に失敗しました。時間をおいて再度お試しください。",
      });
    } catch {
      setState({
        status: "error",
        message: "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
      });
    }
  }

  if (state.status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "64px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h3
          style={{
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: 24,
            fontWeight: 900,
            color: "var(--charcoal)",
            marginBottom: 16,
          }}
        >
          ご応募ありがとうございます
        </h3>
        <p style={{ color: "var(--gray-600)", fontSize: 14, lineHeight: 1.9, maxWidth: 520, margin: "0 auto" }}>
          {state.message}
        </p>
      </div>
    );
  }

  const pending = state.status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="apply-form">
      <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

      <div className="form-section">
        <h3 className="form-section-title">応募ポジション</h3>
        <div className="form-group">
          <label>
            ご希望ポジション <span className="req">*</span>
          </label>
          <select name="position" required defaultValue={initialSlug}>
            <option value="">選択してください</option>
            <option value={CASUAL_INTERVIEW_SLUG}>カジュアル面談希望（ポジション未定）</option>
            {positions.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title} — {p.type} / {p.comp}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>希望勤務形態</label>
            <select name="work_style" defaultValue="">
              <option value="">選択してください</option>
              <option value="正社員">正社員</option>
              <option value="業務委託">業務委託</option>
              <option value="どちらでも可">どちらでも可</option>
            </select>
          </div>
          <div className="form-group">
            <label>稼働開始可能時期</label>
            <input type="text" name="availability" placeholder="例: 2026年6月 / 即日 / 調整中" />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">ご本人様情報</h3>
        <div className="form-row">
          <div className="form-group">
            <label>
              お名前 <span className="req">*</span>
            </label>
            <input type="text" name="name" placeholder="山田 太郎" required />
          </div>
          <div className="form-group">
            <label>
              メールアドレス <span className="req">*</span>
            </label>
            <input type="email" name="email" placeholder="your@email.com" required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>現職の会社名</label>
            <input type="text" name="current_company" placeholder="株式会社サンプル" />
          </div>
          <div className="form-group">
            <label>現職の役職</label>
            <input type="text" name="current_role" placeholder="例: シニアマネージャー" />
          </div>
        </div>
        <div className="form-group">
          <label>LinkedIn URL</label>
          <input type="url" name="linkedin" placeholder="https://www.linkedin.com/in/..." />
        </div>
        <div className="form-group">
          <label>ポートフォリオ / GitHub / 公開実績 URL</label>
          <input type="url" name="portfolio" placeholder="https://..." />
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">応募理由</h3>
        <div className="form-group">
          <label>
            このポジションに応募した理由・ご経歴のハイライト <span className="req">*</span>
          </label>
          <textarea
            name="motivation"
            required
            placeholder={`自由形式で構いません。以下のような観点で教えていただけると助かります:\n\n・これまでの主要プロジェクトと成果\n・mixednuts で実現したいこと\n・強み / 専門領域\n\n職務経歴書は書類選考通過後にお送りいただきます。`}
          />
        </div>
      </div>

      <div className="form-group form-consent">
        <input type="checkbox" required id="privacy-careers" />
        <label htmlFor="privacy-careers">
          <Link href="/privacy">プライバシーポリシー</Link>に同意する（応募情報は選考目的のみに使用します）
        </label>
      </div>

      {state.status === "error" && (
        <div className="form-error">{state.message}</div>
      )}

      <div className="form-actions">
        <button type="submit" className="form-submit" disabled={pending}>
          {pending ? "送信中..." : "応募を送信する →"}
        </button>
        <p className="form-note">
          ※ 2営業日以内にご連絡いたします。
          <br />
          ※ 書類選考通過後、30分のカジュアル面談からスタートします。
        </p>
      </div>
    </form>
  );
}
