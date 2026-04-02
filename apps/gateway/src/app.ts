import cors from "@fastify/cors";
import type { GatewayEnv } from "@fyxvo/config";
import {
  gatewayRequiredApiKeyScopes,
  getMissingApiKeyScopes,
  resolveAllowedCorsOrigins,
  subscriptionOveragePricing
} from "@fyxvo/config";
import { prisma, type PrismaClientType } from "@fyxvo/database";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { OnChainProjectBalanceResolver } from "./balance.js";
import { calculateRequestPrice, chooseFundingAsset, chooseFundingAssetByAsset } from "./pricing.js";
import { PrismaGatewayRepository } from "./repository.js";
import { HttpUpstreamRouter } from "./router.js";
import { RedisGatewayStateStore } from "./state.js";
import type { GatewayAppDependencies, GatewayMetricsSnapshot, JsonRpcPayload, JsonRpcRequest, RoutedRpcNode, RoutingMode } from "./types.js";

const jsonRpcRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string().trim().min(1),
  params: z.unknown().optional(),
  id: z.unknown().optional()
});

const jsonRpcPayloadSchema = z.union([jsonRpcRequestSchema, z.array(jsonRpcRequestSchema).min(1)]);

class GatewayHttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

function getRuntimeCommitSha() {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.COMMIT_SHA;

  return typeof commit === "string" && commit.trim().length > 0 ? commit.trim() : null;
}

function getClientApiKey(request: FastifyRequest): string {
  const headerKey = request.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.length > 0) {
    return headerKey;
  }

  const authorization = request.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  throw new GatewayHttpError(401, "missing_api_key", "A valid API key is required for gateway access.");
}

function parseJsonRpcPayload(body: unknown): JsonRpcPayload {
  const payload = jsonRpcPayloadSchema.parse(body);
  return Array.isArray(payload) ? payload : payload;
}

function serializeRpcPayload(payload: JsonRpcPayload): string {
  return JSON.stringify(payload);
}

function metricsSummary(metrics: GatewayMetricsSnapshot) {
  return {
    totals: {
      requests: metrics.standard.requests + metrics.priority.requests,
      successes: metrics.standard.successes + metrics.priority.successes,
      errors: metrics.standard.errors + metrics.priority.errors,
      upstreamFailures: metrics.standard.upstreamFailures + metrics.priority.upstreamFailures
    },
    standard: metrics.standard,
    priority: metrics.priority
  };
}

function setRateLimitHeaders(reply: FastifyReply, decision: {
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
}) {
  reply.header("x-ratelimit-limit", String(decision.limit));
  reply.header("x-ratelimit-remaining", String(decision.remaining));
  reply.header("x-ratelimit-reset", String(decision.resetAt));
}

function sanitizeErrorForLogs(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      type: typeof error
    };
  }

  const statusCode = (error as unknown as { statusCode?: unknown }).statusCode;
  return {
    name: error.name,
    message: error.message,
    ...(typeof statusCode === "number" ? { statusCode } : {})
  };
}

function requestLogger(app: FastifyInstance, error: unknown) {
  app.log.error(
    {
      event: "gateway.request.error",
      error: sanitizeErrorForLogs(error)
    },
    "Gateway handler failure"
  );
}

function logSubscriptionLookupFailure(app: FastifyInstance, error: unknown, projectId: string) {
  app.log.warn(
    {
      event: "gateway.subscription.lookup_failed",
      projectId,
      error: sanitizeErrorForLogs(error)
    },
    "Subscription lookup failed. Falling back to pay-per-request billing."
  );
}

function normalizeGatewayRuntimeError(error: unknown) {
  if (!(error instanceof Error)) {
    return error;
  }

  if (error.message.includes("was not found")) {
    return new GatewayHttpError(
      409,
      "project_not_activated",
      "The project does not have an on-chain account yet. Activate and fund it through the API before using the gateway."
    );
  }

  if (
    error.message.includes("Project account data is too short") ||
    error.message.includes("Project account discriminator does not match")
  ) {
    return new GatewayHttpError(
      502,
      "invalid_project_state",
      "The project account on chain could not be decoded."
    );
  }

  return error;
}

async function sendGatewayError(
  app: FastifyInstance,
  reply: FastifyReply,
  request: FastifyRequest,
  error: unknown,
  fallbackCode = "internal_error",
  fallbackMessage = "An unexpected gateway error occurred."
) {
  if (error instanceof z.ZodError) {
    reply.status(400).send({
      code: "invalid_json_rpc",
      error: "The request body is not a valid Solana JSON-RPC payload.",
      details: error.flatten(),
      requestId: request.id
    });
    return;
  }

  if (error instanceof GatewayHttpError) {
    reply.status(error.statusCode).send({
      code: error.code,
      error: error.message,
      details: error.details,
      requestId: request.id
    });
    return;
  }

  requestLogger(app, error);
  reply.status(500).send({
    code: fallbackCode,
    error: fallbackMessage,
    requestId: request.id
  });
}

const STARTUP_TIME_MS = Date.now();

const gatewayRegion = process.env.GATEWAY_REGION ?? 'us-east-1';

const CACHE_TTL_MS: Record<string, number> = {
  getHealth: 10_000,
  getSlot: 500,
  getLatestBlockhash: 500,
  getEpochInfo: 5_000,
  getVersion: 60_000,
};

// ---------------------------------------------------------------------------
// Solana JSON-RPC error hint table
// ---------------------------------------------------------------------------

