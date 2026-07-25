"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { uploadClientTargets } from "./actions";
import { type TargetRowError } from "./targets-schema";

interface Props {
  slug: string;
  /** テンプレ CSV（当月起点の空 12 行）。 */
  templateCsv: string;
  /** 現状の目標を CSV 化したもの（このクライアント分のみ）。 */
  currentCsv: string;
  /** マトリクス貼り付けで許可される指標の完全一致リスト（案内表示用）。 */
  matrixMetrics: readonly string[];
  /** マトリクス貼り付けで許可されるチャネル見出しの完全一致リスト（案内表示用）。 */
  matrixChannels: readonly string[];
}

type Format = "long" | "matrix";

/**
 * クライアント自己アップロード UI。
 *
 * 2 つの入力経路を持つが、確定までの流れ（プレビュー→確認メッセージ→確定）は
 * 完全に共有する（doPreview / doCommit の 1 組だけ。第二のコミット経路は作らない）:
 *   1. 貼り付け（マトリクス, 新規 D5）— スプレッドシートの範囲をそのまま貼る。
 *      空欄セルは常に「未提供」扱いで、既存の目標を削除することは絶対にない。
 *   2. CSV アップロード（long 形式, 既存）— 値を空欄にした行だけがそのキーを
 *      明示削除する、唯一の削除経路。
 */
export default function TargetsClient({
  slug,
  templateCsv,
  currentCsv,
  matrixMetrics,
  matrixChannels,
}: Props) {
  const [csv, setCsv] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>("");

  const [activeFormat, setActiveFormat] = useState<Format | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
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

  function clearPreview() {
    setPreviewMsg(null);
    setPreviewCount(null);
    setInterpretation(null);
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    reset();
    clearPreview();
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function onPasteChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setPasteText(e.target.value);
    reset();
    clearPreview();
  }

  function doPreview(text: string, format: Format) {
    reset();
    clearPreview();
    setActiveFormat(format);
    startTransition(async () => {
      const res = await uploadClientTargets(slug, text, "preview", format);
      if (res.ok) {
        setPreviewMsg(res.message);
        setPreviewCount(res.count ?? null);
        setInterpretation(res.interpretation ?? null);
      } else {
        setError(res.message);
        setRowErrors(res.rowErrors ?? null);
        setPreviewCount(null);
      }
    });
  }

  function doCommit() {
    if (previewCount == null || activeFormat == null) return;
    const text = activeFormat === "matrix" ? pasteText : csv;
    if (!confirm("プレビュー表示の差分を保存します。よろしいですか？")) return;
    reset();
    startTransition(async () => {
      const res = await uploadClientTargets(slug, text, "commit", activeFormat);
      if (res.ok) {
        setSuccess(res.message);
        setCsv("");
        setFilename("");
        setPasteText("");
        setActiveFormat(null);
        clearPreview();
      } else {
        setError(res.message);
        setRowErrors(res.rowErrors ?? null);
      }
    });
  }

  function downloadBlob(text: string, name: string) {
    // UTF-8 BOM を先頭に付け、Excel(Win/Mac)で日本語が文字化けしないようにする。
    const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const commitDisabled =
    previewCount == null || activeFormat == null || pending;
  const commitLabel = pending
    ? "実行中..."
    : `確定 (${previewCount ?? "?"} 行を保存)`;

  return (
    <div className="space-y-4">
      {/* 貼り付けで一括入力（マトリクス）— 主経路。CEO の実データはこの形。 */}
      <div className="space-y-3 rounded-md border bg-card p-4">
        <div>
          <label className="block text-sm font-medium">
            貼り付けで一括入力（マトリクス）
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            お手元のスプレッドシートの範囲（指標×月、必要ならチャネルごとの表）を
            そのまま選択して Cmd+V
            で貼り付けてください。空欄のセルは「未入力」として
            無視され、既存の目標が削除されることはありません（削除は下の CSV
            アップロードのみで可能です）。
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            指標: {matrixMetrics.join(" / ")} ／ チャネル:{" "}
            {matrixChannels.join(" / ")}（チャネル別に表を分ける場合は、表の前に
            チャネル名だけの行を置いてください。チャネルを分けない場合は「全体」
            として扱われます）。
          </p>
        </div>
        <textarea
          value={pasteText}
          onChange={onPasteChange}
          disabled={pending}
          placeholder={
            "例）\n\t2026-04\t2026-05\n売上\t1000000\t1200000\nCV\t50\t60"
          }
          rows={8}
          className="block w-full rounded-md border bg-background p-2 font-mono text-xs"
        />
        <div>
          <button
            type="button"
            onClick={() => doPreview(pasteText, "matrix")}
            disabled={!pasteText.trim() || pending}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            プレビュー (検証)
          </button>
        </div>
      </div>

      {/* CSV アップロード — 明示削除ができる唯一の経路。既存の詳細指定向け UI。 */}
      <div className="space-y-3 rounded-md border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadBlob(currentCsv, `${slug}-targets-current.csv`)
            }
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            ⬇ 現状をCSV ダウンロード
          </button>
          <button
            type="button"
            onClick={() =>
              downloadBlob(templateCsv, `${slug}-targets-template.csv`)
            }
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            ⬇ テンプレ CSV
          </button>
        </div>

        <div className="border-t pt-3">
          <label className="block text-sm font-medium">
            ⬆ CSV
            をアップロード（指定したキーだけ更新・値を空欄にすると明示削除）
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="mt-2 block text-sm"
            disabled={pending}
          />
          {filename && (
            <p className="mt-1 text-xs text-muted-foreground">
              選択中: {filename}
            </p>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => doPreview(csv, "long")}
              disabled={!csv || pending}
              className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
            >
              プレビュー (検証)
            </button>
          </div>
        </div>
      </div>

      {/* プレビュー結果・確定・エラー・成功メッセージ — 2 経路で共有。 */}
      {(previewMsg || error || success) && (
        <div className="rounded-md border bg-card p-4">
          {interpretation && !error && (
            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {interpretation}
            </p>
          )}
          {previewMsg && !error && (
            <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">
              ✓ {previewMsg}
              {" — 「確定」を押すと、この差分だけを保存します"}
            </p>
          )}
          {previewMsg && !error && (
            <button
              type="button"
              onClick={doCommit}
              disabled={commitDisabled}
              className="mt-2 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {commitLabel}
            </button>
          )}
          {error && (
            <p className="rounded-md bg-rose-50 p-2 text-sm text-rose-900">
              ✗ {error}
            </p>
          )}
          {rowErrors && rowErrors.length > 0 && (
            <div className="mt-2 max-h-64 overflow-auto rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-900">
              <ul className="space-y-1">
                {rowErrors.map((re, i) => (
                  <li key={`${re.row}-${i}`}>
                    <span className="font-mono font-semibold">
                      {re.row} 行目:
                    </span>{" "}
                    {re.errors.join(" / ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {success && (
            <p className="rounded-md bg-emerald-100 p-2 text-sm text-emerald-900">
              ✅ {success}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
