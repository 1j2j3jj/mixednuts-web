import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const previewDir = path.join(root, "preview");
// Turbopack emits compiled CSS under .next/static/chunks/*.css; the webpack
// builder used .next/static/css. Walk .next/static so either layout works.
const cssDir = path.join(root, ".next", "static");

function listCssFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listCssFiles(fullPath) : [fullPath];
    })
    .filter((file) => file.endsWith(".css"))
    .sort();
}

const cssFiles = listCssFiles(cssDir);
if (cssFiles.length === 0) {
  throw new Error(
    "No compiled CSS found under .next/static. Run `npm run build` first.",
  );
}

fs.mkdirSync(previewDir, { recursive: true });
const bundleFile = path.join(previewDir, "preview.js");
await build({
  absWorkingDir: root,
  entryPoints: [path.join(scriptDir, "preview-entry.tsx")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: bundleFile,
  tsconfig: path.join(root, "tsconfig.json"),
});

// Inlined rather than <link>-ed: the compiled CSS lives outside preview/,
// so a static server rooted at preview/ can never resolve a relative href.
// Inlining keeps the artifact self-contained while the component bundle runs
// through the same client-side React/Recharts path as production.
const css = cssFiles
  .map((file) => fs.readFileSync(file, "utf-8"))
  .join("\n");
const html = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Dashboard P1 Preview</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="preview-root"></div>
    <script type="module" src="./preview.js"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(previewDir, "index.html"), html);
console.log(
  `Rendered preview/index.html and preview/preview.js with ${cssFiles.length} compiled stylesheet(s).`,
);
