import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import type { ApiEnv } from "@fyxvo/config";
import {
  COMPUTE_HEAVY_METHODS,
  FREE_TIER_REQUESTS,
  PRICING_LAMPORTS,
  VOLUME_DISCOUNT,
  WRITE_METHODS,
  normalizeApiKeyScopes,
  resolveAuthorityPlan,
  isEmailDeliveryEnabled,
  supportedApiKeyScopes,
  getSolanaNetworkConfig,
  resolveAllowedCorsOrigins,
  sendTransactionalEmail
} from "@fyxvo/config";
import { databaseHealthcheck } from "@fyxvo/database";
import bs58 from "bs58";
import type { PrismaClientType } from "@fyxvo/database";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { createClient, type RedisClientType } from "redis";
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

const API_STATUS_VERSION = "v1";

function buildEmailVerificationMessage(input: {
  readonly origin: string;
  readonly walletAddress: string;
  readonly token: string;
}) {
  const verificationUrl = `${input.origin.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(input.token)}`;
  return {
    subject: "Verify your Fyxvo email",
    text:
      `Verify your email for Fyxvo.\n\n` +
      `Wallet: ${input.walletAddress}\n` +
      `Open this link to confirm: ${verificationUrl}\n\n` +
      `This verification link expires in 24 hours.`,
    html:
      `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">` +
      `<h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;">Verify your Fyxvo email</h1>` +
      `<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">Confirm this address to receive weekly digests and account alerts for wallet <strong>${input.walletAddress}</strong>.</p>` +
      `<p style="margin:24px 0;"><a href="${verificationUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Verify email</a></p>` +
      `<p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 12px;">If the button does not open, copy this link into your browser:</p>` +
      `<p style="font-size:13px;line-height:1.6;word-break:break-word;color:#0f172a;margin:0 0 16px;">${verificationUrl}</p>` +
      `<p style="font-size:12px;line-height:1.6;color:#64748b;margin:0;">This verification link expires in 24 hours.</p>` +
      `</div>`,
  };
}

function buildIncidentSubscriberMessage(input: {
  readonly serviceName: string;
  readonly severity: string;
  readonly description: string;
  readonly statusLabel: string;
  readonly statusPageUrl: string;
}) {
  return {
    subject: `[Fyxvo status] ${input.statusLabel}: ${input.serviceName}`,
    text:
      `${input.statusLabel} for ${input.serviceName}\n\n` +
      `${input.description}\n\n` +
      `Severity: ${input.severity}\n` +
      `Status page: ${input.statusPageUrl}`,
    html:
      `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">` +
      `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Fyxvo status update</p>` +
      `<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px;">${input.statusLabel}: ${input.serviceName}</h1>` +
      `<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">${input.description}</p>` +
      `<p style="font-size:13px;line-height:1.6;color:#475569;margin:0 0 18px;">Severity: ${input.severity}</p>` +
      `<p style="margin:0;"><a href="${input.statusPageUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600;">Open status page</a></p>` +
      `</div>`,
  };
}

function buildEmailDeliveryTestMessage(input: {
  readonly walletAddress: string;
  readonly timestamp: string;
}) {
  return {
    subject: "Fyxvo email delivery test",
    text:
      `This is a live Fyxvo email delivery test.\n\n` +
      `Wallet: ${input.walletAddress}\n` +
      `Sent at: ${input.timestamp}\n\n` +
      `If you received this email, verification, digest delivery, and operational notices can reach this inbox.`,
    html:
      `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">` +
      `<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Fyxvo delivery check</p>` +
      `<h1 style="font-size:24px;line-height:1.2;margin:0 0 12px;">Your email delivery is working</h1>` +
      `<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">This is a live test email for wallet <strong>${input.walletAddress}</strong>.</p>` +
      `<div style="border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#f8fafc;">` +
      `<p style="margin:0 0 8px;font-size:13px;color:#475569;">Sent at</p>` +
      `<p style="margin:0;font-size:14px;color:#0f172a;">${input.timestamp}</p>` +
      `</div>` +
      `<p style="font-size:13px;line-height:1.6;color:#475569;margin:16px 0 0;">If you received this email, Fyxvo can reach this inbox for verification links, weekly digests, and operational notices.</p>` +
      `</div>`,
  };
}

function getRuntimeCommitSha() {
  const commit =
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    process.env.COMMIT_SHA;

  return typeof commit === "string" && commit.trim().length > 0 ? commit.trim() : null;
}

async function detectPendingPrismaMigrations(prisma?: PrismaClientType) {
  const checkedAt = new Date().toISOString();

  if (!prisma) {
    return {
      checkedAt,
      detected: false,
      count: 0,
      names: [] as string[],
      error: "Prisma client is not available in this runtime."
    };
  }

  try {
    const migrationsDir = path.resolve(process.cwd(), "packages/database/prisma/migrations");
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const expectedNames = entries
      .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    const appliedRows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT "migration_name"
      FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL
    `;
    const appliedNames = new Set(
      appliedRows
        .map((row) => row.migration_name)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    );
    const pendingNames = expectedNames.filter((name) => !appliedNames.has(name));

    return {
      checkedAt,
      detected: pendingNames.length > 0,
      count: pendingNames.length,
      names: pendingNames,
      error: null
    };
  } catch (error) {
    return {
      checkedAt,
      detected: false,
      count: 0,
      names: [] as string[],
      error: error instanceof Error ? error.message : "Unable to inspect Prisma migration state."
    };
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
  dailyBudgetLamports: z.string().trim().regex(/^\d+$/).nullable().optional(),
  monthlyBudgetLamports: z.string().trim().regex(/^\d+$/).nullable().optional(),
  budgetWarningThresholdPct: z.number().int().min(1).max(100).nullable().optional(),
  budgetHardStop: z.boolean().optional(),
  archivedAt: z.string().datetime().optional().nullable(),
  environment: z.enum(["development", "staging", "production"]).optional(),
  starred: z.boolean().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  githubUrl: z.string().url().max(256).nullable().optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z.string().trim().min(3).max(64).regex(/^[a-z0-9-]+$/).nullable().optional(),
  leaderboardVisible: z.boolean().optional(),
});

const createApiKeySchema = z.object({
  label: z.string().trim().min(2).max(100),
  colorTag: z.string().trim().max(24).optional().nullable(),
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

const createOperatorRegistrationSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), "Operator endpoint must use HTTPS."),
  operatorWalletAddress: z.string().trim().min(32).max(64),
  name: z.string().trim().min(2).max(120),
  region: z.string().trim().min(2).max(40),
  contact: z.string().trim().email().max(320)
});

const operatorRegistrationActionSchema = z.object({
  reason: z.string().trim().min(2).max(500).optional()
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
  return user.role === "OWNER" || user.role === "ADMIN" || project.ownerId === user.id || (project.memberUserIds ?? []).includes(user.id);
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
  const baseAuthorityPlan = resolveAuthorityPlan({
    source: process.env,
    protocolAuthorityFallback: input.env.FYXVO_ADMIN_AUTHORITY
  });
  const authorityWarnings = [...baseAuthorityPlan.warnings];
  const actualUpgradeAuthority = input.readiness?.programUpgradeAuthority ?? null;
  if (actualUpgradeAuthority == null) {
    authorityWarnings.push(
      "The live upgrade authority could not be confirmed from the deployed program. Do not assume the admin signer can manage canonical metadata or upgrades."
    );
  } else if (
    baseAuthorityPlan.upgradeAuthorityHint &&
    actualUpgradeAuthority !== baseAuthorityPlan.upgradeAuthorityHint
  ) {
    authorityWarnings.push(
      `Live upgrade authority is ${actualUpgradeAuthority}, but runtime config records ${baseAuthorityPlan.upgradeAuthorityHint}.`
    );
  }
  const authorityPlan = {
    ...baseAuthorityPlan,
    actualUpgradeAuthority,
    warnings: authorityWarnings,
  };
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

const DEFAULT_MAINNET_TARGET_RESERVE_LAMPORTS = 100_000_000_000n;
const MAINNET_SUPPORT_BACKLOG_LIMIT = 10;

async function buildMainnetReleaseGateSnapshot(input: {
  readonly env: ApiEnv;
  readonly prisma: PrismaClientType;
  readonly blockchain: BlockchainClient;
}) {
  const environment = input.env.FYXVO_ENV;
  const authorityPlan = resolveAuthorityPlan({
    source: process.env,
    protocolAuthorityFallback: input.env.FYXVO_ADMIN_AUTHORITY,
  });
  const [gate, readiness, pendingMigrations, activeIncidentCount, supportBacklogCount, confirmedFundingRows] =
    await Promise.all([
      input.prisma.mainnetReleaseGate.findUnique({
        where: { environment },
        include: {
          armedByUser: {
            select: { walletAddress: true },
          },
        },
      }),
      input.blockchain.getProtocolReadiness().catch(() => null),
      detectPendingPrismaMigrations(input.prisma),
      input.prisma.incident.count({ where: { resolvedAt: null } }),
      input.prisma.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
      input.prisma.fundingCoordinate.findMany({
        where: {
          asset: "SOL",
          confirmedAt: { not: null },
        },
        select: { amount: true },
      }),
    ]);

  const targetReserveLamports = gate?.targetReserveLamports ?? DEFAULT_MAINNET_TARGET_RESERVE_LAMPORTS;
  const confirmedFundingLamports = confirmedFundingRows.reduce((total, row) => total + BigInt(row.amount.toString()), 0n);
  const treasuryOverview = buildAdminProtocolOverview({
    env: input.env,
    readiness,
  }).treasury;
  const actualUpgradeAuthority = readiness?.programUpgradeAuthority ?? null;
  const treasurySolBalanceLamports = treasuryOverview.solBalance;
  const treasurySolBalanceValue = treasurySolBalanceLamports ? BigInt(treasurySolBalanceLamports) : 0n;
  const observedReserveLamports =
    treasurySolBalanceValue > confirmedFundingLamports ? treasurySolBalanceValue : confirmedFundingLamports;
  const assistantAvailable = isAssistantConfigured(input.env);
  const emailDeliveryConfigured = isEmailDeliveryEnabled({
    apiKey: input.env.RESEND_API_KEY,
    from: input.env.EMAIL_FROM,
  });
  const reserveReady = observedReserveLamports >= targetReserveLamports;
  const protocolReady = readiness?.ready ?? false;

  const paidBetaBlockers = [
    !assistantAvailable ? "Assistant availability is not healthy yet." : null,
    !emailDeliveryConfigured ? "Email delivery is not configured for verification, digests, and incident communication." : null,
    activeIncidentCount > 0
      ? `${activeIncidentCount} active incident${activeIncidentCount === 1 ? "" : "s"} must be resolved first.`
      : null,
    pendingMigrations.detected
      ? `${pendingMigrations.count} pending Prisma migration${pendingMigrations.count === 1 ? "" : "s"} remain unapplied.`
      : null,
    supportBacklogCount > MAINNET_SUPPORT_BACKLOG_LIMIT
      ? `Support backlog is high at ${supportBacklogCount} open items.`
      : null,
  ].filter((item): item is string => Boolean(item));

  const mainnetBetaBlockers = [
    ...paidBetaBlockers,
    !protocolReady ? "Protocol readiness is not fully green on the current cluster." : null,
    !reserveReady
      ? `Observed treasury reserve is ${observedReserveLamports.toString()} lamports (confirmed funding ${confirmedFundingLamports.toString()}, on-chain treasury balance ${treasurySolBalanceValue.toString()}), below the target reserve of ${targetReserveLamports.toString()} lamports.`
      : null,
    authorityPlan.mode === "single-signer"
      ? "Authority mode is still single-signer. Governed or multisig control is required before mainnet beta."
      : null,
    authorityPlan.upgradeAuthorityHint == null
      ? "Upgrade authority is not documented in runtime config yet."
      : null,
    authorityPlan.upgradeAuthorityHint &&
    actualUpgradeAuthority &&
    authorityPlan.upgradeAuthorityHint !== actualUpgradeAuthority
      ? `On-chain upgrade authority is ${actualUpgradeAuthority}, but runtime config records ${authorityPlan.upgradeAuthorityHint}.`
      : null,
    ...treasuryOverview.reconciliationWarnings,
  ].filter((item): item is string => Boolean(item));

  const checks = [
    {
      key: "confirmed_reserve",
      label: "Confirmed reserve",
      status: reserveReady ? "healthy" : "needs_attention",
      detail: `${observedReserveLamports.toString()} / ${targetReserveLamports.toString()} lamports observed between confirmed funding and live treasury balance`,
    },
    {
      key: "assistant",
      label: "Assistant availability",
      status: assistantAvailable ? "healthy" : "blocked",
      detail: assistantAvailable ? "Assistant is configured for production." : "Assistant is not configured in the current runtime.",
    },
    {
      key: "email_delivery",
      label: "Email delivery",
      status: emailDeliveryConfigured ? "healthy" : "needs_attention",
      detail: emailDeliveryConfigured ? "Verification, digest, and incident email paths are configured." : "Email delivery is missing provider configuration.",
    },
    {
      key: "pending_migrations",
      label: "Pending migrations",
      status: pendingMigrations.detected ? "blocked" : "healthy",
      detail: pendingMigrations.detected
        ? `${pendingMigrations.count} pending migration${pendingMigrations.count === 1 ? "" : "s"} detected.`
        : "No unapplied Prisma migrations detected.",
    },
    {
      key: "incidents",
      label: "Incidents",
      status: activeIncidentCount > 0 ? "blocked" : "healthy",
      detail:
        activeIncidentCount > 0
          ? `${activeIncidentCount} active incident${activeIncidentCount === 1 ? "" : "s"} need attention.`
          : "No active incidents are open.",
    },
    {
      key: "support_backlog",
      label: "Support backlog",
      status: supportBacklogCount > MAINNET_SUPPORT_BACKLOG_LIMIT ? "needs_attention" : "healthy",
      detail: `${supportBacklogCount} open support ticket${supportBacklogCount === 1 ? "" : "s"}.`,
    },
    {
      key: "authority_mode",
      label: "Authority posture",
      status: authorityPlan.mode === "single-signer" ? "blocked" : "healthy",
      detail: `Current authority mode: ${authorityPlan.mode}.`,
    },
    {
      key: "upgrade_authority",
      label: "Upgrade authority hint",
      status:
        authorityPlan.upgradeAuthorityHint == null
          ? "needs_attention"
          : actualUpgradeAuthority && authorityPlan.upgradeAuthorityHint !== actualUpgradeAuthority
            ? "blocked"
            : "healthy",
      detail:
        authorityPlan.upgradeAuthorityHint == null
          ? "Upgrade authority is not documented in runtime config."
          : actualUpgradeAuthority && authorityPlan.upgradeAuthorityHint !== actualUpgradeAuthority
            ? `Recorded as ${authorityPlan.upgradeAuthorityHint}, but the deployed program is controlled by ${actualUpgradeAuthority}.`
            : actualUpgradeAuthority
              ? `Recorded as ${authorityPlan.upgradeAuthorityHint}, matching the deployed program.`
              : `Recorded as ${authorityPlan.upgradeAuthorityHint}.`,
    },
    {
      key: "protocol_readiness",
      label: "Protocol readiness",
      status: protocolReady ? "healthy" : "blocked",
      detail: protocolReady ? "Protocol readiness checks are green." : "Protocol readiness is not fully green.",
    },
    {
      key: "treasury_reconciliation",
      label: "Treasury reconciliation",
      status: treasuryOverview.reconciliationWarnings.length > 0 ? "needs_attention" : "healthy",
      detail:
        treasuryOverview.reconciliationWarnings[0] ??
        "Treasury balance and reserve checks do not show reconciliation warnings.",
    },
  ] as const;

  return {
    timestamp: new Date().toISOString(),
    environment,
    targetReserveLamports: targetReserveLamports.toString(),
    confirmedFundingLamports: confirmedFundingLamports.toString(),
    treasurySolBalanceLamports,
    assistantAvailable,
    emailDeliveryConfigured,
    authorityMode: authorityPlan.mode,
    upgradeAuthorityConfigured: authorityPlan.upgradeAuthorityHint != null,
    protocolReady,
    activeIncidentCount,
    supportBacklogCount,
    pendingMigrations,
    treasuryWarnings: treasuryOverview.reconciliationWarnings,
    paidBetaEligible: paidBetaBlockers.length === 0,
    mainnetBetaEligible: mainnetBetaBlockers.length === 0,
    paidBetaBlockers,
    mainnetBetaBlockers,
    checks,
    gate: {
      armed: gate?.armed ?? false,
      armedAt: gate?.armedAt?.toISOString() ?? null,
      armedByWallet: gate?.armedByUser?.walletAddress ?? null,
      notes: gate?.notes ?? null,
    },
  };
}

function isPrivilegedAdminUser(user: AuthenticatedUser | undefined): boolean {
  return user?.role === "OWNER" || user?.role === "ADMIN";
}

function toPublicMainnetReleaseGateSnapshot(
  snapshot: Awaited<ReturnType<typeof buildMainnetReleaseGateSnapshot>>
) {
  return {
    timestamp: snapshot.timestamp,
    environment: snapshot.environment,
    targetReserveLamports: snapshot.targetReserveLamports,
    confirmedFundingLamports: snapshot.confirmedFundingLamports,
    treasurySolBalanceLamports: snapshot.treasurySolBalanceLamports,
    assistantAvailable: snapshot.assistantAvailable,
    emailDeliveryConfigured: snapshot.emailDeliveryConfigured,
    authorityMode: snapshot.authorityMode,
    upgradeAuthorityConfigured: snapshot.upgradeAuthorityConfigured,
    protocolReady: snapshot.protocolReady,
    activeIncidentCount: snapshot.activeIncidentCount,
    paidBetaEligible: snapshot.paidBetaEligible,
    mainnetBetaEligible: snapshot.mainnetBetaEligible,
    paidBetaBlockers: snapshot.paidBetaBlockers,
    mainnetBetaBlockers: snapshot.mainnetBetaBlockers,
    checks: snapshot.checks,
    gate: {
      armed: snapshot.gate.armed,
      armedAt: snapshot.gate.armedAt,
      notes: snapshot.gate.notes,
    },
  };
}

function toPublicNetworkReadinessSummary(
  snapshot: Awaited<ReturnType<typeof buildMainnetReleaseGateSnapshot>>
) {
  const readinessPercentage =
    snapshot.checks.length < 1
      ? 0
      : Math.round(
          (snapshot.checks.filter((check) => check.status === "healthy").length / snapshot.checks.length) * 100
        );

  return {
    ready: snapshot.mainnetBetaEligible,
    readinessPercentage,
    gates: snapshot.checks.map((check) => ({
      name: check.label,
      status: check.status === "healthy" ? "pass" : "fail",
    })),
    blockers: snapshot.mainnetBetaBlockers,
  };
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

function applyHijackedCorsHeaders(input: {
  raw: {
    setHeader(name: string, value: string): void;
    getHeader(name: string): number | string | string[] | undefined;
  };
  origin: string | undefined;
  allowedOrigins: ReadonlySet<string>;
}) {
  if (!input.origin || !input.allowedOrigins.has(input.origin)) {
    return;
  }

  input.raw.setHeader("Access-Control-Allow-Origin", input.origin);
  input.raw.setHeader("Access-Control-Allow-Credentials", "true");
  input.raw.setHeader("Access-Control-Expose-Headers", "x-fyxvo-conversation-id, x-request-id");

  const varyHeader = input.raw.getHeader("Vary");
  if (typeof varyHeader === "string" && varyHeader.length > 0) {
    input.raw.setHeader("Vary", varyHeader.includes("Origin") ? varyHeader : `${varyHeader}, Origin`);
    return;
  }

  input.raw.setHeader("Vary", "Origin");
}

function isAssistantConfigured(env: Pick<ApiEnv, "ANTHROPIC_API_KEY">): boolean {
  return Boolean(env.ANTHROPIC_API_KEY?.trim());
}

function extractSseDataPayloads(input: string): {
  readonly payloads: string[];
  readonly remainder: string;
} {
  const events = input.split(/\r?\n\r?\n/);
  const remainder = events.pop() ?? "";
  const payloads = events
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
    )
    .filter((payload) => payload.length > 0);

  return {
    payloads,
    remainder
  };
}

function assistantConversationTitleFromMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) return "New conversation";
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 57).trimEnd()}...`;
}

type AssistantProjectContext = {
  projectId?: string | undefined;
  projectName?: string | undefined;
  projectNames?: string[] | undefined;
  balance?: string | undefined;
  totalBalanceSol?: number | undefined;
  requestCount?: number | undefined;
  requestsLast7Days?: number | undefined;
  successRate?: number | undefined;
  gatewayStatus?: string | undefined;
  activationStatus?: string | undefined;
  latestApiKeyMasked?: string | undefined;
  simulationModeAvailable?: boolean | undefined;
  activeAnnouncements?: string[] | undefined;
};

function sanitizeAssistantProjectContext(context: AssistantProjectContext): AssistantProjectContext {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined)
  ) as AssistantProjectContext;
}

