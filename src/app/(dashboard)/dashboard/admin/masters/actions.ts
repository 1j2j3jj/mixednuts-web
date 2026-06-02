"use server";

import { headers } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  upsertTargets,
  replaceExternalCv,
  replaceCampaignMaster,
  CLIENTS_WITH_EXTERNAL_CV,
} from "@/lib/masters";
import {
  parseTargetsCsvResult,
  parseExternalCvCsv,
  parseCampaignMasterCsv,
  type CsvRowError,
} from "@/lib/master-csv";
import { writeAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { CLIENT_IDS, type ClientId } from "@/config/clients";

async function requireAdminEmail(): Promise<string> {
  const h = await headers();
  if (h.get("x-viewer-kind") !== "admin") {
    throw new Error("admin only");
  }
  // Try Better Auth session for email; fallback to env admin.
  let email = "admin@mixednuts-inc.com";
  try {
    const session = await auth.api.getSession({ headers: h });
    if (session?.user?.email) email = session.user.email;
  } catch {
    // ignore
  }
  return email;
}

interface UploadResult {
  ok: boolean;
  message: string;
  inserted?: number;
  preview?: number;
  /** Per-row validation failures (targets upsert). Present when ok=false. */
  rowErrors?: CsvRowError[];
}

/**
 * Upload + commit targets CSV. Idempotent upsert keyed on
 * (client_id, year_month) — keys not present in the CSV are preserved.
 *
 * action: "preview" → parse + validate, no write. Returns row count or errors.
 * action: "commit"  → parse + validate (reject if any error) + MERGE upsert.
 */
export async function uploadTargetsAction(
  csv: string,
  action: "preview" | "commit",
): Promise<UploadResult> {
  try {
    const email = await requireAdminEmail();
    const { rows, errors } = parseTargetsCsvResult(csv);

    if (errors.length > 0) {
      return {
        ok: false,
        message: `検証エラー ${errors.length} 件 — 修正して再アップロードしてください`,
        rowErrors: errors,
      };
    }

    if (action === "preview") {
      const msg =
        rows.length === 0
          ? "データ 0 行 — 書き込みは行われません"
          : `OK. ${rows.length} 行を upsert 予定（含まれない月は温存）`;
      return { ok: true, message: msg, preview: rows.length };
    }

    const { affected } = await upsertTargets(rows, email);
    await writeAuditLog({
      actorEmail: email,
      action: "master.targets.upsert",
      metadata: { rows_affected: affected },
    });
    revalidatePath("/dashboard/admin/masters/targets");
    revalidateTag("bq-targets", "default");
    return { ok: true, message: `${affected} 行を upsert しました`, inserted: affected };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function uploadExternalCvAction(
  clientId: string,
  csv: string,
  action: "preview" | "commit",
): Promise<UploadResult> {
  try {
    const email = await requireAdminEmail();
    const cid = clientId as ClientId;
    if (!CLIENTS_WITH_EXTERNAL_CV.includes(cid)) {
      throw new Error(`Client ${clientId} does not support external_cv`);
    }
    const rows = parseExternalCvCsv(csv);
    if (action === "preview") {
      return { ok: true, message: `OK. ${rows.length} 行が投入予定`, preview: rows.length };
    }
    const { inserted } = await replaceExternalCv(cid, rows, email);
    await writeAuditLog({
      actorEmail: email,
      targetOrgSlug: cid,
      action: "master.external_cv.replace",
      metadata: { rows_inserted: inserted },
    });
    revalidatePath(`/dashboard/admin/masters/external-cv`);
    return { ok: true, message: `${inserted} 行を投入しました`, inserted };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function uploadCampaignMasterAction(
  clientId: string,
  csv: string,
  action: "preview" | "commit",
): Promise<UploadResult> {
  try {
    const email = await requireAdminEmail();
    const cid = clientId as ClientId;
    if (!(CLIENT_IDS as readonly string[]).includes(cid)) {
      throw new Error(`unknown client_id: ${clientId}`);
    }
    const rows = parseCampaignMasterCsv(csv);
    if (action === "preview") {
      return { ok: true, message: `OK. ${rows.length} 行が投入予定`, preview: rows.length };
    }
    const { inserted } = await replaceCampaignMaster(cid, rows, email);
    await writeAuditLog({
      actorEmail: email,
      targetOrgSlug: cid,
      action: "master.campaign_master.replace",
      metadata: { rows_inserted: inserted },
    });
    revalidatePath(`/dashboard/admin/masters/campaigns`);
    return { ok: true, message: `${inserted} 行を投入しました`, inserted };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
