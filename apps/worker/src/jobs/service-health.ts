import type { WorkerEnv } from "@fyxvo/config";
import type { WorkerJobResult, WorkerLogger, WorkerRepository } from "../types.js";
import { workerJobNames } from "../types.js";

interface ServiceTarget {
  readonly name: string;
  readonly url: string;
}

async function probeService(target: ServiceTarget, timeoutMs: number): Promise<{
  status: string;
  responseTimeMs: number | null;
  errorMessage: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(target.url, { signal: controller.signal });
    const responseTimeMs = Date.now() - start;
    const status = response.ok ? "healthy" : "degraded";
    return { status, responseTimeMs, errorMessage: null };
  } catch (error) {
    const responseTimeMs = Date.now() - start;
    const errorMessage =
      error instanceof Error
        ? (error.name === "AbortError" ? "Request timed out" : error.message)
        : "Unknown error";
    return { status: "unreachable", responseTimeMs, errorMessage };
  } finally {
    clearTimeout(timer);
  }
}

export async function processServiceHealthCheck(input: {
  readonly env: WorkerEnv;
  readonly repository: WorkerRepository;
  readonly logger: WorkerLogger;
}): Promise<WorkerJobResult> {
  const apiOrigin = input.env.API_ORIGIN.replace(/\/$/, "");
  const gatewayOrigin = input.env.GATEWAY_ORIGIN.replace(/\/$/, "");

  const targets: ServiceTarget[] = [
    { name: "api", url: `${apiOrigin}/health` },
    { name: "gateway", url: `${gatewayOrigin}/health` }
  ];

  const timeoutMs = 5_000;
  let checked = 0;

  for (const target of targets) {
    const result = await probeService(target, timeoutMs);
    await input.repository.writeServiceHealthSnapshot({
      serviceName: target.name,
      status: result.status,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage
    });
    checked += 1;

    input.logger.debug(
      {
        service: target.name,
        status: result.status,
        responseTimeMs: result.responseTimeMs
      },
      "Service health snapshot recorded"
    );

    // Incident detection: 5 consecutive unhealthy snapshots (~15 min window) → open incident
    const unhealthyCount = await input.repository.countRecentUnhealthySnapshots(target.name, 15);
    const openIncident = await input.repository.findOpenIncident(target.name);

    if (unhealthyCount >= 5 && !openIncident) {
      const incidentId = await input.repository.openIncident({
        serviceName: target.name,
        severity: result.status === "unreachable" ? "critical" : "degraded",
        description: result.errorMessage ?? `${target.name} has been unhealthy for the last 15 minutes`
      });
      input.logger.warn(
        { service: target.name, incidentId, unhealthyCount },
        "Incident opened for degraded service"
      );
    } else if (result.status === "healthy" && openIncident) {
      await input.repository.resolveIncident(openIncident.id);
      input.logger.info(
        { service: target.name, incidentId: openIncident.id },
        "Incident resolved — service recovered"
      );
    }
  }

  // Worker is healthy if it can reach this code path
  await input.repository.writeServiceHealthSnapshot({
    serviceName: "worker",
    status: "healthy",
    responseTimeMs: null,
    errorMessage: null
  });
  checked += 1;

  input.logger.info({ checked }, "Service health check completed");

  return {
    job: workerJobNames.serviceHealthCheck,
    processed: checked,
    details: { services: targets.map((t) => t.name).concat("worker") }
  };
}
