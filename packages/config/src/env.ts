import { z } from "zod";
import {
  APP_NAME,
  DEFAULT_DATABASE_URL,
  DEFAULT_LOG_LEVEL,
  DEFAULT_REDIS_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_STAGE,
  servicePorts,
  type RuntimeStage
} from "./constants.js";
import { FYXVO_DEVNET_ADMIN_AUTHORITY } from "./protocol.js";
import { solanaDevnetConfig } from "./solana.js";

const stageSchema = z.enum(["development", "test", "production"]).default(DEFAULT_STAGE);
const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default(
  DEFAULT_LOG_LEVEL
);
const booleanFlagSchema = z
  .union([z.literal("true"), z.literal("false")])
  .default("false")
  .transform((value) => value === "true");
const csvUrlListSchema = z
  .string()
  .default(solanaDevnetConfig.rpcUrl)
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  )
  .pipe(z.array(z.url()));

export const sharedEnvSchema = z.object({
  FYXVO_ENV: stageSchema,
  LOG_LEVEL: logLevelSchema,
  DATABASE_URL: z.url().default(DEFAULT_DATABASE_URL),
  REDIS_URL: z.url().default(DEFAULT_REDIS_URL),
  WEB_ORIGIN: z.url().default(`http://localhost:${servicePorts.web}`),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : []
    )
    .pipe(z.array(z.url())),
  SOLANA_CLUSTER: z.literal("devnet").default("devnet"),
  FYXVO_PROGRAM_ID: z.string().trim().min(32).default(solanaDevnetConfig.programIds.fyxvo),
  FYXVO_ADMIN_AUTHORITY: z.string().trim().min(32).default(FYXVO_DEVNET_ADMIN_AUTHORITY),
  FYXVO_PROTOCOL_FEE_BPS: z.coerce.number().int().min(0).max(2_000).default(500),
  FYXVO_ENABLE_USDC: booleanFlagSchema,
  SOLANA_RPC_URL: z.url().default(solanaDevnetConfig.rpcUrl),
  SOLANA_WS_URL: z.url().default(solanaDevnetConfig.websocketUrl),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(DEFAULT_REQUEST_TIMEOUT_MS)
});

export const apiEnvSchema = sharedEnvSchema.extend({
  API_HOST: z.string().trim().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(servicePorts.api),
  API_JWT_SECRET: z.string().min(32).default("fyxvo-development-session-secret-change-me"),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  USDC_MINT_ADDRESS: z
    .string()
    .trim()
    .min(32)
    .default(solanaDevnetConfig.usdcMintAddress),
  ANTHROPIC_API_KEY: z.string().optional()
});

export const gatewayEnvSchema = sharedEnvSchema.extend({
  GATEWAY_HOST: z.string().trim().min(1).default("0.0.0.0"),
  GATEWAY_PORT: z.coerce.number().int().positive().default(servicePorts.gateway),
  API_ORIGIN: z.url().default(`http://localhost:${servicePorts.api}`),
  GATEWAY_REDIS_PREFIX: z.string().trim().min(1).default("fyxvo:gateway"),
  GATEWAY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
  GATEWAY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  GATEWAY_PRIORITY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  GATEWAY_PRIORITY_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  GATEWAY_UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  GATEWAY_PRIORITY_TIMEOUT_MS: z.coerce.number().int().positive().default(2_500),
  GATEWAY_HEALTHCHECK_TIMEOUT_MS: z.coerce.number().int().positive().default(1_500),
  GATEWAY_STANDARD_PRICE_LAMPORTS: z.coerce.number().int().positive().default(1_000),
  GATEWAY_COMPUTE_HEAVY_PRICE_LAMPORTS: z.coerce.number().int().positive().default(3_000),
  GATEWAY_PRIORITY_PRICE_LAMPORTS: z.coerce.number().int().positive().default(5_000),
  GATEWAY_WRITE_METHOD_MULTIPLIER: z.coerce.number().int().positive().default(4),
  GATEWAY_MIN_AVAILABLE_LAMPORTS: z.coerce.number().int().nonnegative().default(10_000),
  GATEWAY_BALANCE_CACHE_MS: z.coerce.number().int().positive().default(3_000),
  GATEWAY_NODE_CACHE_MS: z.coerce.number().int().positive().default(5_000),
  GATEWAY_NODE_FAILURE_COOLDOWN_MS: z.coerce.number().int().positive().default(15_000),
  GATEWAY_UPSTREAM_RPC_URLS: csvUrlListSchema
});

