import { Connection } from "@solana/web3.js";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { loadWorkerEnv, type WorkerEnv } from "@fyxvo/config";
import { prisma, type PrismaClientType } from "@fyxvo/database";
import { processMetricsAggregation } from "./jobs/metrics.js";
import { processNodeHealthMonitoring } from "./jobs/node-health.js";
import { processRewardCalculation } from "./jobs/rewards.js";
import { processWalletIndexing } from "./jobs/indexing.js";
import { processServiceHealthCheck } from "./jobs/service-health.js";
import { updateReputations, checkErrorRates, checkBudgetThresholds, generateWeeklyDigests } from "./jobs/maintenance.js";
import { PrismaWorkerRepository } from "./repository.js";
import { JsonRpcNodeProbeClient, RpcSolanaIndexerClient } from "./solana.js";
import type {
  WorkerJobName,
  WorkerLogger,
  WorkerProcessorDependencies,
  WorkerRuntime
} from "./types.js";
import { workerJobNames } from "./types.js";

function safeContext(context: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(context, (_key, candidate) =>
      typeof candidate === "bigint" ? candidate.toString() : candidate
    )
  ) as Record<string, unknown>;
}

export function createWorkerLogger(service: string): WorkerLogger {
  function write(level: string, context: Record<string, unknown>, message: string) {
    const payload = {
      level,
      service,
      message,
      timestamp: new Date().toISOString(),
      ...safeContext(context)
    };

    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
      return;
    }

    console.log(line);
  }

  return {
    info(context, message) {
      write("info", context, message);
    },
    warn(context, message) {
      write("warn", context, message);
    },
    error(context, message) {
      write("error", context, message);
    },
    debug(context, message) {
      write("debug", context, message);
    }
  };
}

function createRedisConnectionOptions(url: string): ConnectionOptions {
  return {
    url,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };
}

async function runJob(
  jobName: WorkerJobName,
  dependencies: WorkerProcessorDependencies
) {
  switch (jobName) {
    case workerJobNames.metricsAggregation:
      return processMetricsAggregation(dependencies);
    case workerJobNames.walletIndexing:
      return processWalletIndexing(dependencies);
    case workerJobNames.nodeHealthMonitoring:
      return processNodeHealthMonitoring(dependencies);
    case workerJobNames.rewardCalculation:
      return processRewardCalculation(dependencies);
    case workerJobNames.serviceHealthCheck:
      return processServiceHealthCheck(dependencies);
  }
}

export class BullMqWorkerRuntime implements WorkerRuntime {
  private readonly queueName: string;
  private readonly connection: ConnectionOptions;
  private readonly queue: Queue;
  private readonly worker: Worker;
  private interval: NodeJS.Timeout | null = null;
  private reputationInterval: NodeJS.Timeout | null = null;
  private errorRateInterval: NodeJS.Timeout | null = null;
  private budgetInterval: NodeJS.Timeout | null = null;
  private digestInterval: NodeJS.Timeout | null = null;

  constructor(private readonly dependencies: WorkerProcessorDependencies) {
    this.queueName = `${dependencies.env.WORKER_NAME}-jobs`;
    this.connection = createRedisConnectionOptions(dependencies.env.REDIS_URL);
    this.queue = new Queue(this.queueName, {
      connection: this.connection,
      prefix: dependencies.env.WORKER_REDIS_PREFIX
    });
    this.worker = new Worker(
      this.queueName,
      async (job) => runJob(job.name as WorkerJobName, this.dependencies),
      {
        connection: this.connection,
        prefix: dependencies.env.WORKER_REDIS_PREFIX,
        concurrency: dependencies.env.WORKER_CONCURRENCY
      }
    );

    this.worker.on("completed", (job, result) => {
      this.dependencies.logger.info(
        {
          event: "worker.job.completed",
          jobId: job.id ?? null,
          jobName: job.name,
          result
        },
        "Worker job completed"
      );
    });

    this.worker.on("failed", (job, error) => {
      this.dependencies.logger.error(
        {
          event: "worker.job.failed",
          jobId: job?.id ?? null,
          jobName: job?.name ?? null,
          error: error.message
        },
        "Worker job failed"
      );
    });
  }

