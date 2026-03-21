import { createClient, type RedisClientType } from "redis";
import type {
  GatewayMetricsSnapshot,
  GatewayModeMetrics,
  GatewayRequestMetric,
  GatewayStateStore,
  ProjectSpendState,
  RateLimitDecision,
  RoutingMode
} from "./types.js";

function emptyModeMetrics(): GatewayModeMetrics {
  return {
    requests: 0,
    successes: 0,
    errors: 0,
    upstreamFailures: 0,
    totalLatencyMs: 0,
    averageLatencyMs: 0,
    successRate: 0
  };
}

function parseModeMetrics(source: Record<string, string>): GatewayModeMetrics {
  const requests = Number(source.requests ?? 0);
  const successes = Number(source.successes ?? 0);
  const errors = Number(source.errors ?? 0);
  const upstreamFailures = Number(source.upstreamFailures ?? 0);
  const totalLatencyMs = Number(source.totalLatencyMs ?? 0);

  return {
    requests,
    successes,
    errors,
    upstreamFailures,
    totalLatencyMs,
    averageLatencyMs: requests === 0 ? 0 : Math.round(totalLatencyMs / requests),
    successRate: requests === 0 ? 0 : Number((successes / requests).toFixed(4))
  };
}

abstract class BaseGatewayStateStore implements GatewayStateStore {
  abstract acquireRateLimit(input: {
    readonly subject: string;
    readonly mode: RoutingMode;
    readonly limit: number;
    readonly windowMs: number;
  }): Promise<RateLimitDecision>;

  abstract getProjectSpend(projectId: string): Promise<ProjectSpendState>;

  abstract incrementProjectSpend(
    projectId: string,
    asset: "SOL" | "USDC",
    amount: bigint
  ): Promise<ProjectSpendState>;

  abstract recordMetric(input: GatewayRequestMetric): Promise<void>;

  abstract getMetricsSnapshot(): Promise<GatewayMetricsSnapshot>;

  abstract ping(): Promise<boolean>;

  abstract close(): Promise<void>;

  // Default no-op cache (overridden by Redis implementation)
  async getCached(_key: string): Promise<string | null> { return null; }
  async setCached(_key: string, _value: string, _ttlMs: number): Promise<void> { /* no-op */ }
}

export class InMemoryGatewayStateStore extends BaseGatewayStateStore {
  private readonly rateLimits = new Map<string, number>();
  private readonly projectSpend = new Map<string, ProjectSpendState>();
  private readonly metrics = new Map<RoutingMode, GatewayModeMetrics>([
    ["standard", emptyModeMetrics()],
    ["priority", emptyModeMetrics()]
  ]);

  async acquireRateLimit(input: {
    readonly subject: string;
    readonly mode: RoutingMode;
    readonly limit: number;
    readonly windowMs: number;
  }): Promise<RateLimitDecision> {
    const bucket = Math.floor(Date.now() / input.windowMs);
    const key = `${input.mode}:${input.subject}:${bucket}`;
    const currentCount = (this.rateLimits.get(key) ?? 0) + 1;
    this.rateLimits.set(key, currentCount);

    return {
      allowed: currentCount <= input.limit,
      remaining: Math.max(0, input.limit - currentCount),
      resetAt: (bucket + 1) * input.windowMs,
      limit: input.limit
    };
  }

  async getProjectSpend(projectId: string): Promise<ProjectSpendState> {
    return this.projectSpend.get(projectId) ?? { sol: 0n, usdc: 0n };
  }

  async incrementProjectSpend(projectId: string, asset: "SOL" | "USDC", amount: bigint) {
    const current = await this.getProjectSpend(projectId);
    const next = {
      sol: asset === "SOL" ? current.sol + amount : current.sol,
      usdc: asset === "USDC" ? current.usdc + amount : current.usdc
    };
    this.projectSpend.set(projectId, next);
    return next;
  }

  async recordMetric(input: GatewayRequestMetric) {
    const current = this.metrics.get(input.mode) ?? emptyModeMetrics();
    const next: GatewayModeMetrics = {
      requests: current.requests + 1,
      successes: current.successes + (input.success ? 1 : 0),
      errors: current.errors + (input.success ? 0 : 1),
      upstreamFailures: current.upstreamFailures + (input.upstreamFailure ? 1 : 0),
      totalLatencyMs: current.totalLatencyMs + input.latencyMs,
      averageLatencyMs: 0,
      successRate: 0
    };
    this.metrics.set(input.mode, parseModeMetrics({
      requests: String(next.requests),
      successes: String(next.successes),
      errors: String(next.errors),
      upstreamFailures: String(next.upstreamFailures),
      totalLatencyMs: String(next.totalLatencyMs)
    }));
  }

