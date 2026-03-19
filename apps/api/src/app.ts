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
  signature: z.string().min(1)
});

const createProjectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(128),
  description: z.string().trim().max(500).optional()
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
  description: z.string().trim().max(500).nullable().optional()
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
      throw new HttpError(401, "invalid_token", "The provided JWT is invalid.");
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
    const [database, readiness] = await Promise.all([
      (input.healthcheck ?? (() => Promise.resolve(true)))(),
      input.blockchain.getProtocolReadiness().catch(() => null)
    ]);

    return {
      status: database && readiness?.ready ? "ok" : "degraded",
      service: "api",
      database,
      chain: readiness?.ready ?? false,
      protocolReady: readiness?.ready ?? false,
      timestamp: new Date().toISOString()
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
      throw new HttpError(401, "invalid_signature", "Wallet signature verification failed.");
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
        status: user.status
      }
    });
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
        ...(body.description !== undefined ? { description: body.description } : {})
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

    return {
      item: await withBlockchainErrors(() =>
        input.blockchain.waitForConfirmedProjectActivation({
          ownerWalletAddress: project.owner.walletAddress,
          chainProjectId: project.chainProjectId,
          storedProjectPda: project.onChainProjectPda,
          signature: body.signature
        })
      )
    };
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
      ...(body.description !== undefined ? { description: body.description } : {})
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

    return { item: apiKey };
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
