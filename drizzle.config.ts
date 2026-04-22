/**
 * Drizzle Kit config — used by `drizzle-kit push` / `drizzle-kit generate`
 * to introspect the Better Auth schema and apply migrations to Neon.
 *
 * The schema lives at src/db/schema.ts. Connection string is pulled from
 * env (Vercel `DATABASE_URL`, Neon-issued).
 */
import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  // Don't throw at import time — Vercel build evaluates this file even
  // when the env var isn't intended to be present (e.g. lint/typecheck
  // in PR previews). Throw at runtime in `dbCredentials` instead.
  console.warn("[drizzle.config] DATABASE_URL not set — drizzle-kit commands will fail");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "",
  },
  verbose: true,
  strict: true,
} satisfies Config;
