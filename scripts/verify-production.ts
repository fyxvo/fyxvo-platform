type JsonRecord = Record<string, unknown>;

interface CheckResult {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; body: JsonRecord }> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  const text = await response.text();
  let body: JsonRecord = {};
  try {
    body = JSON.parse(text) as JsonRecord;
  } catch {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

async function run(): Promise<void> {
  const checks: CheckResult[] = [];

  const webDeployment = await fetchJson("https://www.fyxvo.com/api/deployment-status");
  const webCommit = asString(webDeployment.body.commit);
  checks.push({
    name: "web deployment",
    ok: webDeployment.ok && asString(webDeployment.body.status) === "ok" && webCommit !== null,
    detail: `status=${webDeployment.status} commit=${webCommit ?? "missing"}`
  });

  const apiHealth = await fetchJson("https://api.fyxvo.com/health");
  checks.push({
    name: "api health",
    ok:
      apiHealth.ok &&
      asString(apiHealth.body.status) === "ok" &&
      asBoolean(apiHealth.body.assistantAvailable) === true &&
      asString(apiHealth.body.commit) !== null,
    detail: `status=${apiHealth.status} assistantAvailable=${String(apiHealth.body.assistantAvailable)} commit=${asString(apiHealth.body.commit) ?? "missing"}`
  });

  const apiStatus = await fetchJson("https://api.fyxvo.com/v1/status");
  checks.push({
    name: "api status",
    ok:
      apiStatus.ok &&
      asString(apiStatus.body.status) === "ok" &&
      asBoolean(apiStatus.body.assistantAvailable) === true &&
      asString(apiStatus.body.commit) !== null,
    detail: `status=${apiStatus.status} assistantAvailable=${String(apiStatus.body.assistantAvailable)} commit=${asString(apiStatus.body.commit) ?? "missing"}`
  });

  const gatewayHealth = await fetchJson("https://rpc.fyxvo.com/health");
  checks.push({
    name: "gateway health",
    ok: gatewayHealth.ok && asString(gatewayHealth.body.status) === "ok",
    detail: `status=${gatewayHealth.status} gatewayStatus=${asString(gatewayHealth.body.status) ?? "missing"}`
  });

  const gatewayStatus = await fetchJson("https://rpc.fyxvo.com/v1/status");
  checks.push({
    name: "gateway status",
    ok:
      gatewayStatus.ok &&
      asString(gatewayStatus.body.status) === "ok" &&
      asString(gatewayStatus.body.commit) !== null,
    detail: `status=${gatewayStatus.status} commit=${asString(gatewayStatus.body.commit) ?? "missing"}`
  });

  const assistantPage = await fetch("https://www.fyxvo.com/assistant", {
    method: "HEAD",
    redirect: "follow"
  });
  const robotsTag = assistantPage.headers.get("x-robots-tag");
  const matchedPath = assistantPage.headers.get("x-matched-path");
  checks.push({
    name: "assistant page",
    ok: assistantPage.ok && matchedPath === "/assistant",
    detail: `status=${assistantPage.status} matchedPath=${matchedPath ?? "missing"} xRobotsTag=${robotsTag ?? "none"}`
  });

  let failures = 0;
  console.log("Fyxvo production verification");
  for (const check of checks) {
    const prefix = check.ok ? "OK" : "FAIL";
    console.log(`${prefix} ${check.name}: ${check.detail}`);
    if (!check.ok) failures += 1;
  }

  if (failures > 0) {
    process.exitCode = 1;
    throw new Error(`Production verification failed with ${failures} failing check(s).`);
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