  private async enqueueRecurringJobs(): Promise<void> {
    for (const jobName of Object.values(workerJobNames)) {
      await this.queue.add(jobName, {}, {
        jobId: `${jobName}-singleton`,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2_000
        },
        removeOnComplete: {
          count: 50
        },
        removeOnFail: true
      });
    }
  }

  async start(): Promise<void> {
    await this.enqueueRecurringJobs();
    this.interval = setInterval(() => {
      void this.enqueueRecurringJobs().catch((error: unknown) => {
        this.dependencies.logger.error(
          {
            event: "worker.runtime.enqueue_failed",
            error: error instanceof Error ? error.message : "Unknown enqueue failure"
          },
          "Failed to enqueue recurring worker jobs"
        );
      });
    }, this.dependencies.env.WORKER_INTERVAL_MS);

    const prismaClient = this.dependencies.repository.prisma;
    const logger = this.dependencies.logger;

    if (prismaClient) {
      // Reputation updates — every hour
      void updateReputations(prismaClient, logger);
      this.reputationInterval = setInterval(() => {
        void updateReputations(prismaClient, logger);
      }, 3_600_000);

      // Error rate checks — every 5 minutes
      void checkErrorRates(prismaClient, logger, this.dependencies.env.ERROR_RATE_ALERT_THRESHOLD);
      this.errorRateInterval = setInterval(() => {
        void checkErrorRates(prismaClient, logger, this.dependencies.env.ERROR_RATE_ALERT_THRESHOLD);
      }, 300_000);

      // Budget threshold checks — every 5 minutes
      void checkBudgetThresholds(prismaClient, logger);
      this.budgetInterval = setInterval(() => {
        void checkBudgetThresholds(prismaClient, logger);
      }, 300_000);

      // Weekly digest generation — run once on startup, then weekly
      void generateWeeklyDigests(prismaClient, this.dependencies.env, logger);
      this.digestInterval = setInterval(() => {
        void generateWeeklyDigests(prismaClient, this.dependencies.env, logger);
      }, 7 * 24 * 3_600_000);
    }

    this.dependencies.logger.info(
      {
        event: "worker.runtime.started",
        queueName: this.queueName,
        redisPrefix: this.dependencies.env.WORKER_REDIS_PREFIX,
        concurrency: this.dependencies.env.WORKER_CONCURRENCY
      },
      "Background worker runtime started"
    );
  }

  async close(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.reputationInterval) {
      clearInterval(this.reputationInterval);
      this.reputationInterval = null;
    }
    if (this.errorRateInterval) {
      clearInterval(this.errorRateInterval);
      this.errorRateInterval = null;
    }
    if (this.budgetInterval) {
      clearInterval(this.budgetInterval);
      this.budgetInterval = null;
    }
    if (this.digestInterval) {
      clearInterval(this.digestInterval);
      this.digestInterval = null;
    }

    await this.worker.close();
    await this.queue.close();

    this.dependencies.logger.info({ event: "worker.runtime.stopped" }, "Background worker runtime stopped");
  }
}

export function createWorkerDependencies(input: {
  readonly env: WorkerEnv;
  readonly prismaClient: PrismaClientType;
  readonly logger?: WorkerLogger;
}): WorkerProcessorDependencies {
  const networkConnection = new Connection(input.env.SOLANA_RPC_URL, "confirmed");

  return {
    env: input.env,
    repository: new PrismaWorkerRepository(input.prismaClient),
    logger: input.logger ?? createWorkerLogger(input.env.WORKER_NAME),
    indexer: new RpcSolanaIndexerClient(networkConnection),
    nodeProbe: new JsonRpcNodeProbeClient()
  };
}

export function buildProductionWorkerRuntime(input?: {
  readonly env?: WorkerEnv;
  readonly prismaClient?: PrismaClientType;
  readonly logger?: WorkerLogger;
}): WorkerRuntime {
  const env =
    input?.env ??
    loadWorkerEnv({
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/fyxvo",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379"
    });

  const dependencies = createWorkerDependencies({
    env,
    prismaClient: input?.prismaClient ?? prisma,
    ...(input?.logger ? { logger: input.logger } : {})
  });

  return new BullMqWorkerRuntime(dependencies);
}
