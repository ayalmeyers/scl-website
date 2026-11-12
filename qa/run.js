#!/usr/bin/env node
// Full QA harness for the SCL site: Playwright regression sweep +
// axe-core accessibility audit (+ optional Lighthouse scores), across
// every page at four viewports (390, 768, 1280, 1440). No build step:
// this only reads the static files in the repo root and serves them
// locally.
//
// Per page and viewport: console errors, broken (4xx/5xx) local
// resources, horizontal overflow, cumulative layout shift while
// scrolling through the page (fails above 0.1), axe WCAG 2.0/2.1 A+AA,
// and at phone/tablet widths the menu (opens, closes, no shadow or
// focusable links while closed). Once per page: <title>, meta
// description, favicon link, alt attribute on every <img>, exactly one
// <h1> and no skipped heading levels, and every internal link resolving.
//
// Usage: npm run qa   (equivalent to: node qa/run.js)
// Writes qa/report/report.json (machine-readable) and prints a
// human-readable summary. Exits non-zero if any check fails, including
// any axe violation of impact "serious" or "critical".

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;

const ROOT = path.join(__dirname, "..");
const PORT = 8321;
const BASE = `http://localhost:${PORT}`;
const CHROMIUM_PATH = process.env.QA_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const PAGES = [
  "index.html",
  "who-we-are.html",
  "what-we-do.html",
  "our-clients.html",
  "musings.html",
  "contact.html",
  "managing-virtual-impressions.html",
  "great-leadership.html",
  "learn-to-listen.html",
  "executive-coaching.html",
  "leadership-counsel.html",
  "strategic-communication-consulting.html",
  "privacy.html",
  "404.html"
];

const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: true },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 }
];

// Page-level checks that don't depend on the viewport run once per page
// (at the first viewport): title, meta description, favicon, image alt
// text, heading order, and internal links.
const PAGE_LEVEL_VIEWPORT = VIEWPORTS[0].name;
// Layout shift budget: Google's "good" Core Web Vitals threshold.
const CLS_LIMIT = 0.1;

// Lighthouse is slow (~10-20s/page); run it once per page at desktop
// width rather than once per page per viewport.
function waitForServer(url, attempts) {
  return new Promise((resolve, reject) => {
    const tryOnce = (n) => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (n <= 0) return reject(new Error("server never came up: " + url));
          setTimeout(() => tryOnce(n - 1), 300);
        });
    };
    tryOnce(attempts);
  });
}

