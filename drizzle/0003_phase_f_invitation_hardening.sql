-- Migration 0003: Phase F invitation/audit hardening
-- 2026-07-25
--
-- ⚠️ NEEDS CEO APPROVAL TO RUN. Do not apply to production without
-- explicit sign-off. Written to keep src/db/schema.ts and the live DB
-- schema coherent for when approval is given; not run by this branch.
--
-- Covers two findings from the Phase F security audit:
--
-- F-3 (invite token hardening):
--   - token_hash: the invite "password" was the plaintext invitation.id,
--     embedded in the accept URL AND stored as the (non-secret-shaped)
--     primary key — readable by anyone with DB read access. This column
--     stores a SHA-256 hash of a newly-introduced, separately-generated
--     raw secret; the raw secret is never persisted, only ever emitted
--     into the accept URL at creation time. Nullable: existing/legacy
--     rows created before this migration keep working via an id-only
--     fallback (see src/lib/invite-token.ts, accept-invitation route.ts)
--     until they naturally expire (max 14 days).
--   - revoked_at: explicit revocation timestamp, distinct from
--     status='cancelled' (which already blocks reuse) — records *when*.
--
-- F-2 (honest email-delivery state):
--   - email_status / email_provider_message_id / email_attempt_count /
--     email_last_attempt_at / email_last_error: previously "sent" status
--     lived ONLY in browser React state (lost on reload, no source of
--     truth server-side) and conflated "Resend accepted the API call"
--     with "delivered". These columns let the invitation row honestly
--     record what we actually know. email_status is constrained to the
--     values current code can assert (accepted/failed/not_configured);
--     'delivered'/'bounced' are reserved for a future Resend webhook
--     (deferred — no webhook exists yet, see Phase F report) and are
--     never written today.
--
-- F-4 (impersonation audit trail):
--   - audit_log.impersonated_org_slug: previously no column recorded
--     whether an audited action happened while impersonating a client;
--     the only signal was targetOrgSlug happening to match, which is
--     indistinguishable from a direct (non-impersonating) admin action
--     against the same org.

ALTER TABLE "invitation"
  ADD COLUMN IF NOT EXISTS "token_hash" text,
  ADD COLUMN IF NOT EXISTS "revoked_at" timestamp,
  ADD COLUMN IF NOT EXISTS "email_status" text,
  ADD COLUMN IF NOT EXISTS "email_provider_message_id" text,
  ADD COLUMN IF NOT EXISTS "email_attempt_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "email_last_attempt_at" timestamp,
  ADD COLUMN IF NOT EXISTS "email_last_error" text;

-- Constrain email_status to known values, but keep it permissive of NULL
-- (pre-migration / not-yet-attempted rows) and forward-compatible with
-- the reserved 'delivered'/'bounced' states a future webhook would write.
ALTER TABLE "invitation"
  ADD CONSTRAINT "invitation_email_status_check"
  CHECK ("email_status" IS NULL OR "email_status" IN ('accepted', 'failed', 'not_configured', 'delivered', 'bounced'));

-- Lookup index: accept-invitation route verifies by (id, token_hash).
CREATE INDEX IF NOT EXISTS "invitation_token_hash_idx" ON "invitation" ("token_hash");

ALTER TABLE "audit_log"
  ADD COLUMN IF NOT EXISTS "impersonated_org_slug" text;
