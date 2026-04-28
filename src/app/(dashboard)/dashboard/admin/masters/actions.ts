"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  replaceTargets,
  replaceExternalCv,
  replaceCampaignMaster,
  CLIENTS_WITH_EXTERNAL_CV,
} from "@/lib/masters";
import {
  parseTargetsCsv,
  parseExternalCvCsv,
  parseCampaignMasterCsv,
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
}

/**
 * Upload + commit targets CSV. Full replace.
 *
 * action: "preview" → parse + count, no write
 * action: "commit"  → parse + TRUNCATE + INSERT
 */
export async function uploadTargetsAction(
  csv: string,
  action: "preview" | "commit",
): Promise<UploadResult> {
  try {
    const email = await requireAdminEmail();
    const rows = parseTargetsCsv(csv);
    const valid = CLIENT_IDS as readonly string[];
    for (const r of rows) {
      if (!valid.includes(r.client_id)) {
        throw new Error(`unknown client_id: ${r.client_id} (allowed: ${valid.join(", ")})`);
      }
    }
    if (action === "preview") {
      return { ok: true, message: `OK. ${rows.length} 行が投入予定`, preview: rows.length };
    }
    const { inserted } = await replaceTargets(rows, email);
    await writeAuditLog({
      actorEmail: email,
      action: "master.targets.replace",
      metadata: { rows_inserted: inserted },
    });
    revalidatePath("/dashboard/admin/masters/targets");
    return { ok: true, message: `${inserted} 行を投入しました`, inserted };
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