export const workerEnvSchema = sharedEnvSchema.extend({
  WORKER_NAME: z.string().trim().min(1).default("fyxvo-worker"),
  WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(5_000),
  WORKER_REDIS_PREFIX: z.string().trim().min(1).default("fyxvo:worker"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  WORKER_REQUEST_LOG_BATCH_SIZE: z.coerce.number().int().positive().default(1_000),
  WORKER_SIGNATURE_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  WORKER_NODE_TIMEOUT_MS: z.coerce.number().int().positive().default(2_500),
  WORKER_REWARD_WINDOW_MINUTES: z.coerce.number().int().positive().default(60),
  WORKER_REWARD_LAMPORTS_PER_REQUEST: z.coerce.number().int().positive().default(250)
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().trim().min(1).default(APP_NAME),
  NEXT_PUBLIC_SITE_URL: z.url().default(`http://localhost:${servicePorts.web}`),
  NEXT_PUBLIC_STATUS_PAGE_URL: z.url().optional(),
  NEXT_PUBLIC_API_BASE_URL: z.url().default(`http://localhost:${servicePorts.api}`),
  NEXT_PUBLIC_GATEWAY_BASE_URL: z.url().default(`http://localhost:${servicePorts.gateway}`),
  NEXT_PUBLIC_SOLANA_CLUSTER: z.literal("devnet").default("devnet"),
  NEXT_PUBLIC_SOLANA_RPC_URL: z.url().default(solanaDevnetConfig.rpcUrl),
  NEXT_PUBLIC_ENABLE_USDC: booleanFlagSchema,
  NEXT_PUBLIC_ALLOW_INDEXING: booleanFlagSchema
});

export type SharedEnv = z.output<typeof sharedEnvSchema>;
export type ApiEnv = z.output<typeof apiEnvSchema>;
export type GatewayEnv = z.output<typeof gatewayEnvSchema>;
export type WorkerEnv = z.output<typeof workerEnvSchema>;
export type WebEnv = z.output<typeof webEnvSchema>;

export interface AppConfig<TEnv> {
  readonly appName: typeof APP_NAME;
  readonly stage: RuntimeStage;
  readonly env: TEnv;
}

export function createConfigLoader<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (source: Record<string, string | undefined> = process.env): z.output<TSchema> =>
    schema.parse(source);
}

export const loadSharedEnv = createConfigLoader(sharedEnvSchema);
export const loadApiEnv = createConfigLoader(apiEnvSchema);
export const loadGatewayEnv = createConfigLoader(gatewayEnvSchema);
export const loadWorkerEnv = createConfigLoader(workerEnvSchema);
export const loadWebEnv = createConfigLoader(webEnvSchema);

export function loadSharedConfig(
  source: Record<string, string | undefined> = process.env
): AppConfig<SharedEnv> {
  const env = loadSharedEnv(source);
  return {
    appName: APP_NAME,
    stage: env.FYXVO_ENV,
    env
  };
}

export function resolveRuntimeStage(value: string | undefined): RuntimeStage {
  return stageSchema.parse(value);
}

export function resolveAllowedCorsOrigins(input: {
  readonly WEB_ORIGIN: string;
  readonly CORS_ALLOWED_ORIGINS: readonly string[];
}) {
  return Array.from(new Set([input.WEB_ORIGIN, ...input.CORS_ALLOWED_ORIGINS]));
}

export function assertProductionEnv(
  source: Record<string, string | undefined>,
  serviceName: string,
  requiredKeys: readonly string[]
) {
  if (resolveRuntimeStage(source.FYXVO_ENV) !== "production") {
    return;
  }

  const missing = requiredKeys.filter((key) => {
    const value = source[key];
    return !value || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `${serviceName} startup failed because required production environment variables are missing: ${missing.join(
        ", "
      )}`
    );
  }
}

export function assertProductionSecret(
  source: Record<string, string | undefined>,
  input: {
    readonly serviceName: string;
    readonly key: string;
    readonly disallowedValues?: readonly string[];
    readonly minLength?: number;
  }
) {
  if (resolveRuntimeStage(source.FYXVO_ENV) !== "production") {
    return;
  }

  const value = source[input.key];
  if (!value || value.trim().length === 0) {
    throw new Error(
      `${input.serviceName} startup failed because ${input.key} is missing in production.`
    );
  }

  const trimmed = value.trim();
  if (input.minLength !== undefined && trimmed.length < input.minLength) {
    throw new Error(
      `${input.serviceName} startup failed because ${input.key} must be at least ${input.minLength} characters in production.`
    );
  }

  if (input.disallowedValues?.includes(trimmed)) {
    throw new Error(
      `${input.serviceName} startup failed because ${input.key} is using a development placeholder in production.`
    );
  }
}
