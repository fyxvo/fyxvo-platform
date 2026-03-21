import { createHash, randomBytes, randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import type { ApiEnv } from "@fyxvo/config";
import {
  normalizeApiKeyScopes,
  resolveAuthorityPlan,
  supportedApiKeyScopes,
  getSolanaNetworkConfig,
  resolveAllowedCorsOrigins
} from "@fyxvo/config";
import { databaseHealthcheck } from "@fyxvo/database";
import bs58 from "bs58";
import type { PrismaClientType } from "@fyxvo/database";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { ProtocolReadinessError, SolanaBlockchainClient } from "./blockchain.js";
import { hashRequestBody, PrismaApiRepository } from "./repository.js";
import type {
  AdminOverview,
  ApiRepository,
  AuthenticatedUser,
  BlockchainClient,
  JwtClaims,
  RequestLogInput,
  ProjectWithOwner
} from "./types.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtClaims;
    user: JwtClaims;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: AuthenticatedUser;
  }
}

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}

const challengeSchema = z.object({
  walletAddress: z.string().trim().min(32)
});

const verifySchema = z.object({
  walletAddress: z.string().trim().min(32),
  message: z.string().min(1),
  signature: z.string().min(1),
  referralCode: z.string().optional()
});

const createProjectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(128),
  description: z.string().trim().max(500).optional(),
  templateType: z.enum(["blank", "defi", "indexing"]).optional(),
});

const updateProjectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().trim().min(2).max(128).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  displayName: z.string().trim().max(128).nullable().optional(),
  lowBalanceThresholdSol: z.number().min(0).max(1000).nullable().optional(),
  dailyRequestAlertThreshold: z.number().int().min(0).max(10_000_000).nullable().optional(),
  archivedAt: z.string().datetime().optional().nullable(),
  environment: z.enum(["development", "staging", "production"]).optional(),
  starred: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  githubUrl: z.string().url().max(256).nullable().optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z.string().trim().min(3).max(64).regex(/^[a-z0-9-]+$/).nullable().optional(),
  leaderboardVisible: z.boolean().optional(),
});

const createApiKeySchema = z.object({
  label: z.string().trim().min(2).max(100),
  scopes: z.array(z.enum(supportedApiKeyScopes)).min(1),
  expiresAt: z.string().datetime().optional()
});

const interestAreaValues = [
  "rpc",
  "priority-relay",
  "analytics",
  "operator-participation"
] as const;

const feedbackCategoryValues = [
  "BUG_REPORT",
  "SUPPORT_REQUEST",
  "ONBOARDING_FRICTION",
  "PRODUCT_FEEDBACK"
] as const;

const createInterestSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  role: z.string().trim().min(2).max(80),
  team: z.string().trim().max(120).optional(),
  useCase: z.string().trim().min(10).max(2000),
  expectedRequestVolume: z.string().trim().min(2).max(120),
  interestAreas: z.array(z.enum(interestAreaValues)).min(1),
  operatorInterest: z.boolean().default(false),
  source: z.string().trim().min(2).max(40).default("web")
});

const createFeedbackSubmissionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  role: z.string().trim().max(80).optional(),
  team: z.string().trim().max(120).optional(),
  category: z.enum(feedbackCategoryValues),
  message: z.string().trim().min(12).max(4000),
  source: z.string().trim().min(2).max(40).default("web"),
  page: z.string().trim().max(240).optional(),
  projectId: z.string().uuid().optional(),
  walletAddress: z.string().trim().min(32).optional()
});

const createLaunchEventSchema = z.object({
  name: z.enum([
    "landing_cta_clicked",
    "wallet_connect_intent",
    "project_creation_started",
    "funding_flow_started",
    "api_key_created",
    "interest_form_submitted"
  ]),
  source: z.string().trim().min(2).max(60),
  projectId: z.string().uuid().optional()
});

const prepareFundingSchema = z.object({
  asset: z.enum(["SOL", "USDC"]),
  amount: z
    .union([z.string(), z.number(), z.bigint()])
    .transform((value) => BigInt(value))
    .refine((value) => value > 0n, "Amount must be greater than zero."),
  funderWalletAddress: z.string().trim().min(32),
  funderTokenAccount: z.string().trim().min(32).optional()
});

const verifyProjectActivationSchema = z.object({
  signature: z.string().trim().min(32)
});

const verifyFundingSchema = z.object({
  fundingRequestId: z.string().uuid(),
  signature: z.string().trim().min(32)
});

function walletMessage(walletAddress: string, nonce: string): string {
  return [
    "Fyxvo Authentication",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    "By signing this message you prove wallet ownership and start a JWT-backed session.",
    "No private keys are ever transmitted to or stored by Fyxvo."
  ].join("\n");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function ensureWalletAddress(value: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch (error) {
    throw new HttpError(400, "invalid_wallet", "The wallet address is not a valid Solana public key.", error);
  }
}

function requireUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.currentUser) {
    throw new HttpError(401, "unauthorized", "Authentication is required for this endpoint.");
  }

  return request.currentUser;
}

function requireAdmin(user: AuthenticatedUser) {
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    throw new HttpError(403, "forbidden", "Admin privileges are required for this endpoint.");
  }
}

function canAccessProject(user: AuthenticatedUser, project: ProjectWithOwner): boolean {
  return user.role === "OWNER" || user.role === "ADMIN" || project.ownerId === user.id;
}

function getRoutePattern(request: FastifyRequest): string {
  return request.routeOptions.url ?? request.url;
}

function getRequestErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return null;
  }

  const statusCode = error.statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

function getRequestErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error;
    if (typeof message === "string") {
      return message;
    }
  }

  return "The request could not be processed.";
}

function isRateLimitPayload(
  error: unknown
): error is { code: "rate_limited"; error: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "rate_limited" &&
    "error" in error &&
    typeof error.error === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

function serializeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, candidate) =>
      typeof candidate === "bigint" ? candidate.toString() : candidate
    )
  ) as T;
}

function normalizeBlockchainError(error: unknown): HttpError | null {
  if (error instanceof ProtocolReadinessError) {
    return new HttpError(503, "protocol_not_ready", error.message, {
      readiness: error.readiness
    });
  }

  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message.includes("already exists on chain")) {
    return new HttpError(409, "project_already_activated", error.message);
  }

  if (error.message.includes("has not been activated on chain yet")) {
    return new HttpError(409, "project_not_activated", error.message);
  }

  if (error.message.includes("Timed out while waiting for Solana to confirm")) {
    return new HttpError(504, "chain_confirmation_timeout", error.message);
  }

  if (error.message.includes("Solana rejected the transaction")) {
    return new HttpError(400, "chain_rejected", error.message);
  }

  if (error.message.includes("project account is still missing on chain")) {
    return new HttpError(409, "project_not_activated", error.message);
  }

  return null;
}

function validateCreatedApiKeyScopes(scopes: readonly string[]) {
  const normalized = normalizeApiKeyScopes(scopes);
  const missing: string[] = [];

  if (normalized.includes("priority:relay") && !normalized.includes("rpc:request")) {
    missing.push("rpc:request");
  }

  if (normalized.includes("project:write") && !normalized.includes("project:read")) {
    missing.push("project:read");
  }

  if (missing.length > 0) {
    throw new HttpError(
      400,
      "invalid_api_key_scope_set",
      "The requested API key scope set is incomplete for the access level requested.",
      {
        grantedScopes: normalized,
        requiredScopes: Array.from(new Set(missing))
      }
    );
  }

  return normalized;
}

function buildAdminProtocolOverview(input: {
  readonly env: ApiEnv;
  readonly readiness: Awaited<ReturnType<BlockchainClient["getProtocolReadiness"]>> | null;
}) {
  const authorityPlan = resolveAuthorityPlan({
    source: process.env,
    protocolAuthorityFallback: input.env.FYXVO_ADMIN_AUTHORITY
  });
  const treasury = input.readiness?.treasury;
  const reconciliationWarnings: string[] = [];

  if (!input.readiness?.ready) {
    reconciliationWarnings.push(
      "Protocol readiness is not fully green. Treasury reconciliation should not be treated as launch-ready until protocol readiness passes."
    );
  }
  if (!treasury) {
    reconciliationWarnings.push(
      "Treasury account data is unavailable. Fee and reserve reconciliation cannot be verified from the admin surface."
    );
  } else {
    if (treasury.protocolSolFeesOwed > treasury.solBalance) {
      reconciliationWarnings.push(
        "Tracked SOL fees owed exceed the treasury SOL balance. Reconcile on-chain state and relay spend before proceeding."
      );
    }
    if (treasury.protocolUsdcFeesOwed > treasury.usdcBalance) {
      reconciliationWarnings.push(
        "Tracked USDC fees owed exceed the treasury USDC balance. Reconcile the treasury vault before proceeding."
      );
    }
    if (treasury.reservedSolRewards + treasury.protocolSolFeesOwed > treasury.solBalance) {
      reconciliationWarnings.push(
        "Reserved SOL rewards plus SOL fees owed are approaching or exceeding the treasury balance."
      );
    }
    if (treasury.reservedUsdcRewards + treasury.protocolUsdcFeesOwed > treasury.usdcBalance) {
      reconciliationWarnings.push(
        "Reserved USDC rewards plus USDC fees owed are approaching or exceeding the treasury vault balance."
      );
    }
  }

  return {
    readiness: input.readiness,
    authorityPlan,
    treasury: {
      solBalance: treasury?.solBalance.toString() ?? null,
      usdcBalance: treasury?.usdcBalance.toString() ?? null,
      reservedSolRewards: treasury?.reservedSolRewards.toString() ?? null,
      reservedUsdcRewards: treasury?.reservedUsdcRewards.toString() ?? null,
      protocolSolFeesOwed: treasury?.protocolSolFeesOwed.toString() ?? null,
      protocolUsdcFeesOwed: treasury?.protocolUsdcFeesOwed.toString() ?? null,
      feeWithdrawalReady: false,
      reconciliationWarnings
    }
  } satisfies AdminOverview["protocol"];
}

async function withBlockchainErrors<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    const normalized = normalizeBlockchainError(error);
    if (normalized) {
      throw normalized;
    }
    throw error;
  }
}

function sanitizeErrorForLogs(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      type: typeof error
    };
  }

  return {
    name: error.name,
    message: error.message,
    ...(getRequestErrorStatus(error) !== null ? { statusCode: getRequestErrorStatus(error) } : {})
  };
}

