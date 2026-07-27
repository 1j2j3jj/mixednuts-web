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
      // Phase H: this is onboarding help, not report content. It shows until
      // dismissed — so on a new client or a new device it is on screen — and
      // the Print button then put "はじめての方へ — このダッシュボードの見方"
      // and the whole tab/permission explainer into the client's PDF. Verified
      // present in printed output before this fix.
      data-print-hide="true"
      className="relative rounded-card border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
    >
      <button
        type="button"
        onClick={closeOnce}
        aria-label="ガイドを閉じる"
        // ITEM 3 fix (2026-07-25 Phase E audit): text-sky-400 on bg-sky-50
        // measured 2.044:1 at 14px — far under the 4.5:1 small-text floor.
        // sky-700 = 5.49:1 (verified live); hover bumped from sky-700 to
        // sky-900 so the hover state still visibly darkens instead of
        // becoming a no-op once resting and old-hover coincide.
        className="absolute right-2 top-2 rounded-md px-1.5 text-sky-700 hover:text-sky-900"
      >
        ×
      </button>
      <p className="mb-1.5 font-semibold">
        はじめての方へ — このダッシュボードの見方
      </p>
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
        // ITEM 3 fix (2026-07-25 Phase E audit): text-sky-600 on bg-sky-50
        // measured 3.773:1 at 12px, under the 4.5:1 floor. sky-700 = 5.49:1
        // (verified live); hover:sky-900 unchanged — still a visibly darker
        // step down from the new resting colour.
        className="text-xs text-sky-700 underline hover:text-sky-900"
      >
        今後表示しない
      </button>
    </div>
  );
}
