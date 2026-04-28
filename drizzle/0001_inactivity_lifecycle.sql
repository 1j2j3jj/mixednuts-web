-- Migration 0001: inactivity-based membership lifecycle
-- 2026-04-28
--
-- Adds:
--   user.last_login_at  — tracks last successful authentication. Updated
--                         by /login/success, /api/auth/accept-invitation,
--                         /api/auth/login routes.
--   member.blocked_at   — when set, this membership is blocked from access
--                         (role-resolver filters it out). 6mo after this
--                         timestamp, cron physically deletes the row.
--
-- Cron lifecycle (daily, see /api/cron/membership-cleanup):
--   1) user.last_login_at < now()-6mo AND member.blocked_at IS NULL
--      → set member.blocked_at = now() (block dormant memberships).
--   2) member.blocked_at < now()-6mo
--      → DELETE row (physical removal after 6mo of being blocked).
--
-- Admins (ADMIN_EMAILS env) bypass this entirely — checked before DB lookup.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;

ALTER TABLE "member" ADD COLUMN IF NOT EXISTS "blocked_at" timestamp;

-- Backfill last_login_at for existing users so they're not immediately
-- blocked on first cron run. Set to created_at as a conservative initial
-- value (their next real login will update it).
UPDATE "user" SET "last_login_at" = "created_at" WHERE "last_login_at" IS NULL;

-- Index to make the cron's idle-check query fast (filter on last_login_at).
CREATE INDEX IF NOT EXISTS "user_last_login_at_idx" ON "user" ("last_login_at");

-- Index to make the cron's blocked-deletion query fast.
CREATE INDEX IF NOT EXISTS "member_blocked_at_idx" ON "member" ("blocked_at");
