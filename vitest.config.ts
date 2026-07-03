import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // db/client.ts throws at import time when DATABASE_URL is unset. Provide a
    // dummy DSN so importing the server libs under test only constructs a `pg`
    // Pool (no connection is opened until a query runs, which the tests never do).
    env: {
      DATABASE_URL: "postgresql://u:p@localhost:5432/dummy",
    },
  },
  resolve: {
    alias: [
      // tsconfig "paths": "@/*" -> "./src/*". Mirrored here (no
      // vite-tsconfig-paths dep) so imports like "@/lib/org-role" resolve.
      { find: /^@\/(.*)$/, replacement: r("./src/$1") },
      // Next.js server-marker package — see test/stubs/server-only.ts.
      { find: /^server-only$/, replacement: r("./test/stubs/server-only.ts") },
    ],
  },
});