async function withIdempotency<T extends Record<string, unknown>>(
  repository: ApiRepository,
  request: FastifyRequest,
  actorKey: string,
  action: () => Promise<{ statusCode: number; body: T }>
) {
  const idempotencyKey = request.headers["idempotency-key"];
  const route = getRoutePattern(request);
  const method = request.method;

  if (typeof idempotencyKey !== "string" || idempotencyKey.length === 0) {
    return action();
  }

  const requestHash = hashRequestBody(request.body);
  const record = await repository.getIdempotencyRecord({
    key: idempotencyKey,
    route,
    method,
    actorKey
  });

  if (record) {
    if (record.requestHash !== requestHash) {
      throw new HttpError(
        409,
        "idempotency_conflict",
        "The same idempotency key was used with a different request payload."
      );
    }

    return {
      statusCode: record.statusCode,
      body: record.responseBody as T
    };
  }

  const response = await action();
  const responseBody = serializeForJson(response.body);
  await repository.saveIdempotencyRecord({
    key: idempotencyKey,
    route,
    method,
    actorKey,
    requestHash,
    statusCode: response.statusCode,
    responseBody: responseBody,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  return {
    statusCode: response.statusCode,
    body: responseBody
  };
}

export async function buildApiApp(input: {
  readonly env: ApiEnv;
  readonly repository: ApiRepository;
  readonly blockchain: BlockchainClient;
  readonly healthcheck?: () => Promise<boolean>;
  readonly logger?: boolean;
}) {
  const cspViolations: Array<{ blockedUri: string; violatedDirective: string; timestamp: string; receivedAt: string }> = [];

  const app = Fastify({
    logger: input.logger ?? false
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

  await app.register(jwt, {
    secret: input.env.API_JWT_SECRET
  });

  await app.register(rateLimit, {
    global: true,
    max: input.env.API_RATE_LIMIT_MAX,
    timeWindow: input.env.API_RATE_LIMIT_WINDOW_MS,
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true
    },
    errorResponseBuilder: (request, context) => ({
      code: "rate_limited",
      error: "Too Many Requests",
      message: "Rate limit exceeded. Wait for the current window to reset before retrying.",
      requestId: request.id,
      retryAfterMs: context.after
    })
  });

  app.addHook("preSerialization", async (_request, _reply, payload) => {
    if (payload === undefined) {
      return payload;
    }

    return serializeForJson(payload);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.statusCode).send({
        code: error.code,
        error: error.message,
        details: error.details,
        requestId: request.id
      });
      return;
    }

    if (error instanceof z.ZodError) {
      reply.status(400).send({
        code: "validation_error",
        error: "The request payload did not match the expected shape.",
        details: error.flatten(),
        requestId: request.id
      });
      return;
    }

    if (isRateLimitPayload(error)) {
      reply.status(429).send(error);
      return;
    }

    const requestErrorStatus = getRequestErrorStatus(error);
    if (requestErrorStatus !== null && requestErrorStatus < 500) {
      reply.status(requestErrorStatus).send({
        code: "request_error",
        error: getRequestErrorMessage(error),
        requestId: request.id
      });
      return;
    }

    requestLogger(app, error);
    reply.status(500).send({
      code: "internal_error",
      error: "An unexpected error occurred.",
      requestId: request.id
    });
  });

  app.addHook("preHandler", async (request) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return;
    }

    try {
      const payload = await request.jwtVerify<JwtClaims>();
      const user = await input.repository.findUserById(payload.sub);
      if (!user || user.sessionVersion !== payload.sessionVersion) {
        throw new HttpError(401, "session_expired", "The session is no longer valid.");
      }

      request.currentUser = user;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(401, "invalid_token", "The provided JWT is invalid or expired. Re-authenticate via /v1/auth/challenge and /v1/auth/verify to get a fresh token.");
    }
  });

  app.addHook("onResponse", async (request, reply) => {
    app.log.info(
      {
        event: "api.request.completed",
        requestId: request.id,
        method: request.method,
        route: getRoutePattern(request),
        statusCode: reply.statusCode,
        durationMs: Number(reply.elapsedTime.toFixed(0)),
        userId: request.currentUser?.id
      },
      "API request completed"
    );

    try {
      const idempotencyKeyHeader =
        typeof request.headers["idempotency-key"] === "string"
          ? request.headers["idempotency-key"]
          : undefined;
      const projectId =
        typeof request.params === "object" &&
        request.params &&
        "projectId" in request.params &&
        typeof request.params.projectId === "string"
          ? request.params.projectId
          : undefined;
      const userAgentHeader = request.headers["user-agent"];
      const requestLog: RequestLogInput = {
        service: "api",
        route: getRoutePattern(request),
        method: request.method,
        statusCode: reply.statusCode,
        durationMs: Number(reply.elapsedTime.toFixed(0)),
        ipAddress: request.ip,
        ...(request.id ? { requestId: request.id } : {}),
        ...(idempotencyKeyHeader ? { idempotencyKey: idempotencyKeyHeader } : {}),
        ...(projectId ? { projectId } : {}),
        ...(request.currentUser?.id ? { userId: request.currentUser.id } : {}),
        ...(typeof userAgentHeader === "string" ? { userAgent: userAgentHeader } : {})
      };

      await input.repository.recordRequestLog(requestLog);
    } catch (error) {
      requestLogger(app, error);
    }
  });

  app.get("/", async () => ({
    service: "Fyxvo API",
    version: "0.1.0",
    status: "ok",
    description: "Wallet-authenticated control plane for Fyxvo devnet infrastructure.",
    network: "solana-devnet",
    docs: "https://www.fyxvo.com/docs",
    health: "/health",
    status_url: "/v1/status"
  }));

  app.get("/health", async () => {
    const startTime = process.hrtime.bigint();
    const uptime = process.uptime();

    // Check database
    const dbStart = Date.now();
    let dbOk = false;
    let dbMs = 0;
    try {
      dbOk = await (input.healthcheck ?? (() => Promise.resolve(true)))();
      dbMs = Date.now() - dbStart;
    } catch {
      dbMs = Date.now() - dbStart;
    }

    // Check Redis
    const redisStart = Date.now();
    let redisOk = false;
    let redisMs = 0;
    try {
      const redisClient = (await import("redis")).createClient({ url: input.env.REDIS_URL });
      await redisClient.connect();
      await redisClient.ping();
      await redisClient.quit();
      redisOk = true;
      redisMs = Date.now() - redisStart;
    } catch {
      redisMs = Date.now() - redisStart;
    }

    // Check Solana RPC
    const chainStart = Date.now();
    let chainOk = false;
    let chainMs = 0;
    let chainReadiness: { ready: boolean } | null = null;
    try {
      chainReadiness = await input.blockchain.getProtocolReadiness();
      chainOk = chainReadiness?.ready ?? false;
      chainMs = Date.now() - chainStart;
    } catch {
      chainMs = Date.now() - chainStart;
    }

    const overallOk = dbOk; // Database is the critical dependency; Redis/chain degradation is reported but doesn't fail health
    void startTime; // suppress unused warning

    return {
      status: overallOk ? "ok" : "degraded",
      service: "api",
      uptime: Math.round(uptime),
      assistantAvailable: !!input.env.ANTHROPIC_API_KEY,
      dependencies: {
        database: { ok: dbOk, responseTimeMs: dbMs },
        redis: { ok: redisOk, responseTimeMs: redisMs },
        solana: { ok: chainOk, responseTimeMs: chainMs, protocolReady: chainReadiness?.ready ?? false },
      },
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/v1/status", async () => {
    const network = getSolanaNetworkConfig(input.env.SOLANA_CLUSTER);
    const readiness = await input.blockchain.getProtocolReadiness().catch(() => null);
    const authorityPlan = resolveAuthorityPlan({
      source: process.env,
      protocolAuthorityFallback: input.env.FYXVO_ADMIN_AUTHORITY
    });
    return {
      service: "fyxvo-api",
      environment: input.env.FYXVO_ENV,
      solanaCluster: input.env.SOLANA_CLUSTER,
      solanaRpcUrl: network.rpcUrl,
      programId: input.env.FYXVO_PROGRAM_ID,
      adminAuthority: input.env.FYXVO_ADMIN_AUTHORITY,
      authorityPlan,
      acceptedAssets: {
        sol: true,
        usdcEnabled: input.env.FYXVO_ENABLE_USDC,
        usdcMintAddress: input.env.USDC_MINT_ADDRESS
      },
      protocolReadiness: readiness,
      dependencies: {
        databaseConfigured: input.env.DATABASE_URL.startsWith("postgresql://"),
        redisConfigured: input.env.REDIS_URL.startsWith("redis://")
      }
    };
  });

  // In-memory caches for public network endpoints (per-instance; TTL resets on restart)
  let networkStatsCache: { data: Awaited<ReturnType<typeof input.repository.getNetworkStats>>; expiresAt: number } | null = null;
  let serviceHealthCache: { data: Awaited<ReturnType<typeof input.repository.getServiceHealthHistory>>; expiresAt: number } | null = null;
  const NETWORK_STATS_TTL_MS = 30_000;
  const SERVICE_HEALTH_TTL_MS = 60_000;

  app.get("/v1/network/stats", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (_request, reply) => {
    const now = Date.now();
    if (!networkStatsCache || now >= networkStatsCache.expiresAt) {
      networkStatsCache = {
        data: await input.repository.getNetworkStats(),
        expiresAt: now + NETWORK_STATS_TTL_MS
      };
    }

    reply.header("cache-control", "public, max-age=30, stale-while-revalidate=60");
    return networkStatsCache.data;
  });

  app.get("/v1/network/service-health", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (_request, reply) => {
    const now = Date.now();
    if (!serviceHealthCache || now >= serviceHealthCache.expiresAt) {
      serviceHealthCache = {
        data: await input.repository.getServiceHealthHistory(48),
        expiresAt: now + SERVICE_HEALTH_TTL_MS
      };
    }

    reply.header("cache-control", "public, max-age=60, stale-while-revalidate=120");
    return serviceHealthCache.data;
  });

  app.get("/v1/incidents", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (_request, reply) => {
    const incidents = await input.repository.listIncidents(50);
    reply.header("cache-control", "public, max-age=60, stale-while-revalidate=120");
    return { incidents };
  });

  app.get("/v1/referral/stats", async (request) => {
    const user = requireUser(request);
    const stats = await input.repository.getReferralStats(user.id);
    return stats;
  });

  app.post("/v1/referral/generate", async (request) => {
    const user = requireUser(request);
    const stats = await input.repository.getReferralStats(user.id);
    if (stats.referralCode) {
      return { referralCode: stats.referralCode };
    }
    const referralCode = await input.repository.generateReferralCode(user.id);
    return { referralCode };
  });

  app.post("/v1/referral/click/:code", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const { code } = request.params as { code: string };
    if (!code || !/^[a-z0-9]{8}$/.test(code)) {
      return reply.status(400).send({ error: "Invalid referral code" });
    }
    const result = await input.repository.recordReferralClick(code);
    if (!result) {
      return reply.status(404).send({ error: "Referral code not found" });
    }
    return { success: true };
  });

  app.get("/v1/me", async (request) => {
    const user = requireUser(request);
    const [projects, fullUser] = await Promise.all([
      input.repository.listProjects(user),
      input.repository.findUserById(user.id),
    ]);
    return {
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        onboardingDismissed: fullUser?.onboardingDismissed ?? false,
        createdAt: fullUser?.createdAt?.toISOString() ?? null,
        tosAcceptedAt: fullUser?.tosAcceptedAt?.toISOString() ?? null,
        emailVerified: fullUser?.emailVerified ?? false,
      },
      projectCount: projects.length
    };
  });

  const updateMeSchema = z.object({
    onboardingDismissed: z.boolean().optional(),
    email: z.string().email().max(256).nullable().optional(),
  });

  app.patch("/v1/me", async (request, reply) => {
    const user = requireUser(request);

    const parsed = updateMeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    const { onboardingDismissed, email } = parsed.data;

    await input.repository.updateUser(user.id, {
      ...(onboardingDismissed !== undefined ? { onboardingDismissed } : {}),
      ...(email !== undefined ? { email } : {}),
    });

    return reply.send({ success: true });
  });

  app.post("/v1/me/accept-tos", async (request, reply) => {
    const user = requireUser(request);
    await input.repository.acceptTos(user.id);
    return reply.send({ success: true });
  });

  app.post("/v1/auth/challenge", async (request, reply) => {
    const body = challengeSchema.parse(request.body);
    const walletAddress = ensureWalletAddress(body.walletAddress).toBase58();
    const authNonce = randomUUID();
    const user = await input.repository.createOrRefreshWalletUser(walletAddress, authNonce);
    const message = walletMessage(walletAddress, user.authNonce);

    reply.status(200).send({
      walletAddress,
      nonce: user.authNonce,
      message
    });
  });

  app.post("/v1/auth/verify", async (request, reply) => {
    const body = verifySchema.parse(request.body);
    const wallet = ensureWalletAddress(body.walletAddress);
    const user = await input.repository.findUserByWallet(wallet.toBase58());
    if (!user) {
      throw new HttpError(404, "challenge_not_found", "Request a challenge before verifying.");
    }

    const expectedMessage = walletMessage(wallet.toBase58(), user.authNonce);
    if (body.message !== expectedMessage) {
      throw new HttpError(400, "invalid_message", "The signed message does not match the active challenge.");
    }

    const signatureBytes = bs58.decode(body.signature);
    const verified = nacl.sign.detached.verify(
      Buffer.from(expectedMessage, "utf8"),
      signatureBytes,
      wallet.toBytes()
    );

    if (!verified) {
      throw new HttpError(401, "invalid_signature", "Invalid signature. Ensure you are signing with the correct wallet and the message has not been modified.");
    }

    const nextNonce = randomUUID();
    await input.repository.rotateUserNonce(user.id, nextNonce);

    const token = await reply.jwtSign({
      sub: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      status: user.status,
      sessionVersion: user.sessionVersion
    } satisfies JwtClaims);

    reply.send({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        onboardingDismissed: user.onboardingDismissed ?? false,
      }
    });

    // Handle referral conversion for new users (best-effort, non-blocking)
    if (body.referralCode) {
      void (async () => {
        try {
          const referrer = await input.repository.findUserByReferralCode(body.referralCode!);
          if (referrer) {
            const click = await input.repository.findLatestUnconvertedClick(referrer.id);
            if (click) {
              await input.repository.markReferralConverted(click.id);
              await input.repository.createNotification({
                userId: referrer.id,
                type: "referral.conversion",
                title: "Referral joined!",
                message: "Someone joined Fyxvo through your referral link.",
              });
            }
          }
        } catch { /* best-effort */ }
      })();
    }
  });

  app.post("/v1/interest", async (request, reply) => {
    const body = createInterestSubmissionSchema.parse(request.body);
    const submission = await input.repository.createInterestSubmission({
      name: body.name,
      email: body.email,
      role: body.role,
      ...(body.team ? { team: body.team } : {}),
      useCase: body.useCase,
      expectedRequestVolume: body.expectedRequestVolume,
      interestAreas: body.interestAreas,
      operatorInterest: body.operatorInterest,
      source: body.source
    });

    reply.status(201).send({
      item: serializeForJson({
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
        email: submission.email
      }),
      message:
        "Interest captured. Fyxvo will review the use case and follow up with the most relevant devnet path."
    });
  });

  app.post("/v1/feedback", async (request, reply) => {
    const body = createFeedbackSubmissionSchema.parse(request.body);

    if (body.projectId) {
      const user = requireUser(request);
      const project = await input.repository.findProjectById(body.projectId);
      if (!project || !canAccessProject(user, project)) {
        throw new HttpError(
          404,
          "project_not_found",
          "The requested project context could not be found for this feedback submission."
        );
      }
    }

    const submission = await input.repository.createFeedbackSubmission({
      name: body.name,
      email: body.email,
      ...(body.role ? { role: body.role } : {}),
      ...(body.team ? { team: body.team } : {}),
      category: body.category,
      message: body.message,
      source: body.source,
      ...(body.page ? { page: body.page } : {}),
      ...(body.projectId ? { projectId: body.projectId } : {}),
      ...(request.currentUser?.walletAddress
        ? { walletAddress: request.currentUser.walletAddress }
        : body.walletAddress
          ? { walletAddress: body.walletAddress }
          : {})
    });

    app.log.info(
      {
        event: "alpha.feedback.submitted",
        requestId: request.id,
        category: submission.category,
        status: submission.status,
        source: submission.source,
        page: submission.page,
        projectId: submission.projectId
      },
      "Captured alpha feedback submission"
    );

    reply.status(201).send({
      item: serializeForJson({
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt,
        email: submission.email
      }),
      message:
        "Feedback captured. Fyxvo will review the issue, follow up through the recorded contact path, and use it to improve the private alpha flow."
    });
  });

  app.post("/v1/events", async (request, reply) => {
    const body = createLaunchEventSchema.parse(request.body);
    const userAgentHeader = request.headers["user-agent"];

    await input.repository.recordRequestLog({
      service: "web",
      route: `/events/${body.name}`,
      method: `TRACK:${body.source.slice(0, 48)}`,
      statusCode: 202,
      durationMs: 0,
      ...(body.projectId ? { projectId: body.projectId } : {}),
      ...(request.currentUser?.id ? { userId: request.currentUser.id } : {}),
      ...(request.ip ? { ipAddress: request.ip } : {}),
      ...(typeof userAgentHeader === "string" ? { userAgent: userAgentHeader } : {})
    });

    app.log.info(
      {
        event: "product.event.captured",
        requestId: request.id,
        name: body.name,
        source: body.source,
        projectId: body.projectId,
        userId: request.currentUser?.id
      },
      "Captured launch event"
    );

    reply.status(202).send({
      accepted: true,
      requestId: request.id
    });
  });

  app.get("/v1/projects", async (request) => {
    const user = requireUser(request);
    const projects = await input.repository.listProjects(user);
    return { items: projects };
  });

  app.post("/v1/projects", async (request, reply) => {
    const user = requireUser(request);
    const body = createProjectSchema.parse(request.body);

    const response = await withIdempotency(input.repository, request, user.id, async () => {
      const nextChainProjectId = await input.repository.getNextChainProjectId();
      const ownerWallet = ensureWalletAddress(user.walletAddress);
      const programId = ensureWalletAddress(input.env.FYXVO_PROGRAM_ID);
      const chainProjectIdBuffer = Buffer.alloc(8);
      chainProjectIdBuffer.writeBigUInt64LE(nextChainProjectId);
      const [derivedProjectPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("project"), ownerWallet.toBuffer(), chainProjectIdBuffer],
        programId
      );
      const activation = await withBlockchainErrors(() =>
        input.blockchain.prepareProjectCreationTransaction({
          ownerWalletAddress: user.walletAddress,
          chainProjectId: nextChainProjectId,
          storedProjectPda: derivedProjectPda.toBase58()
        })
      );

      const project = await input.repository.createProject({
        ownerId: user.id,
        slug: body.slug,
        name: body.name,
        chainProjectId: nextChainProjectId,
        onChainProjectPda: derivedProjectPda.toBase58(),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.templateType !== undefined ? { templateType: body.templateType } : {})
      });

      return {
        statusCode: 201,
        body: {
          item: project,
          activation
        }
      };
    });

    reply.status(response.statusCode).send(response.body);
  });

  app.post("/v1/projects/:projectId/activation/verify", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = verifyProjectActivationSchema.parse(request.body);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const result = await withBlockchainErrors(() =>
      input.blockchain.waitForConfirmedProjectActivation({
        ownerWalletAddress: project.owner.walletAddress,
        chainProjectId: project.chainProjectId,
        storedProjectPda: project.onChainProjectPda,
        signature: body.signature
      })
    );

    void input.repository.createNotification({
      userId: user.id,
      type: "project_activated",
      title: "Project activated",
      message: `${project.name} has been activated on Solana devnet.`,
      projectId: project.id
    }).catch(() => undefined);

    return { item: result };
  });

  app.get("/v1/projects/:projectId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    return { item: project };
  });

  app.patch("/v1/projects/:projectId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const updateInput = {
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.lowBalanceThresholdSol !== undefined ? { lowBalanceThresholdSol: body.lowBalanceThresholdSol } : {}),
      ...(body.dailyRequestAlertThreshold !== undefined ? { dailyRequestAlertThreshold: body.dailyRequestAlertThreshold } : {}),
      ...(body.archivedAt !== undefined ? { archivedAt: body.archivedAt !== null ? new Date(body.archivedAt) : null } : {}),
      ...(body.environment !== undefined ? { environment: body.environment } : {}),
      ...(body.starred !== undefined ? { starred: body.starred } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.githubUrl !== undefined ? { githubUrl: body.githubUrl } : {}),
      ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
      ...(body.publicSlug !== undefined ? { publicSlug: body.publicSlug } : {}),
      ...(body.leaderboardVisible !== undefined ? { leaderboardVisible: body.leaderboardVisible } : {})
    };

    return {
      item: await input.repository.updateProject(project.id, updateInput)
    };
  });

  app.delete("/v1/projects/:projectId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    return {
      item: await input.repository.deleteProject(project.id)
    };
  });

  app.get("/v1/projects/:projectId/api-keys", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    return {
      items: await input.repository.listApiKeys(project.id)
    };
  });

  app.post("/v1/projects/:projectId/api-keys", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = createApiKeySchema.parse(request.body);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const response = await withIdempotency(input.repository, request, user.id, async () => {
      const scopes = validateCreatedApiKeyScopes(body.scopes);
      const plainTextKey = `fyxvo_live_${randomBytes(24).toString("hex")}`;
      const prefix = plainTextKey.slice(0, 18);
      const apiKey = await input.repository.createApiKey({
        projectId: project.id,
        createdById: user.id,
        label: body.label,
        prefix,
        keyHash: sha256(plainTextKey),
        scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null
      });

      void input.repository.createNotification({
        userId: user.id,
        type: "api_key_created",
        title: "API key created",
        message: `Key "${body.label}" was created for project "${project.name}"`,
        projectId: project.id
      }).catch(() => undefined);

      void input.repository.logActivity({ projectId: project.id, userId: user.id, action: "apikey.created", details: { label: body.label } }).catch(() => undefined);

      return {
        statusCode: 201,
        body: {
          item: apiKey,
          plainTextKey
        }
      };
    });

    reply.status(response.statusCode).send(response.body);
  });

  app.delete("/v1/projects/:projectId/api-keys/:apiKeyId", async (request) => {
    const user = requireUser(request);
    const params = z
      .object({
        projectId: z.string().uuid(),
        apiKeyId: z.string().uuid()
      })
      .parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const apiKey = await input.repository.revokeApiKey(project.id, params.apiKeyId);
    if (!apiKey) {
      throw new HttpError(404, "api_key_not_found", "The requested API key could not be found.");
    }

    void input.repository.createNotification({
      userId: user.id,
      type: "api_key_revoked",
      title: "API key revoked",
      message: `Key "${apiKey.label}" (${apiKey.prefix}…) was revoked from "${project.name}"`,
      projectId: project.id
    }).catch(() => undefined);

    void input.repository.logActivity({ projectId: project.id, userId: user.id, action: "apikey.revoked", details: { keyId: params.apiKeyId } }).catch(() => undefined);

    return { item: apiKey };
  });

  // POST /v1/projects/:projectId/api-keys/:apiKeyId/rotate — revoke old key and create a new one with same label and scopes
  app.post("/v1/projects/:projectId/api-keys/:apiKeyId/rotate", async (request, reply) => {
    const user = requireUser(request);
    const params = z
      .object({ projectId: z.string().uuid(), apiKeyId: z.string().uuid() })
      .parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const keys = await input.repository.listApiKeys(project.id);
    const existing = keys.find((k) => k.id === params.apiKeyId);
    if (!existing) {
      throw new HttpError(404, "api_key_not_found", "The requested API key could not be found.");
    }
    if (existing.status !== "ACTIVE") {
      throw new HttpError(409, "api_key_not_active", "Only active API keys can be rotated.");
    }

    // Revoke the old key
    await input.repository.revokeApiKey(project.id, params.apiKeyId);

    // Create replacement key with same label and scopes
    const scopes = Array.isArray(existing.scopes) ? existing.scopes as string[] : [];
    const plainTextKey = `fyxvo_live_${randomBytes(24).toString("hex")}`;
    const prefix = plainTextKey.slice(0, 18);
    const newKey = await input.repository.createApiKey({
      projectId: project.id,
      createdById: user.id,
      label: existing.label,
      prefix,
      keyHash: sha256(plainTextKey),
      scopes,
      expiresAt: null
    });

    void input.repository.createNotification({
      userId: user.id,
      type: "api_key_rotated",
      title: "API key rotated",
      message: `Key "${existing.label}" was rotated — old key revoked, new key issued for project "${project.name}"`,
      projectId: project.id
    }).catch(() => undefined);

    reply.status(201).send({ item: newKey, plainTextKey });
  });

  app.post("/v1/projects/:projectId/funding/prepare", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = prepareFundingSchema.parse(request.body);
    if (body.asset === "USDC" && !input.env.FYXVO_ENABLE_USDC) {
      throw new HttpError(
        409,
        "usdc_disabled",
        "USDC funding is configuration-gated on devnet until FYXVO_ENABLE_USDC=true and the mint is verified."
      );
    }

    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const response = await withIdempotency(input.repository, request, user.id, async () => {
      const preparation = await withBlockchainErrors(() =>
        input.blockchain.prepareFundingTransaction({
          ownerWalletAddress: project.owner.walletAddress,
          chainProjectId: project.chainProjectId,
          storedProjectPda: project.onChainProjectPda,
          funderWalletAddress: body.funderWalletAddress,
          asset: body.asset,
          amount: body.amount,
          ...(body.funderTokenAccount ? { funderTokenAccount: body.funderTokenAccount } : {})
        })
      );

      const fundingRecord = await input.repository.saveFundingCoordinate({
        projectId: project.id,
        requestedById: user.id,
        asset: body.asset,
        amount: body.amount,
        recentBlockhash: preparation.recentBlockhash,
        transactionBase64: preparation.transactionBase64,
        idempotencyKey:
          typeof request.headers["idempotency-key"] === "string"
            ? request.headers["idempotency-key"]
            : randomUUID(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      return {
        statusCode: 201,
        body: {
          item: {
            ...preparation,
            fundingRequestId: fundingRecord.id
          }
        }
      };
    });

    reply.status(response.statusCode).send(response.body);
  });

  app.post("/v1/projects/:projectId/funding/verify", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = verifyFundingSchema.parse(request.body);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const fundingRecord = await input.repository.findFundingCoordinate(body.fundingRequestId);
    if (!fundingRecord || fundingRecord.projectId !== project.id) {
      throw new HttpError(404, "funding_request_not_found", "The funding request could not be found.");
    }

    if (
      user.role !== "OWNER" &&
      user.role !== "ADMIN" &&
      fundingRecord.requestedById !== user.id
    ) {
      throw new HttpError(403, "forbidden", "Only the initiating wallet session can verify this funding request.");
    }

    if (fundingRecord.transactionSignature && fundingRecord.confirmedAt) {
      return {
        item: {
          fundingRequestId: fundingRecord.id,
          signature: fundingRecord.transactionSignature,
          confirmedAt: fundingRecord.confirmedAt.toISOString(),
          explorerUrl: `https://explorer.solana.com/tx/${fundingRecord.transactionSignature}?cluster=devnet`,
          onchain: await withBlockchainErrors(() =>
            input.blockchain.readProjectOnChain({
              ownerWalletAddress: project.owner.walletAddress,
              chainProjectId: project.chainProjectId,
              storedProjectPda: project.onChainProjectPda
            })
          )
        }
      };
    }

    const verification = await input.blockchain.waitForConfirmedFunding({
      ownerWalletAddress: project.owner.walletAddress,
      chainProjectId: project.chainProjectId,
      storedProjectPda: project.onChainProjectPda,
      signature: body.signature
    }).catch((error: unknown) => {
      const normalized = normalizeBlockchainError(error);
      if (normalized) {
        throw normalized;
      }
      throw error;
    });
    await input.repository.confirmFundingCoordinate({
      fundingRequestId: fundingRecord.id,
      transactionSignature: body.signature,
      confirmedAt: new Date(verification.confirmedAt)
    });

    void input.repository.createNotification({
      userId: user.id,
      type: "funding_confirmed",
      title: "SOL deposit confirmed",
      message: `${(Number(fundingRecord.amount) / 1e9).toFixed(4)} SOL funded to "${project.name}"`,
      projectId: project.id
    }).catch(() => undefined);

    return {
      item: {
        fundingRequestId: fundingRecord.id,
        ...verification
      }
    };
  });

  app.get("/v1/projects/:projectId/onchain", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    return {
      item: await withBlockchainErrors(() =>
        input.blockchain.readProjectOnChain({
          ownerWalletAddress: project.owner.walletAddress,
          chainProjectId: project.chainProjectId,
          storedProjectPda: project.onChainProjectPda
        })
      )
    };
  });

  app.get("/v1/analytics/overview", async (request) => {
    const user = requireUser(request);
    const projects = await input.repository.listProjects(user);
    return {
      item: await input.repository.getAnalyticsOverview(
        user.role === "OWNER" || user.role === "ADMIN"
          ? undefined
          : projects.map((project) => project.id)
      )
    };
  });

  app.get("/v1/analytics/projects/:projectId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional() }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    const since = query.range ? new Date(Date.now() - rangeToMs(query.range)) : undefined;
    return {
      item: await input.repository.getProjectAnalytics(project.id, since)
    };
  });

  app.get("/v1/notifications", async (request) => {
    const user = requireUser(request);
    const projects = await input.repository.listProjects(user);
    const projectIds = projects.map((p) => p.id);
    return {
      items: await input.repository.getNotifications(user.id, projectIds)
    };
  });

  app.post("/v1/notifications/:notificationId/read", async (request) => {
    const user = requireUser(request);
    const params = z.object({ notificationId: z.string().uuid() }).parse(request.params);
    await input.repository.markNotificationRead(user.id, params.notificationId);
    return { ok: true };
  });

  app.post("/v1/notifications/read-all", async (request) => {
    const user = requireUser(request);
    await input.repository.markAllNotificationsRead(user.id);
    return { ok: true };
  });

  app.get("/v1/transactions", async (request) => {
    const user = requireUser(request);
    const projects = await input.repository.listProjects(user);
    const projectIds = projects.map((p) => p.id);
    return {
      items: await input.repository.getFundingHistory(user.id, projectIds)
    };
  });

  app.get("/v1/projects/:projectId/api-keys/:apiKeyId/analytics", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid(), apiKeyId: z.string().uuid() }).parse(request.params);
    const query = z.object({ range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional() }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    const since = new Date(Date.now() - rangeToMs(query.range ?? "7d"));
    return {
      item: await input.repository.getApiKeyAnalytics(params.projectId, params.apiKeyId, since)
    };
  });

  app.get("/v1/projects/:projectId/analytics/methods", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional() }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    const since = new Date(Date.now() - rangeToMs(query.range ?? "24h"));
    return {
      items: await input.repository.getMethodBreakdown(params.projectId, since)
    };
  });

  app.get("/v1/projects/:projectId/analytics/errors", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ limit: z.coerce.number().min(1).max(100).optional() }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    return {
      items: await input.repository.getErrorLog(params.projectId, query.limit ?? 20)
    };
  });

  app.get("/v1/projects/:projectId/analytics/export", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional() }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    const since = new Date(Date.now() - rangeToMs(query.range ?? "7d"));
    const rows = await input.repository.getExportRows(params.projectId, since);
    const header = "id,service,route,method,statusCode,durationMs,createdAt\n";
    const csv = header + rows.map((row) =>
      [row["id"], row["service"], row["route"], row["method"], row["statusCode"], row["durationMs"], row["createdAt"]].join(",")
    ).join("\n");
    reply.header("content-type", "text/csv");
    reply.header("content-disposition", `attachment; filename="analytics-${project.slug}-${query.range ?? "7d"}.csv"`);
    return reply.send(csv);
  });

  app.get("/v1/projects/:projectId/checklist", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = request.params as { projectId: string };
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) return reply.code(404).send({ error: "Project not found" });

    const apiKeys = await input.repository.listApiKeys(projectId);

    const checklist = {
      projectId,
      steps: [
        {
          key: "activated",
          label: "Project activated on-chain",
          complete: project.chainProjectId !== null && String(project.chainProjectId) !== "" && String(project.chainProjectId) !== "0",
          href: `/projects/${project.slug}`
        },
        {
          key: "funded",
          label: "Project funded with SOL",
          complete: (project._count?.fundingRequests ?? 0) > 0,
          href: `/funding`
        },
        {
          key: "api_key_created",
          label: "API key created",
          complete: apiKeys.length > 0,
          href: `/api-keys`
        },
        {
          key: "traffic_received",
          label: "First relay request sent",
          complete: (project._count?.requestLogs ?? 0) > 0,
          href: `/analytics`
        }
      ],
      completedCount: 0,
      totalCount: 4
    };
    checklist.completedCount = checklist.steps.filter((s) => s.complete).length;

    return reply.send({ item: checklist });
  });

  app.get("/v1/projects/:projectId/analytics/rate-limits", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = request.params as { projectId: string };
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) return reply.code(404).send({ error: "Project not found" });

    const logs = await input.repository.getErrorLog(projectId, 200);
    const rateLimitEvents = logs.filter((e) => e.statusCode === 429);

    return reply.send({ items: rateLimitEvents, count: rateLimitEvents.length });
  });

  app.get("/v1/admin/stats", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return {
      item: await input.repository.getAdminStats()
    };
  });

  app.get("/v1/admin/operators", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return {
      items: await input.repository.listOperators()
    };
  });

  app.get("/v1/admin/overview", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const [overview, readiness] = await Promise.all([
      input.repository.getAdminOverview(),
      input.blockchain.getProtocolReadiness().catch(() => null)
    ]);
    return {
      item: serializeForJson<AdminOverview>({
        ...overview,
        protocol: buildAdminProtocolOverview({
          env: input.env,
          readiness
        })
      })
    };
  });

  app.get("/v1/admin/platform-stats", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return {
      item: await input.repository.getAdminPlatformStats()
    };
  });

  app.get("/v1/admin/newsletter-subscribers", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).parse(request.query);
    return input.repository.getNewsletterSubscribers(query.limit);
  });

  // GET /v1/admin/assistant/stats — assistant usage metrics (admin only)
  app.get("/v1/admin/assistant/stats", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return { item: await input.repository.getAssistantStats() };
  });

  // POST /v1/assistant/chat — AI developer assistant (streaming SSE)
  // Per-user rate limit: 20 messages per hour (rolling window in-memory)
  const assistantUserWindows = new Map<string, number[]>();

  const ASSISTANT_RATE_LIMIT = 20;
  const ASSISTANT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  function checkAssistantRateLimit(userId: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const windowStart = now - ASSISTANT_WINDOW_MS;
    const timestamps = (assistantUserWindows.get(userId) ?? []).filter((t) => t > windowStart);
    assistantUserWindows.set(userId, timestamps);
    if (timestamps.length >= ASSISTANT_RATE_LIMIT) {
      const oldest = timestamps[0]!;
      return { allowed: false, retryAfterMs: oldest + ASSISTANT_WINDOW_MS - now };
    }
    timestamps.push(now);
    assistantUserWindows.set(userId, timestamps);
    return { allowed: true, retryAfterMs: 0 };
  }

  const assistantChatSchema = z.object({
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })).min(1).max(50),
    projectContext: z.object({
      projectName: z.string().optional(),
      projectNames: z.array(z.string()).optional(),
      balance: z.string().optional(),
      totalBalanceSol: z.number().optional(),
      requestCount: z.number().optional(),
      requestsLast7Days: z.number().optional(),
      successRate: z.number().optional(),
      gatewayStatus: z.string().optional(),
      activeAnnouncements: z.array(z.string()).optional(),
    }).optional(),
  });

  app.post("/v1/assistant/chat", async (request, reply) => {
    const user = requireUser(request);

    const rateCheck = checkAssistantRateLimit(user.id);
    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000);
      return reply.status(429).send({
        code: "assistant_rate_limited",
        error: "You have reached the assistant limit of 20 messages per hour.",
        message: `Assistant rate limit exceeded. Try again in ${Math.ceil(retryAfterSec / 60)} minutes.`,
        retryAfterMs: rateCheck.retryAfterMs
      });
    }

    const parsed = assistantChatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    }

    const { messages, projectContext } = parsed.data;
    const requestStart = Date.now();
    const hashedUserId = sha256(user.id).slice(0, 16);

    const anthropicKey = input.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return reply.status(503).send({ error: "AI assistant is not configured" });
    }

    const systemPrompt = `You are the Fyxvo Developer Assistant — a knowledgeable, honest, and practical AI guide for developers building on Solana using the Fyxvo RPC gateway platform. You are an AI and may make mistakes; always recommend testing code before production use. For critical infrastructure questions, also consult the official Solana documentation at docs.solana.com.

## WHAT FYXVO IS
Fyxvo is a hybrid-first decentralized Solana infrastructure network currently in private alpha on devnet. It provides:
- **Managed RPC gateway**: Route Solana JSON-RPC calls through high-performance managed nodes
- **Priority relay**: Low-latency transaction submission for time-sensitive operations
- **Project-based API key authentication**: Separate credentials per project with explicit scopes
- **SOL funding via Phantom wallet**: Pre-deposit SOL to your project's on-chain treasury
- **Per-project analytics**: Request counts, latency, error rates, method breakdown, CSV export
- **Real-time gateway health monitoring**: Live status at status.fyxvo.com
- **Notification system**: Low-balance, rate-limit, and key activity alerts
- **Command palette**: Ctrl+K global navigation
- **Multi-wallet support**: Phantom, Solflare, Backpack, and Coinbase Wallet

## LIVE ENDPOINTS
- Frontend: https://www.fyxvo.com
- Standard RPC gateway: https://rpc.fyxvo.com/rpc
- Priority relay: https://rpc.fyxvo.com/priority
- API: https://api.fyxvo.com
- Status: https://status.fyxvo.com
- Docs: https://www.fyxvo.com/docs

## PLATFORM STATUS
Fyxvo is currently in devnet private alpha. Mainnet is not yet available. All SOL costs and features described are for devnet only.

## AUTHENTICATION FLOW
Fyxvo uses wallet-based auth with a challenge-verify pattern:
\`\`\`typescript
// Step 1: Get a nonce for your wallet
const { message } = await fetch("https://api.fyxvo.com/v1/auth/challenge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ walletAddress: "YOUR_WALLET_ADDRESS" })
}).then(r => r.json());

// Step 2: Sign the message with Phantom
const encodedMessage = new TextEncoder().encode(message);
const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");
const signature = btoa(String.fromCharCode(...signedMessage.signature));

// Step 3: Verify and receive JWT
const { token } = await fetch("https://api.fyxvo.com/v1/auth/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ walletAddress, message, signature })
}).then(r => r.json());

// Use token for authenticated API calls
// Use X-Api-Key header for gateway requests
\`\`\`

## PRICING MODEL (devnet)
- **Standard reads**: 1,000 lamports per request (0.000001 SOL)
- **Compute-heavy methods**: 3,000 lamports per request (0.000003 SOL) — includes getProgramAccounts, getTokenAccountsByOwner, getSignaturesForAddress, getMultipleAccounts, and similar
- **Priority relay**: 5,000 lamports per request (0.000005 SOL)
- **Free tier**: 10,000 standard requests for every new project
- **Volume discount tier 1**: ≥1M requests/month → 20% off
- **Volume discount tier 2**: ≥10M requests/month → 40% off
- **Revenue split**: 80% to node operators / 10% protocol treasury / 10% infra fund
- **Funding**: Pre-deposit SOL to your project's on-chain treasury via Phantom wallet

## HOW TO USE THE GATEWAY

### JavaScript / TypeScript (web3.js v1)
\`\`\`typescript
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://rpc.fyxvo.com/rpc", {
  httpHeaders: { "X-Api-Key": "fyxvo_live_YOUR_KEY" },
});

// For priority relay (low-latency transaction submission):
const priorityConn = new Connection("https://rpc.fyxvo.com/priority", {
  httpHeaders: { "X-Api-Key": "fyxvo_live_YOUR_KEY" },
});
\`\`\`

### JavaScript / TypeScript (web3.js v2)
\`\`\`typescript
import { createSolanaRpcFromTransport, createDefaultRpcTransport } from "@solana/web3.js";

const rpc = createSolanaRpcFromTransport(
  createDefaultRpcTransport({
    url: "https://rpc.fyxvo.com/rpc",
    headers: { "X-Api-Key": "fyxvo_live_YOUR_KEY" },
  })
);
\`\`\`

### Fyxvo SDK
\`\`\`typescript
import FyxvoClient from "@fyxvo/sdk";

const client = new FyxvoClient({
  apiKey: "fyxvo_live_YOUR_KEY",
  baseUrl: "https://rpc.fyxvo.com",
});
\`\`\`

### Python
\`\`\`python
from solana.rpc.api import Client
client = Client(
    "https://rpc.fyxvo.com/rpc",
    extra_headers={"X-Api-Key": "fyxvo_live_YOUR_KEY"}
)
balance = client.get_balance(pubkey)
\`\`\`

### Direct JSON-RPC (curl)
\`\`\`bash
curl https://rpc.fyxvo.com/rpc \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: fyxvo_live_YOUR_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getSlot","params":[]}'

# Priority relay:
curl https://rpc.fyxvo.com/priority \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: fyxvo_live_YOUR_KEY" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"sendTransaction","params":["BASE64_TX"]}'
\`\`\`

## MIGRATING FROM OTHER PROVIDERS
Replace your RPC URL — everything else stays the same:
\`\`\`typescript
// Before (Helius, QuickNode, Alchemy, etc.):
const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=xxx");

// After (Fyxvo):
const connection = new Connection("https://rpc.fyxvo.com/rpc", {
  httpHeaders: { "X-Api-Key": "fyxvo_live_YOUR_KEY" },
});
\`\`\`

## COMMON SOLANA CONCEPTS
- **Lamports**: smallest SOL unit. 1 SOL = 1,000,000,000 lamports
- **Account**: on-chain storage unit with owner, data, lamport balance, and rent exemption threshold
- **Program**: executable account (smart contract) — stateless, processes instructions
- **PDA (Program Derived Address)**: deterministic address derived from seeds + program ID, has no private key
- **Transaction**: atomic set of instructions with a blockhash, must be signed by all required signers
- **Instruction**: call to a specific program with accounts and data
- **Signer**: account that must sign the transaction; most actions require at least the fee payer
- **Blockhash**: expires after ~150 blocks (~60 seconds) — always fetch a fresh one before sending transactions
- **Commitment levels**: processed < confirmed < finalized. Use "confirmed" for most reads; "finalized" for critical state
- **Token account**: holds SPL token balance for a specific mint and owner
- **Associated Token Account (ATA)**: canonical token account for an owner+mint pair, derived deterministically
- **SPL tokens**: Solana's fungible and non-fungible token standard (mint, freeze authority, token accounts)
- **Anchor**: framework for Solana programs — provides IDL, macro-based instruction dispatch, and account validation
- **Priority fees**: compute unit price set via ComputeBudgetProgram instructions to get faster inclusion
- **Common errors**:
  - "AccountNotFound": account doesn't exist yet on-chain
  - "InsufficientFunds": wallet doesn't have enough SOL for fees + transfer
  - "Blockhash not found": blockhash expired — fetch a fresh one and retry
  - "custom program error": program-specific error, check the program's error codes or IDL

## WHEN TO USE PRIORITY RELAY
Use /priority endpoint when:
- Submitting time-sensitive transactions (arbitrage, liquidations, NFT mints)
- Network is congested and standard submission is slow
- You need fastest possible inclusion

Standard /rpc endpoint is fine for:
- All read operations (getBalance, getAccountInfo, getProgramAccounts, etc.)
- Non-time-sensitive transactions
- Development and testing

## CURRENT USER CONTEXT
${projectContext?.projectName ? `- Active project: ${projectContext.projectName}` : "- No active project selected"}
${projectContext?.projectNames?.length ? `- The user has ${projectContext.projectNames.length} project(s): ${projectContext.projectNames.join(", ")}.` : ""}
${projectContext?.balance ? `- Current balance: ${projectContext.balance}` : ""}
${projectContext?.totalBalanceSol !== undefined ? `- Their total funded balance across projects is ${projectContext.totalBalanceSol.toFixed(4)} SOL.` : ""}
${projectContext?.requestCount !== undefined ? `- Lifetime requests: ${projectContext.requestCount.toLocaleString()}` : ""}
${projectContext?.requestsLast7Days !== undefined ? `- They have made ${projectContext.requestsLast7Days} requests in the last 7 days.` : ""}
${projectContext?.gatewayStatus ? `- Current gateway status: ${projectContext.gatewayStatus}.` : ""}

## GUIDELINES
1. You are an AI. Be honest about uncertainty — if you don't know something specific to Fyxvo, say so.
2. All code should be tested before production use. Fyxvo is devnet private alpha.
3. Be concise. Developers want working code, not long explanations.
4. Always show complete, copy-pasteable code examples.
5. Do not promise specific performance numbers (latency, uptime SLAs, etc.)
6. For Solana questions not specific to Fyxvo, give accurate answers and suggest the official Solana docs.
7. When generating code, default to TypeScript unless the user specifies otherwise.
8. Keep responses focused — answer the question asked, don't pad with extras.
9. When a developer is stuck, ask one clarifying question to narrow down the problem.`;

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");

    // Suppress Fastify's default response handling
    void user;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20251001",
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok || !response.body) {
        const durationMs = Date.now() - requestStart;
        app.log.warn({
          event: "assistant.chat.upstream_error",
          hashedUserId,
          model: "claude-sonnet-4-5-20251001",
          messageCount: messages.length,
          durationMs,
          statusCode: response.status
        }, "Anthropic API returned non-OK status");
        reply.raw.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
        reply.raw.end();
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let outputTokenEstimate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const event = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string }; usage?: { output_tokens?: number }; error?: unknown };
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
              outputTokenEstimate += Math.ceil(event.delta.text.length / 4);
              reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      const durationMs = Date.now() - requestStart;
      const inputTokenEstimate = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
      app.log.info({
        event: "assistant.chat.success",
        hashedUserId,
        model: "claude-sonnet-4-5-20251001",
        messageCount: messages.length,
        inputTokenEstimate,
        outputTokenEstimate,
        durationMs,
        timestamp: new Date().toISOString()
      }, "Assistant chat completed");

      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    } catch (err) {
      const durationMs = Date.now() - requestStart;
      app.log.error({
        event: "assistant.chat.error",
        hashedUserId,
        durationMs,
        error: sanitizeErrorForLogs(err)
      }, "Assistant chat failed");
      reply.raw.write(`data: ${JSON.stringify({ error: "Failed to contact AI service" })}\n\n`);
      reply.raw.end();
    }
  });

  // GET /v1/projects/:projectId/widget — public widget data
  app.get("/v1/projects/:projectId/widget", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const project = await input.repository.findProjectById(projectId);
      if (!project) return reply.status(404).send({ error: "Project not found" });

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const analytics = await input.repository.getProjectAnalytics(projectId, since24h).catch(() => null);
      const requestsToday = analytics?.totals?.requestLogs ?? 0;
      const avgLatencyMs = Math.round(analytics?.latency?.averageMs ?? 0);

      return reply.send({
        projectName: project.displayName ?? project.name,
        requestsToday,
        gatewayStatus: "healthy",
        avgLatencyMs,
        isPublic: true,
      });
    } catch {
      return reply.status(500).send({ error: "Failed to fetch widget data" });
    }
  });

  // ── Rate limit status for assistant ─────────────────────────────────────

  app.get("/v1/assistant/rate-limit-status", async (request) => {
    const user = requireUser(request);
    const hourStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);
    const count = await input.repository.countAssistantMessagesThisHour(user.id, hourStart);
    const limit = 20;
    return {
      messagesUsedThisHour: count,
      messagesRemainingThisHour: Math.max(0, limit - count),
      limit,
      windowResetAt: new Date(hourStart.getTime() + 3_600_000).toISOString(),
    };
  });

  // ── Notification preferences ──────────────────────────────────────────────

  const notifPrefsSchema = z.object({
    email:                     z.string().email().nullable().optional(),
    notifyProjectActivation:   z.boolean().optional(),
    notifyApiKeyEvents:        z.boolean().optional(),
    notifyFundingConfirmed:    z.boolean().optional(),
    notifyLowBalance:          z.boolean().optional(),
    notifyDailyAlert:          z.boolean().optional(),
    notifyWeeklySummary:       z.boolean().optional(),
    notifyReferralConversion:  z.boolean().optional(),
  });

  app.get("/v1/notifications/preferences", async (request) => {
    const user = requireUser(request);
    const fullUser = await input.repository.findUserById(user.id);
    if (!fullUser) throw new HttpError(404, "user_not_found", "User not found.");
    const u = fullUser as Record<string, unknown>;
    return {
      email:                     (u.email as string | null) ?? null,
      notifyProjectActivation:   u.notifyProjectActivation ?? true,
      notifyApiKeyEvents:        u.notifyApiKeyEvents ?? true,
      notifyFundingConfirmed:    u.notifyFundingConfirmed ?? true,
      notifyLowBalance:          u.notifyLowBalance ?? true,
      notifyDailyAlert:          u.notifyDailyAlert ?? true,
      notifyWeeklySummary:       u.notifyWeeklySummary ?? false,
      notifyReferralConversion:  u.notifyReferralConversion ?? true,
    };
  });

  app.patch("/v1/notifications/preferences", async (request, reply) => {
    const user = requireUser(request);
    const parsed = notifPrefsSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid request" });
    await input.repository.updateUser(user.id, parsed.data as Parameters<typeof input.repository.updateUser>[1]);
    return { success: true };
  });

  // ── Webhooks ──────────────────────────────────────────────────────────────

  function validateWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return false;
      const hostname = parsed.hostname.toLowerCase();
      // Block localhost and private IP ranges (SSRF prevention)
      if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return false;
      if (/^10\./.test(hostname)) return false;
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
      if (/^192\.168\./.test(hostname)) return false;
      if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
      // Block Railway and Vercel internal domains
      if (hostname.endsWith(".railway.internal") || hostname.endsWith(".vercel-internal.com")) return false;
      return true;
    } catch {
      return false;
    }
  }

  const webhookSchema = z.object({
    url: z.string().url().max(512).refine(validateWebhookUrl, { message: "Webhook URL must be HTTPS and must not point to private or internal addresses." }),
    events: z.array(z.enum(["funding.confirmed","apikey.created","apikey.revoked","balance.low","project.activated"])).min(1),
  });

  app.get("/v1/projects/:projectId/webhooks", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    return { items: await input.repository.listWebhooks(projectId) };
  });

  app.post("/v1/projects/:projectId/webhooks", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = webhookSchema.parse(request.body);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    const secret = randomBytes(32).toString("hex");
    const webhook = await input.repository.createWebhook({ projectId, url: body.url, events: body.events, secret });
    void input.repository.logActivity({ projectId, userId: user.id, action: "webhook.created", details: { url: body.url, events: body.events } }).catch(() => undefined);
    return reply.status(201).send({ item: webhook });
  });

  app.delete("/v1/projects/:projectId/webhooks/:webhookId", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, webhookId } = z.object({ projectId: z.string().uuid(), webhookId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    await input.repository.deleteWebhook(webhookId, projectId);
    void input.repository.logActivity({ projectId, userId: user.id, action: "webhook.deleted", details: { webhookId } }).catch(() => undefined);
    return reply.status(204).send();
  });

  app.post("/v1/projects/:projectId/webhooks/:webhookId/test", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, webhookId } = z.object({ projectId: z.string().uuid(), webhookId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    const webhook = await input.repository.findWebhook(webhookId, projectId);
    if (!webhook) throw new HttpError(404, "webhook_not_found", "Webhook not found.");
    const payload = { event: "test", projectId, timestamp: new Date().toISOString(), data: { message: "This is a test webhook from Fyxvo." } };
    const body = JSON.stringify(payload);
    const sig = createHash("sha256").update(webhook.secret + body).digest("hex");
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-fyxvo-signature": `sha256=${sig}` },
        body,
        signal: AbortSignal.timeout(5000),
      });
      void input.repository.recordWebhookDelivery({
        webhookId: webhook.id,
        eventType: "test",
        payload: payload,
        attemptNumber: 1,
        responseStatus: res.status,
        responseBody: (await res.text().catch(() => "")).slice(0, 1000),
        success: res.ok,
        nextRetryAt: res.ok ? null : new Date(Date.now() + 30_000),
      }).catch(() => undefined);
      return reply.send({ success: res.ok, statusCode: res.status });
    } catch (e) {
      return reply.send({ success: false, error: e instanceof Error ? e.message : "Request failed" });
    }
  });

  // ── Project members (team collaboration) ─────────────────────────────────

  app.get("/v1/projects/:projectId/members", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    return { items: await input.repository.listProjectMembers(projectId) };
  });

  app.post("/v1/projects/:projectId/members/invite", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = z.object({ walletAddress: z.string().min(32).max(44) }).parse(request.body);
    const project = await input.repository.findProjectById(projectId);
    if (!project || project.ownerId !== user.id) throw new HttpError(403, "forbidden", "Only the project owner can invite members.");
    const invitee = await input.repository.findUserByWallet(body.walletAddress);
    if (!invitee) throw new HttpError(404, "user_not_found", "No user found with that wallet address.");
    const existing = await input.repository.findProjectMember(projectId, invitee.id);
    if (existing) return reply.status(409).send({ error: "User is already a member or has a pending invitation." });
    const member = await input.repository.createProjectMember({ projectId, userId: invitee.id, invitedBy: user.id });
    void input.repository.logActivity({ projectId, userId: user.id, action: "member.invited", details: { walletAddress: body.walletAddress } }).catch(() => undefined);
    return reply.status(201).send({ item: member });
  });

  app.patch("/v1/projects/:projectId/members/:memberId/accept", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, memberId } = z.object({ projectId: z.string().uuid(), memberId: z.string().uuid() }).parse(request.params);
    const member = await input.repository.findProjectMemberById(memberId);
    if (!member || member.projectId !== projectId || member.userId !== user.id) throw new HttpError(404, "not_found", "Invitation not found.");
    if (member.acceptedAt) return reply.send({ success: true, message: "Already accepted." });
    await input.repository.acceptProjectMember(memberId);
    return reply.send({ success: true });
  });

  app.delete("/v1/me/invitations/:invitationId", async (request, reply) => {
    const user = requireUser(request);
    const { invitationId } = z.object({ invitationId: z.string().uuid() }).parse(request.params);
    const member = await input.repository.findProjectMemberById(invitationId);
    if (!member || member.userId !== user.id || member.acceptedAt) {
      throw new HttpError(404, "not_found", "Pending invitation not found.");
    }
    await input.repository.deleteProjectMember(invitationId, member.projectId);
    void input.repository.logActivity({
      projectId: member.projectId,
      userId: user.id,
      action: "member.declined",
      details: { memberId: invitationId },
    }).catch(() => undefined);
    return reply.status(204).send();
  });

  app.delete("/v1/projects/:projectId/members/:memberId", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, memberId } = z.object({ projectId: z.string().uuid(), memberId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || project.ownerId !== user.id) throw new HttpError(403, "forbidden", "Only the owner can remove members.");
    const memberToRemove = await input.repository.findProjectMemberById(memberId);
    await input.repository.deleteProjectMember(memberId, projectId);
    if (memberToRemove) {
      // notify removed member
      void input.repository.createNotification({
        userId: memberToRemove.userId,
        type: "member.removed",
        title: "Removed from project",
        message: `You have been removed from ${project.name}.`,
      }).catch(() => undefined);
      void input.repository.logActivity({ projectId, userId: user.id, action: "member.removed", details: { memberId } }).catch(() => undefined);
    }
    return reply.status(204).send();
  });

  app.post("/v1/projects/:projectId/transfer-ownership", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const { newOwnerId } = z.object({ newOwnerId: z.string().uuid() }).parse(request.body);
    const project = await input.repository.findProjectById(projectId);
    if (!project || project.ownerId !== user.id) throw new HttpError(403, "forbidden", "Only the current owner can transfer ownership.");
    const newOwnerMember = await input.repository.findProjectMember(projectId, newOwnerId);
    if (!newOwnerMember || !newOwnerMember.acceptedAt) throw new HttpError(400, "invalid_request", "New owner must be an accepted project member.");
    await input.repository.transferProjectOwnership(projectId, newOwnerId, user.id);
    void input.repository.createNotification({
      userId: newOwnerId,
      type: "project.ownership_transferred",
      title: "Project ownership transferred",
      message: `You are now the owner of ${project.name}.`,
    }).catch(() => undefined);
    void input.repository.logActivity({ projectId, userId: user.id, action: "ownership.transferred", details: { newOwnerId } }).catch(() => undefined);
    return reply.send({ success: true });
  });

  // ── Public project profile ────────────────────────────────────────────────

  app.get("/v1/public/projects/:publicSlug", async (request, reply) => {
    const { publicSlug } = z.object({ publicSlug: z.string() }).parse(request.params);
    const project = await input.repository.findPublicProject(publicSlug);
    if (!project) return reply.status(404).send({ error: "Not found" });
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const analytics = await input.repository.getProjectAnalytics(project.id, since7d).catch(() => null);
    return serializeForJson({
      id: project.id,
      name: project.name,
      displayName: project.displayName,
      slug: project.slug,
      publicSlug: project.publicSlug,
      totalRequests: project._count?.requestLogs ?? 0,
      avgLatencyMs: Math.round(analytics?.latency?.averageMs ?? 0),
      requestVolume7d: (analytics as Record<string, unknown> | null)?.timeSeries ?? [],
    });
  });

  // ── Activity log ──────────────────────────────────────────────────────────

  app.get("/v1/projects/:projectId/activity", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    return { items: await input.repository.listActivityLog(projectId) };
  });

  // ── System announcements ──────────────────────────────────────────────────

  app.get("/v1/announcements/active", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async () => {
    const ann = await input.repository.getActiveAnnouncement();
    return { announcement: ann };
  });

  app.post("/v1/admin/announcements", async (request, reply) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const body = z.object({ message: z.string().min(1).max(500), severity: z.enum(["info", "warning", "critical"]).default("info") }).parse(request.body);
    await input.repository.upsertAnnouncement({ message: body.message, severity: body.severity });
    return reply.status(201).send({ success: true });
  });

  app.delete("/v1/admin/announcements/active", async (request, reply) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    // Delegate to repository: deactivate all active announcements via any cast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (input.repository as any).prisma as any;
    await db.systemAnnouncement.updateMany({ where: { active: true }, data: { active: false } });
    return reply.status(204).send();
  });

  // ── What's New ────────────────────────────────────────────────────────────

  app.get("/v1/whats-new", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (request) => {
    const user = requireUser(request);
    const item = await input.repository.getWhatsNew(user.id);
    return { item };
  });

  app.post("/v1/whats-new/dismiss", async (request, reply) => {
    const user = requireUser(request);
    const { version } = z.object({ version: z.string().min(1) }).parse(request.body);
    await input.repository.dismissWhatsNew(user.id, version);
    return reply.send({ success: true });
  });

  app.post("/v1/admin/whats-new", async (request, reply) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const body = z.object({
      title: z.string().min(1).max(200),
      description: z.string().min(1).max(2000),
      version: z.string().min(1),
    }).parse(request.body);
    // Deactivate old entries and create new one
    const db = (input.repository as unknown as { prisma: { whatsNew: { updateMany: (args: unknown) => Promise<unknown>; create: (args: unknown) => Promise<unknown> } } }).prisma;
    await db.whatsNew.updateMany({ where: { active: true }, data: { active: false } });
    await db.whatsNew.create({ data: { title: body.title, description: body.description, version: body.version, active: true } });
    return reply.status(201).send({ success: true });
  });

  // ── Enterprise interest ───────────────────────────────────────────────────

  const enterpriseInterestSchema = z.object({
    companyName: z.string().trim().min(1).max(256),
    contactEmail: z.string().email().max(256),
    estimatedMonthlyReqs: z.string().trim().min(1).max(128),
    useCase: z.string().trim().min(1).max(2000),
  });

  app.post("/v1/enterprise/interest", async (request, reply) => {
    const body = enterpriseInterestSchema.parse(request.body);
    await input.repository.createEnterpriseInterest(body);
    return reply.status(201).send({ success: true });
  });

  // ── SVG Badge ─────────────────────────────────────────────────────────────

  app.get("/badge/project/:publicSlug", {
    config: { rateLimit: { max: 120, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const { publicSlug } = z.object({ publicSlug: z.string() }).parse(request.params);
    const project = await input.repository.findPublicProject(publicSlug);

    let label = "fyxvo";
    let status = "offline";
    let color = "#ef4444";

    if (project) {
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const analytics = await input.repository.getProjectAnalytics(project.id, since7d).catch(() => null);
      const avgLatency = Math.round(analytics?.latency?.averageMs ?? 0);

      if (avgLatency < 200) { status = `${avgLatency}ms`; color = "#22c55e"; }
      else if (avgLatency < 500) { status = `${avgLatency}ms`; color = "#f59e0b"; }
      else if (avgLatency > 0) { status = `${avgLatency}ms`; color = "#ef4444"; }
      else { status = "operational"; color = "#22c55e"; }
      label = project.name.slice(0, 20);
    }

    const labelWidth = Math.max(60, label.length * 7 + 10);
    const statusWidth = Math.max(70, status.length * 7 + 10);
    const totalWidth = labelWidth + statusWidth;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${status}">
  <title>${label}: ${status}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${statusWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="${Math.round(labelWidth / 2 + 1)}0" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${Math.round(labelWidth / 2 + 1)}0" y="140" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}" lengthAdjust="spacing">${label}</text>
    <text x="${Math.round(labelWidth + statusWidth / 2 + 1)}0" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(statusWidth - 10) * 10}" lengthAdjust="spacing">${status}</text>
    <text x="${Math.round(labelWidth + statusWidth / 2 + 1)}0" y="140" transform="scale(.1)" textLength="${(statusWidth - 10) * 10}" lengthAdjust="spacing">${status}</text>
  </g>
</svg>`;

    void reply.header("content-type", "image/svg+xml").header("cache-control", "max-age=300, s-maxage=300").header("access-control-allow-origin", "*");
    return reply.send(svg);
  });

  // ── Project health score ──────────────────────────────────────────────────

  app.get("/v1/projects/:projectId/health", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    const health = await input.repository.getProjectHealthScore(projectId);
    return { health };
  });

  app.get("/v1/projects/:projectId/health/history", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(403, "forbidden", "Access denied.");
    }
    return { history: await input.repository.getHealthHistory(projectId) };
  });

  // ── Webhook deliveries ────────────────────────────────────────────────────

  app.get("/v1/projects/:projectId/webhooks/:webhookId/deliveries", async (request) => {
    const user = requireUser(request);
    const { projectId, webhookId } = z.object({ projectId: z.string().uuid(), webhookId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) throw new HttpError(404, "project_not_found", "Project not found.");
    const deliveries = await input.repository.getWebhookDeliveries(webhookId);
    return { items: deliveries };
  });

  app.get("/v1/projects/:projectId/webhooks/events", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    const events = await input.repository.listWebhookEvents(projectId);
    return { items: events };
  });

  app.post("/v1/projects/:projectId/webhooks/events/:deliveryId/redeliver", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, deliveryId } = z.object({ projectId: z.string().uuid(), deliveryId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || project.ownerId !== user.id) throw new HttpError(403, "forbidden", "Only the project owner can trigger redelivery.");
    await input.repository.redeliverWebhookEvent(deliveryId, projectId);
    return reply.status(202).send({ success: true });
  });

  // ── Performance analytics ─────────────────────────────────────────────────

  app.post("/v1/analytics/performance", async (request, reply) => {
    const body = z.object({
      page: z.string().max(200),
      fcp: z.number().positive().max(60000).optional().nullable(),
      lcp: z.number().positive().max(60000).optional().nullable(),
      tti: z.number().positive().max(60000).optional().nullable(),
      ua: z.enum(["mobile", "desktop", "tablet"]).optional().nullable(),
    }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "Invalid data" });
    const d = body.data;
    await input.repository.recordPerformanceMetric({
      page: d.page,
      fcp: d.fcp ?? null,
      lcp: d.lcp ?? null,
      tti: d.tti ?? null,
      ua: d.ua ?? null,
    });
    return reply.status(201).send({ ok: true });
  });

  // ── Status page subscription ──────────────────────────────────────────────

  app.post("/v1/status/subscribe", async (request, reply) => {
    const { email } = z.object({ email: z.string().email().max(256) }).parse(request.body);
    await input.repository.subscribeToStatus(email);
    return reply.status(201).send({ success: true });
  });

  // ── Admin performance summary ─────────────────────────────────────────────

  app.get("/v1/admin/performance", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const summary = await input.repository.getPerformanceMetricSummary(7);
    return { items: summary };
  });

  // Webhook delivery retry worker — processes retries every 30 seconds
  const retryWorker = setInterval(() => {
    void (async () => {
      try {
        const pending = await input.repository.getPendingWebhookRetries();
        for (const delivery of pending) {
          const payload = JSON.stringify(delivery.payload);
          const sig = createHash("sha256").update(delivery.webhook.secret + payload).digest("hex");
          const newAttempt = delivery.attemptNumber + 1;
          const RETRY_DELAYS = [30_000, 300_000, 1_800_000, 7_200_000]; // 30s, 5m, 30m, 2h
          let success = false;
          let responseStatus: number | null = null;
          let responseBody: string | null = null;
          try {
            const res = await fetch(delivery.webhook.url, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-fyxvo-signature": sig,
                "x-fyxvo-attempt": String(newAttempt),
              },
              body: payload,
              signal: AbortSignal.timeout(10_000),
            });
            responseStatus = res.status;
            responseBody = await res.text().catch(() => null);
            success = res.ok;
          } catch {
            success = false;
          }
          const retryDelay = RETRY_DELAYS[newAttempt - 1];
          const nextRetryAt = !success && newAttempt < 5 && retryDelay
            ? new Date(Date.now() + retryDelay)
            : null;
          const updateData: { responseStatus?: number; responseBody?: string; success: boolean; nextRetryAt: Date | null } = { success, nextRetryAt };
          if (responseStatus !== null) updateData.responseStatus = responseStatus;
          if (responseBody !== null) updateData.responseBody = responseBody;
          await input.repository.updateWebhookDelivery(delivery.id, updateData);
          // Record new attempt
          if (!success && newAttempt < 5) {
            await input.repository.recordWebhookDelivery({
              webhookId: delivery.webhookId,
              eventType: delivery.eventType,
              payload: delivery.payload,
              attemptNumber: newAttempt,
              responseStatus,
              responseBody,
              success,
              nextRetryAt,
            });
          }
        }
      } catch { /* background worker — silent fail */ }
    })();
  }, 30_000);

  // Clean up on app close
  app.addHook("onClose", () => { clearInterval(retryWorker); });

  // ── API version header on all responses ──────────────────────────────────
  app.addHook("onRequest", async (_req, reply) => {
    reply.header("X-Fyxvo-API-Version", "v1");
  });

  // ── Operators activity feed ───────────────────────────────────────────────
  app.get("/v1/operators/activity", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const items = await input.repository.getOperatorActivity(20);
    return { items };
  });

  app.get("/v1/operators/daily-requests", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const data = await input.repository.getOperatorDailyRequests(7);
    return { data };
  });

  // ── Analytics node distribution ───────────────────────────────────────────
  app.get("/v1/projects/:projectId/analytics/nodes", async (request) => {
    const user = requireUser(request);
    const { projectId } = request.params as { projectId: string };
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    const nodes = await input.repository.getNodeDistribution(projectId, 30);
    return { nodes, dataAvailable: nodes.length > 0 };
  });

  // ── Latency heatmap ───────────────────────────────────────────────────────
  app.get("/v1/projects/:projectId/analytics/heatmap", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const { range = "7d" } = z.object({ range: z.enum(["24h", "7d", "30d"]).default("7d") }).parse(request.query);
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    return { grid: await input.repository.getLatencyHeatmap(projectId, range) };
  });

  // ── Request trace lookup ──────────────────────────────────────────────────
  app.get("/v1/projects/:projectId/requests/:traceId", async (request) => {
    const user = requireUser(request);
    const { projectId, traceId } = z.object({
      projectId: z.string().uuid(),
      traceId: z.string().uuid(),
    }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    const log = await input.repository.findRequestByTraceId(projectId, traceId);
    if (!log) throw new HttpError(404, "not_found", "Trace ID not found.");
    return log;
  });

  // ── Network capacity ──────────────────────────────────────────────────────
  app.get("/v1/network/capacity", async () => {
    const since = new Date(Date.now() - 60_000);
    const recentCount = await input.repository.countRecentRequests(since);
    const requestsPerMinute = recentCount;
    const capacityRpm = 10_000;
    const utilizationPct = Math.min(100, Math.round((requestsPerMinute / capacityRpm) * 100));
    return { requestsPerMinute, capacityRpm, utilizationPct };
  });

  // ── Success rate trend ────────────────────────────────────────────────────
  app.get("/v1/projects/:projectId/analytics/success-trend", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const { range = "7d" } = z.object({ range: z.enum(["24h", "7d", "30d"]).default("7d") }).parse(request.query);
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    return { points: await input.repository.getSuccessRateTrend(projectId, range) };
  });

  // ── CSP violation reporting ───────────────────────────────────────────────
  app.post("/v1/analytics/csp-violation", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    // Log CSP violations — no persistent storage, admin panel reads from in-memory buffer
    const body = z.object({
      blockedUri: z.string().max(500),
      violatedDirective: z.string().max(200),
      timestamp: z.string().max(30),
    }).safeParse(request.body);
    if (!body.success) return reply.status(204).send();
    // Best-effort: store in a rolling in-memory buffer (last 20 entries)
    cspViolations.push({ ...body.data, receivedAt: new Date().toISOString() });
    if (cspViolations.length > 20) cspViolations.shift();
    return reply.status(204).send();
  });

  app.get("/v1/admin/csp-violations", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN") throw new HttpError(403, "forbidden", "Admin only.");
    return { violations: [...cspViolations].reverse() };
  });

  // ── Client error reporting ────────────────────────────────────────────────
  app.post("/v1/analytics/errors", async (request, reply) => {
    const body = z.object({
      component: z.string().max(100),
      message: z.string().max(500),
      page: z.string().max(200),
    }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "Invalid data" });
    await input.repository.recordClientError(body.data);
    return reply.status(201).send({ ok: true });
  });

  // ── Support tickets ───────────────────────────────────────────────────────
  app.post("/v1/support/tickets", async (request, reply) => {
    const user = requireUser(request);
    const body = z.object({
      projectId: z.string().optional(),
      category: z.enum(["general", "billing", "technical", "security"]).default("general"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      subject: z.string().min(5).max(200),
      description: z.string().min(10).max(5000),
    }).parse(request.body);
    const ticketInput: { userId: string; projectId?: string; category: string; priority: string; subject: string; description: string } = {
      userId: user.id,
      category: body.category,
      priority: body.priority,
      subject: body.subject,
      description: body.description,
    };
    if (body.projectId !== undefined) ticketInput.projectId = body.projectId;
    const ticket = await input.repository.createSupportTicket(ticketInput);
    return reply.status(201).send(ticket);
  });

  app.get("/v1/support/tickets", async (request) => {
    const user = requireUser(request);
    const tickets = await input.repository.listSupportTickets(user.id);
    return { tickets };
  });

  app.get("/v1/support/tickets/:id", async (request) => {
    const user = requireUser(request);
    const { id } = request.params as { id: string };
    const ticket = await input.repository.getSupportTicket(id, user.id);
    if (!ticket) throw new HttpError(404, "not_found", "Ticket not found.");
    return ticket;
  });

  app.get("/v1/admin/support/tickets", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const { status } = request.query as { status?: string };
    const tickets = await input.repository.adminListSupportTickets(status);
    return { tickets };
  });

  app.post("/v1/admin/support/tickets/:id/respond", async (request, reply) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const { id } = request.params as { id: string };
    const { response, status } = z.object({
      response: z.string().min(1).max(5000),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).default("resolved"),
    }).parse(request.body);
    const ticket = await input.repository.adminRespondToTicket(id, response, status);
    return reply.status(200).send(ticket);
  });

  // ── Blog / updates ────────────────────────────────────────────────────────
  app.get("/v1/updates", async () => {
    const posts = await input.repository.listBlogPosts(true);
    return { posts };
  });

  app.get("/v1/updates/:slug", async (request) => {
    const { slug } = request.params as { slug: string };
    const post = await input.repository.getBlogPost(slug);
    if (!post) throw new HttpError(404, "not_found", "Post not found.");
    return post;
  });

  app.post("/v1/admin/updates", async (request, reply) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN" && user.role !== "OWNER") throw new HttpError(403, "forbidden", "Admin access required.");
    const body = z.object({
      slug: z.string().min(1).max(100),
      title: z.string().min(1).max(200),
      summary: z.string().min(1).max(500),
      content: z.string().min(1).max(50000),
      visible: z.boolean().default(false),
    }).parse(request.body);
    const post = await input.repository.createBlogPost(body);
    return reply.status(201).send(post);
  });

  // ── Newsletter subscribe ──────────────────────────────────────────────────
  app.post("/v1/newsletter/subscribe", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } }
  }, async (request, reply) => {
    const body = z.object({ email: z.string().email() }).parse(request.body);
    await input.repository.subscribeNewsletter({ email: body.email, source: "landing" });
    return reply.status(200).send({ success: true });
  });

  // ── Leaderboard (public) ──────────────────────────────────────────────────
  app.get("/v1/leaderboard", async () => {
    return { entries: await input.repository.getLeaderboard() };
  });

  // ── Email verification prep ───────────────────────────────────────────────
  app.post("/v1/me/verify-email/request", async (request, reply) => {
    requireUser(request);
    return reply.status(503).send({
      error: "email_delivery_not_enabled",
      message: "Email delivery is not yet enabled. Verification will be available in a future release."
    });
  });

  app.post("/v1/me/verify-email/confirm", async (request, reply) => {
    const body = z.object({ token: z.string() }).parse(request.body);
    const result = await input.repository.verifyEmail(body.token);
    if (!result.success) {
      return reply.status(400).send({ error: "invalid_token", message: "Token is invalid or expired." });
    }
    return { success: true };
  });

  app.get("/v1/me/tos-status", async (request) => {
    const user = requireUser(request);
    return input.repository.getTosStatus(user.id);
  });

  // ── System-wide search ────────────────────────────────────────────────────
  app.get("/v1/search", async (request) => {
    const user = requireUser(request);
    const { q } = z.object({ q: z.string().min(1).max(100) }).parse(request.query);
    const results = await input.repository.globalSearch(user.id, q);
    return results;
  });

  return app;
}

function rangeToMs(range: "1h" | "6h" | "24h" | "7d" | "30d"): number {
  const map: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000
  };
  return map[range] ?? map["7d"]!;
}

function requestLogger(app: FastifyInstance, error: unknown) {
  app.log.error(
    {
      event: "api.request.error",
      error: sanitizeErrorForLogs(error)
    },
    "API handler failure"
  );
}

export async function buildProductionApiApp(input: {
  readonly env: ApiEnv;
  readonly prisma: PrismaClientType;
}) {
  const blockchain = new SolanaBlockchainClient({
    rpcUrl: input.env.SOLANA_RPC_URL,
    expectedAdminAuthority: input.env.FYXVO_ADMIN_AUTHORITY,
    usdcMintAddress: input.env.USDC_MINT_ADDRESS,
    programId: input.env.FYXVO_PROGRAM_ID
  });

  return buildApiApp({
    env: input.env,
    repository: new PrismaApiRepository(input.prisma),
    blockchain,
    healthcheck: () => databaseHealthcheck(input.prisma),
    logger: true
  });
}
