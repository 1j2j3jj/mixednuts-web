#!/usr/bin/env node
/**
 * seo-postbuild-check.mjs — `next build` が出力した静的 HTML を直接読む SEO 回帰チェック。
 *
 * scripts/seo-audit.mjs は起動中のサーバに HTTP で当てる監査。こちらはサーバ不要で
 * `.next/server/app/**.html` を走査し、CI / ローカルの build 直後に回せる assertion に絞る。
 *
 * 検査項目:
 *  1. 1 ページ 1 H1
 *  2. <title> の重複なし（ブランドサフィックスの二重付与もここで落ちる）
 *  3. meta description が存在し、ページ間で重複しない
 *  4. canonical が存在し、og:url と一致する（OG パリティ）
 *  5. og:title / og:description / og:site_name / og:locale / twitter:card が揃っている
 *  6. すべての JSON-LD が JSON として parse できる
 *  7. FAQPage JSON-LD は可視 FAQ があるページにだけ存在する
 *  8. 公開 Insights 記事すべてに Tldr / Answer / FAQ / Sources / Article JSON-LD が存在
 *  9. トップページの title / description / 本文に「ミックスナッツ株式会社」が入っている
 * 10. llms.txt（route handler の prerender 出力）の Insights 一覧が公開記事と過不足なく一致する
 *     — `src/app/llms.txt/route.ts` が `publishedPosts` から生成し、build 時に
 *     `.next/server/app/llms.txt.body` へ静的化される（ISR 3600s）。旧 `public/llms.txt`
 *     が残っていると route を覆うので、その存在も NG にする。
 *
 * usage: node scripts/seo-postbuild-check.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, ".next", "server", "app");
const BRAND_JA = "ミックスナッツ株式会社";
// 認証・エラー・プレビュー系は対象外（検索対象ページではない）
const EXCLUDE = /^(_not-found|_global-error|login|beta|switch|dashboard)/;

if (!fs.existsSync(APP_DIR)) {
  console.error("[seo-postbuild-check] .next/server/app が無い。先に `npm run build` を実行すること。");
  process.exit(2);
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const decode = (v = "") =>
  v
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const files = walk(APP_DIR)
  .map((file) => ({
    file,
    route: "/" + path.relative(APP_DIR, file).replace(/\.html$/, "").replace(/^index$/, ""),
  }))
  .filter(({ route }) => !EXCLUDE.test(route.slice(1)))
  .sort((a, b) => a.route.localeCompare(b.route));

const failures = [];
const titles = new Map();
const descriptions = new Map();
const fail = (route, message) => failures.push(`${route} — ${message}`);

const meta = (html, attr, value) => {
  const re = new RegExp(`<meta[^>]+${attr}="${value}"[^>]+content="([^"]*)"`, "i");
  const reReversed = new RegExp(`<meta[^>]+content="([^"]*)"[^>]+${attr}="${value}"`, "i");
  return decode(html.match(re)?.[1] ?? html.match(reReversed)?.[1] ?? "");
};

for (const { file, route } of files) {
  const html = fs.readFileSync(file, "utf8");

  // 1. H1 は 1 ページ 1 つ
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Count !== 1) fail(route, `H1 が ${h1Count} 個（1 個であること）`);

  // 2. title の重複
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  if (!title) fail(route, "title が空");
  else {
    if (titles.has(title)) fail(route, `title が ${titles.get(title)} と重複: "${title}"`);
    else titles.set(title, route);
    // ブランドサフィックスの二重付与
    const brandHits = (title.match(/mixednuts Inc\./g) ?? []).length;
    if (brandHits > 1) fail(route, `title にブランドサフィックスが ${brandHits} 回: "${title}"`);
  }

  // 3. meta description（存在 + 重複なし）
  const description = meta(html, "name", "description");
  if (!description) fail(route, "meta description が空");
  else if (descriptions.has(description))
    fail(route, `description が ${descriptions.get(description)} と重複`);
  else descriptions.set(description, route);

  const isNoindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);

  // 4. canonical と og:url の一致（OG パリティ）
  const canonical = decode(
    html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)?.[1] ?? "",
  );
  const ogUrl = meta(html, "property", "og:url");
  if (!isNoindex) {
    if (!canonical) fail(route, "canonical が無い");
    if (!ogUrl) fail(route, "og:url が無い");
    if (canonical && ogUrl && canonical !== ogUrl)
      fail(route, `canonical (${canonical}) と og:url (${ogUrl}) が不一致`);
  }

  // 5. OG / Twitter の必須フィールド
  for (const [attr, key] of [
    ["property", "og:title"],
    ["property", "og:description"],
    ["property", "og:site_name"],
    ["property", "og:locale"],
    ["property", "og:image"],
    ["name", "twitter:card"],
    ["name", "twitter:title"],
  ]) {
    if (!meta(html, attr, key)) fail(route, `${key} が無い`);
  }
  const ogLocale = meta(html, "property", "og:locale");
  if (ogLocale && ogLocale !== "ja_JP") fail(route, `og:locale が ja_JP でない: ${ogLocale}`);

  // 6. JSON-LD が parse できる
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  blocks.forEach((block, index) => {
    const body = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      JSON.parse(body);
    } catch (error) {
      fail(route, `JSON-LD #${index + 1} が parse 不能: ${error.message}`);
    }
  });
  if (blocks.length === 0) fail(route, "JSON-LD が 0 件");

  // 7. FAQPage JSON-LD は可視 FAQ があるページにだけ置く
  const hasVisibleFaq = /id="faq"|>\s*FAQ\s*<|よくある質問/i.test(html);
  const hasFaqSchema = /"@type":"FAQPage"/.test(html);
  if (hasFaqSchema && !hasVisibleFaq)
    fail(route, "FAQPage JSON-LD があるのに可視 FAQ が無い（不可視 FAQ は Google 非対応）");

  // 8. 公開記事は Tldr / Answer / FAQ / Sources / Article schema が揃っている
  if (route.startsWith("/insights/") && !route.startsWith("/insights/tag/")) {
    if (!/class="[^"]*\btldr\b/i.test(html)) fail(route, "Tldr ブロックが無い");
    if (!/class="[^"]*answer-block/i.test(html)) fail(route, "Answer ブロックが無い");
    if (!/class="[^"]*stat-callout/i.test(html)) fail(route, "Stat ブロックが無い");
    if (!hasVisibleFaq) fail(route, "可視 FAQ 見出しが無い");
    if (!/id="sources"/i.test(html)) fail(route, "#sources アンカーが無い");
    if (!hasFaqSchema) fail(route, "FAQPage JSON-LD が無い");
    if (!/"@type":"Article"/.test(html)) fail(route, "Article JSON-LD が無い");
    if (!/"dateModified":"/.test(html)) fail(route, "Article.dateModified が無い");
  }

  // 9. トップページの和文社名
  if (route === "/") {
    const description = decode(
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ?? "",
    );
    const body = decode(
      (html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    );
    if (!title.includes(BRAND_JA)) fail(route, `title に「${BRAND_JA}」が無い`);
    if (!description.includes(BRAND_JA)) fail(route, `description に「${BRAND_JA}」が無い`);
    if (!body.includes(BRAND_JA)) fail(route, `本文に「${BRAND_JA}」が無い`);
  }
}

// 10. llms.txt（route handler の prerender 出力）が公開記事一覧と一致しているか
//     route.ts は build 時に静的化され、`.next/server/app/llms.txt.body`（本文）と
//     `.next/server/app/llms.txt.meta`（status / headers）に落ちる。dynamic 化されて
//     .body が無い場合は「予約公開に追随しない静的ファイル」へ戻す回帰なので NG。
const LLMS_LABEL = "llms.txt";
const llmsBodyPath = path.join(APP_DIR, "llms.txt.body");
const legacyLlmsPath = path.join(ROOT, "public", "llms.txt");
if (fs.existsSync(legacyLlmsPath)) {
  failures.push(
    `${LLMS_LABEL} — public/llms.txt が残っている（静的ファイルが src/app/llms.txt/route.ts を覆う。git rm すること）`,
  );
}
if (!fs.existsSync(llmsBodyPath)) {
  failures.push(
    `${LLMS_LABEL} — .next/server/app/llms.txt.body が無い（src/app/llms.txt/route.ts が prerender されていない。dynamic API を使っていないか / revalidate を確認）`,
  );
} else {
  const llms = fs.readFileSync(llmsBodyPath, "utf8");
  const metaPath = path.join(APP_DIR, "llms.txt.meta");
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      if (meta.status && meta.status !== 200)
        failures.push(`${LLMS_LABEL} — status が ${meta.status}（200 であること）`);
      const contentType = meta.headers?.["content-type"] ?? "";
      if (!/^text\/plain/i.test(contentType))
        failures.push(`${LLMS_LABEL} — content-type が text/plain でない: "${contentType}"`);
    } catch (error) {
      failures.push(`${LLMS_LABEL} — llms.txt.meta が parse 不能: ${error.message}`);
    }
  }
  const articleRoutes = files
    .map(({ route }) => route)
    .filter((route) => route.startsWith("/insights/") && !route.startsWith("/insights/tag/"));
  for (const route of articleRoutes) {
    if (!llms.includes(`https://mixednuts-inc.com${route}`))
      failures.push(`${LLMS_LABEL} — 公開記事 ${route} が未掲載`);
  }
  const listed = Array.from(llms.matchAll(/https:\/\/mixednuts-inc\.com(\/insights\/[^)\s]+)\)/g)).map(
    (match) => match[1],
  );
  for (const url of listed) {
    if (!articleRoutes.includes(url))
      failures.push(`${LLMS_LABEL} — 非公開 or 存在しない記事 ${url} が掲載されている`);
  }
  const countMatch = llms.match(/公開記事 (\d+) 本/);
  if (!countMatch) failures.push(`${LLMS_LABEL} — 「公開記事 N 本」の行が無い`);
  else if (Number(countMatch[1]) !== listed.length)
    failures.push(
      `${LLMS_LABEL} — 「公開記事 ${countMatch[1]} 本」と掲載行数 ${listed.length} が不一致`,
    );
  if (!llms.includes(BRAND_JA)) failures.push(`${LLMS_LABEL} — 「${BRAND_JA}」が無い`);
}

console.log(`[seo-postbuild-check] 走査 ${files.length} ページ / ユニーク title ${titles.size} 件`);
if (failures.length > 0) {
  console.error(`\n[seo-postbuild-check] NG ${failures.length} 件:`);
  for (const line of failures) console.error(`  - ${line}`);
  process.exit(1);
}
console.log("[seo-postbuild-check] OK — 全チェック通過");
