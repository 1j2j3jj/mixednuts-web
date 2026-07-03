"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { uploadClientTargets, type TargetRowError } from "./actions";

interface Props {
  slug: string;
  /** テンプレ CSV（当月起点の空 12 行）。 */
  templateCsv: string;
  /** 現状の目標を CSV 化したもの（このクライアント分のみ）。 */
  currentCsv: string;
}

/**
 * クライアント自己アップロード UI（薄い新規実装）。
 * テンプレ DL / 現状 DL → CSV 選択 → プレビュー(検証) → 確定 の流れ。
 * 確定はこのクライアントの目標を全置換する（サーバ側で client_id 強制）。
 */
export default function TargetsClient({ slug, templateCsv, currentCsv }: Props) {
  const [csv, setCsv] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<TargetRowError[] | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setError(null);
    setRowErrors(null);
    setSuccess(null);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    reset();
    setPreviewMsg(null);
    setPreviewCount(null);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function doPreview() {
    reset();
    startTransition(async () => {
      const res = await uploadClientTargets(slug, csv, "preview");
      if (res.ok) {
        setPreviewMsg(res.message);
        setPreviewCount(res.count ?? null);
      } else {
        setError(res.message);
        setRowErrors(res.rowErrors ?? null);
        setPreviewCount(null);
      }
    });
  }

  function doCommit() {
    if (
      !confirm(
        "月次目標を保存します（このクライアントの既存目標を全置換します）。よろしいですか?",
      )
    )
      return;
    reset();
    startTransition(async () => {
      const res = await uploadClientTargets(slug, csv, "commit");
      if (res.ok) {
        setSuccess(res.message);
        setCsv("");
        setFilename("");
        setPreviewCount(null);
        setPreviewMsg(null);
      } else {
        setError(res.message);
        setRowErrors(res.rowErrors ?? null);
      }
    });
  }

  function downloadBlob(text: string, name: string) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadBlob(currentCsv, `${slug}-targets-current.csv`)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          ⬇ 現状をCSV ダウンロード
        </button>
        <button
          type="button"
          onClick={() => downloadBlob(templateCsv, `${slug}-targets-template.csv`)}
          className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          ⬇ テンプレ CSV
        </button>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium">
          ⬆ CSV をアップロード（このクライアントの目標を全置換）
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="mt-2 block text-sm"
          disabled={pending}
        />
        {filename && (
          <p className="mt-1 text-xs text-muted-foreground">選択中: {filename}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={doPreview}
            disabled={!csv || pending}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            プレビュー (検証)
          </button>
          <button
            type="button"
            onClick={doCommit}
            disabled={!csv || previewCount == null || pending}
            className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {pending ? "実行中..." : `確定 (${previewCount ?? "?"} 行を保存)`}
          </button>
        </div>

        {previewMsg && !error && (
          <p className="mt-3 rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">
            ✓ {previewMsg}
            {" — "}
            「確定」を押すとこのクライアントの目標を全置換します
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md bg-rose-50 p-2 text-sm text-rose-900">
            ✗ {error}
          </p>
        )}
        {rowErrors && rowErrors.length > 0 && (
          <div className="mt-2 max-h-64 overflow-auto rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
            <ul className="space-y-1">
              {rowErrors.map((re) => (
                <li key={re.row}>
                  <span className="font-mono font-semibold">{re.row} 行目:</span>{" "}
                  {re.errors.join(" / ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        {success && (
          <p className="mt-3 rounded-md bg-emerald-100 p-2 text-sm text-emerald-900">
            ✅ {success}
          </p>
        )}
      </div>
    </div>
  );
}
