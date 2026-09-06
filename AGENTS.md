# AGENTS.md — mixednuts-web（Codex / Claude Code 共通の判断基準）

正本: 本書の共通判断基準と `README.md`。`CLAUDE.md` は本書を参照する入口。

- ゴール / 完了条件: サイトの要求を最小差分で実装し、関連する検証を通す。
- 触ってよい範囲: 依頼対象の `src/`・`content/`・`public/`・`scripts/`・`test/` とルート文書。
- 承認が要る操作: 本番反映・外部送信・権限変更・課金・不可逆な git。今回の依頼で明示済みの承認は重ねて求めない。
- 認証・権限・実行環境: 共有文書に値を書かない。Codex は `~/.codex`、Claude は `.claude/settings.local.json` で各ツール別に管理する。
- 進め方: 最小差分 → 関連するテスト・検証 → 根拠と未解決事項を含むレビュー可能な成果物 → 必要な質問。

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
