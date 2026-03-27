import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync } from "node:fs";
import process from "node:process";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.FYXVO_SMOKE_BASE_URL ?? "https://www.fyxvo.com";
const PAGES = [
  { path: "/", selectors: ["h1"] },
  { path: "/pricing", selectors: ["h1"] },
  { path: "/docs", selectors: ["h1"] },
  { path: "/status", selectors: ["h1"] },
  { path: "/assistant", selectors: ["h1", 'textarea[aria-label="Message Fyxvo Assistant"]'] },
];

function spawnInstall(args) {
  return spawn("pnpm", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      TURBO_TELEMETRY_DISABLED: "1",
    },
    stdio: "pipe",
  });
}

async function ensureChromiumBrowser() {
  let executablePath = "";

  try {
    executablePath = chromium.executablePath();
  } catch {
    executablePath = "";
  }

  if (executablePath && existsSync(executablePath)) {
    return;
  }

  const install = spawnInstall(["exec", "playwright", "install", "chromium"]);
  let installOutput = "";
  install.stdout.on("data", (chunk) => {
    installOutput += chunk.toString();
  });
  install.stderr.on("data", (chunk) => {
    installOutput += chunk.toString();
  });

  const [installCode] = await once(install, "close");
  if (installCode !== 0) {
    throw new Error(`Chromium browser install failed:\n${installOutput}`);
  }

  if (!existsSync(chromium.executablePath())) {
    throw new Error("Chromium browser install completed without a usable executable");
  }
}

async function waitForReady(page, selectors, path) {
  for (const selector of selectors) {
    try {
      await page.locator(selector).first().waitFor({
        state: "visible",
        timeout: 10_000,
      });
      return;
    } catch {
      // Try the next route-specific selector.
    }
  }

  throw new Error(`Timed out waiting for a visible ready selector on ${path}`);
}

function collectRelevantErrors(errors) {
  return errors.filter((message) => !/favicon|Failed to load resource: the server responded with a status of 404/i.test(message));
}

async function run() {
  await ensureChromiumBrowser();
  const browser = await chromium.launch({ headless: true });

  try {
    for (const item of PAGES) {
      const page = await browser.newPage();
      const consoleErrors = [];
      const pageErrors = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      await page.goto(new URL(item.path, BASE_URL).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      await waitForReady(page, item.selectors, item.path);
      await page.waitForTimeout(1_000);

      const relevantConsoleErrors = collectRelevantErrors(consoleErrors);
      const relevantPageErrors = collectRelevantErrors(pageErrors);

      if (relevantConsoleErrors.length > 0 || relevantPageErrors.length > 0) {
        throw new Error(
          `Production smoke failed on ${item.path}\n` +
            `console: ${JSON.stringify(relevantConsoleErrors)}\n` +
            `page: ${JSON.stringify(relevantPageErrors)}`
        );
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

await run();
