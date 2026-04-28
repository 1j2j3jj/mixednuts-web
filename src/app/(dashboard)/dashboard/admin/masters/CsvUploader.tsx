"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import {
  uploadTargetsAction,
  uploadExternalCvAction,
  uploadCampaignMasterAction,
} from "./actions";

interface UploadResult {
  ok: boolean;
  message: string;
  inserted?: number;
  preview?: number;
}

type Kind = "targets" | "external_cv" | "campaign_master";

interface Props {
  /** Master kind — selects the corresponding server action. */
  kind: Kind;
  /** Required for external_cv and campaign_master. Ignored for targets. */
  clientId?: string;
  /** Display label e.g. "月次目標" */
  label: string;
  /** Sample/template CSV for download */
  templateCsv: string;
  /** Filename suggestion (without .csv) */
  templateName: string;
  /** Current rows CSV (download current state) */
  currentCsv: string;
}

async function dispatch(
  kind: Kind,
  clientId: string | undefined,
  csv: string,
  mode: "preview" | "commit",
): Promise<UploadResult> {
  if (kind === "targets") return uploadTargetsAction(csv, mode);
  if (!clientId) return { ok: false, message: "clientId is required" };
  if (kind === "external_cv") return uploadExternalCvAction(clientId, csv, mode);
  return uploadCampaignMasterAction(clientId, csv, mode);
}

export function CsvUploader({
  kind, clientId, label, templateCsv, templateName, currentCsv,
}: Props) {
  const [csv, setCsv] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setError(null);
    setSuccess(null);
    setPreviewMsg(null);
    setPreviewRows(null);
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  function doPreview() {
    setError(null); setSuccess(null);
    startTransition(async () => {
      const res = await dispatch(kind, clientId, csv, "preview");
      if (res.ok) {
        setPreviewMsg(res.message);
        setPreviewRows(res.preview ?? null);
      } else {
        setError(res.message);
        setPreviewRows(null);
      }
    });
  }

  function doCommit() {
    if (!confirm(`${label} を全置換します。よろしいですか?`)) return;
    setError(null); setSuccess(null);
    startTransition(async () => {
      const res = await dispatch(kind, clientId, csv, "commit");
      if (res.ok) {
        setSuccess(res.message);
        setCsv("");
        setFilename("");
        setPreviewRows(null);
        setPreviewMsg(null);
      } else {
        setError(res.message);
      }
    });
  }

  function downloadBlob(text: string, name: string) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-md border border-neutral-300 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadBlob(currentCsv, `${templateName}-current.csv`)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
        >
          ⬇ 現状をCSV ダウンロード
        </button>
        <button
          type="button"
          onClick={() => downloadBlob(templateCsv, `${templateName}-template.csv`)}
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
        >
          ⬇ テンプレ CSV
        </button>
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <label className="block text-sm font-medium text-neutral-800">
          ⬆ CSV をアップロード（全置換）
        </label>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="mt-2 block text-sm"
          disabled={pending}
        />
        {filename && (
          <p className="mt-1 text-xs text-neutral-600">選択中: {filename}</p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={doPreview}
            disabled={!csv || pending}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-40"
          >
            プレビュー (検証)
          </button>
          <button
            type="button"
            onClick={doCommit}
            disabled={!csv || previewRows == null || pending}
            className="rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {pending ? "実行中..." : `確定 (${previewRows ?? "?"} 行 全置換)`}
          </button>
        </div>

        {previewMsg && !error && (
          <p className="mt-3 rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">
            ✓ {previewMsg} — 「確定」を押すと既存テーブルを全置換します
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md bg-rose-50 p-2 text-sm text-rose-900">
            ✗ {error}
          </p>
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
