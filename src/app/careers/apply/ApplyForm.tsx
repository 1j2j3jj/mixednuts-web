"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { positions, CASUAL_INTERVIEW_SLUG, type Position } from "@/data/careers";
import { submitApplication } from "./actions";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

// -----------------------------------------------------------------------
// File input sub-component
// -----------------------------------------------------------------------

const ALLOWED_EXTENSIONS = ".pdf,.docx,.doc";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

interface FileInputProps {
  name: string;
  label: string;
  disabled: boolean;
}

function FileInput({ name, label, disabled }: FileInputProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) {
      setFileName(null);
      return;
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      setError("PDF または Word ファイル (.docx / .doc) を選択してください。");
      e.target.value = "";
      setFileName(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`ファイルサイズが ${MAX_MB}MB を超えています。`);
      e.target.value = "";
      setFileName(null);
      return;
    }
    setFileName(file.name);
  }

  return (
    <div className="form-group file-input-group">
      <label>{label}</label>
      <div className="file-input-wrapper">
        <button
          type="button"
          className="file-input-btn"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {fileName ? "ファイルを変更" : "ファイルを選択"}
        </button>
        <span className="file-input-name">
          {fileName ?? "選択されていません（PDF推奨、最大10MB）"}
        </span>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={ALLOWED_EXTENSIONS}
          onChange={handleChange}
          disabled={disabled}
          style={{ display: "none" }}
        />
      </div>
      {error && <p className="file-input-error">{error}</p>}
    </div>
  );
}

// -----------------------------------------------------------------------
// Main form component
// -----------------------------------------------------------------------

export default function ApplyForm({ initialPosition }: { initialPosition?: string }) {
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const formRef = useRef<HTMLFormElement>(null);

  const initialSlug = useMemo(() => {
    if (!initialPosition) return "";
    if (initialPosition === CASUAL_INTERVIEW_SLUG) return CASUAL_INTERVIEW_SLUG;
    const match = positions.find((p) => p.slug === initialPosition);
    return match ? match.slug : "";
  }, [initialPosition]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    // Honeypot check (client-side fast path — also checked server-side)
    const honey = (form.elements.namedItem("_honey") as HTMLInputElement | null)?.value?.trim();
    if (honey) {
      setState({ status: "success", message: "応募を受け付けました。" });
      return;
    }

    setState({ status: "submitting" });

    try {
      const formData = new FormData(form);
      const result = await submitApplication(formData);
      if (result.success) {
        setState({ status: "success", message: result.message });
        form.reset();
      } else {
        setState({ status: "error", message: result.message });
      }
    } catch {
      setState({
        status: "error",
        message: "ネットワークエラーが発生しました。時間をおいて再度お試しください。",
      });
    }
  }

  if (state.status === "success") {
    return (
      <div className="apply-form-success" role="status">
        <span>Received / 01</span>
        <h3>ご応募ありがとうございます</h3>
        <p>{state.message}</p>
      </div>
    );
  }

  const pending = state.status === "submitting";

  return (
      <form ref={formRef} onSubmit={handleSubmit} className="apply-form">
        <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

        {/* ── Position ────────────────────────────────── */}
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
                  {p.title} — {p.type}
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
              <input type="text" name="availability" placeholder="例: 2026年10月 / 即日 / 調整中" />
            </div>
          </div>
        </div>

        {/* ── Personal info ───────────────────────────── */}
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

        {/* ── Motivation ──────────────────────────────── */}
        <div className="form-section">
          <h3 className="form-section-title">応募理由</h3>
          <div className="form-group">
            <label>
              このポジションに応募した理由・ご経歴のハイライト <span className="req">*</span>
            </label>
            <textarea
              name="motivation"
              required
              placeholder={`自由形式で構いません。以下のような観点で教えていただけると助かります:\n\n・これまでの主要プロジェクトと成果\n・mixednuts で実現したいこと\n・強み / 専門領域`}
            />
          </div>
        </div>

        {/* ── Document uploads ────────────────────────── */}
        <div className="form-section">
          <h3 className="form-section-title">書類 (任意)</h3>
          <p className="file-upload-note">
            職務経歴書・履歴書をお持ちの方はこちらからアップロードいただけます。
            カジュアル面談希望の場合は任意です。PDF 推奨、各 10MB まで。
          </p>
          <FileInput
            name="resume"
            label="職務経歴書 (PDF 推奨)"
            disabled={pending}
          />
          <FileInput
            name="cv"
            label="履歴書 (PDF 推奨)"
            disabled={pending}
          />
        </div>

        {/* ── Consent ─────────────────────────────────── */}
        <div className="form-group form-consent">
          <input type="checkbox" required id="privacy-careers" />
          <label htmlFor="privacy-careers">
            <Link href="/privacy">プライバシーポリシー</Link>に同意する（応募情報は採用選考目的のみに使用します。Google Drive 等の米国クラウド事業者を利用するため、個人情報の越境移転に同意したものとみなします）
          </label>
        </div>
        <div className="form-group form-consent">
          <input type="checkbox" required id="retention-careers" />
          <label htmlFor="retention-careers">
            応募書類の保管に同意する（不採用の場合、応募から 6 ヶ月経過後に削除します。採用の場合は雇用契約継続中保管します）
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
