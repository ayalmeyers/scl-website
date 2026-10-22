#!/usr/bin/env node
// Full QA harness for the SCL site: Playwright regression sweep
// (console/network/overflow errors) + axe-core accessibility audit +
// Lighthouse performance/SEO/best-practices scores, across every page
// at three viewports. No build step — this only reads the static
// files in the repo root and serves them locally.
//
// Usage: npm run qa   (equivalent to: node qa/run.js)
// Writes qa/report/report.json (machine-readable) and prints a
// human-readable summary. Exits non-zero if any page has a console
// error, a broken (4xx/5xx) local resource, horizontal overflow, or
// an axe violation of impact "serious" or "critical".

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
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 1280, height: 800 },
  { name: "desktop", width: 1728, height: 1000 }
];

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
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
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

      let axeViolations = [];
      if (vp.name === "desktop") {
        const axeResults = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        axeViolations = axeResults.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length
        }));
      }

      results.pages[pg][vp.name] = {
        consoleErrors,
        brokenResources: [...new Set(brokenResources)],
        overflow,
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
