"use server";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitContact(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    return { status: "error", message: "フォームが設定されていません。管理者にお問い合わせください。" };
  }

  const name = formData.get("name")?.toString() ?? "";
  const email = formData.get("email")?.toString() ?? "";
  const company = formData.get("company")?.toString() ?? "";
  const subject = formData.get("subject")?.toString() ?? "";
  const message = formData.get("message")?.toString() ?? "";
  const honeypot = formData.get("_honey")?.toString() ?? "";

  // Honeypot spam trap
  if (honeypot) {
    return { status: "success", message: "送信しました。" };
  }

  if (!name || !email || !message) {
    return { status: "error", message: "必須項目が未入力です。" };
  }

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        name,
        email,
        company,
        subject: subject || `[mixednuts] ${name} 様より新規問い合わせ`,
        message,
        from_name: "mixednuts-inc.com",
        redirect: false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      return { status: "success", message: "お問い合わせを受け付けました。2営業日以内にご返信いたします。" };
    }
    return { status: "error", message: data.message || "送信に失敗しました。時間をおいて再度お試しください。" };
  } catch {
    return { status: "error", message: "ネットワークエラーが発生しました。時間をおいて再度お試しください。" };
  }
}
