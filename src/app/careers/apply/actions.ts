"use server";

import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { google } from "googleapis";
import { positions, CASUAL_INTERVIEW_SLUG } from "@/data/careers";

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type ApplyResult =
  | { success: true; message: string }
  | { success: false; message: string };

interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  fileName: string;
}

// -----------------------------------------------------------------------
// Google Drive auth helpers
// -----------------------------------------------------------------------

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

/**
 * Initialize Google auth from the GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 env var.
 * Vercel stores the SA JSON as a base64-encoded string.
 * Locally, if the env var is absent, falls back to the _secrets/ file.
 */
function buildAuth() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;

  if (base64) {
    const json = JSON.parse(Buffer.from(base64, "base64").toString("utf-8")) as {
      client_email: string;
      private_key: string;
    };
    return new google.auth.JWT({
      email: json.client_email,
      key: json.private_key,
      scopes: DRIVE_SCOPES,
    });
  }

  // Local dev fallback: read from _secrets/
  // Note: this path only works when running from the repo root
  const secretPath = path.resolve(process.cwd(), "../../_secrets/google-service-account.json");
  if (fs.existsSync(secretPath)) {
    const sa = JSON.parse(fs.readFileSync(secretPath, "utf-8")) as {
      client_email: string;
      private_key: string;
    };
    return new google.auth.JWT({
      email: sa.client_email,
      key: sa.private_key,
      scopes: DRIVE_SCOPES,
    });
  }

  throw new Error(
    "Google SA credentials not found. Set GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 env var."
  );
}

// -----------------------------------------------------------------------
// Drive folder helpers
// -----------------------------------------------------------------------

const CAREERS_FOLDER_NAME = "mixednuts-careers";
/** CEO email to receive viewer access on sub-folders */
const CEO_EMAIL = "nozomi@mixednuts-inc.com";

/**
 * Find an existing folder by name under the given parent, or create it.
 * Returns the folder ID.
 */
async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string | null
): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const parentQuery = parentId
    ? ` and '${parentId}' in parents`
    : " and 'root' in parents";

  const listRes = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${escapedName}'${parentQuery} and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const files = listRes.data.files ?? [];
  if (files.length > 0 && files[0].id) {
    return files[0].id;
  }

  // Create new folder
  const createRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  const folderId = createRes.data.id;
  if (!folderId) {
    throw new Error(`Failed to create Drive folder: ${name}`);
  }

  return folderId;
}

/**
 * Grant viewer access to the CEO on a newly created sub-folder.
 */
async function shareWithCeo(
  drive: ReturnType<typeof google.drive>,
  folderId: string
): Promise<void> {
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: "user",
        role: "reader",
        emailAddress: CEO_EMAIL,
      },
      sendNotificationEmail: false,
    });
  } catch (err) {
    // Non-fatal: log and continue
    console.error("[careers/actions] CEO share failed:", err);
  }
}

// -----------------------------------------------------------------------
// File upload helper
// -----------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Upload a single file to Drive and return its ID and webViewLink.
 */
async function uploadFileToDrive(
  drive: ReturnType<typeof google.drive>,
  file: File,
  fileName: string,
  parentFolderId: string
): Promise<DriveUploadResult> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`不正なファイル形式です (${file.type})。PDF/Word のみ許可しています。`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`ファイルサイズが上限 (10MB) を超えています。`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine upload MIME type
  // We always store as-is (not converting to Google Docs format)
  const uploadMime = file.type;

  const createRes = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType: uploadMime,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink",
  });

  const fileId = createRes.data.id;
  const webViewLink = createRes.data.webViewLink;

  if (!fileId || !webViewLink) {
    throw new Error(`Drive アップロードに失敗しました (file: ${fileName})`);
  }

  return { fileId, webViewLink, fileName };
}

// -----------------------------------------------------------------------
// Web3Forms notification
// -----------------------------------------------------------------------

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

