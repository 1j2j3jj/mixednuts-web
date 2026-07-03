// Vitest stub for the `server-only` marker package.
//
// `import "server-only"` resolves at runtime to a Next.js-provided module that
// throws if imported from a client bundle. Under the vitest node environment
// there is no bundler boundary, so we alias it to this empty module (see
// vitest.config.ts `resolve.alias`) purely so that server-lib files under test
// (org-role.ts, sources/bq-rpt.ts) import cleanly.
export {};