const SOLANA_ERROR_HINTS: Record<number, { explanation: string; action: string }> = {
  [-32002]: { explanation: "Transaction simulation failed — the transaction would fail if submitted.", action: "Check your transaction instructions and account balances before submitting." },
  [-32003]: { explanation: "Blockhash not found — the blockhash you used has expired (valid for ~150 slots).", action: "Fetch a new recent blockhash and rebuild your transaction." },
  [-32004]: { explanation: "Node is unhealthy — the RPC node is behind or not fully synced.", action: "Retry in a moment. Fyxvo will route to a healthy node." },
  [-32005]: { explanation: "Slot skipped — this slot was not produced by any validator.", action: "This is normal; retry with the next slot." },
  [-32009]: { explanation: "Transaction precompile verification failed — a program instruction signature check failed.", action: "Verify your transaction signer keys and instruction data are correct." },
  [-32010]: { explanation: "Preflight simulation failed — transaction would fail on-chain.", action: "Review the simulation error logs to find the failing instruction." },
  [-32012]: { explanation: "Transaction already processed — this transaction was already confirmed on-chain.", action: "Do not retry; check transaction status before resubmitting." },
};

function injectSolanaErrorHint(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return body;
  }
  const rpcBody = body as Record<string, unknown>;
  const error = rpcBody["error"];
  if (typeof error !== "object" || error === null) {
    return body;
  }
  const rpcError = error as Record<string, unknown>;
  const code = rpcError["code"];
  if (typeof code !== "number") {
    return body;
  }
  const hint = SOLANA_ERROR_HINTS[code];
  if (!hint) {
    return body;
  }
  return {
    ...rpcBody,
    error: { ...rpcError, fyxvo_hint: hint },
  };
}

function extractFyxvoHint(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return undefined;
  }

  const rpcBody = body as Record<string, unknown>;
  const error = rpcBody["error"];
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return undefined;
  }

  return (error as Record<string, unknown>)["fyxvo_hint"];
}

function summarizeRpcRoute(payload: JsonRpcPayload): string {
  const items = Array.isArray(payload) ? payload : [payload];
  const methods = [...new Set(items.map((entry) => entry.method.trim()).filter((entry) => entry.length > 0))];
  if (methods.length === 0) {
    return "unknown";
  }
  if (methods.length === 1) {
    return methods[0]!;
  }

  const preview = methods.slice(0, 3).join(", ");
  return methods.length > 3 ? `batch:${preview} +${methods.length - 3}` : `batch:${preview}`;
}

// ---------------------------------------------------------------------------
// In-memory circuit breaker (per upstream URL)
// ---------------------------------------------------------------------------

const upstreamFailures = new Map<string, { count: number; openUntil: number }>();

function isCircuitOpen(url: string): boolean {
  const state = upstreamFailures.get(url);
  if (!state) return false;
  if (state.openUntil > Date.now()) return true;
  // Reset after expiry
  upstreamFailures.delete(url);
  return false;
}

function recordUpstreamFailure(url: string): void {
  const state = upstreamFailures.get(url) ?? { count: 0, openUntil: 0 };
  state.count += 1;
  if (state.count >= 5) {
    state.openUntil = Date.now() + 30_000; // 30 second timeout
  }
  upstreamFailures.set(url, state);
}

function recordUpstreamSuccess(url: string): void {
  upstreamFailures.delete(url);
}

