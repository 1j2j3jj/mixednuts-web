# Phase 1 設定監査 — mixednuts-web

監査日: 2026-09-06。Desktop監査HEAD: `b0c7b5c844ea463e2acecf47d85ffe1d72648b80`。PR基準main: `41d7fd8669f6cbb7e5c2de7aec0dadeb35fc084a`。対象リポは読み取りのみ。値・認証ヘッダー・cookie・個人パスの文字列は掲載しない。

| 項目 | 実測 | 判定 |
|---|---|---|
| AGENTS.md | 327 bytes | ⚠️ 内容整備が必要 |
| 常時ロード | 11 bytes（CLAUDE.md + top-level rules） | ✅ 実測 |
| agent / skill | 0 / 0 | ✅ 正本を確認 |
| skill / agent ミラー | .codex/agents・.codex/skills・.agents 以下に実体なし（tracked / untracked / ignored） | ✅ 削除対象なし |
| .codex/config.toml | なし。内容は未読、サイズも採取対象外 | ✅ |
| tracked秘密パターン | 58 件（file:line:種別の組） | ⚠️ 一致は漏えい確定ではない |
| 共有文書・support text | 個人パス/認証候補 0 件 | ✅ 指定走査で検出なし |
| 作業前状態 | clean | ✅ 保存 |

## 調査方法と限界

- ファイル一覧・byte数・tracked状態、指定8パターンの `git grep -I -n -z -F`、共有テキストの個人パス・認証代入候補、参照候補の存在を確認。git grepの行本文はメモリ内で破棄し、file:lineと種別のみ保存。
- `_secrets/`、`.env*`、`.codex/config.toml`、他セッションworktreeは検索から除外。ユーザーの禁止が「tracked全体」より優先。ホームのツール設定は未読。既存レポートは検索のみで変更なし。
- 参照候補はバッククォート内の固定パス中心。相対省略・生成物・外部ツール・履歴参照は区別が必要。コマンドは実行していないため動作保証なし。本文の全意味・動的参照・パターン外secretの不在は保証しない。
- 常時ロードは指定算式の実測であり、Claudeの実際の再帰ロード・frontmatter適用結果の実行検証ではない。

## ファイル一覧とサイズ

| ファイル | bytes | 状態 |
|---|---:|---|
| `AGENTS.md` | 327 | tracked |
| `CLAUDE.md` | 11 | tracked |

## 矛盾・陳腐化一覧

| file:line | 内容 | 新しい方 | 提案 |
|---|---|---|---|
| — | 対象文書内で反対指示は検出なし | — | AGENTS整備 |

Next.jsローカルdocs参照は現時点で存在。AGENTSは生成ブロック中心で共通の判断基準が不足。CLAUDE.mdはAGENTSへの逆向きポインタであり、AGENTSからCLAUDEへ戻すと循環するため追加しない。

## 参照候補（自動抽出、誤検出を含む）

| file:line | 参照 | 解決状況 |
|---|---|---|
| — | — | 固定パス候補の欠落なし |

## archive済みcapability名への参照候補

現役正本に無い名前をarchive索引と照合。履歴説明・単語衝突を含むため、機械的一括置換はしない。

| file:line | 名前 |
|---|---|

## 共有文書・support textの個人パス／認証候補

| file:line | 種別 |
|---|---|

## trackedファイル秘密情報パターン全件

以下は値・行本文を一切含めない。名称・変数・検査用サンプルにも一致する。

