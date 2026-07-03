import "server-only";

/**
 * 招待メール送信（Resend REST API を fetch で直叩き・依存追加なし）。
 *
 * 設計方針（2026-07-03）:
 *   - Resend SDK は入れず、POST https://api.resend.com/emails を fetch する。
 *   - RESEND_API_KEY 未設定なら送信せず no-op（{sent:false, reason:"no_api_key"}）。
 *     キー到着まではリンクコピー動線だけで運用が回るよう、送信は失敗ではなく静かに省く。
 *   - fetch 失敗 / 非2xx も throw せず {sent:false, reason} を返す。
 *     呼び出し側（招待作成）は送信可否に関わらず招待結果を ok のまま返す。
 */

export interface SendInvitationEmailArgs {
  /** 宛先メールアドレス（招待される人）。 */
  to: string;
  /** クライアント表示名（例: 「販促スタイル」）。件名・本文の差し込み。 */
  clientLabel: string;
  /** 権限表示名（「編集者」/「閲覧者」）。 */
  roleLabel: string;
  /** 招待受諾（ログイン）URL。CTA ボタンの href。 */
  acceptUrl: string;
}

export interface SendInvitationEmailResult {
  sent: boolean;
  /** 送信しなかった / 失敗した理由（no_api_key / fetch_failed / status:xxx 等）。 */
  reason?: string;
}

/** HTML 差し込みの最低限のエスケープ（clientLabel 等は安全な文字だが二重ガード）。 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendInvitationEmail(
  args: SendInvitationEmailArgs
): Promise<SendInvitationEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  // キー未設定なら no-op（既存のリンクコピー動線は不変）。
  if (!apiKey) {
    return { sent: false, reason: "no_api_key" };
  }

  const { to, clientLabel, roleLabel, acceptUrl } = args;
  const from = process.env.EMAIL_FROM ?? "dashboard@mixednuts-inc.com";
  const replyTo = process.env.EMAIL_REPLY_TO ?? "info@mixednuts-inc.com";

  // 差し込みは安全な文字のみ想定だが、HTML 側は最低限エスケープする。
  const safeClientLabel = escapeHtml(clientLabel);
  const safeRoleLabel = escapeHtml(roleLabel);
  const safeAcceptUrl = escapeHtml(acceptUrl);

  const subject = `「${clientLabel}」広告ダッシュボードへのご招待｜ミックスナッツ株式会社`;

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#1a1a1a;line-height:1.7;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 16px;">${safeClientLabel} ご担当者さま</p>
  <p style="margin:0 0 16px;">ミックスナッツ株式会社より、貴社の広告パフォーマンスダッシュボードにご招待します。下のボタンからログインいただくと、広告（Google/Yahoo/Meta 等）・GA4・売上の最新レポートをいつでもご確認いただけます。</p>
  <p style="margin:24px 0;">
    <a href="${safeAcceptUrl}" style="display:inline-block;background:#0b1f3a;color:#ffffff;text-decoration:none;border-radius:6px;padding:12px 24px;font-weight:bold;">ダッシュボードを開く</a>
  </p>
  <ul style="margin:0 0 16px;padding-left:20px;">
    <li>権限：${safeRoleLabel}</li>
    <li>このリンクは14日間有効です（期限切れの場合は再発行をご依頼ください）</li>
  </ul>
  <p style="margin:0 0 16px;">本メールにお心当たりがない場合は破棄してください。ご不明点は info@mixednuts-inc.com までご返信ください。</p>
  <p style="margin:24px 0 0;color:#666666;font-size:13px;">— ミックスナッツ株式会社 / mixednuts Inc.</p>
</div>`;

  const text = `${clientLabel} ご担当者さま

ミックスナッツ株式会社より、貴社の広告パフォーマンスダッシュボードにご招待します。下のURLからログインいただくと、広告（Google/Yahoo/Meta 等）・GA4・売上の最新レポートをいつでもご確認いただけます。

ダッシュボードを開く：
${acceptUrl}

・権限：${roleLabel}
・このリンクは14日間有効です（期限切れの場合は再発行をご依頼ください）

本メールにお心当たりがない場合は破棄してください。ご不明点は info@mixednuts-inc.com までご返信ください。

— ミックスナッツ株式会社 / mixednuts Inc.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      return { sent: false, reason: `status:${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] sendInvitationEmail failed:", err);
    return { sent: false, reason: "fetch_failed" };
  }
}