export async function buildGatewayApp(input: GatewayAppDependencies) {
  const app = Fastify({
    logger: input.logger ?? false,
    bodyLimit: 2 * 1024 * 1024
  });
  const allowedOrigins = new Set(resolveAllowedCorsOrigins(input.env));

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed."), false);
    },
    credentials: true
  });

  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
    reply.header("x-fyxvo-trace-id", request.id);
    reply.header("cache-control", "no-store");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "strict-origin-when-cross-origin");
    reply.header(
      "permissions-policy",
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()"
    );
    if (input.env.FYXVO_ENV === "production") {
      reply.header("strict-transport-security", "max-age=31536000; includeSubDomains; preload");
    }
  });

  async function resolveRequestBilling(inputBilling: {
    readonly mode: RoutingMode;
    readonly payload: JsonRpcPayload;
    readonly projectId: string;
    readonly fundingState: {
      readonly availableSolCredits: bigint;
      readonly availableUsdcCredits: bigint;
      readonly totalSolFunded: bigint;
      readonly totalUsdcFunded: bigint;
      readonly projectPda: string;
    };
    readonly spendState: {
      readonly sol: bigint;
      readonly usdc: bigint;
    };
  }) {
    const requestPricing = calculateRequestPrice(inputBilling.payload, inputBilling.mode, input.env);
    let subscription = null;
    try {
      subscription = await input.repository.getProjectSubscription(inputBilling.projectId);
    } catch (error) {
      logSubscriptionLookupFailure(app, error, inputBilling.projectId);
      subscription = null;
    }

    if (
      subscription &&
      subscription.status === "active" &&
      subscription.plan !== "payperrequest"
    ) {
      let usage;
      try {
        usage = await input.repository.getProjectSubscriptionUsage(
          inputBilling.projectId,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd
        );
      } catch (error) {
        logSubscriptionLookupFailure(app, error, inputBilling.projectId);
        usage = {
          standardRequestsUsed: 0,
          priorityRequestsUsed: 0
        };
      }

      const currentRequestCount = requestPricing.requestCount;
      const standardRemaining = subscription.requestsIncluded - BigInt(usage.standardRequestsUsed);
      const priorityRemaining =
        subscription.priorityRequestsIncluded - BigInt(usage.priorityRequestsUsed);

      const coveredStandard =
        inputBilling.mode === "standard"
          ? standardRemaining > 0n
            ? BigInt(currentRequestCount) <= standardRemaining
            : false
          : false;
      const coveredPriority =
        inputBilling.mode === "priority"
          ? priorityRemaining > 0n
            ? BigInt(currentRequestCount) <= priorityRemaining
            : false
          : false;

      if (coveredStandard || coveredPriority) {
        return {
          pricing: requestPricing,
          billingMode: "subscription_included" as const,
          chargedAmount: 0n,
          chargedAsset: null,
          fundingDecision: null
        };
      }

      const overageSolCredits =
        inputBilling.mode === "priority"
          ? subscriptionOveragePricing.priorityLamports * BigInt(currentRequestCount)
          : subscriptionOveragePricing.standardLamports * BigInt(currentRequestCount);
      const overageUsdcCredits =
        inputBilling.mode === "priority"
          ? subscriptionOveragePricing.priorityUsdcBaseUnits * BigInt(currentRequestCount)
          : subscriptionOveragePricing.standardUsdcBaseUnits * BigInt(currentRequestCount);
      const fundingDecision = chooseFundingAssetByAsset({
        funding: inputBilling.fundingState,
        spend: inputBilling.spendState,
        requiredSolCredits: overageSolCredits,
        requiredUsdcCredits: overageUsdcCredits,
        minimumReserve: BigInt(input.env.GATEWAY_MIN_AVAILABLE_LAMPORTS)
      });

      return {
        pricing: requestPricing,
        billingMode: "subscription_overage" as const,
        chargedAmount:
          fundingDecision?.asset === "SOL" ? overageSolCredits : overageUsdcCredits,
        chargedAsset: fundingDecision?.asset ?? null,
        fundingDecision
      };
    }

    const fundingDecision = chooseFundingAsset({
      funding: inputBilling.fundingState,
      spend: inputBilling.spendState,
      requiredCredits: requestPricing.totalPrice,
      minimumReserve: BigInt(input.env.GATEWAY_MIN_AVAILABLE_LAMPORTS)
    });

    return {
      pricing: requestPricing,
      billingMode: "payg" as const,
      chargedAmount: requestPricing.totalPrice,
      chargedAsset: fundingDecision?.asset ?? null,
      fundingDecision
    };
  }

  async function handleRpcRequest(mode: RoutingMode, request: FastifyRequest, reply: FastifyReply) {
    const startedAt = Date.now();
    const requestPath = request.routeOptions.url ?? request.url;
    let rpcRoute = requestPath;
    let projectId: string | undefined;
    let apiKeyId: string | undefined;
    let statusCode = 500;
    let upstreamNodes: RoutedRpcNode[] = [];
    let requestSize: number | undefined;
    let responseSize: number | undefined;
    let upstreamNode: string | undefined;
    let upstreamRegion: string | undefined;
    let simulated = false;
    let cacheHit: boolean | undefined;
    let fyxvoHint: unknown;

    try {
      const payload = parseJsonRpcPayload(request.body);
      rpcRoute = summarizeRpcRoute(payload);
      const serializedPayload = serializeRpcPayload(payload);
      requestSize = Buffer.byteLength(serializedPayload, "utf8");
      const apiKey = getClientApiKey(request);
      const projectAccess = await input.repository.findProjectAccessByApiKey(apiKey);
      if (!projectAccess) {
        throw new GatewayHttpError(401, "invalid_api_key", "The provided API key is not active.");
      }

      projectId = projectAccess.project.id;
      apiKeyId = projectAccess.apiKey.id;

      // ── Response cache for read-only RPC methods ──────────────────────────
      if (!Array.isArray(payload)) {
        const singlePayload = payload as JsonRpcRequest;
        const rpcMethod = singlePayload.method;
        const cacheTtl = CACHE_TTL_MS[rpcMethod];
        if (cacheTtl !== undefined) {
          const cacheKey = `fyxvo:rpc:${rpcMethod}`;
          const cached = await input.stateStore.getCached(cacheKey).catch(() => null);
          if (cached !== null) {
            statusCode = 200;
            cacheHit = true;
            responseSize = Buffer.byteLength(cached, "utf8");
            reply.header("x-fyxvo-cache", "hit");
            reply.status(200).send(JSON.parse(cached));
            return;
          }
          cacheHit = false;
          // Cache miss — proceed normally, store result after upstream call
          const requiredScopes = gatewayRequiredApiKeyScopes(mode);
          const missingScopes = getMissingApiKeyScopes({
            grantedScopes: projectAccess.apiKey.scopes,
            requiredScopes
          });
          if (missingScopes.length > 0) {
            throw new GatewayHttpError(
              403,
              "insufficient_api_key_scope",
              mode === "priority"
                ? "This API key is not allowed to use priority relay. Issue a key with rpc:request and priority:relay."
                : "This API key is not allowed to send relay traffic. Issue a key with rpc:request.",
              {
                requiredScopes,
                missingScopes,
                grantedScopes: projectAccess.apiKey.scopes
              }
            );
          }

          const KEY_RATE_LIMIT_MAX = 300;
          const keyRateLimitDecision = await input.stateStore.acquireRateLimit({
            subject: `key:${apiKeyId}`,
            mode,
            limit: KEY_RATE_LIMIT_MAX,
            windowMs: input.env.GATEWAY_RATE_LIMIT_WINDOW_MS
          });
          setRateLimitHeaders(reply, keyRateLimitDecision);

          if (!keyRateLimitDecision.allowed) {
            throw new GatewayHttpError(429, "key_rate_limited", "API key rate limit exceeded. Wait for the current window to reset before retrying.", {
              error: "rate_limited",
              code: "key_rate_limited",
              limit: keyRateLimitDecision.limit,
              remaining: keyRateLimitDecision.remaining,
              resetAt: keyRateLimitDecision.resetAt,
              retryAfterMs: Math.max(keyRateLimitDecision.resetAt - Date.now(), 0)
            });
          }

          const rateLimitDecision = await input.stateStore.acquireRateLimit({
            subject: apiKeyId,
            mode,
            limit:
              mode === "priority"
                ? input.env.GATEWAY_PRIORITY_RATE_LIMIT_MAX
                : input.env.GATEWAY_RATE_LIMIT_MAX,
            windowMs:
              mode === "priority"
                ? input.env.GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS
                : input.env.GATEWAY_RATE_LIMIT_WINDOW_MS
          });
          setRateLimitHeaders(reply, rateLimitDecision);

          if (!rateLimitDecision.allowed) {
            throw new GatewayHttpError(429, "rate_limited", "Gateway rate limit exceeded. Wait for the current window to reset before retrying.", {
              limit: rateLimitDecision.limit,
              remaining: rateLimitDecision.remaining,
              resetAt: rateLimitDecision.resetAt,
              retryAfterMs: Math.max(rateLimitDecision.resetAt - Date.now(), 0)
            });
          }

          const simulateQuery = (request.query as Record<string, string | undefined>)["simulate"];
          const isSimulated = simulateQuery === "true" || simulateQuery === "1";

          if (isSimulated) {
            const reqId = singlePayload.id ?? null;
            let result: unknown;
            if (rpcMethod === "getHealth") {
              result = "ok";
            } else if (rpcMethod === "getSlot") {
              result = 312847293;
            } else if (rpcMethod === "getEpochInfo") {
              result = {
                absoluteSlot: 312847293,
                blockHeight: 289001122,
                epoch: 731,
                slotIndex: 1123,
                slotsInEpoch: 432000,
                transactionCount: 928112,
              };
            } else if (rpcMethod === "getVersion") {
              result = {
                "solana-core": "2.1.0-simulated",
                "feature-set": 327001001,
              };
            } else if (rpcMethod === "getBalance") {
              result = {
                context: { slot: 312847293 },
                value: 1000000000,
              };
            } else if (rpcMethod === "getAccountInfo") {
              result = {
                context: { slot: 312847293 },
                value: {
                  data: ["", "base64"],
                  executable: false,
                  lamports: 1000000000,
                  owner: "11111111111111111111111111111111",
                  rentEpoch: 18446744073709552000,
                  space: 0,
                },
              };
            } else if (rpcMethod === "getLatestBlockhash") {
              result = {
                context: { slot: 312847293 },
                value: {
                  blockhash: "SimulatedBlockhash1111111111111111111111111111",
                  lastValidBlockHeight: 312857293,
                },
              };
            } else if (rpcMethod === "simulateTransaction") {
              result = {
                context: { slot: 312847293 },
                value: {
                  err: null,
                  logs: [
                    "Program simulated111111111111111111111111111111 invoke [1]",
                    "Program simulated111111111111111111111111111111 success",
                  ],
                  accounts: null,
                  unitsConsumed: 18250,
                  returnData: null,
                },
              };
            } else {
              reply.header("x-fyxvo-simulated", "true");
              reply.header("x-fyxvo-project-id", projectAccess.project.id);
              reply.header("x-fyxvo-routing-mode", mode);
              statusCode = 200;
              reply.status(200).send({
                jsonrpc: "2.0",
                id: reqId,
                error: {
                  code: -32600,
                  message: "Method not simulated. Remove ?simulate=true to use real data.",
                },
              });
              return;
            }
            reply.header("x-fyxvo-simulated", "true");
            reply.header("x-fyxvo-project-id", projectAccess.project.id);
            reply.header("x-fyxvo-routing-mode", mode);
            statusCode = 200;
            reply.status(200).send({ jsonrpc: "2.0", id: reqId, result });
            return;
          }

          if (projectAccess.project.relayPaused) {
            throw new GatewayHttpError(
              402,
              "relay_paused",
              "Relay access is paused for this project until billing is brought back into good standing."
            );
          }

          const [fundingState, spendState, fetchedNodes] = await Promise.all([
            input.balanceResolver.getProjectFundingState(projectAccess.project),
            input.stateStore.getProjectSpend(projectAccess.project.id),
            input.repository.listUpstreamNodes(projectAccess.project.id)
          ]);
          upstreamNodes = fetchedNodes;

          const billing = await resolveRequestBilling({
            mode,
            payload,
            projectId: projectAccess.project.id,
            fundingState,
            spendState
          });
          const pricing = billing.pricing;
          const fundingDecision = billing.fundingDecision;

          if (billing.chargedAmount > 0n && !fundingDecision) {
            throw new GatewayHttpError(402, "insufficient_project_funds", "Project balance is insufficient for this request.", {
              requiredCredits: billing.chargedAmount.toString(),
              availableSolCredits: (fundingState.availableSolCredits - spendState.sol).toString(),
              availableUsdcCredits: (fundingState.availableUsdcCredits - spendState.usdc).toString()
            });
          }

          if (upstreamNodes.length === 0) {
            throw new GatewayHttpError(503, "no_upstream_nodes", "No healthy Solana upstream nodes are configured.");
          }

          const openNodes = upstreamNodes.filter((node) => !isCircuitOpen(node.endpoint));
          const routingNodes = openNodes.length > 0 ? openNodes : upstreamNodes;

          const routed = await input.router.route({
            mode,
            payload,
            serializedBody: serializeRpcPayload(payload),
            nodes: routingNodes,
            timeoutMs:
              mode === "priority"
                ? input.env.GATEWAY_PRIORITY_TIMEOUT_MS
                : input.env.GATEWAY_UPSTREAM_TIMEOUT_MS
          });

          const success = routed.statusCode < 500 && !routed.hasJsonRpcError;
          const durationMs = Date.now() - startedAt;

          if (success) {
            recordUpstreamSuccess(routed.node.endpoint);
          } else {
            recordUpstreamFailure(routed.node.endpoint);
          }

          await input.stateStore.recordMetric({
            mode,
            projectId: projectAccess.project.id,
            latencyMs: durationMs,
            success,
            upstreamFailure: false
          });

          if (success) {
            await Promise.all([
              input.repository.touchApiKeyUsage(projectAccess.apiKey.id),
              ...(billing.chargedAmount > 0n && fundingDecision
                ? [
                    input.stateStore.incrementProjectSpend(
                      projectAccess.project.id,
                      fundingDecision.asset,
                      billing.chargedAmount
                    )
                  ]
                : [])
            ]);
            // Store in cache on success
            const responseBody = injectSolanaErrorHint(routed.body);
            responseSize = Buffer.byteLength(JSON.stringify(responseBody), "utf8");
            fyxvoHint = extractFyxvoHint(responseBody);
            upstreamNode = routed.node.name;
            upstreamRegion = routed.node.region;
            await input.stateStore.setCached(cacheKey, JSON.stringify(responseBody), cacheTtl).catch(() => undefined);
          }

          app.log.info(
            {
              event: "gateway.request.completed",
              requestId: request.id,
              projectId: projectAccess.project.id,
              apiKeyId: projectAccess.apiKey.id,
              mode,
              rpcMethods: pricing.methods,
              upstreamNodeId: routed.node.id,
              upstreamEndpoint: routed.node.endpoint,
              chargedAsset: billing.chargedAsset,
              priceCredits: billing.chargedAmount.toString(),
              billingMode: billing.billingMode,
              durationMs,
              statusCode: routed.statusCode,
              success
            },
            "Gateway RPC request completed"
          );

          reply.header("x-fyxvo-project-id", projectAccess.project.id);
          reply.header("x-fyxvo-project-slug", projectAccess.project.slug);
          reply.header("x-fyxvo-upstream-node-id", routed.node.id);
          reply.header("x-fyxvo-routing-mode", mode);
          reply.header("x-fyxvo-price-credits", billing.chargedAmount.toString());
          reply.header("x-fyxvo-billing-mode", billing.billingMode);
          if (billing.chargedAsset) {
            reply.header("x-fyxvo-billed-asset", billing.chargedAsset);
          }
          reply.header("x-fyxvo-cache", "miss");

          statusCode = routed.statusCode;
          reply.status(routed.statusCode).send(injectSolanaErrorHint(routed.body));
          return;
        }
      }

      const requiredScopes = gatewayRequiredApiKeyScopes(mode);
      const missingScopes = getMissingApiKeyScopes({
        grantedScopes: projectAccess.apiKey.scopes,
        requiredScopes
      });
      if (missingScopes.length > 0) {
        throw new GatewayHttpError(
          403,
          "insufficient_api_key_scope",
          mode === "priority"
            ? "This API key is not allowed to use priority relay. Issue a key with rpc:request and priority:relay."
            : "This API key is not allowed to send relay traffic. Issue a key with rpc:request.",
          {
            requiredScopes,
            missingScopes,
            grantedScopes: projectAccess.apiKey.scopes
          }
        );
      }

      const KEY_RATE_LIMIT_MAX = 300;
      const keyRateLimitDecision = await input.stateStore.acquireRateLimit({
        subject: `key:${apiKeyId}`,
        mode,
        limit: KEY_RATE_LIMIT_MAX,
        windowMs: input.env.GATEWAY_RATE_LIMIT_WINDOW_MS
      });
      setRateLimitHeaders(reply, keyRateLimitDecision);

      if (!keyRateLimitDecision.allowed) {
        throw new GatewayHttpError(429, "key_rate_limited", "API key rate limit exceeded. Wait for the current window to reset before retrying.", {
          error: "rate_limited",
          code: "key_rate_limited",
          limit: keyRateLimitDecision.limit,
          remaining: keyRateLimitDecision.remaining,
          resetAt: keyRateLimitDecision.resetAt,
          retryAfterMs: Math.max(keyRateLimitDecision.resetAt - Date.now(), 0)
        });
      }

      const rateLimitDecision = await input.stateStore.acquireRateLimit({
        subject: apiKeyId,
        mode,
        limit:
          mode === "priority"
            ? input.env.GATEWAY_PRIORITY_RATE_LIMIT_MAX
            : input.env.GATEWAY_RATE_LIMIT_MAX,
        windowMs:
          mode === "priority"
            ? input.env.GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS
            : input.env.GATEWAY_RATE_LIMIT_WINDOW_MS
      });
      setRateLimitHeaders(reply, rateLimitDecision);

      if (!rateLimitDecision.allowed) {
        throw new GatewayHttpError(429, "rate_limited", "Gateway rate limit exceeded. Wait for the current window to reset before retrying.", {
          limit: rateLimitDecision.limit,
          remaining: rateLimitDecision.remaining,
          resetAt: rateLimitDecision.resetAt,
          retryAfterMs: Math.max(rateLimitDecision.resetAt - Date.now(), 0)
        });
      }

      const simulateQuery = (request.query as Record<string, string | undefined>)["simulate"];
      const isSimulated = simulateQuery === "true" || simulateQuery === "1";
      simulated = isSimulated;

      if (isSimulated) {
        const firstRequest = Array.isArray(payload) ? payload[0] : payload;
        const rpcMethod = firstRequest?.method;
        const reqId = firstRequest?.id ?? null;

        app.log.info(
          {
            event: "gateway.simulate.request",
            requestId: request.id,
            projectId: projectAccess.project.id,
            apiKeyId: projectAccess.apiKey.id,
            mode,
            rpcMethod,
            simulated: true,
          },
          "Gateway simulation mode request"
        );

        let result: unknown;
        if (rpcMethod === "getHealth") {
          result = "ok";
        } else if (rpcMethod === "getSlot") {
          result = 312847293;
        } else if (rpcMethod === "getEpochInfo") {
          result = {
            absoluteSlot: 312847293,
            blockHeight: 289001122,
            epoch: 731,
            slotIndex: 1123,
            slotsInEpoch: 432000,
            transactionCount: 928112,
          };
        } else if (rpcMethod === "getVersion") {
          result = {
            "solana-core": "2.1.0-simulated",
            "feature-set": 327001001,
          };
        } else if (rpcMethod === "getBalance") {
          result = { context: { slot: 312847293 }, value: 1000000000 };
        } else if (rpcMethod === "getAccountInfo") {
          result = {
            context: { slot: 312847293 },
            value: {
              data: ["", "base64"],
              executable: false,
              lamports: 1000000000,
              owner: "11111111111111111111111111111111",
              rentEpoch: 18446744073709552000,
              space: 0,
            },
          };
        } else if (rpcMethod === "getLatestBlockhash") {
          result = {
            context: { slot: 312847293 },
            value: {
              blockhash: "SimulatedBlockhash1111111111111111111111111111",
              lastValidBlockHeight: 312857293,
            },
          };
        } else if (rpcMethod === "simulateTransaction") {
          result = {
            context: { slot: 312847293 },
            value: {
              err: null,
              logs: [
                "Program simulated111111111111111111111111111111 invoke [1]",
                "Program simulated111111111111111111111111111111 success",
              ],
              accounts: null,
              unitsConsumed: 18250,
              returnData: null,
            },
          };
        } else {
          reply.header("x-fyxvo-simulated", "true");
          reply.header("x-fyxvo-project-id", projectAccess.project.id);
          reply.header("x-fyxvo-routing-mode", mode);
          statusCode = 200;
          const body = {
            jsonrpc: "2.0",
            id: reqId,
            error: {
              code: -32600,
              message: "Method not simulated. Remove ?simulate=true to use real data.",
            },
          };
          responseSize = Buffer.byteLength(JSON.stringify(body), "utf8");
          reply.status(200).send(body);
          return;
        }

        reply.header("x-fyxvo-simulated", "true");
        reply.header("x-fyxvo-project-id", projectAccess.project.id);
        reply.header("x-fyxvo-routing-mode", mode);
        statusCode = 200;
        const body = { jsonrpc: "2.0", id: reqId, result };
        responseSize = Buffer.byteLength(JSON.stringify(body), "utf8");
        reply.status(200).send(body);
        return;
      }

      if (projectAccess.project.relayPaused) {
        throw new GatewayHttpError(
          402,
          "relay_paused",
          "Relay access is paused for this project until billing is brought back into good standing."
        );
      }

      const [fundingState, spendState, fetchedNodes, budgetUsage] = await Promise.all([
        input.balanceResolver.getProjectFundingState(projectAccess.project),
        input.stateStore.getProjectSpend(projectAccess.project.id),
        input.repository.listUpstreamNodes(projectAccess.project.id),
        input.repository.getProjectBudgetUsage(projectAccess.project.id),
      ]);
      upstreamNodes = fetchedNodes;
      const billing = await resolveRequestBilling({
        mode,
        payload,
        projectId: projectAccess.project.id,
        fundingState,
        spendState
      });
      const pricing = billing.pricing;

      const nextDailySpend = budgetUsage.dailyLamports + billing.chargedAmount;
      const nextMonthlySpend = budgetUsage.monthlyLamports + billing.chargedAmount;
      const dailyBudgetExceeded =
        projectAccess.project.dailyBudgetLamports !== null &&
        nextDailySpend > projectAccess.project.dailyBudgetLamports;
      const monthlyBudgetExceeded =
        projectAccess.project.monthlyBudgetLamports !== null &&
        nextMonthlySpend > projectAccess.project.monthlyBudgetLamports;

      if (projectAccess.project.budgetHardStop && (dailyBudgetExceeded || monthlyBudgetExceeded)) {
        throw new GatewayHttpError(
          402,
          "budget_exceeded",
          "This project has exceeded its configured budget for billable requests. Simulation mode is still allowed.",
          {
            dailyBudgetLamports: projectAccess.project.dailyBudgetLamports?.toString() ?? null,
            dailySpendLamports: budgetUsage.dailyLamports.toString(),
            monthlyBudgetLamports: projectAccess.project.monthlyBudgetLamports?.toString() ?? null,
            monthlySpendLamports: budgetUsage.monthlyLamports.toString(),
            attemptedRequestLamports: billing.chargedAmount.toString(),
            simulationStillAvailable: true,
          }
        );
      }

      const budgetWarningThresholdPct = projectAccess.project.budgetWarningThresholdPct ?? 80;
      const dailyBudgetWarning =
        projectAccess.project.dailyBudgetLamports !== null &&
        projectAccess.project.dailyBudgetLamports > 0n &&
        Number((nextDailySpend * 100n) / projectAccess.project.dailyBudgetLamports) >= budgetWarningThresholdPct;
      const monthlyBudgetWarning =
        projectAccess.project.monthlyBudgetLamports !== null &&
        projectAccess.project.monthlyBudgetLamports > 0n &&
        Number((nextMonthlySpend * 100n) / projectAccess.project.monthlyBudgetLamports) >= budgetWarningThresholdPct;

      const fundingDecision = billing.fundingDecision;

      if (billing.chargedAmount > 0n && !fundingDecision) {
        throw new GatewayHttpError(402, "insufficient_project_funds", "Project balance is insufficient for this request.", {
          requiredCredits: billing.chargedAmount.toString(),
          availableSolCredits: (fundingState.availableSolCredits - spendState.sol).toString(),
          availableUsdcCredits: (fundingState.availableUsdcCredits - spendState.usdc).toString()
        });
      }

      if (upstreamNodes.length === 0) {
        throw new GatewayHttpError(503, "no_upstream_nodes", "No healthy Solana upstream nodes are configured.");
      }

      // Filter nodes whose circuit is open before routing
      const openNodes = upstreamNodes.filter((node) => !isCircuitOpen(node.endpoint));
      const routingNodes = openNodes.length > 0 ? openNodes : upstreamNodes;

      const routed = await input.router.route({
        mode,
        payload,
        serializedBody: serializeRpcPayload(payload),
        nodes: routingNodes,
        timeoutMs:
          mode === "priority"
            ? input.env.GATEWAY_PRIORITY_TIMEOUT_MS
            : input.env.GATEWAY_UPSTREAM_TIMEOUT_MS
      });

      const success = routed.statusCode < 500 && !routed.hasJsonRpcError;
      const durationMs = Date.now() - startedAt;

      // Record circuit breaker outcome for the used upstream node
      if (success) {
        recordUpstreamSuccess(routed.node.endpoint);
      } else {
        recordUpstreamFailure(routed.node.endpoint);
      }

      await input.stateStore.recordMetric({
        mode,
        projectId: projectAccess.project.id,
        latencyMs: durationMs,
        success,
        upstreamFailure: false
      });

      if (success) {
        await Promise.all([
          input.repository.touchApiKeyUsage(projectAccess.apiKey.id),
          ...(billing.chargedAmount > 0n && fundingDecision
            ? [
                input.stateStore.incrementProjectSpend(
                  projectAccess.project.id,
                  fundingDecision.asset,
                  billing.chargedAmount
                )
              ]
            : [])
        ]);
      }

      app.log.info(
        {
          event: "gateway.request.completed",
          requestId: request.id,
          projectId: projectAccess.project.id,
          apiKeyId: projectAccess.apiKey.id,
          mode,
          rpcMethods: pricing.methods,
          upstreamNodeId: routed.node.id,
          upstreamEndpoint: routed.node.endpoint,
          chargedAsset: billing.chargedAsset,
          priceCredits: billing.chargedAmount.toString(),
          billingMode: billing.billingMode,
          durationMs,
          statusCode: routed.statusCode,
          success
        },
        "Gateway RPC request completed"
      );

      upstreamNode = routed.node.name;
      upstreamRegion = routed.node.region;
      cacheHit = false;
      reply.header("x-fyxvo-project-id", projectAccess.project.id);
      reply.header("x-fyxvo-project-slug", projectAccess.project.slug);
      reply.header("x-fyxvo-upstream-node-id", routed.node.id);
      reply.header("x-fyxvo-routing-mode", mode);
      reply.header("x-fyxvo-price-credits", billing.chargedAmount.toString());
      reply.header("x-fyxvo-billing-mode", billing.billingMode);
      if (billing.chargedAsset) {
        reply.header("x-fyxvo-billed-asset", billing.chargedAsset);
      }
      if (dailyBudgetWarning || monthlyBudgetWarning) {
        reply.header("x-fyxvo-budget-warning", "true");
      }

      statusCode = routed.statusCode;
      const responseBody = injectSolanaErrorHint(routed.body);
      responseSize = Buffer.byteLength(JSON.stringify(responseBody), "utf8");
      fyxvoHint = extractFyxvoHint(responseBody);
      reply.status(routed.statusCode).send(responseBody);
    } catch (error) {
      const normalizedError = normalizeGatewayRuntimeError(error);
      const durationMs = Date.now() - startedAt;
      if (projectId) {
        await input.stateStore.recordMetric({
          mode,
          projectId,
          latencyMs: durationMs,
          success: false,
          upstreamFailure:
            normalizedError instanceof GatewayHttpError
              ? normalizedError.code === "upstream_unavailable"
              : true
        });
      }

      if (
        normalizedError instanceof Error &&
        !(normalizedError instanceof GatewayHttpError) &&
        normalizedError.message.includes("All upstream nodes failed")
      ) {
        statusCode = 503;
        // Record a circuit breaker failure for all nodes that were tried
        for (const node of upstreamNodes) {
          recordUpstreamFailure(node.endpoint);
        }
        app.log.warn(
          {
            event: "gateway.upstream.exhausted",
            requestId: request.id,
            projectId,
            apiKeyId,
            mode,
            error: normalizedError.message
          },
          "Gateway upstream routing exhausted"
        );
        await sendGatewayError(
          app,
          reply,
          request,
          new GatewayHttpError(503, "upstream_unavailable", "All configured upstream nodes failed for this request.", {
            message: normalizedError.message
          })
        );
      } else {
        statusCode = normalizedError instanceof GatewayHttpError ? normalizedError.statusCode : 500;
        await sendGatewayError(app, reply, request, normalizedError);
      }
    } finally {
      const durationMs = Date.now() - startedAt;
      try {
        await input.repository.recordRequestLog({
          requestId: request.id,
          route: rpcRoute,
          method: request.method,
          statusCode,
          durationMs,
          ...(apiKeyId ? { apiKeyId } : {}),
          ...(projectId ? { projectId } : {}),
          ...(request.ip ? { ipAddress: request.ip } : {}),
          ...(typeof request.headers["user-agent"] === "string"
            ? { userAgent: request.headers["user-agent"] }
            : {}),
          ...(upstreamRegion ? { region: upstreamRegion } : {}),
          ...(typeof requestSize === "number" ? { requestSize } : {}),
          ...(typeof responseSize === "number" ? { responseSize } : {}),
          ...(upstreamNode ? { upstreamNode } : {}),
          mode,
          simulated,
          ...(typeof cacheHit === "boolean" ? { cacheHit } : {}),
          ...(fyxvoHint !== undefined ? { fyxvoHint } : {})
        });
      } catch (error) {
        requestLogger(app, error);
      }
    }
  }

  app.get("/", async () => ({
    service: "Fyxvo Gateway",
    version: "0.1.0",
    status: "ok",
    description: "Solana JSON-RPC relay for funded devnet projects.",
    usage: "Send POST requests with content-type: application/json and x-api-key header.",
    endpoints: {
      standard: "POST /rpc — requires rpc:request scope",
      priority: "POST /priority — requires rpc:request and priority:relay scopes"
    },
    docs: "https://www.fyxvo.com/docs",
    health: "/health",
    status_url: "/v1/status"
  }));

  app.get("/rpc", async () => ({
    service: "Fyxvo Gateway — Standard RPC",
    version: "0.1.0",
    usage: "This endpoint only accepts POST requests.",
    note: "Provide content-type: application/json and x-api-key in your request headers.",
    example: {
      method: "POST /rpc",
      headers: {
        "content-type": "application/json",
        "x-api-key": "YOUR_API_KEY"
      },
      body: { jsonrpc: "2.0", id: 1, method: "getHealth" }
    },
    docs: "https://www.fyxvo.com/docs"
  }));

  app.get("/priority", async () => ({
    service: "Fyxvo Gateway — Priority Relay",
    version: "0.1.0",
    usage: "This endpoint only accepts POST requests.",
    note: "Requires rpc:request and priority:relay scopes. Provide content-type: application/json and x-api-key headers.",
    example: {
      method: "POST /priority",
      headers: {
        "content-type": "application/json",
        "x-api-key": "YOUR_PRIORITY_API_KEY"
      },
      body: { jsonrpc: "2.0", id: 1, method: "getSlot" }
    },
    docs: "https://www.fyxvo.com/docs"
  }));

  app.get("/health", async (_request, reply) => {
    const uptimeMs = Date.now() - STARTUP_TIME_MS;
    const commit = getRuntimeCommitSha();

    const redisStart = Date.now();
    const redis = await input.stateStore.ping().catch(() => false);
    const redisResponseTimeMs = Date.now() - redisStart;

    const [database, upstreamNodes, metrics] = await Promise.all([
      input.repository.ping().catch(() => false),
      input.repository.listUpstreamNodes().catch(() => []),
      input.stateStore.getMetricsSnapshot().catch(() => ({
        standard: {
          requests: 0,
          successes: 0,
          errors: 0,
          upstreamFailures: 0,
          totalLatencyMs: 0,
          averageLatencyMs: 0,
          successRate: 0
        },
        priority: {
          requests: 0,
          successes: 0,
          errors: 0,
          upstreamFailures: 0,
          totalLatencyMs: 0,
          averageLatencyMs: 0,
          successRate: 0
        }
      }))
    ]);

    const upstreamStart = Date.now();
    const upstreamOk = upstreamNodes.length
      ? await input.router.ping(upstreamNodes, input.env.GATEWAY_HEALTHCHECK_TIMEOUT_MS).catch(() => false)
      : false;
    const upstreamResponseTimeMs = Date.now() - upstreamStart;

    const primaryNode = upstreamNodes[0];
    const ok = database && redis && upstreamOk;
    const summary = metricsSummary(metrics);

    reply.status(ok ? 200 : 503).send({
      status: ok ? "ok" : "degraded",
      service: "gateway",
      version: "v1",
      commit,
      environment: input.env.FYXVO_ENV,
      region: gatewayRegion,
      uptime: Math.floor(uptimeMs / 1000),
      solanaCluster: input.env.SOLANA_CLUSTER,
      requests: {
        total: summary.totals.requests,
        sinceStartup: true
      },
      dependencies: {
        redis: {
          ok: redis as boolean,
          responseTimeMs: redisResponseTimeMs
        },
        upstream: {
          ok: upstreamOk,
          responseTimeMs: upstreamResponseTimeMs,
          nodeCount: upstreamNodes.length,
          ...(primaryNode ? { url: primaryNode.endpoint } : {})
        }
      },
      database,
      metrics: summary,
      upstreamCircuits: Array.from(upstreamFailures.entries()).map(([url, state]) => ({
        url,
        open: state.openUntil > Date.now(),
        failures: state.count,
        nextRetryAt: state.openUntil > 0 ? new Date(state.openUntil).toISOString() : null,
      })),
      cache: { cachedMethods: Object.keys(CACHE_TTL_MS), enabled: true },
      timestamp: new Date().toISOString()
    });
  });

  app.get("/v1/status", async () => {
    const [metrics, upstreamNodes] = await Promise.all([
      input.stateStore.getMetricsSnapshot(),
      input.repository.listUpstreamNodes()
    ]);

    return {
      status: "ok",
      service: "fyxvo-gateway",
      version: "v1",
      commit: getRuntimeCommitSha(),
      timestamp: new Date().toISOString(),
      environment: input.env.FYXVO_ENV,
      region: gatewayRegion,
      solanaCluster: input.env.SOLANA_CLUSTER,
      programId: input.env.FYXVO_PROGRAM_ID,
      controlPlaneOrigin: input.env.API_ORIGIN,
      nodeCount: upstreamNodes.length,
      pricing: {
        standard: input.env.GATEWAY_STANDARD_PRICE_LAMPORTS,
        priority: input.env.GATEWAY_PRIORITY_PRICE_LAMPORTS,
        writeMultiplier: input.env.GATEWAY_WRITE_METHOD_MULTIPLIER
      },
      acceptedAssets: {
        sol: true,
        usdcEnabled: input.env.FYXVO_ENABLE_USDC
      },
      scopeEnforcement: {
        enabled: true,
        standardRequiredScopes: gatewayRequiredApiKeyScopes("standard"),
        priorityRequiredScopes: gatewayRequiredApiKeyScopes("priority")
      },
      metrics: metricsSummary(metrics)
    };
  });

  app.get("/v1/metrics", async () => ({
    item: metricsSummary(await input.stateStore.getMetricsSnapshot())
  }));

  app.post("/", async (request, reply) => handleRpcRequest("standard", request, reply));
  app.post("/rpc", async (request, reply) => handleRpcRequest("standard", request, reply));
  app.post("/priority", async (request, reply) => handleRpcRequest("priority", request, reply));
  app.post("/priority-rpc", async (request, reply) => handleRpcRequest("priority", request, reply));

  return app;
}

export async function buildProductionGatewayApp(input: {
  readonly env: GatewayEnv;
  readonly prismaClient?: PrismaClientType;
}) {
  const repository = new PrismaGatewayRepository(
    input.prismaClient ?? prisma,
    input.env.SOLANA_CLUSTER,
    input.env.GATEWAY_UPSTREAM_RPC_URLS
  );
  const stateStore = new RedisGatewayStateStore({
    url: input.env.REDIS_URL,
    prefix: input.env.GATEWAY_REDIS_PREFIX
  });
  const balanceResolver = new OnChainProjectBalanceResolver({
    rpcUrl: input.env.SOLANA_RPC_URL,
    cacheMs: input.env.GATEWAY_BALANCE_CACHE_MS
  });
  const router = new HttpUpstreamRouter({
    failureCooldownMs: input.env.GATEWAY_NODE_FAILURE_COOLDOWN_MS
  });

  return buildGatewayApp({
    env: input.env,
    repository,
    stateStore,
    balanceResolver,
    router,
    logger: true
  });
}
