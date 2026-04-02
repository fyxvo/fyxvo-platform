import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import Fastify from "fastify";
import { loadGatewayEnv } from "@fyxvo/config";
import { ApiKeyStatus, NodeStatus } from "@fyxvo/database";
import type { AddressInfo } from "node:net";
import { buildGatewayApp } from "../src/app.js";
import { decodeProjectFundingState } from "../src/balance.js";
import { HttpUpstreamRouter } from "../src/router.js";
import { InMemoryGatewayStateStore } from "../src/state.js";
import type {
  GatewayRepository,
  JsonRpcPayload,
  ProjectAccessContext,
  ProjectBalanceResolver,
  GatewayProjectSubscription,
  GatewayProjectSubscriptionUsage,
  ProjectFundingState,
  RoutedRpcNode
} from "../src/types.js";

function makeEnv(overrides: Partial<Record<string, string>> = {}) {
  return loadGatewayEnv({
    FYXVO_ENV: "test",
    LOG_LEVEL: "error",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/fyxvo_test",
    REDIS_URL: "redis://localhost:6379",
    SOLANA_CLUSTER: "devnet",
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
    SOLANA_WS_URL: "wss://api.devnet.solana.com",
    REQUEST_TIMEOUT_MS: "5000",
    GATEWAY_HOST: "127.0.0.1",
    GATEWAY_PORT: "4100",
    API_ORIGIN: "http://localhost:4000",
    GATEWAY_REDIS_PREFIX: "fyxvo:gateway:test",
    GATEWAY_RATE_LIMIT_MAX: "5",
    GATEWAY_RATE_LIMIT_WINDOW_MS: "60000",
    GATEWAY_PRIORITY_RATE_LIMIT_MAX: "1",
    GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS: "60000",
    GATEWAY_UPSTREAM_TIMEOUT_MS: "1500",
    GATEWAY_PRIORITY_TIMEOUT_MS: "750",
    GATEWAY_HEALTHCHECK_TIMEOUT_MS: "750",
    GATEWAY_STANDARD_PRICE_LAMPORTS: "100",
    GATEWAY_PRIORITY_PRICE_LAMPORTS: "400",
    GATEWAY_WRITE_METHOD_MULTIPLIER: "4",
    GATEWAY_MIN_AVAILABLE_LAMPORTS: "0",
    GATEWAY_BALANCE_CACHE_MS: "1000",
    GATEWAY_NODE_CACHE_MS: "1000",
    GATEWAY_NODE_FAILURE_COOLDOWN_MS: "2000",
    ...overrides
  });
}

class MemoryGatewayRepository implements GatewayRepository {
  public subscription: GatewayProjectSubscription | null = null;
  public subscriptionUsage: GatewayProjectSubscriptionUsage = {
    standardRequestsUsed: 0n,
    priorityRequestsUsed: 0n
  };

  constructor(
    private readonly apiKey: string,
    private readonly access: ProjectAccessContext,
    private readonly nodes: RoutedRpcNode[]
  ) {}

  public readonly requestLogs: Array<{
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    apiKeyId?: string;
    projectId?: string;
  }> = [];

  public usageTouches = 0;

  async findProjectAccessByApiKey(apiKey: string) {
    return apiKey === this.apiKey ? this.access : null;
  }

  async getProjectBudgetUsage() {
    return {
      dailyLamports: 0n,
      monthlyLamports: 0n,
    };
  }

  async listUpstreamNodes(projectId?: string) {
    return projectId ? this.nodes.filter((node) => node.projectId === projectId || node.projectId === null) : this.nodes;
  }

  async touchApiKeyUsage() {
    this.usageTouches += 1;
  }

  async getProjectSubscription(projectId: string) {
    return this.access.project.id === projectId ? this.subscription : null;
  }

  async getProjectSubscriptionUsage(projectId: string) {
    return this.access.project.id === projectId
      ? this.subscriptionUsage
      : {
          standardRequestsUsed: 0n,
          priorityRequestsUsed: 0n
        };
  }

  async recordRequestLog(input: {
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly apiKeyId?: string;
    readonly projectId?: string;
  }) {
    this.requestLogs.push(input);
  }

  async ping() {
    return true;
  }
}

class StaticBalanceResolver implements ProjectBalanceResolver {
  constructor(private readonly state: ProjectFundingState) {}

  async getProjectFundingState() {
    return this.state;
  }
}

const resources = new Set<{ close: () => Promise<unknown> }>();

afterEach(async () => {
  for (const resource of resources) {
    await resource.close();
    resources.delete(resource);
  }
});

