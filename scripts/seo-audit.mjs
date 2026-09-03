#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const base = getArg("--base", "http://localhost:3700").replace(/\/$/, "");
const output = getArg("-o", ".seo-audit/report.json");
const productionOrigin = "https://mixednuts-inc.com";
const forbidden = ["120+", "120体", "120 体", "戦略ファーム", "300億", "経営企画責任者", "戦略コンサルティング →"];
const staticNoindex = ["/login", "/beta"];
const missingRoute = "/__seo_audit_missing_page__";

function decode(value = "") {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
function stripTags(value = "") {
  return decode(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)')`, "i"));
  return decode(match?.[1] ?? match?.[2] ?? "");
}
function meta(html, key, value) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const found = tags.find((tag) => attr(tag, key).toLowerCase() === value.toLowerCase());
  return found ? attr(found, "content") : "";
}
function link(html, rel) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const found = tags.find((tag) => attr(tag, "rel").split(/\s+/).includes(rel));
  return found ? attr(found, "href") : "";
}
function normalizeUrl(value) {
  try {
    const url = new URL(value);
    const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.origin}${pathname}${url.search}`;
  } catch {
    return value;
  }
}
function schemaNodes(value, nodes = []) {
  if (Array.isArray(value)) {
    for (const item of value) schemaNodes(item, nodes);
    return nodes;
  }
  if (!value || typeof value !== "object") return nodes;
  if (value["@type"]) nodes.push(value);
  if (Array.isArray(value["@graph"])) schemaNodes(value["@graph"], nodes);
  for (const [key, child] of Object.entries(value)) {
    if (key === "@graph") continue;
    if (child && typeof child === "object") schemaNodes(child, nodes);
  }
  return nodes;
}
function typesOf(node) {
  return Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]].filter(Boolean);
}
function hasFields(node, fields) {
  return fields.filter((field) => node?.[field] === undefined || node?.[field] === null || node?.[field] === "");
}

let content = [];
try {
  ({ posts: content } = await import("../.velite/index.js"));
} catch {
  console.error("Unable to load .velite content. Run npm run prebuild first.");
  process.exit(1);
}
const published = content.filter((post) => !post.hidden);
const tagCounts = new Map();
for (const post of published) for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
const noindexTags = [...tagCounts].filter(([, count]) => count === 1).map(([tag]) => `/insights/tag/${encodeURIComponent(tag)}`);

const sitemapResponse = await fetch(`${base}/sitemap.xml`);
if (!sitemapResponse.ok) throw new Error(`sitemap.xml returned ${sitemapResponse.status}`);
const sitemapXml = await sitemapResponse.text();
const sitemapRoutes = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(decode(match[1])).pathname);
const noindexRoutes = [...staticNoindex, ...noindexTags];
const routes = [...new Set([...sitemapRoutes, ...noindexRoutes, missingRoute])];
const results = [];
const titles = new Map();
const descriptions = new Map();

for (const route of routes) {
  const requestedUrl = `${base}${route}`;
  const response = await fetch(requestedUrl, { redirect: "follow" });
  const html = await response.text();
  const renderedHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const issues = [];
  const is404 = route === missingRoute;
  const shouldNoindex = noindexRoutes.includes(route) || is404;
  const expectedStatus = is404 ? 404 : 200;
  if (response.status !== expectedStatus) issues.push(`status ${response.status}, expected ${expectedStatus}`);

  const titleMatches = [...html.matchAll(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/gi)];
  const title = stripTags(titleMatches[0]?.[1] ?? "");
  if (titleMatches.length !== 1) issues.push(`title count ${titleMatches.length}`);
  if (!title) issues.push("empty title");
  if (title.length > 60) issues.push(`title too long (${title.length})`);
  if (!title.endsWith(" | mixednuts Inc.")) issues.push("brand suffix missing or incorrect");
  if ((title.match(/\| mixednuts Inc\./g) ?? []).length !== 1) issues.push("brand suffix count is not 1");
  if (titles.has(title)) issues.push(`duplicate title with ${titles.get(title)}`); else titles.set(title, route);

  const description = meta(html, "name", "description");
  if (!is404) {
    if (!description) issues.push("missing meta description");
    if (description.length < 80 || description.length > 120) issues.push(`description length ${description.length}`);
    if (descriptions.has(description)) issues.push(`duplicate description with ${descriptions.get(description)}`); else descriptions.set(description, route);
  }

  const canonical = link(html, "canonical");
  if (!is404) {
    const expectedCanonical = normalizeUrl(`${productionOrigin}${route === "/" ? "" : route}`);
    if (!canonical) issues.push("missing canonical");
    else if (!/^https?:\/\//.test(canonical)) issues.push("canonical is not absolute");
    else if (normalizeUrl(canonical) !== expectedCanonical) issues.push(`canonical mismatch (${canonical})`);
  }

  if (!is404) {
    const requiredOg = [["property", "og:title"], ["property", "og:description"], ["property", "og:url"], ["property", "og:image"], ["property", "og:site_name"], ["property", "og:locale"], ["name", "twitter:card"]];
    for (const [key, value] of requiredOg) if (!meta(html, key, value)) issues.push(`missing ${value}`);
  }

  const robots = meta(html, "name", "robots").toLowerCase();
  const emitsNoindex = robots.split(/[ ,]+/).includes("noindex");
  if (shouldNoindex && !emitsNoindex) issues.push("missing robots noindex");
  if (!shouldNoindex && emitsNoindex) issues.push("unexpected robots noindex");

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  if (attr(htmlTag, "lang") !== "ja") issues.push("html lang is not ja");
  const h1Matches = [...html.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi)];
  if (h1Matches.length !== 1) issues.push(`h1 count ${h1Matches.length}`);
  const h1Tag = h1Matches[0] ? `<h1 ${h1Matches[0][1]}>` : "";
  const h1Name = attr(h1Tag, "aria-label") || stripTags(h1Matches[0]?.[2] ?? "");
  if (!h1Name) issues.push("empty h1 accessible name");
  if (!stripTags(h1Matches[0]?.[2] ?? "")) issues.push("empty h1 textContent");

  const mainMatches = [...renderedHtml.matchAll(/<main\b[^>]*>[\s\S]*?<\/main>/gi)];
  if (mainMatches.length !== 1) issues.push(`main count ${mainMatches.length}`);
  const headings = mainMatches[0]
    ? [...mainMatches[0][0].matchAll(/<h([1-6])\b[^>]*>[\s\S]*?<\/h\1>/gi)].map((match) => Number(match[1]))
    : [];
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index] > headings[index - 1] + 1) {
      issues.push(`heading level skip h${headings[index - 1]} to h${headings[index]}`);
      break;
    }
  }

  const anchors = [...renderedHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  if (anchors.some((match) => !stripTags(match[2]) && !/aria-label=/i.test(match[1]))) issues.push("empty anchor");
  if (anchors.some((match) => /href=(?:"https?:\/\/|'https?:\/\/)/i.test(match[1]) && !/rel=(?:"[^"]*noopener|'[^']*noopener)/i.test(match[1]))) issues.push("external link missing noopener");
  if (!/href=(?:"\/legal"|'\/legal')/i.test(renderedHtml) || !/href=(?:"\/privacy"|'\/privacy')/i.test(renderedHtml)) issues.push("footer legal/privacy links missing");
  if (!is404 && !shouldNoindex && route !== "/" && !/<nav\b[^>]*aria-label=(?:"パンくずリスト"|'パンくずリスト')[^>]*>[\s\S]*?<ol\b/i.test(renderedHtml)) issues.push("semantic breadcrumb nav missing");

  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = images.filter((tag) => !/\salt=(?:"[^"]*"|'[^']*')/i.test(tag));
  if (imagesWithoutAlt.length) issues.push(`${imagesWithoutAlt.length} img without alt`);

  const blocks = [...html.matchAll(/<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonValues = [];
  for (const block of blocks) {
    try { jsonValues.push(JSON.parse(block[1])); } catch (error) { issues.push(`invalid JSON-LD: ${error.message}`); }
  }
  const nodes = jsonValues.flatMap((value) => schemaNodes(value));
  const schemaTypes = [...new Set(nodes.flatMap(typesOf))].filter(Boolean);
  const organizationCount = nodes.filter((node) => typesOf(node).includes("Organization")).length;
  const websiteCount = nodes.filter((node) => typesOf(node).includes("WebSite")).length;
  if (organizationCount !== 1) issues.push(`Organization count ${organizationCount}`);
  if (websiteCount !== 1) issues.push(`WebSite count ${websiteCount}`);
  if (!is404 && !shouldNoindex && route !== "/" && !schemaTypes.includes("BreadcrumbList")) issues.push("missing BreadcrumbList");

  for (const node of nodes) {
    const nodeTypes = typesOf(node);
    if (nodeTypes.includes("Article")) {
      const missing = hasFields(node, ["headline", "datePublished", "author", "publisher", "mainEntityOfPage", "image"]);
      if (missing.length) issues.push(`Article missing ${missing.join(",")}`);
      if ((node.headline?.length ?? 0) > 110) issues.push("Article headline over 110 chars");
    }
    if (nodeTypes.includes("Service")) {
      const missing = hasFields(node, ["name", "provider"]);
      if (missing.length) issues.push(`Service missing ${missing.join(",")}`);
    }
    if (nodeTypes.includes("Person")) {
      const missing = hasFields(node, ["name", "jobTitle"]);
      if (missing.length) issues.push(`Person missing ${missing.join(",")}`);
    }
    if (nodeTypes.includes("ItemList")) {
      const elements = node.itemListElement;
      if (!Array.isArray(elements) || elements.length < 1) issues.push("ItemList has no elements");
      else if (elements.some((item) => !item?.url && !item?.item?.url && !item?.item)) issues.push("ItemList element missing url");
    }
  }

  for (const phrase of forbidden) if (html.includes(phrase)) issues.push(`forbidden phrase: ${phrase}`);
  const absoluteUrls = html.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
  if (absoluteUrls.some((url) => url.includes("example.com"))) issues.push("example.com absolute URL found");
  if (absoluteUrls.some((url) => /localhost|127\.0\.0\.1/.test(url) && !url.startsWith(base))) issues.push("localhost absolute URL found");

  results.push({ route, status: response.status, title, titleLength: title.length, description, descriptionLength: description.length, canonical, ogType: meta(html, "property", "og:type"), schemaTypes, noindex: emitsNoindex, h1: h1Name, imagesWithoutAlt: imagesWithoutAlt.length, issues });
}

const dashboardLayout = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/app/(dashboard)/layout.tsx"), "utf8");
if (!/robots:\s*\{\s*index:\s*false/.test(dashboardLayout)) results.push({ route: "/dashboard/*", issues: ["dashboard layout lacks noindex metadata"] });

console.log("route | title len | desc len | schema types | h1 | issues");
console.log("--- | ---: | ---: | --- | --- | ---");
for (const result of results) {
  console.log(`${result.route} | ${result.titleLength ?? "-"} | ${result.descriptionLength ?? "-"} | ${(result.schemaTypes ?? []).join(", ")} | ${result.h1 || "-"} | ${(result.issues ?? []).join("; ") || "—"}`);
}
const issueCount = results.reduce((sum, result) => sum + (result.issues?.length ?? 0), 0);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ base, generatedAt: new Date().toISOString(), issueCount, routes: results }, null, 2));
console.log(`\n${results.length} routes audited; ${issueCount} issues. JSON: ${output}`);
process.exitCode = issueCount ? 1 : 0;