| file:line | 種別 |
|---|---|
| `content/insights/ai-agent-org-123.mdx:147` | OpenAI-key-pattern |
| `content/insights/auto-delegation-routing-table.mdx:29` | OpenAI-key-pattern |
| `content/insights/auto-delegation-routing-table.mdx:223` | OpenAI-key-pattern |
| `content/insights/calibration-bias-17x.mdx:210` | OpenAI-key-pattern |
| `content/insights/calibration-hallucination-zero.mdx:167` | OpenAI-key-pattern |
| `content/insights/cognitive-modes.mdx:216` | OpenAI-key-pattern |
| `content/insights/cognitive-modes.mdx:224` | OpenAI-key-pattern |
| `content/insights/jarvis-adaptive-delegation.mdx:185` | OpenAI-key-pattern |
| `content/insights/knowledge-store-4-layers.mdx:196` | OpenAI-key-pattern |
| `content/insights/task-forced-delegation.mdx:11` | OpenAI-key-pattern |
| `drizzle/0000_init_better_auth.sql:7` | refresh-token-field |
| `drizzle/0000_init_better_auth.sql:10` | refresh-token-field |
| `drizzle/meta/0000_snapshot.json:41` | refresh-token-field |
| `drizzle/meta/0000_snapshot.json:42` | refresh-token-field |
| `drizzle/meta/0000_snapshot.json:59` | refresh-token-field |
| `drizzle/meta/0000_snapshot.json:60` | refresh-token-field |
| `package-lock.json:10087` | OpenAI-key-pattern |
| `package-lock.json:10161` | OpenAI-key-pattern |
| `package-lock.json:10163` | OpenAI-key-pattern |
| `package-lock.json:10438` | OpenAI-key-pattern |
| `package-lock.json:10531` | OpenAI-key-pattern |
| `package-lock.json:10533` | OpenAI-key-pattern |
| `package-lock.json:11239` | OpenAI-key-pattern |
| `package-lock.json:12020` | OpenAI-key-pattern |
| `public/llms.txt:37` | OpenAI-key-pattern |
| `src/app/(dashboard)/dashboard/[slug]/settings/members/actions.ts:45` | Authorization-header |
| `src/app/api/cron/audit-log-purge/route.ts:19` | Bearer |
| `src/app/api/cron/audit-log-purge/route.ts:21` | Authorization-header |
| `src/app/api/cron/audit-log-purge/route.ts:21` | Bearer |
| `src/app/api/cron/audit-log-purge/route.ts:28` | Bearer |
| `src/app/api/cron/audit-log-purge/route.ts:33` | Bearer |
| `src/app/api/cron/freshness-check/route.ts:24` | Bearer |
| `src/app/api/cron/freshness-check/route.ts:34` | Bearer |
| `src/app/api/cron/freshness-check/route.ts:35` | Authorization-header |
| `src/app/api/cron/freshness-check/route.ts:35` | Bearer |
| `src/app/api/cron/freshness-check/route.ts:40` | Bearer |
| `src/app/api/cron/membership-cleanup/route.ts:20` | Bearer |
| `src/app/api/cron/membership-cleanup/route.ts:30` | Bearer |
| `src/app/api/cron/membership-cleanup/route.ts:36` | Bearer |
| `src/app/page.tsx:366` | OpenAI-key-pattern |
| `src/app/page.tsx:367` | OpenAI-key-pattern |
| `src/app/services/page.tsx:76` | OpenAI-key-pattern |
| `src/db/schema.ts:79` | refresh-token-field |
| `src/db/schema.ts:82` | refresh-token-field |
| `src/lib/__tests__/design-guards.test.ts:496` | OpenAI-key-pattern |
| `src/lib/__tests__/email.test.ts:127` | Bearer |
| `src/lib/__tests__/email.test.ts:140` | Bearer |
| `src/lib/design-guards.ts:420` | OpenAI-key-pattern |
| `src/lib/email.ts:181` | Authorization-header |
| `src/lib/email.ts:181` | Bearer |
| `src/lib/sources/gsc.ts:25` | refresh-token-field |
| `src/lib/sources/gsc.ts:68` | client-secret-field |
| `src/lib/sources/gsc.ts:69` | refresh-token-field |
| `src/lib/sources/gsc.ts:71` | client-secret-field |
| `src/lib/sources/gsc.ts:92` | client-secret-field |
| `src/lib/sources/gsc.ts:93` | refresh-token-field |
| `src/lib/sources/gsc.ts:96` | refresh-token-field |
| `src/middleware.ts:170` | Bearer |

## 消すもの（優先順・このPhaseでは未適用）

- 未使用ミラーは検出なし。既存本文の機械的削除なし。
- AGENTSが無い場合は20行以内で追加。存在する場合はNext.jsの現行参照を保ち判断基準を整備。

注: Desktopの監査HEADとPR基準mainは異なる。既存開発ブランチ・未push変更はPRに含めない。AGENTS原文の一致、正本件数とミラー不在はPR基準mainでも確認済み。

---

## Phase 2 — 分類と適用範囲

### 削除
- AGENTSの重複本文・不要なミラー説明を削減。Next.js生成ブロックは現行参照として保持。
- skill / agentミラーは検出なし。Codex hooksは固有実装のため削除対象外。

### 移動
- 今回はなし。mixednutsincの詳細本文は既に移設済みで、さらなる移動は旧指示の残存を解消しない。

### 追加（最小限）
- AGENTSが無い2リポは20行以内、全リポ3,000 bytes以下で判断基準と参照だけを整備。
- 新規監査メモ1本。既存レポートは不変。

## 適用しない提案

- 認証・権限・実行環境、hook、アプリコードには変更なし。秘密パターン一致はコード例・変数参照と実値を区別できる追加調査が必要なため、機械的削除は行わない。

## 適用と検証

AGENTSのみ整備。各ファイル3,000 bytes以下、新設2本は20行以下。Next.js生成ブロックの保持、禁止値パターンの不在、ポインタ循環を増やしていないこと、差分対象の限定、git diff --checkを確認。アプリ・hook・権限・認証設定には変更がないためアプリテストは実行しない。完了条件3・4に残る高リスク事項は上の提案へ分離し、解消済みとは扱わない。
