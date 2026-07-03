"use client";

import { useEffect, useState } from "react";

/**
 * 初回訪問ガイド（Batch5 オンボーディング）。
 *
 * - モーダルではなく dismissible なカード（押し付けない）。
 * - localStorage キー `mnweb-guide-dismissed-v1` で「今後表示しない」を永続化。
 *   × は今セッションだけ閉じる（次回また出る）。
 * - SSR と矛盾しないよう、マウント後に localStorage を読むまで何も描画しない
 *   （hydration mismatch 回避）。
 */
const STORAGE_KEY = "mnweb-guide-dismissed-v1";

const TAB_GUIDE: Array<[string, string]> = [
  ["サマリー", "全体KPI・目標対比・チャネル俯瞰"],
  ["広告詳細", "媒体別（Google/Yahoo/Meta 等)の実績"],
  ["フィルター詳細", "キャンペーン・期間で絞り込む分析"],
  ["レポート", "GA×広告の突合レポート（日次/週次/月次）"],
  ["商品・検索", "EC商品・検索クエリのインサイト"],
];

export default function FirstRunGuide() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // localStorage 不可（プライベートモード等）→ ガイドは出さない
    }
  }, []);

  if (!visible) return null;

  function closeOnce() {
    setVisible(false);
  }
  function dismissForever() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <div
      role="note"
      className="relative rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
    >
      <button
        type="button"
        onClick={closeOnce}
        aria-label="ガイドを閉じる"
        className="absolute right-2 top-2 rounded px-1.5 text-sky-400 hover:text-sky-700"
      >
        ×
      </button>
      <p className="mb-1.5 font-semibold">はじめての方へ — このダッシュボードの見方</p>
      <ul className="mb-2 space-y-0.5">
        {TAB_GUIDE.map(([tab, desc]) => (
          <li key={tab}>
            <span className="font-medium">{tab}</span>
            <span className="text-sky-800">：{desc}</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 text-xs text-sky-800">
        右上の期間セレクタで選んだ期間は、タブを切り替えても維持されます。権限は
        閲覧者（レポートの閲覧）と編集者（閲覧＋メンバー招待・目標設定）の2種類です。
      </p>
      <button
        type="button"
        onClick={dismissForever}
        className="text-xs text-sky-600 underline hover:text-sky-900"
      >
        今後表示しない
      </button>
    </div>
  );
}
