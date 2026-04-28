-- Migration 0002: client_credentials table (DB-backed Basic Auth)
-- 2026-04-28
--
-- Replaces env-based CLIENT_AUTH_<ID>="user:pass" with a row per client.
-- verifyCredentials reads DB first, falls back to env for backward compat.
-- Admin UI (/dashboard/admin/clients/[id]) writes here without redeploy.
--
-- Password storage: PBKDF2-SHA256, 100k iterations, per-row random salt.
-- Plaintext never persisted.

CREATE TABLE IF NOT EXISTS "client_credentials" (
  "client_id" text PRIMARY KEY,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "password_salt" text NOT NULL,
  "iterations" integer NOT NULL DEFAULT 100000,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "rotated_by" text
);