type AssistantUiAction = {
  id: string;
  label: string;
  href: string;
  kind: "playground" | "funding" | "api_keys" | "analytics" | "docs" | "invite" | "project";
};

type AssistantPlaygroundPayload = {
  method: string;
  params?: Record<string, string>;
  snippet?: string;
  mode?: "standard" | "priority";
  simulate?: boolean;
};

const ASSISTANT_DOCS_LINKS = {
  quickstart: { href: "/docs#quickstart", label: "Open quickstart" },
  authentication: { href: "/docs#authentication", label: "Open auth docs" },
  funding: { href: "/docs#funding", label: "Open funding docs" },
  "priority-relay": { href: "/docs#priority-relay", label: "Open priority relay docs" },
  analytics: { href: "/docs#analytics", label: "Open analytics docs" },
  webhooks: { href: "/docs#webhooks", label: "Open webhook docs" },
  "simulation-mode": { href: "/docs#simulation-mode", label: "Open simulation docs" },
  pricing: { href: "/pricing", label: "Open pricing" },
} as const;

function detectAssistantDocsSection(content: string): keyof typeof ASSISTANT_DOCS_LINKS | null {
  const lower = content.toLowerCase();
  if (lower.includes("pricing") || lower.includes("lamport")) return "pricing";
  if (lower.includes("webhook")) return "webhooks";
  if (lower.includes("api key") || lower.includes("x-api-key") || lower.includes("authentication")) return "authentication";
  if (lower.includes("fund") || lower.includes("treasury") || lower.includes("devnet sol")) return "funding";
  if (lower.includes("priority")) return "priority-relay";
  if (lower.includes("analytics") || lower.includes("latency") || lower.includes("request log")) return "analytics";
  if (lower.includes("simulation")) return "simulation-mode";
  if (lower.includes("quickstart") || lower.includes("first request")) return "quickstart";
  return null;
}

function firstAssistantCodeBlock(content: string): string | null {
  const match = content.match(/```[\w-]*\n([\s\S]*?)```/);
  return match?.[1]?.trim() ?? null;
}

function detectAssistantPlaygroundPayload(content: string): AssistantPlaygroundPayload | null {
  const block = firstAssistantCodeBlock(content) ?? content;
  const methodMatch =
    block.match(/"method"\s*:\s*"([^"]+)"/) ??
    block.match(/\b(getHealth|getSlot|getLatestBlockhash|getBalance|getAccountInfo|getEpochInfo|simulateTransaction|getVersion)\b/);
  if (!methodMatch) return null;

  const method = methodMatch[1]!;
  const params: Record<string, string> = {};
  if (method === "getBalance" || method === "getAccountInfo") {
    const keyMatch = block.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
    if (keyMatch) {
      params.pubkey = keyMatch[0];
    }
  }
  if (method === "simulateTransaction") {
    params.signature = "";
  }

  const mode = /\/priority\b|priority relay|priority endpoint/i.test(block) ? "priority" : "standard";
  const simulate =
    /simulate=true|simulation mode|simulated response|method-not-simulated/i.test(block) || method === "simulateTransaction";
  return {
    method,
    params,
    snippet: block,
    mode,
    simulate,
  };
}

function inferAssistantPromptCategory(input: string): string {
  const lower = input.toLowerCase();
  if (/(first request|quickstart|getting started|how do i start)/.test(lower)) return "getting_started";
  if (/(fund|pricing|lamport|devnet sol|cost|volume discount)/.test(lower)) return "funding_pricing";
  if (/(rpc|priority|relay|getlatestblockhash|getbalance|getaccountinfo|json-rpc)/.test(lower)) return "rpc_relay";
  if (/(debug|error|trace|failed|401|429|500|503|issue|broken)/.test(lower)) return "debugging";
  if (/(analytics|latency|requests|traffic|dashboard|metrics)/.test(lower)) return "analytics";
  return "general";
}

