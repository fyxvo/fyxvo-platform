import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { Keypair } from "@solana/web3.js";

interface CheckResult {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

interface JsonObject {
  readonly [key: string]: unknown;
}

interface ReadinessGate {
  readonly name?: unknown;
  readonly status?: unknown;
}

function getEnv(name: string, fallback?: string): string | null {
  const value = process.env[name] ?? fallback;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asObject(value: unknown): JsonObject {
  return value != null && typeof value === "object" ? (value as JsonObject) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function runCommand(command: string, args: string[]): Promise<{ ok: boolean; detail: string }> {
  return await new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      const detail = (stdout.trim() || stderr.trim() || `exit=${code ?? "null"}`).slice(0, 400);
      resolvePromise({
        ok: code === 0,
        detail
      });
    });
  });
}

async function fetchJson(url: string, token?: string | null): Promise<{ ok: boolean; status: number; body: JsonObject }> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    }
  });

  const text = await response.text();
  let body: JsonObject = {};
  try {
    body = asObject(JSON.parse(text));
  } catch {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

function readAuthorityAddress(): string | null {
  const explicitAddress = getEnv("MAINNET_AUTHORITY_WALLET_ADDRESS");
  if (explicitAddress) {
    return explicitAddress;
  }

  const walletPath = getEnv("ANCHOR_WALLET");
  if (!walletPath) {
    return null;
  }

  const absolutePath = resolve(walletPath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  try {
    const contents = JSON.parse(readFileSync(absolutePath, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(contents)).publicKey.toBase58();
  } catch {
    return null;
  }
}

async function fetchSolBalanceLamports(rpcUrl: string, address: string): Promise<number | null> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address]
    })
  });

  if (!response.ok) {
    return null;
  }

  const body = asObject(await response.json());
  return asNumber(asObject(body.result).value);
}

function daysBetween(isoTimestamp: string, now: number): number {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return -1;
  }

  return (now - parsed) / (1000 * 60 * 60 * 24);
}

async function run(): Promise<void> {
  const checks: CheckResult[] = [];
  const mainnetRpcUrl = getEnv("MAINNET_SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")!;
  const minLamports = 160_000_000_000;
  const readinessUrl = getEnv("FYXVO_READINESS_URL", "https://api.fyxvo.com/v1/network/readiness")!;
  const githubApiUrl =
    getEnv(
      "FYXVO_GITHUB_ACTIONS_URL",
      "https://api.github.com/repos/fyxvo/fyxvo-platform/actions/runs?branch=main&per_page=3"
    )!;

  const build = await runCommand("pnpm", ["solana:program:build"]);
  checks.push({
    name: "program build",
    ok: build.ok,
    detail: build.detail
  });

  const authorityAddress = readAuthorityAddress();
  if (authorityAddress == null) {
    checks.push({
      name: "authority wallet balance",
      ok: false,
      detail: "Set MAINNET_AUTHORITY_WALLET_ADDRESS or ANCHOR_WALLET before running this script."
    });
  } else {
    const lamports = await fetchSolBalanceLamports(mainnetRpcUrl, authorityAddress);
    checks.push({
      name: "authority wallet balance",
      ok: lamports != null && lamports >= minLamports,
      detail:
        lamports == null
          ? `Could not read ${authorityAddress} from ${mainnetRpcUrl}.`
          : `address=${authorityAddress} lamports=${lamports} required=${minLamports}`
    });
  }

  const stableSince = getEnv("FYXVO_DEVNET_STABLE_SINCE") ?? getEnv("FYXVO_DEVNET_DEPLOYED_AT");
  const stableDays = stableSince ? daysBetween(stableSince, Date.now()) : -1;
  checks.push({
    name: "devnet stable for 7 days",
    ok: stableDays >= 7,
    detail:
      stableSince == null
        ? "Set FYXVO_DEVNET_STABLE_SINCE or FYXVO_DEVNET_DEPLOYED_AT to the ISO deployment timestamp."
        : `stableSince=${stableSince} days=${stableDays.toFixed(2)}`
  });

  const readiness = await fetchJson(readinessUrl);
  const readinessItem = asObject(readiness.body.item);
  const readinessGates = Array.isArray(readinessItem.gates) ? (readinessItem.gates as ReadinessGate[]) : [];
  const passingGates = readinessGates.filter((gate) => gate.status === "pass").length;
  checks.push({
    name: "public readiness gates",
    ok:
      readiness.ok &&
      asBoolean(readinessItem.ready) === true &&
      asNumber(readinessItem.readinessPercentage) === 100 &&
      readinessGates.length === 10 &&
      passingGates === readinessGates.length,
    detail: `status=${readiness.status} ready=${String(readinessItem.ready)} percentage=${String(
      readinessItem.readinessPercentage
    )} gates=${readinessGates.length} passing=${passingGates}`
  });

  const githubToken = getEnv("GITHUB_TOKEN");
  const ciRuns = await fetchJson(githubApiUrl, githubToken);
  const workflowRuns = Array.isArray(ciRuns.body.workflow_runs) ? ciRuns.body.workflow_runs.map(asObject) : [];
  const latestRun = workflowRuns[0] ?? {};
  checks.push({
    name: "ci pipeline green",
    ok:
      ciRuns.ok &&
      asString(latestRun.status) === "completed" &&
      asString(latestRun.conclusion) === "success",
    detail: `status=${ciRuns.status} workflowStatus=${asString(latestRun.status) ?? "missing"} conclusion=${
      asString(latestRun.conclusion) ?? "missing"
    }`
  });

  const opsReviewed = getEnv("FYXVO_OPS_HANDOFF_REVIEWED") === "true";
  checks.push({
    name: "ops handoff reviewed",
    ok: opsReviewed && existsSync(resolve("docs/OPERATIONS.md")),
    detail: `opsReviewed=${String(opsReviewed)} operationsDoc=${existsSync(resolve("docs/OPERATIONS.md"))}`
  });

  let failures = 0;
  console.log("Fyxvo mainnet readiness verification");
  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
    if (!check.ok) {
      failures += 1;
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    throw new Error(`Mainnet readiness failed with ${failures} failing check(s).`);
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
