/**
 * Single Postgres client + Drizzle ORM instance.
 *
 * Uses the `pg` driver against Neon's pooled connection. Neon's serverless
 * pool wakes the project on first query (~300ms cold), then stays warm for
 * subsequent requests in the same Vercel function instance.
 *
 * Vercel function instances are reused across invocations, so we cache
 * the pool on `globalThis` to avoid spawning a new one per request.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "@/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  // Throw at import time on the server — every code path that imports
  // this file requires DB access. Better to fail loud than silent.
  throw new Error("DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __mn_pg_pool: Pool | undefined;
}

const pool =
  globalThis.__mn_pg_pool ??
  new Pool({
    connectionString: url,
    // Neon uses TLS; pg auto-negotiates from the sslmode=require in URL.
    // max=10 (was 5): 6+ concurrent request handlers in one warm function
    // instance were exhausting the pool (監査#11). Still well under Neon's
    // pooled-connection ceiling since we connect via the pooler endpoint.
    max: 10,
    // Release idle sockets after 30s so a traffic burst doesn't pin 10
    // connections on Neon forever; fail fast (10s) when a connection can't
    // be established instead of queueing until the function times out.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Server-side kill switch: no single statement may run >25s (below the
    // function maxDuration so the DB never outlives its request).
    statement_timeout: 25_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__mn_pg_pool = pool;
}

export const db = drizzle(pool, { schema });