function inferAssistantSuggestedActions(input: {
  content: string;
  projectContext?: AssistantProjectContext | undefined;
  docsSection: keyof typeof ASSISTANT_DOCS_LINKS | null;
  playgroundPayload: AssistantPlaygroundPayload | null;
}): AssistantUiAction[] {
  const actions = new Map<string, AssistantUiAction>();
  const lower = input.content.toLowerCase();

  const add = (action: AssistantUiAction | null) => {
    if (!action) return;
    actions.set(action.id, action);
  };

  if (input.playgroundPayload) {
    add({ id: "open_playground", label: "Open playground", href: "/playground", kind: "playground" });
  }

  if (input.docsSection) {
    const docs = ASSISTANT_DOCS_LINKS[input.docsSection];
    add({ id: `docs_${input.docsSection}`, label: docs.label, href: docs.href, kind: "docs" });
  }

  if (lower.includes("api key") || lower.includes("x-api-key") || lower.includes("authentication")) {
    add({ id: "open_api_keys", label: "Open API keys", href: "/api-keys", kind: "api_keys" });
  }

  if (lower.includes("fund") || lower.includes("treasury") || lower.includes("devnet sol")) {
    add({ id: "open_funding", label: "Open funding page", href: "/funding", kind: "funding" });
  }

  if (lower.includes("analytics") || lower.includes("latency") || lower.includes("request log")) {
    add({ id: "open_analytics", label: "Open analytics", href: "/analytics", kind: "analytics" });
  }

  if (lower.includes("invite") || lower.includes("team") || lower.includes("collabor")) {
    add({ id: "invite_teammate", label: "Invite teammate", href: "/settings", kind: "invite" });
  }

  if (!input.projectContext?.latestApiKeyMasked && input.projectContext?.projectId) {
    add({ id: "create_api_key", label: "Create API key", href: "/api-keys", kind: "api_keys" });
  }

  if (input.projectContext?.activationStatus !== "activated" && input.projectContext?.projectId) {
    add({ id: "open_project", label: "Open project", href: "/dashboard", kind: "project" });
  }

  return [...actions.values()].slice(0, 4);
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
  readonly prisma?: PrismaClientType;
  readonly logger?: boolean;
}) {
  const cspViolations: Array<{ blockedUri: string; violatedDirective: string; timestamp: string; receivedAt: string }> = [];

  const app = Fastify({
    logger: input.logger ?? false
  });
  const allowedOrigins = new Set(resolveAllowedCorsOrigins(input.env));
  let rateLimitRedis: RedisClientType | null = null;

  try {
    rateLimitRedis = createClient({ url: input.env.REDIS_URL });
    await rateLimitRedis.connect();
  } catch (error) {
    app.log.warn(
      {
        event: "api.rate_limit.redis_unavailable",
        message: error instanceof Error ? error.message : "Unknown Redis connection failure"
      },
      "API Redis rate limit helper is unavailable; custom abuse limits will degrade gracefully."
    );
    rateLimitRedis = null;
  }

  function requirePrisma() {
    if (!input.prisma) {
      throw new HttpError(
        503,
        "database_unavailable",
        "This route requires a database-backed runtime."
      );
    }
    return input.prisma;
  }

  function clientIp(request: FastifyRequest) {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim().length > 0) {
      return forwarded.split(",")[0]?.trim() ?? request.ip;
    }
    return request.ip;
  }

  async function enforceRedisWindowLimit(inputLimit: {
    request: FastifyRequest;
    key: string;
    max: number;
    windowMs: number;
    message: string;
  }) {
    if (!rateLimitRedis) {
      return;
    }

    const windowSeconds = Math.max(1, Math.ceil(inputLimit.windowMs / 1000));
    const current = await rateLimitRedis.incr(inputLimit.key);
    if (current === 1) {
      await rateLimitRedis.expire(inputLimit.key, windowSeconds);
    }

    if (current > inputLimit.max) {
      const ttlSeconds = await rateLimitRedis.ttl(inputLimit.key).catch(() => -1);
      throw new HttpError(429, "rate_limited", inputLimit.message, {
        requestId: inputLimit.request.id,
        retryAfterMs: ttlSeconds > 0 ? ttlSeconds * 1000 : inputLimit.windowMs,
      });
    }
  }

  async function deliverEmail(inputMessage: {
    readonly to: string | readonly string[];
    readonly subject: string;
    readonly html: string;
    readonly text: string;
  }) {
    await sendTransactionalEmail(
      {
        apiKey: input.env.RESEND_API_KEY,
        from: input.env.EMAIL_FROM,
        replyTo: input.env.EMAIL_REPLY_TO,
        baseUrl: input.env.EMAIL_DELIVERY_BASE_URL,
      },
      inputMessage
    );
  }

  async function notifyStatusSubscribers(inputMessage: {
    readonly serviceName: string;
    readonly severity: string;
    readonly description: string;
    readonly statusLabel: string;
  }) {
    if (!isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM })) {
      return;
    }

    try {
      const subscribers = await requirePrisma().statusSubscriber.findMany({
        where: { active: true },
        select: { email: true },
        take: 250,
      });
      const recipients = subscribers.map((subscriber) => subscriber.email).filter(Boolean);
      if (recipients.length === 0) return;

      const message = buildIncidentSubscriberMessage({
        ...inputMessage,
        statusPageUrl: input.env.WEB_ORIGIN.replace(/\/$/, "") + "/status",
      });
      await deliverEmail({
        to: recipients,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    } catch (error) {
      app.log.warn(
        {
          event: "status.email_delivery_failed",
          message: error instanceof Error ? error.message : "Unknown status email delivery failure",
        },
        "Status subscriber email delivery failed"
      );
    }
  }

  function startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  function startOfUtcMonth(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  function parseLoggedRouteMethods(route: string) {
    if (!route.startsWith("batch:")) {
      return [route];
    }
    return route
      .slice("batch:".length)
      .split(",")
      .map((value) => value.trim().replace(/\s+\+\d+$/, ""))
      .filter((value) => value.length > 0);
  }

  function requestPriceLamports(route: string, mode: "standard" | "priority" | null | undefined) {
    const methods = parseLoggedRouteMethods(route);
    if (methods.length === 0) {
      return 0;
    }
    const total = methods.reduce((sum, rpcMethod) => {
      if (mode === "priority") {
        return sum + PRICING_LAMPORTS.priority;
      }
      if (WRITE_METHODS.has(rpcMethod)) {
        return sum + PRICING_LAMPORTS.standard * 4;
      }
      if (COMPUTE_HEAVY_METHODS.has(rpcMethod)) {
        return sum + PRICING_LAMPORTS.computeHeavy;
      }
      return sum + PRICING_LAMPORTS.standard;
    }, 0);
    return total;
  }

  function toBigIntOrNull(value: string | null | undefined) {
    if (value == null || value.trim().length === 0) {
      return null;
    }
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }

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
      if (error.statusCode >= 500) {
        void input.repository.createServerError({
          route: getRoutePattern(request),
          method: request.method,
          statusCode: error.statusCode,
          message: error.message,
          stack: error.stack ?? null,
          userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
          requestId: request.id
        }).catch(() => undefined);
      }
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
    void input.repository.createServerError({
      route: getRoutePattern(request),
      method: request.method,
      statusCode: 500,
      message: error instanceof Error ? error.message : "Unknown internal API failure.",
      stack: error instanceof Error ? error.stack ?? null : null,
      userAgent: typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null,
      requestId: request.id
    }).catch(() => undefined);
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
    const commit = getRuntimeCommitSha();

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
      service: "fyxvo-api",
      version: API_STATUS_VERSION,
      environment: input.env.FYXVO_ENV,
      commit,
      uptime: Math.round(uptime),
      assistantAvailable: isAssistantConfigured(input.env),
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
    const commit = getRuntimeCommitSha();
    const authorityPlan = resolveAuthorityPlan({
      source: process.env,
      protocolAuthorityFallback: input.env.FYXVO_ADMIN_AUTHORITY
    });
    const statusAuthorityPlan = {
      ...authorityPlan,
      actualUpgradeAuthority: readiness?.programUpgradeAuthority ?? null,
    };
    const overallStatus = readiness?.ready === false ? "degraded" : "ok";
    return {
      status: overallStatus,
      service: "fyxvo-api",
      version: API_STATUS_VERSION,
      commit,
      timestamp: new Date().toISOString(),
      environment: input.env.FYXVO_ENV,
      region: process.env.GATEWAY_REGION ?? 'us-east-1',
      assistantAvailable: isAssistantConfigured(input.env),
      solanaCluster: input.env.SOLANA_CLUSTER,
      solanaRpcUrl: network.rpcUrl,
      programId: input.env.FYXVO_PROGRAM_ID,
      adminAuthority: input.env.FYXVO_ADMIN_AUTHORITY,
      authorityPlan: statusAuthorityPlan,
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
    return { ...networkStatsCache.data, region: process.env.GATEWAY_REGION ?? 'us-east-1' };
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

  app.post("/v1/admin/incidents", async (request, reply) => {
    const user = requireUser(request);
    requireAdmin(user);
    const body = z.object({
      serviceName: z.string().min(2).max(100),
      severity: z.enum(["info", "warning", "critical", "degraded"]).default("degraded"),
      description: z.string().min(5).max(500),
    }).parse(request.body);
    const incident = await input.repository.createIncident(body);
    void notifyStatusSubscribers({
      serviceName: incident.serviceName,
      severity: incident.severity,
      description: incident.description,
      statusLabel: "Incident opened",
    });
    return reply.status(201).send({ item: incident });
  });

  app.patch("/v1/admin/incidents/:id", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      severity: z.enum(["info", "warning", "critical", "degraded"]).optional(),
      description: z.string().min(5).max(500).optional(),
      status: z.enum(["open", "resolved"]).optional(),
    }).parse(request.body);
    const incident = await input.repository.updateIncident(params.id, {
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { resolvedAt: body.status === "resolved" ? new Date() : null } : {}),
    });
    if (body.severity !== undefined || body.description !== undefined || body.status !== undefined) {
      await db.incidentUpdate.create({
        data: {
          incidentId: params.id,
          status: body.status === "resolved" ? "resolved" : body.status === "open" ? "reopened" : "update",
          severity: body.severity ?? incident.severity,
          message: body.description ?? incident.description,
          affectedServices: [incident.serviceName],
        },
      });
      void notifyStatusSubscribers({
        serviceName: incident.serviceName,
        severity: incident.severity,
        description: body.description ?? incident.description,
        statusLabel: body.status === "resolved" ? "Incident resolved" : body.status === "open" ? "Incident reopened" : "Incident updated",
      });
    }
    return { item: incident };
  });

  app.post("/v1/admin/incidents/:id/updates", async (request, reply) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({
      message: z.string().trim().min(5).max(1000),
      status: z.enum(["update", "escalated", "resolved"]).default("update"),
      severity: z.enum(["info", "warning", "critical", "degraded"]).optional(),
      affectedServices: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
    }).parse(request.body);
    const existing = await db.incident.findUnique({ where: { id: params.id } });
    if (!existing) {
      throw new HttpError(404, "incident_not_found", "The requested incident could not be found.");
    }
    await db.incidentUpdate.create({
      data: {
        incidentId: params.id,
        status: body.status,
        severity: body.severity ?? existing.severity,
        message: body.message,
        affectedServices: body.affectedServices?.length ? body.affectedServices : [existing.serviceName],
      },
    });
    if (body.status === "resolved" && existing.resolvedAt == null) {
      await db.incident.update({
        where: { id: params.id },
        data: { resolvedAt: new Date(), ...(body.severity ? { severity: body.severity } : {}) },
      });
    }
    const incident = await db.incident.findUnique({
      where: { id: params.id },
      include: {
        updates: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!incident) {
      throw new HttpError(404, "incident_not_found", "The requested incident could not be found.");
    }
    void notifyStatusSubscribers({
      serviceName: incident.serviceName,
      severity: body.severity ?? incident.severity,
      description: body.message,
      statusLabel:
        body.status === "resolved"
          ? "Incident resolved"
          : body.status === "escalated"
            ? "Incident escalated"
            : "Incident update",
    });
    return reply.status(201).send({
      item: serializeForJson(incident),
    });
  });

  // GET /v1/network/health-calendar — public, no auth required
  // Returns last 30 days of network health as calendar data
  app.get("/v1/network/health-calendar", {
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } }
  }, async (_request, reply) => {
    const calendar = await input.repository.getNetworkHealthCalendar();
    reply.header("cache-control", "public, max-age=300, stale-while-revalidate=600");
    return { calendar };
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reputationLevel: (fullUser as any)?.reputationLevel ?? 'Explorer',
      },
      projectCount: projects.length
    };
  });

  app.get("/v1/me/session-diagnostics", async (request) => {
    const user = requireUser(request);
    const fullUser = await input.repository.findUserById(user.id);
    const decoded = typeof (request as FastifyRequest & { jwtDecode?: () => unknown }).jwtDecode === "function"
      ? ((request as FastifyRequest & { jwtDecode: () => unknown }).jwtDecode() as { iat?: number; exp?: number } | null)
      : null;
    return {
      item: {
        sessionActive: true,
        walletAddress: user.walletAddress,
        authMode: "wallet_signature_jwt",
        issuedAt: typeof decoded?.iat === "number" ? new Date(decoded.iat * 1000).toISOString() : null,
        expiresAt: typeof decoded?.exp === "number" ? new Date(decoded.exp * 1000).toISOString() : null,
        termsAccepted: Boolean(fullUser?.tosAcceptedAt),
        onboardingDismissed: Boolean(fullUser?.onboardingDismissed),
        assistantAvailable: isAssistantConfigured(input.env),
        environment: input.env.FYXVO_ENV,
        suggestions: [
          "If the wallet reconnects but authenticated pages still fail, disconnect and sign in again to rotate the JWT session.",
          "If a signed session expires, refresh the dashboard or reconnect the wallet to issue a fresh token.",
          "If assistant availability is false, verify /health and /v1/status before assuming the wallet session is broken.",
        ],
      },
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

  app.get("/v1/me/dashboard-preferences", async (request) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const item = await db.dashboardPreference.findUnique({
      where: { userId: user.id },
      select: {
        widgetOrder: true,
        hiddenWidgets: true,
        updatedAt: true,
      },
    });
    return {
      item: {
        widgetOrder: item?.widgetOrder ?? [],
        hiddenWidgets: item?.hiddenWidgets ?? [],
        updatedAt: item?.updatedAt?.toISOString() ?? null,
      },
    };
  });

  app.patch("/v1/me/dashboard-preferences", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const body = z.object({
      widgetOrder: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
      hiddenWidgets: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    }).parse(request.body);

    const item = await db.dashboardPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        widgetOrder: body.widgetOrder ?? [],
        hiddenWidgets: body.hiddenWidgets ?? [],
      },
      update: {
        ...(body.widgetOrder !== undefined ? { widgetOrder: body.widgetOrder } : {}),
        ...(body.hiddenWidgets !== undefined ? { hiddenWidgets: body.hiddenWidgets } : {}),
      },
      select: {
        widgetOrder: true,
        hiddenWidgets: true,
        updatedAt: true,
      },
    });

    return reply.send({
      item: {
        widgetOrder: item.widgetOrder,
        hiddenWidgets: item.hiddenWidgets,
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  });

  app.get("/v1/bookmarks", async (request) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const items = await db.userBookmark.findMany({
      where: { userId: user.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        projectId: item.projectId ?? null,
        label: item.label,
        href: item.href,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  });

  app.post("/v1/bookmarks", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const body = z.object({
      label: z.string().trim().min(1).max(80),
      href: z.string().trim().min(1).max(300),
      projectId: z.string().uuid().optional().nullable(),
    }).parse(request.body);

    const item = await db.userBookmark.upsert({
      where: {
        userId_href: {
          userId: user.id,
          href: body.href,
        },
      },
      create: {
        userId: user.id,
        label: body.label,
        href: body.href,
        ...(body.projectId ? { projectId: body.projectId } : {}),
      },
      update: {
        label: body.label,
        ...(body.projectId !== undefined ? { projectId: body.projectId } : {}),
      },
    });

    return reply.status(201).send({
      item: {
        id: item.id,
        projectId: item.projectId ?? null,
        label: item.label,
        href: item.href,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  });

  app.delete("/v1/bookmarks/:bookmarkId", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const { bookmarkId } = z.object({ bookmarkId: z.string().uuid() }).parse(request.params);
    await db.userBookmark.deleteMany({
      where: { id: bookmarkId, userId: user.id },
    });
    return reply.status(204).send();
  });

  app.get("/v1/saved-views", async (request) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const query = z.object({
      kind: z.enum(["alerts", "request_logs"]),
      projectId: z.string().uuid().optional(),
    }).parse(request.query);

    const items = await db.savedView.findMany({
      where: {
        userId: user.id,
        kind: query.kind,
        ...(query.projectId ? { OR: [{ projectId: query.projectId }, { projectId: null }] } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        kind: item.kind,
        name: item.name,
        projectId: item.projectId ?? null,
        filters: item.filters,
        isDefault: item.isDefault,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    };
  });

  app.post("/v1/saved-views", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const body = z.object({
      kind: z.enum(["alerts", "request_logs"]),
      name: z.string().trim().min(1).max(80),
      projectId: z.string().uuid().optional().nullable(),
      filters: z.record(z.string(), z.unknown()),
      isDefault: z.boolean().optional(),
    }).parse(request.body);

    if (body.isDefault) {
      await db.savedView.updateMany({
        where: { userId: user.id, kind: body.kind },
        data: { isDefault: false },
      });
    }

    const item = await db.savedView.create({
      data: {
        userId: user.id,
        kind: body.kind,
        name: body.name,
        filters: JSON.parse(JSON.stringify(body.filters)) as never,
        isDefault: body.isDefault ?? false,
        ...(body.projectId ? { projectId: body.projectId } : {}),
      },
    });

    return reply.status(201).send({
      item: {
        id: item.id,
        kind: item.kind,
        name: item.name,
        projectId: item.projectId ?? null,
        filters: item.filters,
        isDefault: item.isDefault,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  });

  app.patch("/v1/saved-views/:viewId", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const { viewId } = z.object({ viewId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      name: z.string().trim().min(1).max(80).optional(),
      filters: z.record(z.string(), z.unknown()).optional(),
      isDefault: z.boolean().optional(),
    }).parse(request.body);

    const existing = await db.savedView.findFirst({
      where: { id: viewId, userId: user.id },
    });
    if (!existing) {
      throw new HttpError(404, "not_found", "Saved view not found.");
    }

    if (body.isDefault) {
      await db.savedView.updateMany({
        where: { userId: user.id, kind: existing.kind },
        data: { isDefault: false },
      });
    }

    const item = await db.savedView.update({
      where: { id: viewId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.filters !== undefined
          ? { filters: JSON.parse(JSON.stringify(body.filters)) as never }
          : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      },
    });

    return reply.send({
      item: {
        id: item.id,
        kind: item.kind,
        name: item.name,
        projectId: item.projectId ?? null,
        filters: item.filters,
        isDefault: item.isDefault,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  });

  app.delete("/v1/saved-views/:viewId", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const { viewId } = z.object({ viewId: z.string().uuid() }).parse(request.params);
    await db.savedView.deleteMany({
      where: { id: viewId, userId: user.id },
    });
    return reply.status(204).send();
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
    await enforceRedisWindowLimit({
      request,
      key: `rate-limit:interest:${clientIp(request)}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
      message: "Interest submissions are limited to 10 requests per IP per hour."
    });
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

  app.post("/v1/operators/register", async (request, reply) => {
    const body = createOperatorRegistrationSchema.parse(request.body);
    await enforceRedisWindowLimit({
      request,
      key: `rate-limit:operator-registration:${clientIp(request)}`,
      max: 5,
      windowMs: 60 * 60 * 1000,
      message: "Operator registrations are limited to 5 requests per IP per hour."
    });
    ensureWalletAddress(body.operatorWalletAddress);

    const registration = await input.repository.createOperatorRegistration({
      endpoint: body.endpoint,
      operatorWalletAddress: body.operatorWalletAddress,
      name: body.name,
      region: body.region,
      contact: body.contact
    });

    await input.repository.createFeedbackSubmission({
      name: body.name,
      email: body.contact,
      role: "Node operator",
      walletAddress: body.operatorWalletAddress,
      category: "PRODUCT_FEEDBACK",
      message: [
        "Operator registration submitted.",
        `Endpoint: ${body.endpoint}`,
        `Wallet: ${body.operatorWalletAddress}`,
        `Region: ${body.region}`,
        `Contact: ${body.contact}`,
        `Registration ID: ${registration.id}`
      ].join("\n"),
      source: "operator-registration",
      page: "/operators"
    });

    if (
      input.env.EMAIL_REPLY_TO &&
      isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM })
    ) {
      void deliverEmail({
        to: input.env.EMAIL_REPLY_TO,
        subject: `[Fyxvo operators] Pending registration ${registration.name}`,
        text: [
          "A new operator registration has been submitted.",
          `Registration ID: ${registration.id}`,
          `Name: ${registration.name}`,
          `Endpoint: ${registration.endpoint}`,
          `Wallet: ${registration.operatorWalletAddress}`,
          `Region: ${registration.region}`,
          `Contact: ${registration.contact}`
        ].join("\n"),
        html:
          `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a;">` +
          `<h1 style="font-size:24px;line-height:1.2;margin:0 0 16px;">New operator registration</h1>` +
          `<p style="font-size:15px;line-height:1.7;margin:0 0 16px;">A new operator submitted a node for review.</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Registration ID:</strong> ${registration.id}</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Name:</strong> ${registration.name}</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Endpoint:</strong> ${registration.endpoint}</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Wallet:</strong> ${registration.operatorWalletAddress}</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Region:</strong> ${registration.region}</p>` +
          `<p style="font-size:14px;line-height:1.7;margin:0;"><strong>Contact:</strong> ${registration.contact}</p>` +
          `</div>`
      }).catch(() => undefined);
    }

    return reply.status(201).send({
      item: serializeForJson(registration)
    });
  });

  app.get("/v1/operators/network", async () => {
    const [operators, readiness] = await Promise.all([
      input.repository.listActiveOperatorNetwork(),
      input.blockchain.getProtocolReadiness().catch(() => null)
    ]);

    const totalRegistered =
      readiness?.operatorRegistry?.totalRegistered !== undefined
        ? Number(readiness.operatorRegistry.totalRegistered)
        : 0;

    return {
      activeOperatorCount: operators.length,
      operators,
      totalRegistered
    };
  });

  app.post("/v1/feedback", async (request, reply) => {
    const body = createFeedbackSubmissionSchema.parse(request.body);
    await enforceRedisWindowLimit({
      request,
      key: `rate-limit:feedback:${clientIp(request)}`,
      max: 10,
      windowMs: 60 * 60 * 1000,
      message: "Feedback submissions are limited to 10 requests per IP per hour."
    });

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { items: projects.map((p) => ({ ...p, tags: (p as any).tags ?? [] })) };
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

    return {
      item: {
        ...project,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (project as any).tags ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ownerReputationLevel: (project.owner as any)?.reputationLevel ?? 'Explorer',
      }
    };
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
      ...(body.dailyBudgetLamports !== undefined ? { dailyBudgetLamports: toBigIntOrNull(body.dailyBudgetLamports) } : {}),
      ...(body.monthlyBudgetLamports !== undefined ? { monthlyBudgetLamports: toBigIntOrNull(body.monthlyBudgetLamports) } : {}),
      ...(body.budgetWarningThresholdPct !== undefined ? { budgetWarningThresholdPct: body.budgetWarningThresholdPct } : {}),
      ...(body.budgetHardStop !== undefined ? { budgetHardStop: body.budgetHardStop } : {}),
      ...(body.archivedAt !== undefined ? { archivedAt: body.archivedAt !== null ? new Date(body.archivedAt) : null } : {}),
      ...(body.environment !== undefined ? { environment: body.environment } : {}),
      ...(body.starred !== undefined ? { starred: body.starred } : {}),
      ...(body.notes !== undefined ? { notes: body.notes, notesEditedByWallet: user.walletAddress } : {}),
      ...(body.githubUrl !== undefined ? { githubUrl: body.githubUrl } : {}),
      ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
      ...(body.publicSlug !== undefined ? { publicSlug: body.publicSlug } : {}),
      ...(body.leaderboardVisible !== undefined ? { leaderboardVisible: body.leaderboardVisible } : {})
    };

    const updated = await input.repository.updateProject(project.id, updateInput);

    if (body.archivedAt !== undefined && body.archivedAt !== (project.archivedAt ? new Date(project.archivedAt).toISOString() : null)) {
      void input.repository.logActivity({
        projectId: project.id,
        userId: user.id,
        action: body.archivedAt ? "project.archived" : "project.restored",
        details: body.archivedAt ? { reason: updated.archiveReason ?? null } : null,
      }).catch(() => undefined);
    }
    if (body.isPublic !== undefined && body.isPublic !== project.isPublic) {
      void input.repository.logActivity({
        projectId: project.id,
        userId: user.id,
        action: body.isPublic ? "project.public_enabled" : "project.public_disabled",
        details: body.isPublic ? { publicSlug: updated.publicSlug ?? null } : null,
      }).catch(() => undefined);
    }
    if (body.notes !== undefined) {
      void input.repository.logActivity({
        projectId: project.id,
        userId: user.id,
        action: "project.notes_updated",
        details: { length: body.notes?.length ?? 0 },
      }).catch(() => undefined);
    }
    if (
      body.lowBalanceThresholdSol !== undefined ||
      body.dailyRequestAlertThreshold !== undefined ||
      body.dailyBudgetLamports !== undefined ||
      body.monthlyBudgetLamports !== undefined ||
      body.budgetWarningThresholdPct !== undefined ||
      body.budgetHardStop !== undefined
    ) {
      void input.repository.logActivity({
        projectId: project.id,
        userId: user.id,
        action: "project.alerts_updated",
        details: {
          lowBalanceThresholdSol: body.lowBalanceThresholdSol ?? null,
          dailyRequestAlertThreshold: body.dailyRequestAlertThreshold ?? null,
          dailyBudgetLamports: body.dailyBudgetLamports ?? null,
          monthlyBudgetLamports: body.monthlyBudgetLamports ?? null,
          budgetWarningThresholdPct: body.budgetWarningThresholdPct ?? null,
          budgetHardStop: body.budgetHardStop ?? null,
        },
      }).catch(() => undefined);
    }

    return { item: updated };
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

  // GET /v1/projects/:id/stats/public — API-key auth (x-api-key header), requires project:read scope
  // This endpoint is intentionally unauthenticated via JWT; it uses x-api-key to identify the caller.
  app.get("/v1/projects/:id/stats/public", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const rawApiKey = request.headers["x-api-key"];
    if (typeof rawApiKey !== "string" || rawApiKey.length === 0) {
      throw new HttpError(401, "missing_api_key", "An x-api-key header is required for this endpoint.");
    }
    const keyHash = sha256(rawApiKey);
    const apiKey = await input.repository.findApiKeyByHash(keyHash);
    if (!apiKey) {
      throw new HttpError(401, "invalid_api_key", "The provided API key is invalid or revoked.");
    }
    if (apiKey.projectId !== params.id) {
      throw new HttpError(403, "forbidden", "The API key does not belong to this project.");
    }
    const scopes = Array.isArray(apiKey.scopes) ? (apiKey.scopes as string[]) : [];
    if (!scopes.includes("project:read")) {
      throw new HttpError(403, "insufficient_scope", "The API key requires the project:read scope.");
    }
    const stats = await input.repository.getPublicProjectStats(params.id);
    return stats;
  });

  // PATCH /v1/projects/:projectId/tags — JWT auth, owner or admin only
  app.patch("/v1/projects/:projectId/tags", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      tags: z.array(
        z.string().trim().max(20).regex(/^[a-z0-9-]+$/, "Tags must be lowercase alphanumeric with hyphens only")
      ).max(10),
    }).parse(request.body);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    await input.repository.updateProjectTags(project.id, body.tags);
    const updated = await input.repository.findProjectById(project.id);
    return {
      item: {
        ...updated,
        tags: body.tags,
      }
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
        colorTag: body.colorTag ?? null,
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
      colorTag: existing.colorTag ?? null,
      prefix,
      keyHash: sha256(plainTextKey),
      scopes,
      expiresAt: existing.expiresAt ? new Date(existing.expiresAt) : null
    });

    void input.repository.createNotification({
      userId: user.id,
      type: "api_key_rotated",
      title: "API key rotated",
      message: `Key "${existing.label}" was rotated — old key revoked, new key issued for project "${project.name}"`,
      projectId: project.id
    }).catch(() => undefined);

    void input.repository.logActivity({
      projectId: project.id,
      userId: user.id,
      action: "apikey.rotated",
      details: { previousKeyId: params.apiKeyId, newKeyId: newKey.id, label: existing.label },
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

  app.get("/v1/alerts", async (request) => {
    const user = requireUser(request);
    const projects = await input.repository.listProjects(user);
    const projectIds = projects.map((project) => project.id);
    return {
      items: await input.repository.getAlertCenter(
        user.id,
        projectIds,
        isAssistantConfigured(input.env)
      ),
    };
  });

  app.patch("/v1/alerts/:alertKey", async (request) => {
    const user = requireUser(request);
    const params = z.object({ alertKey: z.string().min(1) }).parse(request.params);
    const body = z.object({
      state: z.enum(["new", "acknowledged", "resolved"]),
      projectId: z.string().uuid().optional().nullable(),
    }).parse(request.body);
    await input.repository.upsertAlertState({
      userId: user.id,
      alertKey: decodeURIComponent(params.alertKey),
      state: body.state,
      projectId: body.projectId ?? null,
    });
    return { ok: true };
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

  app.get("/v1/projects/:projectId/analytics/cost-breakdown", async (request) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ range: z.enum(["1h", "6h", "24h", "7d", "30d"]).default("7d") }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const since = new Date(Date.now() - rangeToMs(query.range));
    const rows = await db.requestLog.findMany({
      where: {
        projectId: params.projectId,
        simulated: false,
        createdAt: { gte: since },
      },
      select: {
        route: true,
        mode: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const monthlyRows = await db.requestLog.findMany({
      where: {
        projectId: params.projectId,
        simulated: false,
        createdAt: { gte: startOfUtcMonth() },
      },
      select: {
        route: true,
        mode: true,
      },
    });

    const monthlyRequestCount = monthlyRows.length;
    const grouped = new Map<string, {
      method: string;
      pricingTier: "standard" | "compute_heavy" | "write" | "priority";
      count: number;
      totalLamports: number;
    }>();

    for (const row of rows) {
      const methods = parseLoggedRouteMethods(row.route);
      for (const method of methods) {
        const pricingTier =
          row.mode === "priority"
            ? "priority"
            : WRITE_METHODS.has(method)
              ? "write"
              : COMPUTE_HEAVY_METHODS.has(method)
                ? "compute_heavy"
                : "standard";
        const baseLamports =
          pricingTier === "priority"
            ? PRICING_LAMPORTS.priority
            : pricingTier === "compute_heavy"
              ? PRICING_LAMPORTS.computeHeavy
              : pricingTier === "write"
                ? PRICING_LAMPORTS.standard * 4
                : PRICING_LAMPORTS.standard;
        const discountedLamports = Math.max(1, Math.floor(baseLamports * (10_000 - (monthlyRequestCount >= VOLUME_DISCOUNT.tier2.monthlyRequests
          ? VOLUME_DISCOUNT.tier2.discountBps
          : monthlyRequestCount >= VOLUME_DISCOUNT.tier1.monthlyRequests
            ? VOLUME_DISCOUNT.tier1.discountBps
            : 0)) / 10_000));
        const key = `${method}:${pricingTier}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.count += 1;
          existing.totalLamports += discountedLamports;
        } else {
          grouped.set(key, {
            method,
            pricingTier,
            count: 1,
            totalLamports: discountedLamports,
          });
        }
      }
    }

    const totalLamports = [...grouped.values()].reduce((sum, item) => sum + item.totalLamports, 0);
    return {
      item: {
        range: query.range,
        totalLamports,
        items: [...grouped.values()]
          .sort((left, right) => right.totalLamports - left.totalLamports)
          .map((item) => ({
            ...item,
            estimatedSol: item.totalLamports / 1_000_000_000,
            shareOfTotalSpend: totalLamports > 0 ? item.totalLamports / totalLamports : 0,
          })),
      },
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

  app.get("/v1/projects/:projectId/budget", async (request) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const [dailyRows, monthlyRows] = await Promise.all([
      db.requestLog.findMany({
        where: {
          projectId: params.projectId,
          simulated: false,
          createdAt: { gte: startOfUtcDay() },
        },
        select: { route: true, mode: true },
      }),
      db.requestLog.findMany({
        where: {
          projectId: params.projectId,
          simulated: false,
          createdAt: { gte: startOfUtcMonth() },
        },
        select: { route: true, mode: true },
      }),
    ]);

    const dailySpendLamports = dailyRows.reduce(
      (sum, row) => sum + requestPriceLamports(row.route, row.mode === "priority" ? "priority" : "standard"),
      0,
    );
    const monthlySpendLamports = monthlyRows.reduce(
      (sum, row) => sum + requestPriceLamports(row.route, row.mode === "priority" ? "priority" : "standard"),
      0,
    );
    const warningThresholdPct = project.budgetWarningThresholdPct ?? 80;
    const dailyBudgetLamports = project.dailyBudgetLamports ? Number(project.dailyBudgetLamports) : null;
    const monthlyBudgetLamports = project.monthlyBudgetLamports ? Number(project.monthlyBudgetLamports) : null;

    return {
      item: {
        dailyBudgetLamports: project.dailyBudgetLamports?.toString() ?? null,
        monthlyBudgetLamports: project.monthlyBudgetLamports?.toString() ?? null,
        warningThresholdPct,
        hardStop: project.budgetHardStop ?? false,
        dailySpendLamports,
        monthlySpendLamports,
        dailyUsagePct: dailyBudgetLamports && dailyBudgetLamports > 0 ? Math.min(100, (dailySpendLamports / dailyBudgetLamports) * 100) : null,
        monthlyUsagePct: monthlyBudgetLamports && monthlyBudgetLamports > 0 ? Math.min(100, (monthlySpendLamports / monthlyBudgetLamports) * 100) : null,
        dailyWarningTriggered: dailyBudgetLamports && dailyBudgetLamports > 0 ? (dailySpendLamports / dailyBudgetLamports) * 100 >= warningThresholdPct : false,
        monthlyWarningTriggered: monthlyBudgetLamports && monthlyBudgetLamports > 0 ? (monthlySpendLamports / monthlyBudgetLamports) * 100 >= warningThresholdPct : false,
      },
    };
  });

  app.get("/v1/projects/:projectId/requests", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({
      range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional(),
      method: z.string().trim().min(1).max(120).optional(),
      status: z.enum(["success", "error"]).optional(),
      apiKey: z.string().trim().min(1).max(64).optional(),
      mode: z.enum(["standard", "priority"]).optional(),
      simulatedOnly: z.coerce.boolean().optional(),
      errorsOnly: z.coerce.boolean().optional(),
      search: z.string().trim().min(1).max(120).optional(),
      page: z.coerce.number().int().min(1).optional(),
      pageSize: z.coerce.number().int().min(10).max(1000).optional(),
    }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    return await input.repository.listProjectRequestLogs(params.projectId, {
      ...(query.range ? { range: query.range } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.apiKey ? { apiKey: query.apiKey } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(typeof query.simulatedOnly === "boolean" ? { simulatedOnly: query.simulatedOnly } : {}),
      ...(typeof query.errorsOnly === "boolean" ? { errorsOnly: query.errorsOnly } : {}),
      ...(query.search ? { search: query.search } : {}),
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
  });

  app.get("/v1/projects/:projectId/requests/export", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({
      format: z.enum(["csv", "json"]).default("csv"),
      range: z.enum(["1h", "6h", "24h", "7d", "30d"]).optional(),
      method: z.string().trim().min(1).max(120).optional(),
      status: z.enum(["success", "error"]).optional(),
      apiKey: z.string().trim().min(1).max(64).optional(),
      mode: z.enum(["standard", "priority"]).optional(),
      simulatedOnly: z.coerce.boolean().optional(),
      errorsOnly: z.coerce.boolean().optional(),
      search: z.string().trim().min(1).max(120).optional(),
    }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }

    const logs = await input.repository.listProjectRequestLogs(params.projectId, {
      ...(query.range ? { range: query.range } : {}),
      ...(query.method ? { method: query.method } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.apiKey ? { apiKey: query.apiKey } : {}),
      ...(query.mode ? { mode: query.mode } : {}),
      ...(typeof query.simulatedOnly === "boolean" ? { simulatedOnly: query.simulatedOnly } : {}),
      ...(typeof query.errorsOnly === "boolean" ? { errorsOnly: query.errorsOnly } : {}),
      ...(query.search ? { search: query.search } : {}),
      page: 1,
      pageSize: 1000,
    });

    if (query.format === "json") {
      reply.header("content-type", "application/json");
      reply.header("content-disposition", `attachment; filename="request-logs-${project.slug}.json"`);
      return reply.send(JSON.stringify(logs.items, null, 2));
    }

    const header = [
      "timestamp",
      "method",
      "httpMethod",
      "mode",
      "latencyMs",
      "success",
      "statusCode",
      "apiKeyPrefix",
      "traceId",
      "simulated",
      "upstreamNode",
      "region",
      "requestSize",
      "responseSize",
      "cacheHit",
    ].join(",");
    const rows = logs.items.map((item) =>
      [
        item.timestamp,
        item.route,
        item.httpMethod,
        item.mode ?? "",
        item.latencyMs,
        item.success,
        item.statusCode,
        item.apiKeyPrefix ?? "",
        item.traceId ?? "",
        item.simulated,
        item.upstreamNode ?? "",
        item.region ?? "",
        item.requestSize ?? "",
        item.responseSize ?? "",
        item.cacheHit ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );
    reply.header("content-type", "text/csv");
    reply.header("content-disposition", `attachment; filename="request-logs-${project.slug}.csv"`);
    return reply.send([header, ...rows].join("\n"));
  });

  app.get("/v1/projects/:projectId/access-audit", async (request) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(100) }).parse(request.query);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    const items = await input.repository.listActivityLog(params.projectId, query.limit);
    return {
      items: items.filter((item) =>
        [
          "settings.viewed",
          "apikey.created",
          "apikey.rotated",
          "apikey.revoked",
          "project.alerts_updated",
          "project.public_enabled",
          "project.public_disabled",
          "member.invited",
          "member.accepted",
          "member.declined",
          "member.removed",
          "ownership.transferred",
          "webhook.created",
          "webhook.deleted",
        ].includes(item.action)
      ),
    };
  });

  app.post("/v1/projects/:projectId/access-audit/view", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(params.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "The requested project could not be found.");
    }
    await input.repository.logActivity({
      projectId: params.projectId,
      userId: user.id,
      action: "settings.viewed",
      details: { source: "settings-page" },
    });
    return reply.status(202).send({ ok: true });
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
      items: serializeForJson(await input.repository.listOperatorRegistrations()),
      activeOperators: serializeForJson(await input.repository.listOperators())
    };
  });

  app.post("/v1/admin/operators/:registrationId/approve", async (request, reply) => {
    const user = requireUser(request);
    requireAdmin(user);
    const { registrationId } = z.object({ registrationId: z.string().uuid() }).parse(request.params);

    try {
      const approved = await input.repository.approveOperatorRegistration(registrationId);
      return reply.status(201).send({
        item: serializeForJson({
          registration: approved.registration,
          operatorId: approved.operator.id,
          nodeId: approved.node.id,
          nodeStatus: approved.node.status
        })
      });
    } catch (error) {
      throw new HttpError(
        404,
        "operator_registration_not_found",
        error instanceof Error ? error.message : "Operator registration could not be approved."
      );
    }
  });

  app.post("/v1/admin/operators/:registrationId/reject", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const { registrationId } = z.object({ registrationId: z.string().uuid() }).parse(request.params);
    const body = operatorRegistrationActionSchema.parse(request.body ?? {});
    const rejected = await input.repository.rejectOperatorRegistration(registrationId, body.reason ?? null);
    if (!rejected) {
      throw new HttpError(404, "operator_registration_not_found", "Operator registration not found.");
    }
    return {
      item: serializeForJson(rejected)
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

  app.get("/v1/admin/errors", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return {
      items: await input.repository.listServerErrors(100)
    };
  });

  app.get("/v1/admin/retention-cohorts", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const now = new Date();

    async function buildSummary(windowDays: number | null) {
      const since = windowDays === null ? null : new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
      const userWhere = since ? { createdAt: { gte: since } } : {};
      const users = await db.user.findMany({
        where: userWhere,
        select: { id: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      });
      const requestLogWindowWhere = since ? { createdAt: { gte: since } } : {};
      const [assistantUsage, playgroundUsage, apiKeyUsage, fundedProjects, publicShares, requestUsage, firstTrafficProjects] = await Promise.all([
        db.assistantConversation.findMany({
          where: { ...(since ? { createdAt: { gte: since } } : {}) },
          select: { userId: true },
          distinct: ["userId"],
        }),
        db.playgroundRecipe.findMany({
          where: { ...(since ? { updatedAt: { gte: since } } : {}) },
          select: { project: { select: { ownerId: true } } },
        }),
        db.apiKey.findMany({
          where: { ...(since ? { createdAt: { gte: since } } : {}) },
          select: { createdById: true },
          distinct: ["createdById"],
        }),
        db.fundingCoordinate.findMany({
          where: { confirmedAt: { not: null }, ...(since ? { confirmedAt: { gte: since } } : {}) },
          select: { requestedById: true },
          distinct: ["requestedById"],
        }),
        db.project.findMany({
          where: {
            OR: [{ isPublic: true }, { leaderboardVisible: true }],
            ...(since ? { updatedAt: { gte: since } } : {}),
          },
          select: { ownerId: true },
        }),
        db.requestLog.findMany({
          where: { userId: { not: null }, ...(since ? { createdAt: { gte: since } } : {}) },
          select: { userId: true },
          distinct: ["userId"],
        }),
        db.project.findMany({
          where: { requestLogs: { some: since ? { createdAt: { gte: since } } : {} } },
          select: {
            id: true,
            _count: { select: { requestLogs: true } },
          },
        }),
      ]);
      const repeatTrafficProjects = await db.project.findMany({
        where: { requestLogs: { some: requestLogWindowWhere } },
        select: {
          id: true,
          requestLogs: {
            ...(since ? { where: requestLogWindowWhere } : {}),
            take: 2,
            orderBy: { createdAt: "asc" },
            select: { id: true },
          },
        },
      });

      const activityByUser = new Map<string, Date[]>();
      const recordActivity = (userId: string | null | undefined, timestamp: Date) => {
        if (!userId) return;
        const existing = activityByUser.get(userId) ?? [];
        existing.push(timestamp);
        activityByUser.set(userId, existing);
      };

      const [assistantEvents, projectEvents, apiKeyEvents, fundingEvents] = await Promise.all([
        db.assistantConversation.findMany({ where: { userId: { in: users.map((entry) => entry.id) } }, select: { userId: true, createdAt: true } }),
        db.project.findMany({ where: { ownerId: { in: users.map((entry) => entry.id) } }, select: { ownerId: true, createdAt: true } }),
        db.apiKey.findMany({ where: { createdById: { in: users.map((entry) => entry.id) } }, select: { createdById: true, createdAt: true } }),
        db.fundingCoordinate.findMany({
          where: { requestedById: { in: users.map((entry) => entry.id) }, confirmedAt: { not: null } },
          select: { requestedById: true, confirmedAt: true, createdAt: true },
        }),
      ]);
      for (const event of assistantEvents) recordActivity(event.userId, event.createdAt);
      for (const event of projectEvents) recordActivity(event.ownerId, event.createdAt);
      for (const event of apiKeyEvents) recordActivity(event.createdById, event.createdAt);
      for (const event of fundingEvents) recordActivity(event.requestedById, event.confirmedAt ?? event.createdAt);

      const returnedAfter = (days: number) =>
        users.filter((candidate) => {
          const threshold = candidate.createdAt.getTime() + days * 24 * 60 * 60 * 1000;
          return (activityByUser.get(candidate.id) ?? []).some((entry) => entry.getTime() >= threshold);
        }).length;

      const newUsersByDayMap = new Map<string, number>();
      for (const row of users) {
        const key = startOfUtcDay(row.createdAt).toISOString().slice(0, 10);
        newUsersByDayMap.set(key, (newUsersByDayMap.get(key) ?? 0) + 1);
      }

      return {
        windowDays,
        generatedAt: now.toISOString(),
        newUsersByDay: [...newUsersByDayMap.entries()].map(([date, count]) => ({ date, count })),
        retained: {
          day1: returnedAfter(1),
          day7: returnedAfter(7),
          day30: returnedAfter(30),
        },
        totals: {
          newUsers: users.length,
          firstTrafficProjects: firstTrafficProjects.length,
          repeatTrafficProjects: repeatTrafficProjects.filter((project) => project.requestLogs.length > 1).length,
          assistantUsers: assistantUsage.length,
          playgroundUsers: new Set(playgroundUsage.map((row) => row.project.ownerId)).size,
          apiKeyCreators: apiKeyUsage.length,
          fundedUsers: fundedProjects.length,
          publicSharers: new Set(publicShares.map((row) => row.ownerId)).size,
          requestUsers: requestUsage.length,
        },
      };
    }

    return {
      item: {
        sevenDay: await buildSummary(7),
        thirtyDay: await buildSummary(30),
        allTime: await buildSummary(null),
      },
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

  app.get("/v1/admin/email-delivery", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const emailDeliveryDb = db as PrismaClientType & {
      digestSchedule: {
        count: () => Promise<number>;
      };
      digestRecord: {
        findFirst: (input: {
          orderBy: { generatedAt: "desc" };
          select: { generatedAt: true; sentAt: true };
        }) => Promise<{ generatedAt: Date; sentAt: Date | null } | null>;
      };
    };
    const configured = isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM });
    const [verifiedUsers, digestEnabledUsers, activeDigestSchedules, statusSubscribers, latestDigestRecord] = await Promise.all([
      db.user.count({ where: { emailVerified: true } }),
      db.user.count({ where: { emailVerified: true, notifyWeeklySummary: true } }),
      emailDeliveryDb.digestSchedule.count(),
      db.statusSubscriber.count({ where: { active: true } }),
      emailDeliveryDb.digestRecord.findFirst({
        orderBy: { generatedAt: "desc" },
        select: { generatedAt: true, sentAt: true },
      }),
    ]);

    return {
      item: {
        configured,
        provider: configured ? "resend" : "unconfigured",
        fromAddress: input.env.EMAIL_FROM ?? null,
        replyToAddress: input.env.EMAIL_REPLY_TO ?? null,
        verifiedUsers,
        digestEnabledUsers,
        activeDigestSchedules,
        statusSubscribers,
        latestDigestGeneratedAt: latestDigestRecord?.generatedAt?.toISOString() ?? null,
        latestDigestSentAt: latestDigestRecord?.sentAt?.toISOString() ?? null,
      },
    };
  });

  app.get("/v1/admin/observability", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    return { item: await input.repository.getAdminObservability() };
  });

  app.get("/v1/admin/release-readiness", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const now = new Date();
    const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = startOfUtcDay(now);

    const [
      latestGatewayHealth,
      activeIncidentCount,
      webhookDeliveries24h,
      supportBacklogCount,
      totalUsers,
      totalActiveProjects,
      recentTrafficProjects,
      lowBalanceAlertProjects,
      recentProjectLogs,
      assistantUsageToday,
      newsletterSubscribers,
      leaderboardOptIns,
      publicProjectPagesCount,
      pendingMigrations,
      latestAnnouncement,
      latestBlogPost,
      latestWhatsNew,
      openSupportTickets,
      activeIncidents,
      latestDigestRecord,
      dueDigestCount,
      statusSubscriberCount,
    ] = await Promise.all([
      db.serviceHealthSnapshot.findFirst({
        where: { serviceName: "gateway" },
        orderBy: { checkedAt: "desc" },
        select: { status: true, checkedAt: true },
      }),
      db.incident.count({ where: { resolvedAt: null } }),
      db.webhookDelivery.findMany({
        where: { createdAt: { gte: start24h } },
        select: { status: true },
      }),
      db.supportTicket.count({
        where: { status: { in: ["open", "in_progress"] } },
      }),
      db.user.count(),
      db.project.count({ where: { archivedAt: null } }),
      db.requestLog.findMany({
        where: {
          projectId: { not: null },
          createdAt: { gte: start7d },
        },
        select: { projectId: true },
        distinct: ["projectId"],
      }),
      db.notification.findMany({
        where: {
          projectId: { not: null },
          createdAt: { gte: start7d },
          OR: [
            { title: { contains: "low balance", mode: "insensitive" } },
            { message: { contains: "low balance", mode: "insensitive" } },
          ],
        },
        select: { projectId: true },
        distinct: ["projectId"],
      }),
      db.requestLog.findMany({
        where: {
          projectId: { not: null },
          createdAt: { gte: start24h },
        },
        select: { projectId: true, statusCode: true },
      }),
      db.assistantMessage.count({
        where: { role: "user", createdAt: { gte: startOfToday } },
      }),
      db.newsletterSubscriber.count(),
      db.project.count({ where: { leaderboardVisible: true, archivedAt: null } }),
      db.project.count({ where: { isPublic: true, publicSlug: { not: null } } }),
      detectPendingPrismaMigrations(db),
      db.systemAnnouncement.findFirst({
        orderBy: { createdAt: "desc" },
        select: { message: true, severity: true, createdAt: true },
      }),
      db.blogPost.findFirst({
        where: { visible: true, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { title: true, slug: true, publishedAt: true },
      }),
      db.whatsNew.findFirst({
        where: { active: true },
        orderBy: { publishedAt: "desc" },
        select: { version: true, title: true, publishedAt: true },
      }),
      db.supportTicket.count({ where: { status: { in: ["open", "in_progress"] } } }),
      db.incident.findMany({
        where: { resolvedAt: null },
        orderBy: { startedAt: "desc" },
        take: 5,
        select: {
          id: true,
          serviceName: true,
          severity: true,
          description: true,
          startedAt: true,
        },
      }),
      db.digestRecord.findFirst({
        orderBy: { generatedAt: "desc" },
        select: { generatedAt: true, sent: true },
      }),
      db.digestSchedule.count({ where: { nextSendAt: { lte: now } } }),
      db.statusSubscriber.count({ where: { active: true } }),
    ]);

    const highErrorRateProjects = new Set<string>();
    const statsByProject = new Map<string, { total: number; errors: number }>();
    for (const log of recentProjectLogs) {
      if (!log.projectId) continue;
      const stats = statsByProject.get(log.projectId) ?? { total: 0, errors: 0 };
      stats.total += 1;
      if (log.statusCode >= 400) stats.errors += 1;
      statsByProject.set(log.projectId, stats);
    }
    for (const [projectId, stats] of statsByProject.entries()) {
      if (stats.total >= 20 && stats.errors / stats.total >= 0.1) {
        highErrorRateProjects.add(projectId);
      }
    }

    const failedWebhookCount = webhookDeliveries24h.filter((delivery) =>
      delivery.status === "failed" || delivery.status === "permanent_failure"
    ).length;
    const webhookFailureRate =
      webhookDeliveries24h.length > 0
        ? Number(((failedWebhookCount / webhookDeliveries24h.length) * 100).toFixed(1))
        : 0;

    const infrastructureStatus =
      !isAssistantConfigured(input.env) || latestGatewayHealth?.status === "offline" || activeIncidentCount > 0
        ? "blocked"
        : webhookFailureRate > 10 || supportBacklogCount > 10 || cspViolations.filter((entry) => new Date(entry.receivedAt).getTime() >= start24h.getTime()).length > 0
          ? "needs_attention"
          : "healthy";
    const productStatus =
      totalActiveProjects === 0 || recentTrafficProjects.length === 0
        ? "needs_attention"
        : highErrorRateProjects.size > 0 || lowBalanceAlertProjects.length > 0
          ? "needs_attention"
          : "healthy";
    const operationsStatus =
      pendingMigrations.detected || activeIncidentCount > 0
        ? "blocked"
        : dueDigestCount > 0 || openSupportTickets > 0
          ? "needs_attention"
          : "healthy";

    return {
      item: {
        timestamp: now.toISOString(),
        environment: input.env.FYXVO_ENV,
        infrastructure: {
          status: infrastructureStatus,
          apiCommit: getRuntimeCommitSha(),
          gatewayHealth: latestGatewayHealth?.status ?? "unknown",
          assistantAvailable: isAssistantConfigured(input.env),
          currentIncidentCount: activeIncidentCount,
          cspViolationsLast24h: cspViolations.filter((entry) => new Date(entry.receivedAt).getTime() >= start24h.getTime()).length,
          webhookFailureRate,
          supportBacklogCount,
        },
        product: {
          status: productStatus,
          totalUsers,
          totalActiveProjects,
          projectsWithRecentTraffic: recentTrafficProjects.length,
          projectsWithLowBalanceAlerts: lowBalanceAlertProjects.length,
          projectsWithHighErrorRates: highErrorRateProjects.size,
          assistantUsageToday,
          newsletterSubscribers,
          leaderboardOptIns,
          publicProjectPagesCount,
        },
        operations: {
          status: operationsStatus,
          pendingMigrations,
          latestAnnouncement: latestAnnouncement
            ? {
                message: latestAnnouncement.message,
                severity: latestAnnouncement.severity,
                createdAt: latestAnnouncement.createdAt.toISOString(),
              }
            : null,
          latestBlogPost: latestBlogPost
            ? {
                title: latestBlogPost.title,
                slug: latestBlogPost.slug,
                publishedAt: latestBlogPost.publishedAt?.toISOString() ?? null,
              }
            : null,
          latestChangelogVersion: latestWhatsNew
            ? {
                version: latestWhatsNew.version,
                title: latestWhatsNew.title,
                publishedAt: latestWhatsNew.publishedAt.toISOString(),
              }
            : null,
          openSupportTickets,
          activeIncidents: activeIncidents.map((incident) => ({
            id: incident.id,
            serviceName: incident.serviceName,
            severity: incident.severity,
            description: incident.description,
            startedAt: incident.startedAt.toISOString(),
          })),
          digestGenerationStatus: {
            latestGeneratedAt: latestDigestRecord?.generatedAt.toISOString() ?? null,
            latestSent: latestDigestRecord?.sent ?? null,
            dueSchedules: dueDigestCount,
          },
          statusSubscriberCount,
        },
      },
    };
  });

  app.get("/v1/admin/onboarding-funnel", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const query = z.object({ windowDays: z.coerce.number().int().min(7).max(30).default(7) }).parse(request.query);
    const now = new Date();

    async function buildWindowSummary(start: Date, end: Date) {
      const [walletConnected, projectCreated, projectActivatedRows, fundedRows, apiKeysCreated, firstRequestRows] =
        await Promise.all([
          db.requestLog.count({
            where: {
              service: "web",
              route: "/events/wallet_connect_intent",
              createdAt: { gte: start, lt: end },
            },
          }),
          db.project.count({ where: { createdAt: { gte: start, lt: end } } }),
          db.notification.findMany({
            where: {
              type: "project_activated",
              projectId: { not: null },
              createdAt: { gte: start, lt: end },
            },
            select: { projectId: true },
            distinct: ["projectId"],
          }),
          db.fundingCoordinate.findMany({
            where: { createdAt: { gte: start, lt: end } },
            select: { projectId: true },
            distinct: ["projectId"],
          }),
          db.apiKey.count({ where: { createdAt: { gte: start, lt: end } } }),
          db.requestLog.findMany({
            where: {
              projectId: { not: null },
              createdAt: { gte: start, lt: end },
            },
            select: { projectId: true },
            distinct: ["projectId"],
          }),
        ]);

      return {
        walletConnected,
        projectCreated,
        projectActivated: projectActivatedRows.length,
        funded: fundedRows.length,
        apiKeyCreated: apiKeysCreated,
        firstRequestMade: firstRequestRows.length,
      };
    }

    const currentStart = new Date(now.getTime() - query.windowDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - query.windowDays * 2 * 24 * 60 * 60 * 1000);
    const [current, previous] = await Promise.all([
      buildWindowSummary(currentStart, now),
      buildWindowSummary(previousStart, currentStart),
    ]);

    const steps = [
      { key: "wallet_connected", label: "Wallet connected", count: current.walletConnected, previousCount: previous.walletConnected },
      { key: "project_created", label: "Project created", count: current.projectCreated, previousCount: previous.projectCreated },
      { key: "project_activated", label: "Project activated", count: current.projectActivated, previousCount: previous.projectActivated },
      { key: "funded", label: "Funded", count: current.funded, previousCount: previous.funded },
      { key: "api_key_created", label: "API key created", count: current.apiKeyCreated, previousCount: previous.apiKeyCreated },
      { key: "first_request_made", label: "First request made", count: current.firstRequestMade, previousCount: previous.firstRequestMade },
    ].map((step, index, allSteps) => {
      const previousStepCount = index === 0 ? step.count : allSteps[index - 1]!.count;
      const conversionPercentage =
        index === 0
          ? 100
          : previousStepCount > 0
            ? Number(((step.count / previousStepCount) * 100).toFixed(1))
            : 0;
      const trend =
        step.count > step.previousCount ? "up"
          : step.count < step.previousCount ? "down"
            : "flat";
      return {
        key: step.key,
        label: step.label,
        count: step.count,
        previousCount: step.previousCount,
        conversionPercentage,
        trend,
      };
    });

    return {
      item: {
        windowDays: query.windowDays,
        generatedAt: now.toISOString(),
        steps,
      },
    };
  });

  app.get("/v1/admin/feedback-inbox", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const query = z.object({
      type: z.enum(["all", "feedback_submission", "assistant_feedback", "support_ticket", "newsletter_signup", "referral_conversion"]).default("all"),
      status: z.enum(["all", "new", "reviewed", "planned", "resolved"]).default("all"),
    }).parse(request.query);

    const [feedbackRows, assistantFeedbackRows, supportRows, newsletterRows, referralRows, triageRows] = await Promise.all([
      db.feedbackSubmission.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { project: { select: { id: true, name: true, slug: true } } },
      }),
      db.assistantFeedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          conversation: { select: { id: true, title: true } },
          user: { select: { walletAddress: true, displayName: true } },
          message: { select: { content: true } },
        },
      }),
      db.supportTicket.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
        include: {
          user: { select: { walletAddress: true, displayName: true } },
          project: { select: { id: true, name: true, slug: true } },
        },
      }),
      db.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      db.referralClick.findMany({
        where: { convertedToSignup: true },
        orderBy: { clickedAt: "desc" },
        take: 40,
        include: { referrer: { select: { walletAddress: true, displayName: true } } },
      }),
      db.feedbackInboxTriage.findMany({
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

    const triageByKey = new Map(triageRows.map((row) => [`${row.itemType}:${row.itemId}`, row]));
    const items = [
      ...feedbackRows.map((row) => {
        const triage = triageByKey.get(`feedback_submission:${row.id}`);
        return {
          id: row.id,
          type: "feedback_submission",
          title: row.category.replace(/_/g, " ").toLowerCase(),
          summary: row.message,
          source: row.source,
          createdAt: row.createdAt.toISOString(),
          actor: row.walletAddress ?? row.email,
          project: row.project ? { id: row.project.id, name: row.project.name, slug: row.project.slug } : null,
          status: triage?.status ?? "new",
          tags: triage?.tags ?? [],
        };
      }),
      ...assistantFeedbackRows.map((row) => {
        const triage = triageByKey.get(`assistant_feedback:${row.id}`);
        return {
          id: row.id,
          type: "assistant_feedback",
          title: row.rating === "up" ? "Assistant thumbs up" : "Assistant thumbs down",
          summary: row.note ?? row.message.content.slice(0, 180),
          source: row.conversation.title,
          createdAt: row.createdAt.toISOString(),
          actor: row.user.walletAddress,
          project: null,
          status: triage?.status ?? "new",
          tags: triage?.tags ?? [],
        };
      }),
      ...supportRows.map((row) => {
        const triage = triageByKey.get(`support_ticket:${row.id}`);
        return {
          id: row.id,
          type: "support_ticket",
          title: row.subject,
          summary: row.description,
          source: row.category,
          createdAt: row.createdAt.toISOString(),
          actor: row.user.walletAddress,
          project: row.project ? { id: row.project.id, name: row.project.name, slug: row.project.slug } : null,
          status: triage?.status ?? "new",
          tags: triage?.tags ?? [],
        };
      }),
      ...newsletterRows.map((row) => {
        const triage = triageByKey.get(`newsletter_signup:${row.id}`);
        return {
          id: row.id,
          type: "newsletter_signup",
          title: "Newsletter signup",
          summary: row.email,
          source: row.source,
          createdAt: row.createdAt.toISOString(),
          actor: row.email,
          project: null,
          status: triage?.status ?? "new",
          tags: triage?.tags ?? [],
        };
      }),
      ...referralRows.map((row) => {
        const triage = triageByKey.get(`referral_conversion:${row.id}`);
        return {
          id: row.id,
          type: "referral_conversion",
          title: "Referral conversion",
          summary: `${row.referrer.displayName} generated a converted signup.`,
          source: "referral",
          createdAt: row.clickedAt.toISOString(),
          actor: row.referrer.walletAddress,
          project: null,
          status: triage?.status ?? "new",
          tags: triage?.tags ?? [],
        };
      }),
    ]
      .filter((item) => query.type === "all" || item.type === query.type)
      .filter((item) => query.status === "all" || item.status === query.status)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return { items };
  });

  app.patch("/v1/admin/feedback-inbox/:itemType/:itemId", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const params = z.object({
      itemType: z.enum(["feedback_submission", "assistant_feedback", "support_ticket", "newsletter_signup", "referral_conversion"]),
      itemId: z.string().min(1).max(64),
    }).parse(request.params);
    const body = z.object({
      status: z.enum(["new", "reviewed", "planned", "resolved"]).optional(),
      tags: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
    }).parse(request.body);

    const item = await db.feedbackInboxTriage.upsert({
      where: {
        itemType_itemId: {
          itemType: params.itemType,
          itemId: params.itemId,
        },
      },
      create: {
        itemType: params.itemType,
        itemId: params.itemId,
        status: body.status ?? "new",
        tags: body.tags ?? [],
        updatedByUserId: user.id,
      },
      update: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
        updatedByUserId: user.id,
      },
    });

    return {
      item: {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        status: item.status,
        tags: item.tags,
        updatedAt: item.updatedAt.toISOString(),
      },
    };
  });

  app.get("/v1/admin/deployment-readiness", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);

    return {
      item: {
        service: "fyxvo-api",
        version: API_STATUS_VERSION,
        commit: getRuntimeCommitSha(),
        environment: input.env.FYXVO_ENV,
        timestamp: new Date().toISOString(),
        assistantAvailable: isAssistantConfigured(input.env),
        pendingMigrations: await detectPendingPrismaMigrations(input.prisma)
      }
    };
  });

  app.get("/v1/admin/mainnet-readiness-gate", async (request) => {
    const db = requirePrisma();
    const snapshot = await buildMainnetReleaseGateSnapshot({
      env: input.env,
      prisma: db,
      blockchain: input.blockchain,
    });

    if (!isPrivilegedAdminUser(request.currentUser)) {
      return {
        item: toPublicMainnetReleaseGateSnapshot(snapshot),
      };
    }

    return {
      item: snapshot,
    };
  });

  app.get("/v1/network/readiness", async () => {
    const db = requirePrisma();
    const snapshot = await buildMainnetReleaseGateSnapshot({
      env: input.env,
      prisma: db,
      blockchain: input.blockchain,
    });

    return {
      item: toPublicNetworkReadinessSummary(snapshot),
    };
  });

  app.patch("/v1/admin/mainnet-readiness-gate", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const db = requirePrisma();
    const body = z.object({
      targetReserveLamports: z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).optional(),
      armed: z.boolean().optional(),
      notes: z
        .union([z.string().trim().max(1200), z.null()])
        .optional()
        .transform((value) => {
          if (value == null) return value;
          return value.length > 0 ? value : null;
        }),
    }).parse(request.body);

    const environment = input.env.FYXVO_ENV;
    const existingGate = await db.mainnetReleaseGate.findUnique({
      where: { environment },
      select: { id: true, armed: true },
    });

    const baseUpdate = {
      ...(body.targetReserveLamports !== undefined
        ? {
            targetReserveLamports:
              typeof body.targetReserveLamports === "number"
                ? BigInt(body.targetReserveLamports)
                : BigInt(body.targetReserveLamports),
          }
        : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    };

    if (Object.keys(baseUpdate).length > 0) {
      await db.mainnetReleaseGate.upsert({
        where: { environment },
        create: {
          environment,
          ...baseUpdate,
        },
        update: baseUpdate,
      });
    }

    if (body.armed === true) {
      const snapshot = await buildMainnetReleaseGateSnapshot({
        env: input.env,
        prisma: db,
        blockchain: input.blockchain,
      });
      if (!snapshot.mainnetBetaEligible) {
        throw new HttpError(
          409,
          "mainnet_gate_blocked",
          "Mainnet release cannot be armed until the live readiness checks are green.",
          snapshot
        );
      }

      await db.mainnetReleaseGate.upsert({
        where: { environment },
        create: {
          environment,
          targetReserveLamports:
            typeof body.targetReserveLamports === "number"
              ? BigInt(body.targetReserveLamports)
              : typeof body.targetReserveLamports === "string"
                ? BigInt(body.targetReserveLamports)
                : DEFAULT_MAINNET_TARGET_RESERVE_LAMPORTS,
          notes: body.notes ?? null,
          armed: true,
          armedAt: new Date(),
          armedByUserId: user.id,
        },
        update: {
          armed: true,
          armedAt: new Date(),
          armedByUserId: user.id,
        },
      });
    } else if (body.armed === false && (existingGate || Object.keys(baseUpdate).length > 0)) {
      await db.mainnetReleaseGate.upsert({
        where: { environment },
        create: {
          environment,
          targetReserveLamports:
            typeof body.targetReserveLamports === "number"
              ? BigInt(body.targetReserveLamports)
              : typeof body.targetReserveLamports === "string"
                ? BigInt(body.targetReserveLamports)
                : DEFAULT_MAINNET_TARGET_RESERVE_LAMPORTS,
          notes: body.notes ?? null,
          armed: false,
          armedAt: null,
          armedByUserId: null,
        },
        update: {
          armed: false,
          armedAt: null,
          armedByUserId: null,
        },
      });
    }

    return {
      item: await buildMainnetReleaseGateSnapshot({
        env: input.env,
        prisma: db,
        blockchain: input.blockchain,
      }),
    };
  });

  // POST /v1/assistant/chat — AI developer assistant (streaming SSE)
  // Per-user rate limit: 20 messages per hour (rolling window in-memory)
  const assistantUserWindows = new Map<string, number[]>();

  const ASSISTANT_RATE_LIMIT = 20;
  const ASSISTANT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const ASSISTANT_MODEL = "claude-sonnet-4-20250514";

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
    conversationId: z.string().uuid().optional(),
    messages: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })).min(1).max(50),
    projectContext: z.object({
      projectId: z.string().uuid().optional(),
      projectName: z.string().optional(),
      projectNames: z.array(z.string()).optional(),
      balance: z.string().optional(),
      totalBalanceSol: z.number().optional(),
      requestCount: z.number().optional(),
      requestsLast7Days: z.number().optional(),
      successRate: z.number().optional(),
      gatewayStatus: z.string().optional(),
      activationStatus: z.string().optional(),
      latestApiKeyMasked: z.string().optional(),
      simulationModeAvailable: z.boolean().optional(),
      activeAnnouncements: z.array(z.string()).optional(),
    }).optional(),
  });

  app.get("/v1/assistant/conversations", async (request) => {
    const user = requireUser(request);
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(20),
      q: z.string().trim().max(120).optional(),
      includeArchived: z.coerce.boolean().optional(),
    }).parse(request.query);
    return {
      items: await input.repository.listAssistantConversations(
        user.id,
        query.limit,
        query.q,
        query.includeArchived ?? true
      )
    };
  });

  app.get("/v1/assistant/conversations/latest", async (request) => {
    const user = requireUser(request);
    const item = await input.repository.getLatestAssistantConversation(user.id);
    if (!item) {
      return { item: null };
    }
    return { item };
  });

  app.post("/v1/assistant/conversations", async (request, reply) => {
    const user = requireUser(request);
    const body = z.object({ title: z.string().trim().max(80).optional() }).parse(request.body ?? {});
    const item = await input.repository.createAssistantConversation({
      userId: user.id,
      title: body.title || "New conversation",
    });
    return reply.status(201).send({ item });
  });

  app.get("/v1/assistant/conversations/:conversationId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ conversationId: z.string().uuid() }).parse(request.params);
    const item = await input.repository.getAssistantConversation(user.id, params.conversationId);
    if (!item) throw new HttpError(404, "not_found", "Conversation not found.");
    return { item };
  });

  app.patch("/v1/assistant/conversations/:conversationId", async (request) => {
    const user = requireUser(request);
    const params = z.object({ conversationId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        pinned: z.boolean().optional(),
        archived: z.boolean().optional(),
        title: z.string().trim().min(1).max(80).optional(),
      })
      .refine((value) => typeof value.pinned === "boolean" || typeof value.archived === "boolean" || typeof value.title === "string", {
        message: "At least one conversation field must be updated.",
      })
      .parse(request.body ?? {});

    const item = await input.repository.updateAssistantConversation(user.id, params.conversationId, {
      ...(typeof body.pinned === "boolean" ? { pinned: body.pinned } : {}),
      ...(typeof body.archived === "boolean" ? { archived: body.archived } : {}),
      ...(typeof body.title === "string" ? { title: body.title } : {}),
    });
    if (!item) throw new HttpError(404, "not_found", "Conversation not found.");
    return { item };
  });

  app.delete("/v1/assistant/conversations/:conversationId", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ conversationId: z.string().uuid() }).parse(request.params);
    await input.repository.clearAssistantConversation(user.id, params.conversationId);
    return reply.status(204).send();
  });

  app.post("/v1/assistant/messages/:messageId/feedback", async (request, reply) => {
    const user = requireUser(request);
    const params = z.object({ messageId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      conversationId: z.string().uuid(),
      rating: z.enum(["up", "down"]),
      note: z.string().trim().max(280).optional().nullable(),
    }).parse(request.body);

    const item = await input.repository.upsertAssistantFeedback({
      userId: user.id,
      conversationId: body.conversationId,
      messageId: params.messageId,
      rating: body.rating,
      ...(body.note !== undefined ? { note: body.note } : {}),
    });

    return reply.status(201).send({ item });
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

    const { messages, projectContext, conversationId: requestedConversationId } = parsed.data;
    const requestStart = Date.now();
    const hashedUserId = sha256(user.id).slice(0, 16);
    const anthropicKey = input.env.ANTHROPIC_API_KEY;
    if (!isAssistantConfigured(input.env) || !anthropicKey) {
      return reply.status(503).send({
        code: "assistant_unavailable",
        error: "The AI assistant is not configured.",
        message: "The AI assistant is currently unavailable for this environment.",
        requestId: request.id
      });
    }

    const projects = await input.repository.listProjects(user);
    const openIncidents = (await input.repository.listIncidents(10)).filter((incident) => !incident.resolvedAt);
    const activeAnnouncement = await input.repository.getActiveAnnouncement();
    const selectedProject =
      projectContext?.projectId
        ? projects.find((project) => project.id === projectContext.projectId) ?? null
        : null;
    const selectedProjectApiKeys =
      selectedProject ? await input.repository.listApiKeys(selectedProject.id).catch(() => []) : [];
    const latestSelectedApiKey = selectedProjectApiKeys
      .slice()
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
    const latestSelectedApiKeyMasked = latestSelectedApiKey ? `${latestSelectedApiKey.prefix}••••` : null;
    const liveContextLines = [
      `- Projects in workspace: ${projects.length}`,
      projects.length > 0
        ? `- Project names: ${projects.map((project) => project.name).join(", ")}`
        : "- Project names: none yet",
      `- Activated projects: ${projects.filter((project) => Boolean(project.onChainProjectPda)).length}/${projects.length}`,
      `- Projects with funding events: ${projects.filter((project) => (project._count?.fundingRequests ?? 0) > 0).length}/${projects.length}`,
      selectedProject ? `- Selected project: ${selectedProject.name}` : null,
      selectedProject ? `- Selected project activation status: ${projectContext?.activationStatus ?? "unknown"}` : null,
      projectContext?.balance ? `- Selected project funded SOL balance: ${projectContext.balance}` : null,
      latestSelectedApiKeyMasked ? `- Latest selected project API key: ${latestSelectedApiKeyMasked}` : "- Latest selected project API key: none yet",
      projectContext?.totalBalanceSol !== undefined
        ? `- Total funded SOL balance across projects: ${projectContext.totalBalanceSol.toFixed(4)} SOL`
        : null,
      projectContext?.requestsLast7Days !== undefined
        ? `- Requests in last 7 days: ${projectContext.requestsLast7Days}`
        : null,
      `- Gateway status: ${openIncidents.length === 0 ? "operational" : "degraded or incident open"}`,
      activeAnnouncement ? `- Active system announcement: ${activeAnnouncement.message}` : "- Active system announcement: none",
      `- Pricing model: standard ${PRICING_LAMPORTS.standard.toLocaleString()} lamports, compute-heavy ${PRICING_LAMPORTS.computeHeavy.toLocaleString()} lamports, priority ${PRICING_LAMPORTS.priority.toLocaleString()} lamports on devnet`,
      "- Simulation mode: available in the Playground via the simulate toggle; unsupported methods return a method-not-simulated response",
      "- Mainnet availability: not live yet",
    ].filter((line): line is string => Boolean(line));

    let effectiveConversationId: string;
    if (requestedConversationId) {
      const existingConversation = await input.repository.getAssistantConversation(user.id, requestedConversationId);
      if (!existingConversation) {
        throw new HttpError(404, "not_found", "Conversation not found.");
      }
      effectiveConversationId = existingConversation.id;
    } else {
      const createdConversation = await input.repository.createAssistantConversation({
        userId: user.id,
        title: assistantConversationTitleFromMessage(
          messages.find((message) => message.role === "user")?.content ?? "New conversation"
        ),
      });
      effectiveConversationId = createdConversation.id;
    }

    const systemPrompt = `You are the Fyxvo Developer Assistant — a knowledgeable, honest, and practical AI guide for developers building on Solana using the Fyxvo RPC gateway platform. You are an AI and may make mistakes; always recommend testing code before production use. For critical infrastructure questions, also consult the official Solana documentation at docs.solana.com.

## TRUTHFULNESS RULES
- Never invent Fyxvo features, rollout states, integrations, or guarantees.
- If something is not in the live context below, say you do not see it live yet.
- If a user asks whether something exists and it is not clearly live, answer that it is not live yet or that you cannot confirm it from the available live context.
- Prefer concrete answers grounded in the live context and current product behavior over generic platform claims.

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

## LIVE PRODUCT SURFACES YOU CAN HELP WITH
- **Assistant workspace**: server-backed conversation history, copy actions, playground handoff, related docs links
- **Playground**: saved recipes, webhook testing, simulation mode, benchmarks, trace lookup
- **Request logs**: per-project request explorer with filters, exports, trace IDs, upstream node, region, and error hints
- **Alerts center**: low balance, webhook failures, error rate alerts, incident linkage, and saved views
- **Project health**: readiness score, breakdowns, 7d/30d trend history, and operational recommendations
- **Team collaboration**: notes/runbooks, team activity history, starter kits, bookmarks, shared playground recipes
- **Public surfaces**: public project pages, leaderboard opt-in, explore page, security page, reliability page, status page
- **Operations tools**: incident timelines, release readiness, admin observability, support inbox, feedback inbox

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
const signature = bs58.encode(signedMessage.signature);

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
- **Standard reads**: ${PRICING_LAMPORTS.standard.toLocaleString()} lamports per request (${(PRICING_LAMPORTS.standard / 1_000_000_000).toFixed(6)} SOL)
- **Compute-heavy methods**: ${PRICING_LAMPORTS.computeHeavy.toLocaleString()} lamports per request (${(PRICING_LAMPORTS.computeHeavy / 1_000_000_000).toFixed(6)} SOL) — includes getProgramAccounts, getTokenAccountsByOwner, getSignaturesForAddress, getMultipleAccounts, and similar
- **Priority relay**: ${PRICING_LAMPORTS.priority.toLocaleString()} lamports per request (${(PRICING_LAMPORTS.priority / 1_000_000_000).toFixed(6)} SOL)
- **Free tier**: ${FREE_TIER_REQUESTS.toLocaleString()} standard requests for every new project
- **Volume discount tier 1**: ≥${VOLUME_DISCOUNT.tier1.monthlyRequests.toLocaleString()} requests/month → ${VOLUME_DISCOUNT.tier1.discountBps / 100}% off
- **Volume discount tier 2**: ≥${VOLUME_DISCOUNT.tier2.monthlyRequests.toLocaleString()} requests/month → ${VOLUME_DISCOUNT.tier2.discountBps / 100}% off
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

## LIVE FYXVO CONTEXT
${liveContextLines.join("\n")}

## RESPONSE SHAPE
- Start with a direct answer in 1 to 3 short sentences.
- If the user asked for code, configuration, curl, or RPC usage, follow with exactly one primary copy-pasteable example in a fenced code block.
- If the answer should send the user somewhere inside Fyxvo, end with one best next step sentence. Prefer one destination, not a list of many pages.
- If the user is asking for debugging help, say what to check first before offering deeper follow-up steps.
- Use short headings only when they materially improve scanability for a longer answer.

## GUIDELINES
1. You are an AI. Be honest about uncertainty — if you don't know something specific to Fyxvo, say so.
2. All code should be tested before production use. Fyxvo is devnet private alpha.
3. Be concise. Developers want working code, not long explanations.
4. Always show complete, copy-pasteable code examples.
5. Do not promise specific performance numbers (latency, uptime SLAs, etc.)
6. For Solana questions not specific to Fyxvo, give accurate answers and suggest the official Solana docs.
7. When generating code, default to TypeScript unless the user specifies otherwise.
8. Keep responses focused — answer the question asked, don't pad with extras.
9. If a user asks where to go in the product, recommend the single best page first, then at most two supporting pages.
10. If the question is about debugging or product usage, do not refuse just because it is not strictly about RPC. Help with dashboards, request logs, alerts, funding, API keys, webhooks, teams, and notes when those features are live.
11. If the user asks about something not live yet, say clearly that it is not live yet.
12. When a developer is stuck, ask one clarifying question only if it materially changes the answer. Otherwise give the best grounded answer you can.`;

    try {
      const upstreamResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: ASSISTANT_MODEL,
          max_tokens: 4096,
          stream: true,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!upstreamResponse.ok || !upstreamResponse.body) {
        const durationMs = Date.now() - requestStart;
        app.log.warn({
          event: "assistant.chat.upstream_error",
          hashedUserId,
          model: ASSISTANT_MODEL,
          messageCount: messages.length,
          durationMs,
          statusCode: upstreamResponse.status
        }, "Anthropic API returned non-OK status");

        return reply.status(500).send({
          code: "assistant_internal_error",
          error: "The AI provider request failed.",
          message: "Fyxvo could not complete the assistant request. Please try again.",
          requestId: request.id
        });
      }

      reply.hijack();
      reply.raw.statusCode = 200;
      applyHijackedCorsHeaders({
        raw: reply.raw,
        origin: request.headers.origin,
        allowedOrigins,
      });
      reply.raw.setHeader("x-fyxvo-conversation-id", effectiveConversationId);
      reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");
      reply.raw.flushHeaders?.();

      const reader = upstreamResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputTokenEstimate = 0;
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { payloads, remainder } = extractSseDataPayloads(buffer);
        buffer = remainder;

        for (const payload of payloads) {
          if (payload === "[DONE]") continue;

          try {
            const event = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string }; usage?: { output_tokens?: number }; error?: unknown };
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
              outputTokenEstimate += Math.ceil(event.delta.text.length / 4);
              assistantText += event.delta.text;
              reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      buffer += decoder.decode();
      const { payloads: finalPayloads } = extractSseDataPayloads(`${buffer}\n\n`);
      for (const payload of finalPayloads) {
        if (payload === "[DONE]") continue;

        try {
          const event = JSON.parse(payload) as { type?: string; delta?: { type?: string; text?: string } };
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
            outputTokenEstimate += Math.ceil(event.delta.text.length / 4);
            assistantText += event.delta.text;
            reply.raw.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
          }
        } catch {
          // skip malformed trailing payloads
        }
      }

      const durationMs = Date.now() - requestStart;
      const inputTokenEstimate = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);
      const lastUserMessage = messages.filter((message) => message.role === "user").at(-1)?.content ?? "";
      const matchedDocsSection = detectAssistantDocsSection(assistantText);
      const playgroundPayload = detectAssistantPlaygroundPayload(assistantText);
      const suggestedActions = inferAssistantSuggestedActions({
        content: assistantText,
        projectContext: projectContext
          ? sanitizeAssistantProjectContext({
              ...projectContext,
              ...(latestSelectedApiKeyMasked ? { latestApiKeyMasked: latestSelectedApiKeyMasked } : {}),
            })
          : undefined,
        docsSection: matchedDocsSection,
        playgroundPayload,
      });
      const promptCategory = inferAssistantPromptCategory(lastUserMessage);
      app.log.info({
        event: "assistant.chat.success",
        hashedUserId,
        model: ASSISTANT_MODEL,
        messageCount: messages.length,
        inputTokenEstimate,
        outputTokenEstimate,
        durationMs,
        timestamp: new Date().toISOString()
      }, "Assistant chat completed");

      await input.repository.saveAssistantConversationMessages({
        userId: user.id,
        conversationId: effectiveConversationId,
        titleFromFirstUserMessage: assistantConversationTitleFromMessage(
          messages.find((message) => message.role === "user")?.content ?? ""
        ),
        messages: [
          ...messages,
          {
            role: "assistant",
            content: assistantText || "No assistant response was returned.",
            projectId: selectedProject?.id ?? projectContext?.projectId ?? null,
            matchedDocsSection,
            suggestedActions,
            playgroundPayload,
            promptCategory,
            responseTimeMs: durationMs,
            inputTokenEstimate,
            outputTokenEstimate,
          },
        ],
      });

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
      if (reply.raw.headersSent) {
        reply.raw.write(
          `data: ${JSON.stringify({ error: "The assistant stream was interrupted. Please try again." })}\n\n`
        );
        reply.raw.write("data: [DONE]\n\n");
        reply.raw.end();
        return;
      }

      return reply.status(500).send({
        code: "assistant_internal_error",
        error: "The AI assistant request failed.",
        message: "Fyxvo could not complete the assistant request. Please try again.",
        requestId: request.id
      });
    }
  });

  // GET /v1/projects/:projectId/widget — public widget data
  app.get("/v1/projects/:projectId/widget", async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      const project = await input.repository.findProjectById(projectId);
      if (!project) return reply.status(404).send({ error: "Project not found" });

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const analytics = await input.repository.getProjectAnalytics(projectId, since24h).catch(() => null);
      const requestsToday = analytics?.totals?.requestLogs ?? 0;
      const avgLatencyMs = Math.round(analytics?.latency?.averageMs ?? 0);
      const db = requirePrisma();
      const requestRows = await db.requestLog.findMany({
        where: {
          projectId,
          createdAt: { gte: since7d }
        },
        select: {
          createdAt: true
        }
      });
      const requestCounts = new Map<string, number>();
      for (let index = 6; index >= 0; index -= 1) {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - index);
        requestCounts.set(date.toISOString().slice(0, 10), 0);
      }
      for (const row of requestRows) {
        const dateKey = row.createdAt.toISOString().slice(0, 10);
        if (requestCounts.has(dateKey)) {
          requestCounts.set(dateKey, (requestCounts.get(dateKey) ?? 0) + 1);
        }
      }

      return reply.send({
        projectName: project.displayName ?? project.name,
        projectSlug: project.slug,
        publicSlug: project.publicSlug ?? null,
        requestsToday,
        gatewayStatus: "healthy",
        avgLatencyMs,
        requestVolume7d: [...requestCounts.entries()].map(([date, count]) => ({ date, count })),
        isPublic: project.isPublic ?? false,
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
    const resetAt = new Date(hourStart.getTime() + 3_600_000).toISOString();
    return {
      messagesUsedThisHour: count,
      messagesRemainingThisHour: Math.max(0, limit - count),
      limit,
      windowResetAt: resetAt,
      resetAt,
      model: ASSISTANT_MODEL,
      assistantAvailable: isAssistantConfigured(input.env),
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
    const startedAt = Date.now();
    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-fyxvo-signature": `sha256=${sig}` },
        body,
        signal: AbortSignal.timeout(5000),
      });
      const responseBody = (await res.text().catch(() => "")).slice(0, 500);
      const latencyMs = Date.now() - startedAt;
      void input.repository.recordWebhookDelivery({
        webhookId: webhook.id,
        eventType: "test",
        payload: payload,
        attemptNumber: 1,
        responseStatus: res.status,
        responseBody,
        success: res.ok,
        nextRetryAt: res.ok ? null : new Date(Date.now() + 30_000),
      }).catch(() => undefined);
      return reply.send({ success: res.ok, statusCode: res.status, latencyMs, body: responseBody });
    } catch (e) {
      return reply.send({
        success: false,
        statusCode: 0,
        latencyMs: Date.now() - startedAt,
        body: "",
        error: e instanceof Error ? e.message : "Request failed"
      });
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
    void input.repository.logActivity({
      projectId,
      userId: user.id,
      action: "member.accepted",
      details: { memberId },
    }).catch(() => undefined);
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
    const body = z.object({
      message: z.string().min(1).max(500),
      severity: z.enum(["info", "warning", "critical"]).default("info"),
      startAt: z.string().datetime().optional().nullable(),
      endAt: z.string().datetime().optional().nullable(),
    }).parse(request.body);
    await input.repository.upsertAnnouncement({
      message: body.message,
      severity: body.severity,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
    });
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
    const query = z.object({ range: z.enum(["7d", "30d"]).optional() }).parse(request.query ?? {});
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(403, "forbidden", "Access denied.");
    }
    return { history: await input.repository.getHealthHistory(projectId, query.range === "30d" ? 30 : 7) };
  });

  app.get("/v1/projects/:projectId/export-summary", async (request, reply) => {
    const user = requireUser(request);
    const db = requirePrisma();
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const { format = "json" } = z.object({ format: z.enum(["json", "markdown"]).default("json") }).parse(request.query);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "Project not found.");
    }

    const [health, apiKeys, members, requests7d, webhooks, notifications, fundingRows] = await Promise.all([
      input.repository.getProjectHealthScore(projectId),
      input.repository.listApiKeys(projectId),
      input.repository.listProjectMembers(projectId),
      db.requestLog.findMany({
        where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        select: { statusCode: true, durationMs: true },
      }),
      db.webhook.findMany({
        where: { projectId },
        include: {
          deliveries: {
            orderBy: { createdAt: "desc" },
            take: 10,
            select: { status: true, createdAt: true },
          },
        },
      }),
      db.notification.findMany({
        where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { title: true, message: true, createdAt: true },
      }),
      db.fundingCoordinate.findMany({
        where: { projectId, asset: "SOL" },
        select: { amount: true },
      }),
    ]);

    const successCount = requests7d.filter((log) => log.statusCode < 400).length;
    const avgLatencyMs =
      requests7d.length > 0
        ? Math.round(requests7d.reduce((sum, log) => sum + log.durationMs, 0) / requests7d.length)
        : 0;
    const webhookDeliveries = webhooks.flatMap((webhook) => webhook.deliveries);
    const successfulWebhookDeliveries = webhookDeliveries.filter((delivery) => delivery.status === "delivered").length;
    const webhookHealth =
      webhookDeliveries.length > 0
        ? Number(((successfulWebhookDeliveries / webhookDeliveries.length) * 100).toFixed(1))
        : null;

    const totalFundedLamports = fundingRows.reduce((sum, row) => sum + row.amount, 0n);
    const summary = {
      project: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.archivedAt ? "archived" : "active",
        healthScore: health.score,
        fundingSol: `${Number(totalFundedLamports) / 1_000_000_000} SOL`,
        apiKeyCount: apiKeys.length,
        successRate7d: requests7d.length > 0 ? Number(((successCount / requests7d.length) * 100).toFixed(1)) : null,
        averageLatencyMs7d: avgLatencyMs,
        webhookHealth7d: webhookHealth,
        teamMembers: members.map((member) => ({
          walletAddress: member.user.walletAddress,
          displayName: member.user.displayName,
          role: member.role,
        })),
        recentAlerts: notifications.map((notification) => ({
          title: notification.title,
          message: notification.message,
          createdAt: notification.createdAt.toISOString(),
        })),
      },
    };

    if (format === "markdown") {
      const markdown = [
        `# ${summary.project.name}`,
        "",
        `- Status: ${summary.project.status}`,
        `- Health score: ${summary.project.healthScore}`,
        `- Funding: ${summary.project.fundingSol}`,
        `- API keys: ${summary.project.apiKeyCount}`,
        `- Success rate (7d): ${summary.project.successRate7d ?? "Unavailable"}${summary.project.successRate7d !== null ? "%" : ""}`,
        `- Average latency (7d): ${summary.project.averageLatencyMs7d || "Unavailable"}${summary.project.averageLatencyMs7d ? "ms" : ""}`,
        `- Webhook health (7d): ${summary.project.webhookHealth7d ?? "Unavailable"}${summary.project.webhookHealth7d !== null ? "%" : ""}`,
        "",
        "## Team members",
        ...(summary.project.teamMembers.length > 0
          ? summary.project.teamMembers.map((member) => `- ${member.displayName} (${member.role}) · ${member.walletAddress}`)
          : ["- No team members yet."]),
        "",
        "## Recent alerts",
        ...(summary.project.recentAlerts.length > 0
          ? summary.project.recentAlerts.map((alert) => `- ${alert.title}: ${alert.message}`)
          : ["- No recent alerts."]),
      ].join("\n");
      reply.header("content-type", "text/markdown; charset=utf-8");
      return reply.send(markdown);
    }

    return reply.send(summary);
  });

  app.get("/v1/projects/:projectId/playground/recipes", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "Project not found.");
    }

    return { items: await input.repository.listPlaygroundRecipes(projectId) };
  });

  app.post("/v1/projects/:projectId/playground/recipes", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const body = z.object({
      name: z.string().trim().min(1).max(80),
      method: z.string().trim().min(1).max(120),
      mode: z.enum(["standard", "priority"]),
      simulationEnabled: z.boolean().default(false),
      params: z.record(z.string(), z.string()).default({}),
      notes: z.string().trim().max(2000).optional().nullable(),
      tags: z.array(z.string().trim().min(1).max(24)).max(6).optional(),
      pinned: z.boolean().optional(),
    }).parse(request.body);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "Project not found.");
    }

    const item = await input.repository.createPlaygroundRecipe({
      projectId,
      name: body.name,
      method: body.method,
      mode: body.mode,
      simulationEnabled: body.simulationEnabled,
      params: body.params,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
      pinned: body.pinned ?? false,
    });
    return reply.status(201).send({ item });
  });

  app.patch("/v1/projects/:projectId/playground/recipes/:recipeId", async (request) => {
    const user = requireUser(request);
    const { projectId, recipeId } = z.object({
      projectId: z.string().uuid(),
      recipeId: z.string().uuid(),
    }).parse(request.params);
    const body = z.object({
      name: z.string().trim().min(1).max(80).optional(),
      method: z.string().trim().min(1).max(120).optional(),
      mode: z.enum(["standard", "priority"]).optional(),
      simulationEnabled: z.boolean().optional(),
      params: z.record(z.string(), z.string()).optional(),
      notes: z.string().trim().max(2000).optional().nullable(),
      tags: z.array(z.string().trim().min(1).max(24)).max(6).optional(),
      pinned: z.boolean().optional(),
      share: z.boolean().optional(),
      touchLastUsedAt: z.boolean().optional(),
    }).parse(request.body);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "Project not found.");
    }

    const item = await input.repository.updatePlaygroundRecipe(recipeId, projectId, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.method !== undefined ? { method: body.method } : {}),
      ...(body.mode !== undefined ? { mode: body.mode } : {}),
      ...(body.simulationEnabled !== undefined ? { simulationEnabled: body.simulationEnabled } : {}),
      ...(body.params !== undefined ? { params: body.params } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.pinned !== undefined ? { pinned: body.pinned } : {}),
      ...(body.share !== undefined ? { sharedToken: body.share ? randomBytes(12).toString("base64url") : null } : {}),
      ...(body.touchLastUsedAt ? { touchLastUsedAt: true } : {}),
    });
    if (!item) {
      throw new HttpError(404, "recipe_not_found", "Recipe not found.");
    }
    return { item };
  });

  app.get("/v1/playground/recipes/shared/:sharedToken", async (request) => {
    const user = requireUser(request);
    const { sharedToken } = z.object({ sharedToken: z.string().min(1) }).parse(request.params);
    const recipe = await input.repository.getPlaygroundRecipeBySharedToken(sharedToken);
    if (!recipe) {
      throw new HttpError(404, "recipe_not_found", "Shared recipe not found.");
    }
    const project = await input.repository.findProjectById(recipe.projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(403, "forbidden", "You do not have access to this shared recipe.");
    }
    return { item: recipe };
  });

  app.delete("/v1/projects/:projectId/playground/recipes/:recipeId", async (request, reply) => {
    const user = requireUser(request);
    const { projectId, recipeId } = z.object({
      projectId: z.string().uuid(),
      recipeId: z.string().uuid(),
    }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || !canAccessProject(user, project)) {
      throw new HttpError(404, "project_not_found", "Project not found.");
    }

    await input.repository.deletePlaygroundRecipe(recipeId, projectId);
    return reply.status(204).send();
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
    await enforceRedisWindowLimit({
      request,
      key: `rate-limit:status-subscribe:${email.trim().toLowerCase()}`,
      max: 3,
      windowMs: 24 * 60 * 60 * 1000,
      message: "Status subscriptions are limited to 3 attempts per email address per 24 hours."
    });
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
  app.addHook("onClose", async () => {
    clearInterval(retryWorker);
    if (rateLimitRedis) {
      await rateLimitRedis.quit().catch(() => undefined);
    }
  });

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

  app.get("/v1/operators/my-registration", async (request) => {
    const user = requireUser(request);
    const items = await input.repository.listOperatorRegistrationsByWallet(user.walletAddress);
    return { items: serializeForJson(items) };
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

  app.get("/v1/projects/:projectId/requests/first", async (request) => {
    const user = requireUser(request);
    const { projectId } = z.object({
      projectId: z.string().uuid()
    }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project) throw new HttpError(404, "not_found", "Project not found.");
    if (!canAccessProject(user, project)) throw new HttpError(403, "forbidden", "Access denied.");
    return { item: await input.repository.getFirstSuccessfulProjectRequest(projectId) };
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
    await enforceRedisWindowLimit({
      request,
      key: `rate-limit:newsletter:${body.email.trim().toLowerCase()}`,
      max: 3,
      windowMs: 24 * 60 * 60 * 1000,
      message: "Newsletter subscriptions are limited to 3 attempts per email address per 24 hours."
    });
    await input.repository.subscribeNewsletter({ email: body.email, source: "landing" });
    return reply.status(200).send({ success: true });
  });

  // ── Leaderboard (public) ──────────────────────────────────────────────────
  app.get("/v1/leaderboard", async () => {
    return { entries: await input.repository.getLeaderboard() };
  });

  app.get("/v1/explore", async (request) => {
    const db = requirePrisma();
    const query = z.object({
      templateType: z.string().trim().min(1).max(32).optional(),
      tag: z.string().trim().min(1).max(32).optional(),
      leaderboardVisible: z.coerce.boolean().optional(),
      recentTraffic: z.coerce.boolean().optional(),
      recentlyCreated: z.coerce.boolean().optional(),
    }).parse(request.query);
    const recentTrafficSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCreationSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const projects = await db.project.findMany({
      where: {
        isPublic: true,
        publicSlug: { not: null },
        archivedAt: null,
        ...(query.templateType ? { templateType: query.templateType } : {}),
        ...(query.tag ? { tags: { has: query.tag } } : {}),
        ...(typeof query.leaderboardVisible === "boolean" ? { leaderboardVisible: query.leaderboardVisible } : {}),
        ...(query.recentlyCreated ? { createdAt: { gte: recentCreationSince } } : {}),
        ...(query.recentTraffic ? { requestLogs: { some: { createdAt: { gte: recentTrafficSince } } } } : {}),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        publicSlug: true,
        templateType: true,
        tags: true,
        leaderboardVisible: true,
        createdAt: true,
        owner: { select: { reputationLevel: true } },
        requestLogs: {
          where: { createdAt: { gte: recentTrafficSince } },
          select: { durationMs: true, statusCode: true },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    });

    return {
      items: projects.map((project) => {
        const requestCount = project.requestLogs.length;
        const avgLatencyMs = requestCount > 0
          ? Math.round(project.requestLogs.reduce((sum, row) => sum + row.durationMs, 0) / requestCount)
          : 0;
        const successRate = requestCount > 0
          ? project.requestLogs.filter((row) => row.statusCode < 400).length / requestCount
          : 0;
        return {
          id: project.id,
          projectName: project.displayName ?? project.name,
          publicSlug: project.publicSlug,
          templateType: project.templateType ?? "blank",
          tags: project.tags,
          leaderboardVisible: project.leaderboardVisible,
          requestVolume7d: requestCount,
          averageLatencyMs7d: avgLatencyMs,
          successRate7d: successRate,
          healthSummary: requestCount === 0 ? "No recent traffic" : successRate >= 0.98 ? "Healthy" : successRate >= 0.9 ? "Needs attention" : "High error pressure",
          reputationBadge: project.owner.reputationLevel,
          createdAt: project.createdAt.toISOString(),
        };
      }),
    };
  });

  // ── Email verification prep ───────────────────────────────────────────────
  app.post("/v1/me/verify-email/request", async (request, reply) => {
    const user = requireUser(request);
    if (!user.email) {
      return reply.status(400).send({
        error: "email_missing",
        message: "Add an email address in settings before requesting verification.",
      });
    }
    if (user.emailVerified) {
      return reply.status(200).send({
        requested: false,
        alreadyVerified: true,
        message: "This email address is already verified.",
      });
    }
    if (!isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM })) {
      return reply.status(503).send({
        error: "email_delivery_not_enabled",
        message: "Email delivery is not configured in this environment.",
      });
    }

    const token = randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await input.repository.setEmailVerificationToken(user.id, token, expiry);

    const message = buildEmailVerificationMessage({
      origin: input.env.WEB_ORIGIN,
      walletAddress: user.walletAddress,
      token,
    });
    await deliverEmail({
      to: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return reply.status(202).send({
      requested: true,
      expiresAt: expiry.toISOString(),
      message: "Verification email sent.",
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

  app.get("/v1/me/email-delivery-status", async (request) => {
    const user = requireUser(request);
    const configured = isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM });
    return {
      item: await input.repository.getEmailDeliveryStatus(user.id, configured),
    };
  });

  app.post("/v1/me/email-delivery/test", async (request, reply) => {
    const user = requireUser(request);
    const configured = isEmailDeliveryEnabled({ apiKey: input.env.RESEND_API_KEY, from: input.env.EMAIL_FROM });
    const deliveryStatus = await input.repository.getEmailDeliveryStatus(user.id, configured);
    if (!deliveryStatus.email) {
      return reply.status(400).send({
        error: "email_missing",
        message: "Add an email address before sending a test email.",
      });
    }
    if (!deliveryStatus.emailVerified) {
      return reply.status(403).send({
        error: "email_not_verified",
        message: "Verify this email address before sending a delivery test.",
      });
    }
    if (!configured) {
      return reply.status(503).send({
        error: "email_delivery_not_enabled",
        message: "Email delivery is not configured in this environment.",
      });
    }

    const message = buildEmailDeliveryTestMessage({
      walletAddress: user.walletAddress,
      timestamp: new Date().toISOString(),
    });

    await deliverEmail({
      to: deliveryStatus.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return reply.status(202).send({
      sent: true,
      recipient: deliveryStatus.email,
      message: "Test email sent.",
    });
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

  // ── Invite links ──────────────────────────────────────────────────────────
  app.get("/v1/projects/:projectId/invite-link", async (request, reply) => {
    const user = requireUser(request);
    const { projectId } = z.object({ projectId: z.string().uuid() }).parse(request.params);
    const project = await input.repository.findProjectById(projectId);
    if (!project || project.ownerId !== user.id) throw new HttpError(403, "forbidden", "Only the project owner can generate invite links.");
    const result = await input.repository.generateInviteLink(projectId, user.id);
    return reply.status(201).send({ inviteUrl: `https://www.fyxvo.com/invite/${result.token}`, expiresAt: result.expiresAt });
  });

  app.get("/v1/invite/:token", async (request) => {
    const { token } = z.object({ token: z.string().min(1) }).parse(request.params);
    const invite = await input.repository.lookupInviteToken(token);
    if (!invite) throw new HttpError(404, "not_found", "Invite link is invalid or has expired.");
    return invite;
  });

  app.post("/v1/invite/:token/accept", async (request) => {
    const user = requireUser(request);
    const { token } = z.object({ token: z.string().min(1) }).parse(request.params);
    await input.repository.acceptInviteToken(token, user.id);
    return { accepted: true };
  });

  app.post("/v1/invite/:token/decline", async (request) => {
    const user = requireUser(request);
    const { token } = z.object({ token: z.string().min(1) }).parse(request.params);
    await input.repository.declineInviteToken(token, user.id);
    return { declined: true };
  });

  // ── Digest schedule ───────────────────────────────────────────────────────
  app.post("/v1/me/digest", async (request, reply) => {
    const user = requireUser(request);
    await input.repository.upsertDigestSchedule(user.id);
    return reply.status(201).send({ enrolled: true });
  });

  app.delete("/v1/me/digest", async (request) => {
    const user = requireUser(request);
    await input.repository.deleteDigestSchedule(user.id);
    return { removed: true };
  });

  // ── Admin gateway upstreams ───────────────────────────────────────────────
  app.get("/v1/admin/gateway/upstreams", async (request) => {
    const user = requireUser(request);
    if (user.role !== "ADMIN") throw new HttpError(403, "forbidden", "Admin only.");
    const gatewayBase = process.env.GATEWAY_BASE_URL ?? "https://rpc.fyxvo.com";
    try {
      const res = await fetch(`${gatewayBase}/health`);
      const data = await res.json() as { upstreamCircuits?: unknown[]; upstreams?: unknown[] };
      return { upstreams: data.upstreamCircuits ?? data.upstreams ?? [], source: gatewayBase };
    } catch {
      return { upstreams: [], source: gatewayBase, error: "Could not reach gateway health endpoint." };
    }
  });

  // ── Admin digest preview ──────────────────────────────────────────────────
  // GET /v1/admin/digest/preview/:userId — admin only, returns latest digest HTML for a user
  app.get("/v1/admin/digest/preview/:userId", async (request) => {
    const user = requireUser(request);
    requireAdmin(user);
    const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
    const record = await input.repository.getLatestDigestRecord(userId);
    if (!record) {
      throw new HttpError(404, "digest_not_found", "No digest record found for this user.");
    }
    return { html: record.htmlContent, generatedAt: record.generatedAt };
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
    expectedUpgradeAuthorityHint: process.env.FYXVO_UPGRADE_AUTHORITY_HINT ?? null,
    usdcMintAddress: input.env.USDC_MINT_ADDRESS,
    programId: input.env.FYXVO_PROGRAM_ID
  });

  return buildApiApp({
    env: input.env,
    repository: new PrismaApiRepository(input.prisma),
    blockchain,
    prisma: input.prisma,
    healthcheck: () => databaseHealthcheck(input.prisma),
    logger: true
  });
}