  async getMetricsSnapshot(): Promise<GatewayMetricsSnapshot> {
    return {
      standard: this.metrics.get("standard") ?? emptyModeMetrics(),
      priority: this.metrics.get("priority") ?? emptyModeMetrics()
    };
  }

  async getCached(_key: string): Promise<string | null> {
    return null;
  }

  async setCached(_key: string, _value: string, _ttlMs: number): Promise<void> {}

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {}
}

export class RedisGatewayStateStore extends BaseGatewayStateStore {
  private readonly client: RedisClientType;
  private readonly prefix: string;
  private readyPromise: Promise<void> | null = null;

  constructor(input: { readonly url: string; readonly prefix: string; readonly client?: RedisClientType }) {
    super();
    this.client = input.client ?? createClient({ url: input.url });
    this.prefix = input.prefix.replace(/:$/, "");
  }

  private async ready() {
    if (this.client.isOpen) {
      return;
    }

    this.readyPromise ??= this.client.connect().then(() => {});
    await this.readyPromise;
  }

  private rateLimitKey(subject: string, mode: RoutingMode, windowMs: number): {
    readonly key: string;
    readonly resetAt: number;
  } {
    const bucket = Math.floor(Date.now() / windowMs);
    return {
      key: `${this.prefix}:ratelimit:${mode}:${subject}:${bucket}`,
      resetAt: (bucket + 1) * windowMs
    };
  }

  private spendKey(projectId: string): string {
    return `${this.prefix}:spend:${projectId}`;
  }

  private metricsKey(mode: RoutingMode): string {
    return `${this.prefix}:metrics:${mode}`;
  }

  async acquireRateLimit(input: {
    readonly subject: string;
    readonly mode: RoutingMode;
    readonly limit: number;
    readonly windowMs: number;
  }): Promise<RateLimitDecision> {
    await this.ready();
    const { key, resetAt } = this.rateLimitKey(input.subject, input.mode, input.windowMs);
    const count = await this.client.incr(key);

    if (count === 1) {
      await this.client.pExpire(key, input.windowMs);
    }

    return {
      allowed: count <= input.limit,
      remaining: Math.max(0, input.limit - count),
      resetAt,
      limit: input.limit
    };
  }

  async getProjectSpend(projectId: string): Promise<ProjectSpendState> {
    await this.ready();
    const spend = await this.client.hGetAll(this.spendKey(projectId));
    return {
      sol: BigInt(spend.sol ?? "0"),
      usdc: BigInt(spend.usdc ?? "0")
    };
  }

  async incrementProjectSpend(projectId: string, asset: "SOL" | "USDC", amount: bigint) {
    await this.ready();
    await this.client.hIncrBy(this.spendKey(projectId), asset === "SOL" ? "sol" : "usdc", Number(amount));
    return this.getProjectSpend(projectId);
  }

  async recordMetric(input: GatewayRequestMetric) {
    await this.ready();
    const metricsKey = this.metricsKey(input.mode);
    const updates = this.client.multi();
    updates.hIncrBy(metricsKey, "requests", 1);
    updates.hIncrBy(metricsKey, "successes", input.success ? 1 : 0);
    updates.hIncrBy(metricsKey, "errors", input.success ? 0 : 1);
    updates.hIncrBy(metricsKey, "upstreamFailures", input.upstreamFailure ? 1 : 0);
    updates.hIncrBy(metricsKey, "totalLatencyMs", input.latencyMs);
    updates.hSet(metricsKey, "updatedAt", new Date().toISOString());
    await updates.exec();
  }

  async getMetricsSnapshot(): Promise<GatewayMetricsSnapshot> {
    await this.ready();
    const [standard, priority] = await Promise.all([
      this.client.hGetAll(this.metricsKey("standard")),
      this.client.hGetAll(this.metricsKey("priority"))
    ]);

    return {
      standard: parseModeMetrics(standard),
      priority: parseModeMetrics(priority)
    };
  }

  async getCached(key: string): Promise<string | null> {
    await this.ready();
    return this.client.get(key);
  }

  async setCached(key: string, value: string, ttlMs: number): Promise<void> {
    await this.ready();
    await this.client.set(key, value, { PX: ttlMs });
  }

  async ping(): Promise<boolean> {
    await this.ready();
    return (await this.client.ping()) === "PONG";
  }

  async close(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}
