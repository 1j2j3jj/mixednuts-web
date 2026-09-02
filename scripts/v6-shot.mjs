import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

function readArgs(argv) {
  const args = {
    url: "http://localhost:3600/",
    out: ".shots/top",
    width: 1440,
    scrolls: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
    reducedMotion: false,
    full: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--url") args.url = argv[++index];
    else if (value === "--out") args.out = argv[++index];
    else if (value === "--width") args.width = Number(argv[++index]);
    else if (value === "--scrolls") args.scrolls = argv[++index].split(",").map(Number);
    else if (value === "--reduced-motion") args.reducedMotion = true;
    else if (value === "--full") args.full = true;
  }
  if (!Number.isFinite(args.width) || args.width < 320) throw new Error("--width must be at least 320");
  if (args.scrolls.some((fraction) => !Number.isFinite(fraction) || fraction < 0 || fraction > 1)) {
    throw new Error("--scrolls must be comma-separated fractions from 0 to 1");
  }
  return args;
}

const args = readArgs(process.argv.slice(2));
const height = args.width <= 500 ? 844 : 900;
await fs.mkdir(args.out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: args.width, height },
  deviceScaleFactor: 1,
  reducedMotion: args.reducedMotion ? "reduce" : "no-preference",
});
const page = await context.newPage();
page.setDefaultNavigationTimeout(90_000);
page.setDefaultTimeout(90_000);

const consoleMessages = [];
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    consoleMessages.push({ type: message.type(), text: message.text() });
  }
});
page.on("pageerror", (error) => consoleMessages.push({ type: "error", text: error.message }));

await page.addInitScript(() => {
  window.__v6Metrics = { lcp: 0, cls: 0 };
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const last = entries.at(-1);
    if (last) window.__v6Metrics.lcp = last.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) window.__v6Metrics.cls += entry.value;
    }
  }).observe({ type: "layout-shift", buffered: true });
});

await page.goto(args.url, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(1_400);

const stem = `${args.width}${args.reducedMotion ? "-reduced" : ""}`;
for (const fraction of args.scrolls) {
  await page.evaluate((scrollFraction) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: maximum * scrollFraction, behavior: "instant" });
  }, fraction);
  await page.waitForTimeout(1_400);
  const label = String(Math.round(fraction * 100)).padStart(3, "0");
  await page.screenshot({
    path: path.join(args.out, `${stem}-scroll-${label}.png`),
    fullPage: args.full,
  });
}

const audit = await page.evaluate(() => {
  const lineTops = (element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const tops = [];
    let textNode = walker.nextNode();
    while (textNode) {
      if (textNode.textContent?.trim()) {
        const range = document.createRange();
        range.selectNodeContents(textNode);
        for (const rect of range.getClientRects()) {
          if (rect.width && rect.height) tops.push(Math.round(rect.top * 2) / 2);
        }
      }
      textNode = walker.nextNode();
    }
    return [...new Set(tops)].length;
  };
  const wrapIssues = [...document.querySelectorAll("h1, h2, h3, button, a.v6-button")]
    .map((element) => {
      const explicitBreaks = element.querySelectorAll("br").length;
      const renderedLines = lineTops(element);
      return {
        element: element.tagName.toLowerCase(),
        text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 120),
        renderedLines,
        allowedLines: explicitBreaks + 1,
      };
    })
    .filter((item) => item.renderedLines > item.allowedLines);
  return {
    lcpMs: Math.round(window.__v6Metrics?.lcp || 0),
    cls: Number((window.__v6Metrics?.cls || 0).toFixed(4)),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    wrapIssues,
  };
});

console.log(JSON.stringify({
  url: args.url,
  viewport: { width: args.width, height },
  reducedMotion: args.reducedMotion,
  screenshots: args.scrolls.length,
  console: consoleMessages,
  audit,
}, null, 2));

await browser.close();
