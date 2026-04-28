"use server";

import { db } from "@/db/client";
import { clientCredentials } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password-hash";
import { CLIENTS, CLIENT_IDS, type ClientId } from "@/config/clients";
import { headers } from "next/headers";

/**
 * Server actions for /dashboard/admin/clients/[id] Basic Auth (IDPW)
 * management. CEO can rotate credentials per client without redeploy.
 *
 * All writes go through assertAdmin() — only mn_session admin can use these.
 */

async function assertAdmin(): Promise<void> {
  const h = await headers();
  const viewerKind = h.get("x-viewer-kind");
  if (viewerKind !== "admin") {
    throw new Error("管理者のみアクセス可能");
  }
}

async function actorEmail(): Promise<string> {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list[0] ?? "admin@mixednuts-inc.com";
}

export interface ClientCredentialInfo {
  clientId: ClientId;
  /** True if a row exists in client_credentials. */
  hasDbCredentials: boolean;
  /** Username, if DB row exists. */
  username: string | null;
  /** Last rotation timestamp from DB. */
  updatedAt: Date | null;
  /** Email of last rotator. */
  rotatedBy: string | null;
  /** True if env CLIENT_AUTH_<ID> is set (legacy/fallback). */
  hasEnvCredentials: boolean;
}

/**
 * Get the visible (non-secret) state of a client's Basic Auth credentials.
 * Never returns the password hash. Username is OK to surface to admin UI.
 */
export async function getClientCredentialInfo(
  clientId: ClientId
): Promise<ClientCredentialInfo> {
  await assertAdmin();
  if (!CLIENT_IDS.includes(clientId)) {
    throw new Error(`Unknown clientId: ${clientId}`);
  }
  const rows = await db
    .select({
      username: clientCredentials.username,
      updatedAt: clientCredentials.updatedAt,
      rotatedBy: clientCredentials.rotatedBy,
    })
    .from(clientCredentials)
    .where(eq(clientCredentials.clientId, clientId));

  const hasEnv = Boolean(process.env[`CLIENT_AUTH_${clientId.toUpperCase()}`]);

  if (rows.length === 0) {
    return {
      clientId,
      hasDbCredentials: false,
      username: null,
      updatedAt: null,
      rotatedBy: null,
      hasEnvCredentials: hasEnv,
    };
  }
  return {
    clientId,
    hasDbCredentials: true,
    username: rows[0].username,
    updatedAt: rows[0].updatedAt,
    rotatedBy: rows[0].rotatedBy,
    hasEnvCredentials: hasEnv,
  };
}

export interface SetClientCredentialsInput {
  clientId: ClientId;
  username: string;
  password: string;
}

export interface SetClientCredentialsResult {
  ok: boolean;
  error?: string;
}

/**
 * Create or rotate a client's Basic Auth credentials. Plaintext password
 * is hashed with PBKDF2 (Web Crypto) before persistence.
 */
export async function setClientCredentials(
  input: SetClientCredentialsInput
): Promise<SetClientCredentialsResult> {
  await assertAdmin();
  if (!CLIENT_IDS.includes(input.clientId)) {
    return { ok: false, error: `Unknown clientId: ${input.clientId}` };
  }
  const username = input.username.trim();
  const password = input.password;
  if (!username || username.length < 3) {
    return { ok: false, error: "ユーザー名は 3 文字以上で入力してください" };
  }
  if (!password || password.length < 8) {
    return { ok: false, error: "パスワードは 8 文字以上で入力してください" };
  }
  if (/\s/.test(username)) {
    return { ok: false, error: "ユーザー名に空白を含めることはできません" };
  }

  const hashed = await hashPassword(password);
  const rotator = await actorEmail();
  const now = new Date();

  // Upsert by clientId (PK).
  await db
    .insert(clientCredentials)
    .values({
      clientId: input.clientId,
      username,
      passwordHash: hashed.hash,
      passwordSalt: hashed.salt,
      iterations: hashed.iterations,
      createdAt: now,
      updatedAt: now,
      rotatedBy: rotator,
    })
    .onConflictDoUpdate({
      target: clientCredentials.clientId,
      set: {
        username,
        passwordHash: hashed.hash,
        passwordSalt: hashed.salt,
        iterations: hashed.iterations,
        updatedAt: now,
        rotatedBy: rotator,
      },
    });

  return { ok: true };
}

/**
 * Remove a client's DB-backed credentials. Falls back to env if env still set.
 */
export async function clearClientCredentials(
  clientId: ClientId
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  if (!CLIENT_IDS.includes(clientId)) {
    return { ok: false, error: `Unknown clientId: ${clientId}` };
  }
  await db.delete(clientCredentials).where(eq(clientCredentials.clientId, clientId));
  return { ok: true };
}

// Suppress unused-import warning when CLIENTS isn't directly referenced
// in some build modes (it is via type narrowing).
void CLIENTS;