async function startUpstreamServer(handler: (payload: unknown) => { statusCode: number; body: unknown }) {
  const app = Fastify({ logger: false });
  app.post("/", async (request, reply) => {
    const response = handler(request.body);
    reply.status(response.statusCode).send(response.body);
  });
  await app.listen({
    host: "127.0.0.1",
    port: 0
  });
  resources.add(app);
  const address = app.server.address() as AddressInfo;
  return {
    app,
    endpoint: `http://127.0.0.1:${address.port}/`
  };
}

function createAccessContext(): ProjectAccessContext {
  return {
    apiKey: {
      id: "api-key-1",
      projectId: "project-1",
      label: "Gateway key",
      prefix: "fyxvo_live_gateway",
      scopes: ["rpc:request", "priority:relay"],
      status: ApiKeyStatus.ACTIVE,
      expiresAt: null
    },
    project: {
      id: "project-1",
      slug: "gateway-project",
      name: "Gateway Project",
      ownerId: "user-1",
      ownerWalletAddress: "7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT",
      chainProjectId: 1n,
      onChainProjectPda: "9xQeWvG816bUx9EPfEZ2pFhdvbSQYzHn6n3Ww9wXXA4A",
      dailyBudgetLamports: null,
      monthlyBudgetLamports: null,
      budgetWarningThresholdPct: 80,
      budgetHardStop: false,
      relayPaused: false,
    }
  };
}

function createScopedAccessContext(scopes: readonly string[]): ProjectAccessContext {
  const access = createAccessContext();
  return {
    ...access,
    apiKey: {
      ...access.apiKey,
      scopes: [...scopes]
    }
  };
}

function encodeProjectAccount(input: {
  readonly totalSolFunded: bigint;
  readonly totalUsdcFunded: bigint;
  readonly availableSolCredits: bigint;
  readonly availableUsdcCredits: bigint;
}) {
  const discriminator = createHash("sha256")
    .update("account:ProjectAccount")
    .digest()
    .subarray(0, 8);
  const buffer = Buffer.alloc(177);
  discriminator.copy(buffer, 0);
  buffer.writeBigUInt64LE(1n, 104);
  buffer.writeBigUInt64LE(input.totalSolFunded, 112);
  buffer.writeBigUInt64LE(input.totalUsdcFunded, 120);
  buffer.writeBigUInt64LE(input.availableSolCredits, 128);
  buffer.writeBigUInt64LE(input.availableUsdcCredits, 136);
  return buffer;
}

