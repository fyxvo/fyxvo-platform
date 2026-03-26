import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { firefox } from "@playwright/test";

const HOST = "127.0.0.1";
const PORT = 3210;
const BASE_URL = `http://${HOST}:${PORT}`;
const PAGES = ["/pricing", "/dashboard", "/assistant"];

const browserEnv = {
  ...process.env,
  NEXT_PUBLIC_API_BASE_URL: "https://api.fyxvo.com",
  NEXT_PUBLIC_GATEWAY_BASE_URL: "https://rpc.fyxvo.com",
  NEXT_PUBLIC_STATUS_PAGE_URL: "https://status.fyxvo.com",
  NEXT_PUBLIC_SITE_URL: "https://www.fyxvo.com",
  NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.devnet.solana.com",
  NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
  NEXT_PUBLIC_APP_NAME: "Fyxvo",
  NEXT_TELEMETRY_DISABLED: "1",
  TURBO_TELEMETRY_DISABLED: "1",
};

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await globalThis.fetch(url, { redirect: "manual" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Retry until the server becomes available.
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function spawnCommand(args) {
  return spawn("pnpm", args, {
    cwd: process.cwd(),
    env: browserEnv,
    stdio: "pipe",
  });
}

async function run() {
  const build = spawnCommand(["--filter", "@fyxvo/web", "build"]);
  let buildOutput = "";
  build.stdout.on("data", (chunk) => {
    buildOutput += chunk.toString();
  });
  build.stderr.on("data", (chunk) => {
    buildOutput += chunk.toString();
  });

  const [buildCode] = await once(build, "close");
  if (buildCode !== 0) {
    throw new Error(`Browser regression build failed:\n${buildOutput}`);
  }

  const server = spawnCommand(["--filter", "@fyxvo/web", "exec", "next", "start", "--hostname", HOST, "--port", String(PORT)]);
  server.stdout.on("data", () => undefined);
  server.stderr.on("data", () => undefined);

  try {
    await waitForServer(`${BASE_URL}/pricing`);

    const browser = await firefox.launch({ headless: true });
    try {
      for (const path of PAGES) {
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

        await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
        await page.waitForTimeout(1_500);

        const hydrationConsoleErrors = consoleErrors.filter((message) =>
          /hydration|did not match|minified react error|react error #418|validateDOMNesting/i.test(message)
        );
        const hydrationPageErrors = pageErrors.filter((message) =>
          /hydration|did not match|minified react error|react error #418|validateDOMNesting/i.test(message)
        );

        if (hydrationConsoleErrors.length > 0 || hydrationPageErrors.length > 0) {
          throw new Error(
            `Firefox hydration regression on ${path}\n` +
              `console: ${JSON.stringify(hydrationConsoleErrors)}\n` +
              `page: ${JSON.stringify(hydrationPageErrors)}`
          );
        }

        await page.close();
      }
    } finally {
      await browser.close();
    }
  } finally {
    server.kill("SIGTERM");
    await once(server, "close").catch(() => undefined);
  }
}

await run();