async function regressionAndAxe(browser, results) {
  for (const pg of PAGES) {
    results.pages[pg] = results.pages[pg] || {};
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: !!vp.mobile,
        hasTouch: !!vp.mobile
      });
      const page = await context.newPage();
      // Cumulative layout shift, recorded from first paint, ignoring
      // shifts within 500ms of user input (scrolling here is programmatic,
      // so shifts while scrolling still count).
      await page.addInitScript(() => {
        window.__cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (!e.hadRecentInput) window.__cls += e.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch (e) {}
      });
      const consoleErrors = [];
      const brokenResources = [];
      page.on("pageerror", (e) => consoleErrors.push(String(e)));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("response", (res) => {
        if (res.status() >= 400 && res.url().startsWith(BASE)) {
          brokenResources.push(`${res.status()} ${res.url()}`);
        }
      });

      await page.goto(`${BASE}/${pg}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(250);
      const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      // Scroll-reveal (.reveal) elements fade in over a 0.9s CSS
      // transition (plus up to a 0.34s stagger delay) once an
      // IntersectionObserver marks them visible. Pausing only 40ms
      // between scroll steps caught them mid-fade, which axe then
      // (correctly, for that instant) reported as low color contrast —
      // a false positive from an animation in progress, not a real
      // steady-state contrast bug. Wait long enough per step, and
      // settle at the bottom, for every transition to finish before
      // the accessibility snapshot below.
      for (let f = 0; f <= 1; f += 0.2) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), f * scrollHeight);
        await page.waitForTimeout(260);
      }
      await page.waitForTimeout(1300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      );

      const cls = await page.evaluate(() => window.__cls || 0);

      // Phone menu: opens, closes, and casts nothing while closed.
      let menu = null;
      if (vp.width <= 860 && (await page.$(".nav-toggle"))) {
        menu = await page.evaluate(async () => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          const links = document.querySelector(".nav-links");
          const toggle = document.querySelector(".nav-toggle");
          if (getComputedStyle(toggle).display === "none") return { skipped: true };
          window.scrollTo(0, 0);
          const closedShadow = getComputedStyle(links).boxShadow;
          const closedVisible = getComputedStyle(links).visibility;
          toggle.click();
          await wait(600);
          const r = links.getBoundingClientRect();
          const opened = links.classList.contains("is-open") && r.left < window.innerWidth && getComputedStyle(links).visibility === "visible";
          const expandedOpen = toggle.getAttribute("aria-expanded");
          toggle.click();
          await wait(600);
          const closed = !links.classList.contains("is-open") && getComputedStyle(links).visibility === "hidden";
          return { closedShadow, closedVisible, opened, expandedOpen, closed };
        });
      }

      let pageLevel = null;
      if (vp.name === PAGE_LEVEL_VIEWPORT) {
        pageLevel = await page.evaluate(() => {
          const title = (document.title || "").trim();
          const descEl = document.querySelector('meta[name="description"]');
          const description = descEl ? (descEl.getAttribute("content") || "").trim() : "";
          const favicon = !!document.querySelector('link[rel~="icon"]');
          const imgsMissingAlt = [...document.querySelectorAll("img")]
            .filter((i) => !i.hasAttribute("alt"))
            .map((i) => i.getAttribute("src"));
          const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => {
            // Skip headings in closed dialogs/hidden sections: they are not
            // in the page outline until shown.
            return !h.closest("dialog:not([open]), [hidden], noscript");
          });
          const levels = headings.map((h) => Number(h.tagName[1]));
          const h1Count = levels.filter((l) => l === 1).length;
          const skips = [];
          for (let i = 1; i < levels.length; i++) {
            if (levels[i] > levels[i - 1] + 1) {
              skips.push(`h${levels[i - 1]} -> h${levels[i]} ("${headings[i].textContent.trim().slice(0, 40)}")`);
            }
          }
          if (levels.length && levels[0] !== 1) skips.unshift(`first heading is h${levels[0]}`);
          const internalLinks = [...document.querySelectorAll("a[href]")]
            .map((a) => a.href)
            .filter((h) => h.startsWith(location.origin))
            .map((h) => h.split("#")[0]);
          return { title, description, favicon, imgsMissingAlt, h1Count, skips, internalLinks: [...new Set(internalLinks)] };
        });
        const brokenLinks = [];
        for (const href of pageLevel.internalLinks) {
          const status = await new Promise((resolve) => {
            http.get(href, (res) => { res.resume(); resolve(res.statusCode); }).on("error", () => resolve(0));
          });
          if (status >= 400 || status === 0) brokenLinks.push(`${status} ${href}`);
        }
        pageLevel.brokenLinks = brokenLinks;
        delete pageLevel.internalLinks;
      }

      let axeViolations = [];
      {
        const axeResults = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        axeViolations = axeResults.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
          targets: v.nodes.slice(0, 6).map((n) => n.target.join(" "))
        }));
      }

      results.pages[pg][vp.name] = {
        consoleErrors,
        brokenResources: [...new Set(brokenResources)],
        overflow,
        cls: Math.round(cls * 1000) / 1000,
        menu,
        pageLevel,
        axeViolations
      };

      await context.close();
    }
  }
}

async function lighthouseAudit(results) {
  // Dynamic import: lighthouse is ESM-only in v13.
  const lighthouse = (await import("lighthouse")).default;
  const chromeLauncher = await import("chrome-launcher");

  const chrome = await chromeLauncher.launch({
    chromePath: CHROMIUM_PATH,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"]
  });

  try {
    for (const pg of PAGES) {
      const runnerResult = await lighthouse(`${BASE}/${pg}`, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
      });
      const cats = runnerResult.lhr.categories;
      results.pages[pg] = results.pages[pg] || {};
      results.pages[pg].lighthouse = {
        performance: Math.round(cats.performance.score * 100),
        accessibility: Math.round(cats.accessibility.score * 100),
        bestPractices: Math.round(cats["best-practices"].score * 100),
        seo: Math.round(cats.seo.score * 100)
      };
    }
  } finally {
    await chrome.kill();
  }
}

function printSummary(results) {
  console.log("\n=== QA summary ===\n");
  let failed = false;

  for (const pg of PAGES) {
    const p = results.pages[pg];
    const lh = p.lighthouse
      ? `perf ${p.lighthouse.performance} / a11y ${p.lighthouse.accessibility} / best-practices ${p.lighthouse.bestPractices} / seo ${p.lighthouse.seo}`
      : "lighthouse: n/a";
    console.log(`${pg}  (${lh})`);

    for (const vp of VIEWPORTS) {
      const r = p[vp.name];
      if (!r) continue;
      const bad = [];
      if (r.consoleErrors.length) bad.push(`console: ${r.consoleErrors.join(" | ")}`);
      if (r.brokenResources.length) bad.push(`broken: ${r.brokenResources.join(" | ")}`);
      if (r.overflow) bad.push("horizontal overflow");
      if (r.cls > CLS_LIMIT) bad.push(`layout shift CLS ${r.cls}`);
      if (r.menu && !r.menu.skipped) {
        if (r.menu.closedShadow !== "none") bad.push("closed menu casts a shadow");
        if (r.menu.closedVisible !== "hidden") bad.push("closed menu links reachable");
        if (!r.menu.opened || r.menu.expandedOpen !== "true") bad.push("menu did not open");
        if (!r.menu.closed) bad.push("menu did not close");
      }
      if (r.pageLevel) {
        const pl = r.pageLevel;
        if (!pl.title) bad.push("missing <title>");
        if (!pl.description) bad.push("missing meta description");
        if (!pl.favicon) bad.push("missing favicon link");
        if (pl.imgsMissingAlt.length) bad.push("img without alt: " + pl.imgsMissingAlt.join(", "));
        if (pl.h1Count !== 1) bad.push(`${pl.h1Count} <h1> elements`);
        if (pl.skips.length) bad.push("heading order: " + pl.skips.join("; "));
        if (pl.brokenLinks.length) bad.push("broken links: " + pl.brokenLinks.join(" | "));
      }
      const seriousAxe = r.axeViolations.filter((v) => v.impact === "serious" || v.impact === "critical");
      if (seriousAxe.length) {
        bad.push(
          "axe (" +
            seriousAxe.map((v) => `${v.id} [${v.impact}] x${v.nodes}`).join(", ") +
            ")"
        );
      }
      const minorAxe = r.axeViolations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
      if (bad.length) {
        failed = true;
        console.log(`  ${vp.name}: FAIL — ${bad.join("; ")}`);
      } else if (minorAxe.length) {
        console.log(`  ${vp.name}: ok (minor axe: ${minorAxe.map((v) => v.id).join(", ")})`);
      } else {
        console.log(`  ${vp.name}: ok`);
      }
    }
  }

  console.log(failed ? "\nRESULT: FAIL — see above\n" : "\nRESULT: PASS\n");
  return failed;
}

async function main() {
  // Lighthouse launches its own Chrome (separately from the Playwright
  // instance used for the rest of this harness) and that launch reaches
  // out to a handful of Google hosts (component update checks, etc.)
  // during startup. In a sandboxed environment whose egress proxy blocks
  // those hosts, that launch hangs rather than failing fast — so
  // Lighthouse is opt-in here (--lighthouse), not on by default. It runs
  // fine in an unrestricted environment (a normal CI runner, a laptop).
  const runLighthouse = process.argv.includes("--lighthouse");

  const server = spawn("python3", ["-m", "http.server", String(PORT)], {
    cwd: ROOT,
    stdio: "ignore"
  });

  try {
    await waitForServer(`${BASE}/index.html`, 30);

    const results = { generatedAt: new Date().toISOString(), pages: {} };

    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    try {
      await regressionAndAxe(browser, results);
    } finally {
      await browser.close();
    }

    if (runLighthouse) {
      await lighthouseAudit(results);
    }

    fs.mkdirSync(path.join(ROOT, "qa", "report"), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, "qa", "report", "report.json"),
      JSON.stringify(results, null, 2)
    );

    const failed = printSummary(results);
    process.exitCode = failed ? 1 : 0;
  } finally {
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
