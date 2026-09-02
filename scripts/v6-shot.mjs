import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

function readArgs(argv) {
  const args = {
    url: "http://localhost:3600/",
    out: ".shots/top",
    width: 1440,
    scrolls: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
    reducedMotion: false,
    showCookieBanner: false,
    settle: 1400,
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
    else if (value === "--show-cookie-banner") args.showCookieBanner = true;
    else if (value === "--settle") args.settle = Number(argv[++index]);
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

async function resolveChromiumExecutable() {
  const defaultPath = chromium.executablePath();
  try {
    await fs.access(defaultPath);
    return defaultPath;
  } catch {
    const cacheRoot = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
    const entries = await fs.readdir(cacheRoot).catch(() => []);
    const candidates = entries
      .filter((entry) => entry.startsWith("chromium"))
      .sort((a, b) => {
        const headlessOrder = Number(b.startsWith("chromium_headless_shell")) - Number(a.startsWith("chromium_headless_shell"));
        return headlessOrder || b.localeCompare(a, undefined, { numeric: true });
      })
      .flatMap((entry) => [
        path.join(cacheRoot, entry, "chrome-headless-shell-mac-arm64", "chrome-headless-shell"),
        path.join(cacheRoot, entry, "chrome-headless-shell-mac", "chrome-headless-shell"),
        path.join(cacheRoot, entry, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
        path.join(cacheRoot, entry, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
      ]);
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {}
    }
    throw new Error(`No installed Chromium executable found. Expected ${defaultPath}`);
  }
}

const browser = await chromium.launch({
  headless: true,
  executablePath: await resolveChromiumExecutable(),
  args: ["--single-process", "--no-zygote"],
});
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
  localStorage.setItem("mn_cookie_consent", JSON.stringify({ value: "essential-only", ts: Date.now() }));
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

// Pre-set cookie consent so the CookieBanner (localStorage key
// `mn_cookie_consent`) does not occlude every frame; pass
// --show-cookie-banner to audit the banner itself.
if (!args.showCookieBanner) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        "mn_cookie_consent",
        JSON.stringify({ value: "essential-only", ts: Date.now() }),
      );
    } catch {}
  });
}
await page.goto(args.url, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(args.settle);
const initialMetrics = await page.evaluate(() => ({
  lcpMs: Math.round(window.__v6Metrics?.lcp || 0),
  cls: Number((window.__v6Metrics?.cls || 0).toFixed(4)),
}));

const stem = `${args.width}${args.reducedMotion ? "-reduced" : ""}`;
const contrastSamples = [];

function channelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]) {
  return 0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

for (const fraction of args.scrolls) {
  await page.evaluate((scrollFraction) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: maximum * scrollFraction, behavior: "instant" });
  }, fraction);
  await page.waitForTimeout(args.settle);
  const label = String(Math.round(fraction * 100)).padStart(3, "0");
  const contrastTargets = await page.evaluate(() => {
    const parseColor = (value) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { rgb: parts.slice(0, 3), alpha: Number.isFinite(parts[3]) ? parts[3] : 1 };
    };
    return [...document.querySelectorAll("[data-v6-contrast]")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const color = parseColor(style.color);
        const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          (typeof element.checkVisibility === "function"
            ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
            : Number(style.opacity) >= 0.5 && style.visibility !== "hidden");
        if (!visible || !color) return null;
        return {
          text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 100),
          kind: element.dataset.v6Contrast,
          threshold: element.dataset.v6Contrast === "body" ? 4.5 : 3,
          x: Math.min(innerWidth - 1, Math.max(0, Math.round(rect.left + rect.width / 2))),
          y: Math.min(innerHeight - 1, Math.max(0, Math.round(rect.top + rect.height / 2))),
          color,
        };
      })
      .filter(Boolean);
  });
  const screenshotBuffer = await page.screenshot({
    path: path.join(args.out, `${stem}-scroll-${label}.png`),
    fullPage: args.full,
  });
  if (contrastTargets.length && !args.full) {
    await page.evaluate(() => {
      for (const [index, element] of [...document.querySelectorAll("[data-v6-contrast]")].entries()) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const visible = rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth &&
          (typeof element.checkVisibility === "function"
            ? element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
            : Number(style.opacity) >= 0.5 && style.visibility !== "hidden");
        if (!visible) continue;
        for (const [trackedIndex, trackedElement] of [element, ...element.querySelectorAll("*")].entries()) {
          trackedElement.dataset.v6AuditStyle = trackedElement.getAttribute("style") ?? "__none__";
          trackedElement.dataset.v6AuditNode = `${index}-${trackedIndex}`;
          trackedElement.style.setProperty("color", "transparent", "important");
          trackedElement.style.setProperty("text-shadow", "none", "important");
        }
      }
    });
    const backgroundBuffer = await page.screenshot();
    const { data, info } = await sharp(backgroundBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const target of contrastTargets) {
      const pixelOffset = (target.y * info.width + target.x) * info.channels;
      const background = [data[pixelOffset], data[pixelOffset + 1], data[pixelOffset + 2]];
      const foreground = target.color.rgb.map((channel, index) => Math.round(channel * target.color.alpha + background[index] * (1 - target.color.alpha)));
      const ratio = contrastRatio(foreground, background);
      contrastSamples.push({
        fraction,
        text: target.text,
        kind: target.kind,
        foreground,
        background,
        ratio: Number(ratio.toFixed(2)),
        threshold: target.threshold,
        pass: ratio >= target.threshold,
      });
    }
  }
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("[data-v6-audit-style]")) {
      const previousStyle = element.dataset.v6AuditStyle;
      if (previousStyle === "__none__") element.removeAttribute("style");
      else element.setAttribute("style", previousStyle);
      delete element.dataset.v6AuditStyle;
      delete element.dataset.v6AuditNode;
    }
  });
  void screenshotBuffer;
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
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    wrapIssues,
  };
});
audit.lcpMs = initialMetrics.lcpMs;
audit.cls = initialMetrics.cls;
audit.contrast = {
  samples: contrastSamples,
  failures: contrastSamples.filter((sample) => !sample.pass),
};

console.log(JSON.stringify({
  url: args.url,
  viewport: { width: args.width, height },
  reducedMotion: args.reducedMotion,
  screenshots: args.scrolls.length,
  console: consoleMessages,
  audit,
}, null, 2));

await browser.close();
if (audit.contrast.failures.length) process.exitCode = 1;
