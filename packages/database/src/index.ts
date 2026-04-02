import {
  ApiKeyStatus,
  FeedbackCategory,
  NodeNetwork,
  NodeOperatorStatus,
  NodeStatus,
  Prisma,
  PrismaClient,
  FeedbackSubmissionStatus,
  UserRole,
  UserStatus
} from "@prisma/client";
import type { Prisma as PrismaTypes, PrismaClient as PrismaClientType } from "@prisma/client";
import { z } from "zod";

export {
  ApiKeyStatus,
  FeedbackCategory,
  FeedbackSubmissionStatus,
  NodeNetwork,
  NodeOperatorStatus,
  NodeStatus,
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus
};
export type {
  ApiKey,
  FeedbackSubmission,
  FundingCoordinate,
  ErrorEntry,
  IdempotencyRecord,
  InterestSubmission,
  Metrics,
  Node,
  NodeHealthCheck,
  NodeOperator,
  OperatorRegistration,
  OperatorRewardSnapshot,
  Project,
  Prisma as PrismaNamespace,
  ProjectUsageRollup,
  PrismaClient as PrismaClientType,
  RequestLog,
  Subscription,
  TransactionLookup,
  User,
  WalletActivity,
  WalletTokenBalance,
  WorkerCursor
} from "@prisma/client";

export const databaseEnvSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_LOG_QUERIES: z
    .union([z.literal("true"), z.literal("false")])
    .default("false")
    .transform((value) => value === "true")
});

export type DatabaseEnv = z.output<typeof databaseEnvSchema>;

export function loadDatabaseEnv(
  source: Record<string, string | undefined> = process.env
): DatabaseEnv {
  return databaseEnvSchema.parse(source);
}

export function createPrismaClient(
  options: PrismaTypes.PrismaClientOptions = {},
  source: Record<string, string | undefined> = process.env
): PrismaClientType {
  const env = loadDatabaseEnv(source);

  return new PrismaClient({
    log: env.DATABASE_LOG_QUERIES ? ["query", "info", "warn", "error"] : ["warn", "error"],
    ...options
  });
}

const globalForPrisma = globalThis as {
  __fyxvoPrisma?: PrismaClientType;
};

export const prisma =
  globalForPrisma.__fyxvoPrisma ??
  createPrismaClient({}, {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/fyxvo"
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__fyxvoPrisma = prisma;
}

export async function databaseHealthcheck(client: PrismaClientType = prisma): Promise<boolean> {
  await client.$queryRaw`SELECT 1`;
  return true;
}

export async function disconnectDatabase(client: PrismaClientType = prisma): Promise<void> {
  await client.$disconnect();
}