async function sendNotification(params: {
  name: string;
  email: string;
  positionLabel: string;
  linkedin: string;
  portfolio: string;
  currentCompany: string;
  currentRole: string;
  motivation: string;
  availability: string;
  workStyle: string;
  resumeLink: string;
  cvLink: string;
}): Promise<void> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY ?? process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("Web3Forms access key が設定されていません。");
  }

  const driveLinks =
    [
      params.resumeLink ? `職務経歴書: ${params.resumeLink}` : "",
      params.cvLink ? `履歴書: ${params.cvLink}` : "",
    ]
      .filter(Boolean)
      .join("\n") || "（ファイルなし）";

  const payload = {
    access_key: accessKey,
    name: params.name,
    email: params.email,
    subject: `[Careers] ${params.positionLabel} — ${params.name} 様よりご応募`,
    from_name: "mixednuts-inc.com (careers)",
    ポジション: params.positionLabel,
    氏名: params.name,
    メールアドレス: params.email,
    LinkedIn: params.linkedin,
    ポートフォリオ: params.portfolio,
    現職: params.currentCompany,
    現職役職: params.currentRole,
    応募理由: params.motivation,
    稼働開始可能時期: params.availability,
    希望勤務形態: params.workStyle,
    添付ファイル: driveLinks,
    redirect: "false",
  };

  const res = await fetch(WEB3FORMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { success: boolean; message?: string };
  if (!data.success) {
    throw new Error(data.message ?? "Web3Forms への送信に失敗しました。");
  }
}

// -----------------------------------------------------------------------
// Name sanitizer for Drive folder/file names
// -----------------------------------------------------------------------

/** Convert a display name to a safe ASCII slug (romaji-ish approximation). */
function sanitizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "")
    .slice(0, 40)
    .toLowerCase();
}

// -----------------------------------------------------------------------
// Main Server Action
// -----------------------------------------------------------------------

/**
 * Handle careers application form submission.
 *
 * Accepts multipart FormData (via `<form action={submitApplication}>`).
 * 1. Validates required fields and file constraints.
 * 2. Uploads resume/cv files to Google Drive under mixednuts-careers/.
 * 3. Sends notification email via Web3Forms with Drive links.
 *
 * @param formData - FormData from the browser
 */
