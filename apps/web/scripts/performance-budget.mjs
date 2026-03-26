import { readFile } from "node:fs/promises";
import path from "node:path";

const statsPath = path.resolve(process.cwd(), ".next/diagnostics/route-bundle-stats.json");
const budgets = [
  { route: "/", label: "Landing page", maxBytes: 1_550_000 },
  { route: "/assistant", label: "Assistant", maxBytes: 1_600_000 },
  { route: "/playground", label: "Playground", maxBytes: 1_600_000 },
];

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

async function main() {
  let raw;
  try {
    raw = await readFile(statsPath, "utf8");
  } catch {
    console.log(`[perf-budgets] No route bundle stats found at ${statsPath}. Run a web build first.`);
    process.exit(0);
  }

  const stats = JSON.parse(raw);
  if (!Array.isArray(stats)) {
    console.log("[perf-budgets] Route bundle stats file is not in the expected format.");
    process.exit(0);
  }

  console.log("[perf-budgets] Frontend route budget report");
  let warnings = 0;

  for (const budget of budgets) {
    const entry = stats.find((candidate) => candidate?.route === budget.route);
    if (!entry || typeof entry.firstLoadUncompressedJsBytes !== "number") {
      console.log(`- ${budget.label}: route data unavailable for ${budget.route}`);
      continue;
    }

    const size = entry.firstLoadUncompressedJsBytes;
    const delta = size - budget.maxBytes;
    const status = delta > 0 ? "WARN" : "OK";
    if (delta > 0) warnings += 1;

    console.log(
      `- ${budget.label} (${budget.route}): ${formatBytes(size)} vs budget ${formatBytes(budget.maxBytes)} [${status}]`,
    );
  }

  if (warnings > 0) {
    console.log(`[perf-budgets] ${warnings} route budget warning(s). Visibility only; build remains non-blocking.`);
  } else {
    console.log("[perf-budgets] All tracked routes are within the current warning thresholds.");
  }
}

await main();