describe("Fyxvo gateway", () => {
  it("falls back between upstream nodes and records successful metrics", async () => {
    let failedNodeHits = 0;
    let healthyNodeHits = 0;
    const failingNode = await startUpstreamServer(() => {
      failedNodeHits += 1;
      return {
        statusCode: 503,
        body: {
          error: "upstream unavailable"
        }
      };
    });
    const healthyNode = await startUpstreamServer((payload) => {
      healthyNodeHits += 1;
      const body = payload as { id?: unknown; method?: string };
      if (body.method === "getHealth") {
        return {
          statusCode: 200,
          body: {
            jsonrpc: "2.0",
            id: body.id ?? "health",
            result: "ok"
          }
        };
      }

      return {
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: {
            slot: 321
          }
        }
      };
    });

    const access = createAccessContext();
    const repository = new MemoryGatewayRepository("fyxvo_live_gateway_test", access, [
      {
        id: "node-1",
        projectId: access.project.id,
        name: "project-primary",
        endpoint: failingNode.endpoint,
        region: "us-east-1",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date("2026-03-18T19:00:00.000Z"),
        operatorName: "Atlas"
      },
      {
        id: "node-2",
        projectId: null,
        name: "shared-secondary",
        endpoint: healthyNode.endpoint,
        region: "us-west-2",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date("2026-03-18T19:01:00.000Z"),
        operatorName: "Zephyr"
      }
    ]);
    const stateStore = new InMemoryGatewayStateStore();
    const app = await buildGatewayApp({
      env: makeEnv(),
      repository,
      stateStore,
      balanceResolver: new StaticBalanceResolver({
        projectPda: access.project.onChainProjectPda,
        totalSolFunded: 5_000n,
        totalUsdcFunded: 0n,
        availableSolCredits: 5_000n,
        availableUsdcCredits: 0n
      }),
      router: new HttpUpstreamRouter({
        failureCooldownMs: 2_000
      }),
      logger: false
    });
    await app.ready();
    resources.add(app);

    const response = await app.inject({
      method: "POST",
      url: "/rpc",
      headers: {
        "x-api-key": "fyxvo_live_gateway_test"
      },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "getSlot"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        slot: 321
      }
    });
    expect(response.headers["x-fyxvo-upstream-node-id"]).toBe("node-2");
    expect(failedNodeHits).toBe(1);
    expect(healthyNodeHits).toBe(1);
    expect(repository.usageTouches).toBe(1);

    const metricsResponse = await app.inject({
      method: "GET",
      url: "/v1/metrics"
    });
    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.json()).toMatchObject({
      item: {
        totals: {
          requests: 1,
          successes: 1,
          errors: 0
        },
        standard: {
          requests: 1,
          successes: 1
        }
      }
    });
  });

  it("applies separate priority pricing and priority rate limits", async () => {
    const healthyNode = await startUpstreamServer((payload) => {
      const body = payload as { id?: unknown; method?: string };
      return {
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: body.method === "getHealth" ? "ok" : { value: 42 }
        }
      };
    });

    const access = createAccessContext();
    const repository = new MemoryGatewayRepository("fyxvo_live_gateway_priority", access, [
      {
        id: "node-priority",
        projectId: access.project.id,
        name: "priority-primary",
        endpoint: healthyNode.endpoint,
        region: "us-east-1",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        operatorName: "Atlas"
      }
    ]);
    const stateStore = new InMemoryGatewayStateStore();
    const app = await buildGatewayApp({
      env: makeEnv(),
      repository,
      stateStore,
      balanceResolver: new StaticBalanceResolver({
        projectPda: access.project.onChainProjectPda,
        totalSolFunded: 1_000n,
        totalUsdcFunded: 0n,
        availableSolCredits: 1_000n,
        availableUsdcCredits: 0n
      }),
      router: new HttpUpstreamRouter({
        failureCooldownMs: 2_000
      }),
      logger: false
    });
    await app.ready();
    resources.add(app);

    const first = await app.inject({
      method: "POST",
      url: "/priority-rpc",
      headers: {
        "x-api-key": "fyxvo_live_gateway_priority"
      },
      payload: {
        jsonrpc: "2.0",
        id: 2,
        method: "getLatestBlockhash"
      }
    });
    expect(first.statusCode).toBe(200);
    expect(first.headers["x-fyxvo-routing-mode"]).toBe("priority");
    expect(first.headers["x-fyxvo-price-credits"]).toBe("400");

    const second = await app.inject({
      method: "POST",
      url: "/priority-rpc",
      headers: {
        "x-api-key": "fyxvo_live_gateway_priority"
      },
      payload: {
        jsonrpc: "2.0",
        id: 3,
        method: "getLatestBlockhash"
      }
    });
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({
      code: "rate_limited"
    });

    expect(await stateStore.getProjectSpend(access.project.id)).toEqual({
      sol: 400n,
      usdc: 0n
    });
  });

  it("rejects relay traffic when the API key is missing required scopes", async () => {
    const healthyNode = await startUpstreamServer((payload) => {
      const body = payload as { id?: unknown };
      return {
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: "should not be reached"
        }
      };
    });

    const access = createScopedAccessContext(["analytics:read"]);
    const repository = new MemoryGatewayRepository("fyxvo_live_gateway_scoped", access, [
      {
        id: "node-scoped",
        projectId: access.project.id,
        name: "project-scoped",
        endpoint: healthyNode.endpoint,
        region: "us-east-1",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        operatorName: "Atlas"
      }
    ]);
    const app = await buildGatewayApp({
      env: makeEnv(),
      repository,
      stateStore: new InMemoryGatewayStateStore(),
      balanceResolver: new StaticBalanceResolver({
        projectPda: access.project.onChainProjectPda,
        totalSolFunded: 1_000n,
        totalUsdcFunded: 0n,
        availableSolCredits: 1_000n,
        availableUsdcCredits: 0n
      }),
      router: new HttpUpstreamRouter({
        failureCooldownMs: 2_000
      }),
      logger: false
    });
    await app.ready();
    resources.add(app);

    const standardResponse = await app.inject({
      method: "POST",
      url: "/rpc",
      headers: {
        "x-api-key": "fyxvo_live_gateway_scoped"
      },
      payload: {
        jsonrpc: "2.0",
        id: 5,
        method: "getSlot"
      }
    });

    expect(standardResponse.statusCode).toBe(403);
    expect(standardResponse.json()).toMatchObject({
      code: "insufficient_api_key_scope",
      details: {
        requiredScopes: ["rpc:request"],
        missingScopes: ["rpc:request"],
        grantedScopes: ["analytics:read"]
      }
    });
  });

  it("rejects requests when the project balance is insufficient", async () => {
    const healthyNode = await startUpstreamServer((payload) => {
      const body = payload as { id?: unknown };
      return {
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: "should not be reached"
        }
      };
    });

    const access = createAccessContext();
    const repository = new MemoryGatewayRepository("fyxvo_live_gateway_lowfunds", access, [
      {
        id: "node-lowfunds",
        projectId: null,
        name: "shared-lowfunds",
        endpoint: healthyNode.endpoint,
        region: "us-east-1",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        operatorName: "Atlas"
      }
    ]);
    const app = await buildGatewayApp({
      env: makeEnv(),
      repository,
      stateStore: new InMemoryGatewayStateStore(),
      balanceResolver: new StaticBalanceResolver({
        projectPda: access.project.onChainProjectPda,
        totalSolFunded: 50n,
        totalUsdcFunded: 0n,
        availableSolCredits: 50n,
        availableUsdcCredits: 0n
      }),
      router: new HttpUpstreamRouter({
        failureCooldownMs: 2_000
      }),
      logger: false
    });
    await app.ready();
    resources.add(app);

    const response = await app.inject({
      method: "POST",
      url: "/",
      headers: {
        "x-api-key": "fyxvo_live_gateway_lowfunds"
      },
      payload: {
        jsonrpc: "2.0",
        id: 4,
        method: "getProgramAccounts"
      }
    });

    expect(response.statusCode).toBe(402);
    expect(response.json()).toMatchObject({
      code: "insufficient_project_funds"
    });
  });

  it("exposes health and status with live upstream checks", async () => {
    const healthyNode = await startUpstreamServer((payload) => {
      const body = payload as { id?: unknown; method?: string };
      return {
        statusCode: 200,
        body: {
          jsonrpc: "2.0",
          id: body.id ?? 1,
          result: body.method === "getHealth" ? "ok" : { ok: true }
        }
      };
    });

    const access = createAccessContext();
    const repository = new MemoryGatewayRepository("fyxvo_live_gateway_health", access, [
      {
        id: "node-health",
        projectId: null,
        name: "shared-health",
        endpoint: healthyNode.endpoint,
        region: "us-east-1",
        status: NodeStatus.ONLINE,
        lastHeartbeatAt: new Date(),
        operatorName: "Atlas"
      }
    ]);
    const app = await buildGatewayApp({
      env: makeEnv(),
      repository,
      stateStore: new InMemoryGatewayStateStore(),
      balanceResolver: new StaticBalanceResolver({
        projectPda: access.project.onChainProjectPda,
        totalSolFunded: 1_000n,
        totalUsdcFunded: 0n,
        availableSolCredits: 1_000n,
        availableUsdcCredits: 0n
      }),
      router: new HttpUpstreamRouter({
        failureCooldownMs: 2_000
      }),
      logger: false
    });
    await app.ready();
    resources.add(app);

    const healthResponse = await app.inject({
      method: "GET",
      url: "/health"
    });
    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toMatchObject({
      status: "ok",
      service: "gateway",
      version: "v1",
      environment: "test",
      database: true,
      dependencies: {
        redis: { ok: true },
        upstream: { ok: true, nodeCount: 1 }
      }
    });
    expect(typeof healthResponse.json().commit === "string" || healthResponse.json().commit === null).toBe(true);
    expect(healthResponse.json().timestamp).toEqual(expect.any(String));

    const statusResponse = await app.inject({
      method: "GET",
      url: "/v1/status"
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      status: "ok",
      service: "fyxvo-gateway",
      version: "v1",
      environment: "test",
      nodeCount: 1,
      scopeEnforcement: {
        enabled: true,
        standardRequiredScopes: ["rpc:request"],
        priorityRequiredScopes: ["rpc:request", "priority:relay"]
      },
      pricing: {
        standard: 100,
        priority: 400
      }
    });
    expect(typeof statusResponse.json().commit === "string" || statusResponse.json().commit === null).toBe(true);
    expect(statusResponse.json().timestamp).toEqual(expect.any(String));
  });

  it("decodes the on-chain project funding layout", async () => {
    const state = decodeProjectFundingState(
      encodeProjectAccount({
        totalSolFunded: 9_000n,
        totalUsdcFunded: 4_000n,
        availableSolCredits: 2_500n,
        availableUsdcCredits: 1_250n
      }),
      "project-pda-test"
    );

    expect(state).toEqual({
      projectPda: "project-pda-test",
      totalSolFunded: 9_000n,
      totalUsdcFunded: 4_000n,
      availableSolCredits: 2_500n,
      availableUsdcCredits: 1_250n
    });
  });
});
