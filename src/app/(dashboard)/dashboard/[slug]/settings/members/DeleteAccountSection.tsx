"use client";

import { useState } from "react";

/**
 * 退会（アカウント削除）Danger Zone。
 *
 * members 設定ページ下部に表示。確認モーダルで「削除」と入力させてから
 * POST /api/auth/delete-account を呼ぶ。成功時は cookie が失効済みなので
 * /login へフル遷移する（router.push だと保護ページの残骸が見えるため
 * window.location でリロード遷移）。
 *
 * 運営（admin / impersonation 中）にはページ側（page.tsx）で非表示 —
 * API 側でも 403 で二重に拒否される。
 */
const CONFIRM_TEXT = "削除";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirm.trim() === CONFIRM_TEXT;

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirm("");
    setError(null);
  }

  async function handleDelete() {
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "POST" });
      const data: { ok?: boolean; error?: string; redirect?: string } = await res
        .json()
        .catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.href = data.redirect ?? "/login";
        return;
      }
      setError(data.error ?? "削除に失敗しました。時間をおいて再度お試しください");
    } catch {
      setError("削除に失敗しました。時間をおいて再度お試しください");
    }
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-red-200 bg-red-50/40 p-4 dark:border-red-900 dark:bg-red-950/20">
      <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
        アカウントの削除
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        ご自身のアカウントとすべての組織メンバーシップを削除します。この操作は取り消せません。
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-600 hover:text-white dark:border-red-800 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-900"
      >
        アカウントを削除
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-account-title"
              className="text-base font-semibold text-red-700 dark:text-red-400"
            >
              本当にアカウントを削除しますか？
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              ログイン情報・組織メンバーシップ・保留中の招待が完全に削除され、
              ダッシュボードにアクセスできなくなります。この操作は取り消せません。
            </p>
            <label className="mt-4 block text-xs text-muted-foreground">
              続行するには「{CONFIRM_TEXT}」と入力してください
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                placeholder={CONFIRM_TEXT}
              />
            </label>
            {error && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!confirmed || busy}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "削除中…" : "完全に削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