export async function submitApplication(formData: FormData): Promise<ApplyResult> {
  // ------------------------------------------------------------------
  // 1. Honeypot spam check
  // ------------------------------------------------------------------
  const honey = (formData.get("_honey") as string | null)?.trim();
  if (honey) {
    // Silent success for bots
    return { success: true, message: "応募を受け付けました。" };
  }

  // ------------------------------------------------------------------
  // 2. Extract and validate text fields
  // ------------------------------------------------------------------
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const positionSlug = (formData.get("position") as string | null)?.trim() ?? "";
  const motivation = (formData.get("motivation") as string | null)?.trim() ?? "";

  if (!name || !email || !positionSlug || !motivation) {
    return { success: false, message: "必須項目が未入力です。" };
  }

  const pos = positions.find((p) => p.slug === positionSlug);
  const positionLabel =
    positionSlug === CASUAL_INTERVIEW_SLUG
      ? "カジュアル面談希望（ポジション未定）"
      : pos?.title ?? positionSlug;

  const linkedin = (formData.get("linkedin") as string | null) ?? "";
  const portfolio = (formData.get("portfolio") as string | null) ?? "";
  const currentCompany = (formData.get("current_company") as string | null) ?? "";
  const currentRole = (formData.get("current_role") as string | null) ?? "";
  const availability = (formData.get("availability") as string | null) ?? "";
  const workStyle = (formData.get("work_style") as string | null) ?? "";

  // ------------------------------------------------------------------
  // 3. Extract file inputs (optional)
  // ------------------------------------------------------------------
  const resumeFile = formData.get("resume") as File | null;
  const cvFile = formData.get("cv") as File | null;

  // Server-side file validation (MIME + size)
  for (const [label, file] of [["職務経歴書", resumeFile], ["履歴書", cvFile]] as [string, File | null][]) {
    if (!file || file.size === 0) continue;
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return {
        success: false,
        message: `${label}: 不正なファイル形式です。PDF または Word (.docx/.doc) をアップロードしてください。`,
      };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        success: false,
        message: `${label}: ファイルサイズが 10MB を超えています。`,
      };
    }
  }

  // ------------------------------------------------------------------
  // 4. Google Drive upload (only if files present)
  // ------------------------------------------------------------------
  let resumeLink = "";
  let cvLink = "";
  let subFolderId: string | null = null;

  const hasFiles =
    (resumeFile && resumeFile.size > 0) || (cvFile && cvFile.size > 0);

  if (hasFiles) {
    let drive: ReturnType<typeof google.drive>;
    let rootFolderId: string;

    try {
      const auth = buildAuth();
      drive = google.drive({ version: "v3", auth });

      // Determine root parent
      const parentEnv = process.env.CAREERS_DRIVE_PARENT_ID ?? null;

      // Find or create mixednuts-careers/ folder
      rootFolderId = await findOrCreateFolder(drive, CAREERS_FOLDER_NAME, parentEnv);
    } catch (err) {
      console.error("[careers/actions] Drive init error:", err);
      return {
        success: false,
        message: "ファイルアップロードの準備中にエラーが発生しました。テキストのみでご応募いただくか、時間をおいて再試行してください。",
      };
    }

    // Create sub-folder: YYYY-MM-DD_{name}_{position-slug}/
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const nameSafe = sanitizeName(name);
    const subFolderName = `${dateStr}_${nameSafe}_${positionSlug}`;

    try {
      subFolderId = await findOrCreateFolder(drive, subFolderName, rootFolderId);
      // Grant CEO viewer access on the per-application sub-folder
      await shareWithCeo(drive, subFolderId);
    } catch (err) {
      console.error("[careers/actions] Sub-folder creation error:", err);
      return {
        success: false,
        message: "ファイル保存先の作成に失敗しました。時間をおいて再試行してください。",
      };
    }

    // Upload files
    const uploadedFileIds: string[] = [];

    try {
      if (resumeFile && resumeFile.size > 0) {
        const ext = resumeFile.name.split(".").pop() ?? "pdf";
        const fileName = `${dateStr}_${nameSafe}_resume.${ext}`;
        const result = await uploadFileToDrive(drive, resumeFile, fileName, subFolderId);
        resumeLink = result.webViewLink;
        uploadedFileIds.push(result.fileId);
      }

      if (cvFile && cvFile.size > 0) {
        const ext = cvFile.name.split(".").pop() ?? "pdf";
        const fileName = `${dateStr}_${nameSafe}_cv.${ext}`;
        const result = await uploadFileToDrive(drive, cvFile, fileName, subFolderId);
        cvLink = result.webViewLink;
        uploadedFileIds.push(result.fileId);
      }
    } catch (err) {
      console.error("[careers/actions] File upload error:", err);

      // Rollback: delete the sub-folder (best-effort)
      if (subFolderId) {
        try {
          await drive.files.delete({ fileId: subFolderId });
        } catch (deleteErr) {
          console.error("[careers/actions] Rollback folder delete failed:", deleteErr);
        }
      }

      const message =
        err instanceof Error ? err.message : "ファイルのアップロードに失敗しました。";
      return { success: false, message };
    }
  }

  // ------------------------------------------------------------------
  // 5. Send notification email via Web3Forms
  // ------------------------------------------------------------------
  try {
    await sendNotification({
      name,
      email,
      positionLabel,
      linkedin,
      portfolio,
      currentCompany,
      currentRole,
      motivation,
      availability,
      workStyle,
      resumeLink,
      cvLink,
    });
  } catch (err) {
    console.error("[careers/actions] Web3Forms error:", err);
    // Files are already uploaded — report partial success
    return {
      success: false,
      message:
        "ファイルは保存されましたが、通知メールの送信に失敗しました。お手数ですが careers@mixednuts-inc.com までご連絡ください。",
    };
  }

  return {
    success: true,
    message:
      "ご応募を受け付けました。2営業日以内にご連絡いたします。書類選考通過後、カジュアル面談（30分）にご案内します。",
  };
}
