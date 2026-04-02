import type { GatewayEnv } from "@fyxvo/config";
import type { ApiKey, Node } from "@fyxvo/database";

export type RoutingMode = "standard" | "priority";

export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: unknown;
  readonly id?: unknown;
}

export type JsonRpcPayload = JsonRpcRequest | readonly JsonRpcRequest[];

export interface ProjectAccessContext {
  readonly apiKey: {
    readonly id: string;
    readonly projectId: string;
    readonly label: string;
    readonly prefix: string;
    readonly scopes: readonly string[];
    readonly status: ApiKey["status"];
    readonly expiresAt: Date | null;
  };
  readonly project: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly ownerId: string;
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly onChainProjectPda: string;
    readonly relayPaused: boolean;
    readonly dailyBudgetLamports: bigint | null;
    readonly monthlyBudgetLamports: bigint | null;
    readonly budgetWarningThresholdPct: number | null;
    readonly budgetHardStop: boolean;
  };
}

export interface GatewayProjectSubscription {
  readonly id: string;
  readonly projectId: string;
  readonly plan: string;
  readonly status: string;
  readonly priceUsdc: bigint;
  readonly requestsIncluded: bigint;
  readonly priorityRequestsIncluded: bigint;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelledAt: Date | null;
}

export interface GatewayProjectSubscriptionUsage {
  readonly standardRequestsUsed: number;
  readonly priorityRequestsUsed: number;
}

export interface RoutedRpcNode {
  readonly id: string;
  readonly projectId: string | null;
  readonly name: string;
  readonly endpoint: string;
  readonly region: string;
  readonly status: Node["status"];
  readonly lastHeartbeatAt: Date | null;
  readonly operatorName: string;
}

export interface ProjectFundingState {
  readonly availableSolCredits: bigint;
  readonly availableUsdcCredits: bigint;
  readonly totalSolFunded: bigint;
  readonly totalUsdcFunded: bigint;
  readonly projectPda: string;
}

export interface ProjectSpendState {
  readonly sol: bigint;
  readonly usdc: bigint;
}

export interface PricingDecision {
  readonly methods: readonly string[];
  readonly requestCount: number;
  readonly basePrice: bigint;
  readonly totalPrice: bigint;
}

export interface FundingDecision {
  readonly asset: "SOL" | "USDC";
  readonly remainingCredits: bigint;
}

export interface GatewayRequestMetric {
  readonly mode: RoutingMode;
  readonly projectId: string;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly upstreamFailure: boolean;
}

export interface GatewayModeMetrics {
  readonly requests: number;
  readonly successes: number;
  readonly errors: number;
  readonly upstreamFailures: number;
  readonly totalLatencyMs: number;
  readonly averageLatencyMs: number;
  readonly successRate: number;
}

export interface GatewayMetricsSnapshot {
  readonly standard: GatewayModeMetrics;
  readonly priority: GatewayModeMetrics;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
  readonly limit: number;
}

export interface GatewayStateStore {
  acquireRateLimit(input: {
    readonly subject: string;
    readonly mode: RoutingMode;
    readonly limit: number;
    readonly windowMs: number;
  }): Promise<RateLimitDecision>;
  getProjectSpend(projectId: string): Promise<ProjectSpendState>;
  incrementProjectSpend(projectId: string, asset: "SOL" | "USDC", amount: bigint): Promise<ProjectSpendState>;
  recordMetric(input: GatewayRequestMetric): Promise<void>;
  getMetricsSnapshot(): Promise<GatewayMetricsSnapshot>;
  getCached(key: string): Promise<string | null>;
  setCached(key: string, value: string, ttlMs: number): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export interface GatewayRepository {
  findProjectAccessByApiKey(apiKey: string): Promise<ProjectAccessContext | null>;
  getProjectSubscription(projectId: string): Promise<GatewayProjectSubscription | null>;
  getProjectSubscriptionUsage(projectId: string, periodStart: Date, periodEnd: Date): Promise<GatewayProjectSubscriptionUsage>;
  getProjectBudgetUsage(projectId: string): Promise<{ readonly dailyLamports: bigint; readonly monthlyLamports: bigint }>;
  listUpstreamNodes(projectId?: string): Promise<RoutedRpcNode[]>;
  touchApiKeyUsage(apiKeyId: string): Promise<void>;
  recordRequestLog(input: {
    readonly requestId?: string;
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly apiKeyId?: string;
    readonly projectId?: string;
    readonly ipAddress?: string;
    readonly userAgent?: string;
    readonly region?: string;
    readonly requestSize?: number;
    readonly responseSize?: number;
    readonly upstreamNode?: string;
    readonly mode?: RoutingMode;
    readonly simulated?: boolean;
    readonly cacheHit?: boolean;
    readonly fyxvoHint?: unknown;
  }): Promise<void>;
  ping(): Promise<boolean>;
}

export interface ProjectBalanceResolver {
  getProjectFundingState(project: ProjectAccessContext["project"]): Promise<ProjectFundingState>;
}

export interface RoutedUpstreamResponse {
  readonly node: RoutedRpcNode;
  readonly statusCode: number;
  readonly body: unknown;
  readonly rawBody: string;
  readonly hasJsonRpcError: boolean;
}

export interface UpstreamRouter {
  route(input: {
    readonly mode: RoutingMode;
    readonly payload: JsonRpcPayload;
    readonly serializedBody: string;
    readonly nodes: readonly RoutedRpcNode[];
    readonly timeoutMs: number;
  }): Promise<RoutedUpstreamResponse>;
  ping(nodes: readonly RoutedRpcNode[], timeoutMs: number): Promise<boolean>;
}

export interface GatewayAppDependencies {
  readonly env: GatewayEnv;
  readonly repository: GatewayRepository;
  readonly stateStore: GatewayStateStore;
  readonly balanceResolver: ProjectBalanceResolver;
  readonly router: UpstreamRouter;
  readonly logger?: boolean;
}
