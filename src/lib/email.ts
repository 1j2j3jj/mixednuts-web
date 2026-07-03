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
 *
 * テンプレ品質（2026-07-03 改訂・4レンズ批評+敵対検証 APPROVE）:
 *   - table-based + 全インラインCSS で Gmail/Outlook(mso)/Apple Mail/モバイル堅牢化。
 *   - 非表示プレヘッダー、VML bulletproof button、CTA直下の生URLフォールバック、
 *     ブランドヘッダー帯（テキストワードマーク・外部画像不使用）、明示背景色で
 *     ダークモード反転に耐性、送信者明示フッター、フィッシング対策の一文。
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

  // 件名はプレーンテキスト（HTML ではない）ため raw clientLabel を使う。
  const subject = `「${clientLabel}」広告レポートダッシュボードへのご招待｜ミックスナッツ株式会社`;

  const html = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">${safeClientLabel} の広告レポートダッシュボードへのご招待です。ログインすると最新レポートをご確認いただけます。</div>
<div style="display:none;max-height:0;overflow:hidden;">&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;color-scheme:light;">
  <tr>
    <td align="center" style="background-color:#f4f5f7;padding:24px 12px;">
      <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e2e4e8;border-radius:8px;">
        <tr>
          <td style="background-color:#0b1f3a;border-radius:8px 8px 0 0;padding:16px 28px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:0.04em;">mixednuts</span>
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#9fb0c9;font-size:12px;">&nbsp;広告レポートダッシュボード</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;color:#1a1a1a;line-height:1.7;">
            <p style="margin:0 0 8px;font-size:14px;">${safeClientLabel} ご担当者さま</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#0b1f3a;line-height:1.5;">広告レポートダッシュボードにご招待します</p>
            <p style="margin:0 0 16px;font-size:14px;">ミックスナッツ株式会社は、貴社の広告運用・分析を支援しているコンサルティング会社です。運用状況をご確認いただけるよう専用ダッシュボードをご用意しました。下のボタンからアクセスいただくと、広告（Google／Yahoo／Meta 等）・GA4・売上の最新レポートをご確認いただけます。</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:8px 28px 4px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeAcceptUrl}" style="height:46px;v-text-anchor:middle;width:260px;" arcsize="14%" fillcolor="#0b1f3a" strokecolor="#0b1f3a"><w:anchorlock/><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">ダッシュボードを開く</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- -->
            <a href="${safeAcceptUrl}" target="_blank" style="display:inline-block;background-color:#0b1f3a;color:#ffffff;text-decoration:none;border:1px solid #0b1f3a;border-radius:6px;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;font-size:15px;font-weight:bold;line-height:1;">ダッシュボードを開く</a>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td style="padding:4px 28px 0;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
            <p style="margin:0 0 4px;font-size:12px;color:#888888;text-align:center;">このリンクは14日間有効です（期限切れの場合は再発行をご依頼ください）</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 4px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
            <p style="margin:0 0 6px;font-size:13px;color:#555555;line-height:1.6;">ボタンが開かない場合は、次のURLをブラウザに貼り付けてください。リンク先はミックスナッツのダッシュボード（mixednuts-inc.com）です。</p>
            <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeAcceptUrl}" target="_blank" style="color:#0b1f3a;text-decoration:underline;">${safeAcceptUrl}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 4px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f8fa;border:1px solid #e8eaee;border-radius:6px;">
              <tr>
                <td style="padding:14px 16px;font-size:13px;color:#333333;line-height:1.7;">
                  <span style="color:#666666;">権限：</span><span style="font-weight:bold;">${safeRoleLabel}</span><br>
                  <span style="color:#666666;font-size:12px;">閲覧者はレポートの閲覧のみ、編集者は閲覧に加えメンバーの招待が可能です。</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
            <p style="margin:0 0 12px;font-size:13px;color:#555555;line-height:1.7;">本メールは、貴社の広告運用を担当するミックスナッツ株式会社よりお送りしています。ダッシュボードがパスワード入力を求めることはありません。クリックにご不安がある場合は、このメールへご返信いただくか info@mixednuts-inc.com へお問い合わせください。お心当たりがない場合は破棄してください。</p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f7f8fa;border-top:1px solid #e8eaee;border-radius:0 0 8px 8px;padding:16px 28px;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif;">
            <p style="margin:0 0 4px;font-size:13px;color:#333333;font-weight:bold;">ミックスナッツ株式会社</p>
            <p style="margin:0 0 2px;font-size:12px;color:#777777;line-height:1.6;">広告パフォーマンスダッシュボード提供元</p>
            <p style="margin:0;font-size:12px;color:#777777;line-height:1.6;">お問い合わせ：<a href="mailto:info@mixednuts-inc.com" style="color:#0b1f3a;text-decoration:none;">info@mixednuts-inc.com</a>　/　mixednuts-inc.com</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`;

  const text = `${clientLabel} ご担当者さま

広告レポートダッシュボードにご招待します。

ミックスナッツ株式会社は、貴社の広告運用・分析を支援しているコンサルティング会社です。運用状況をご確認いただけるよう専用ダッシュボードをご用意しました。ログインいただくと、広告（Google／Yahoo／Meta 等）・GA4・売上の最新レポートをご確認いただけます。

▼ ダッシュボードを開く
${acceptUrl}

（リンク先はミックスナッツのダッシュボード（mixednuts-inc.com）です。上記URLをブラウザに貼り付けてもアクセスできます。）

■ 権限：${roleLabel}
　閲覧者はレポートの閲覧のみ、編集者は閲覧に加えメンバーの招待が可能です。

■ このリンクは14日間有効です（期限切れの場合は再発行をご依頼ください）。

本メールは、貴社の広告運用を担当するミックスナッツ株式会社よりお送りしています。ダッシュボードがパスワード入力を求めることはありません。クリックにご不安がある場合は、このメールへご返信いただくか info@mixednuts-inc.com へお問い合わせください。お心当たりがない場合は破棄してください。

――――――――――
ミックスナッツ株式会社
広告パフォーマンスダッシュボード提供元
お問い合わせ：info@mixednuts-inc.com
mixednuts-inc.com`;

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
