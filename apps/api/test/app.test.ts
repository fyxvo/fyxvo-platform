import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  anchorAccountDiscriminator,
  fyxvoProgramSeeds,
  getSolanaNetworkConfig,
  loadApiEnv
} from "@fyxvo/config";
import {
  ApiKeyStatus,
  type FeedbackSubmission,
  type InterestSubmission,
  NodeNetwork,
  NodeOperatorStatus,
  NodeStatus,
  UserRole,
  UserStatus,
  type ApiKey,
  type FundingCoordinate,
  type IdempotencyRecord,
  type Metrics,
  type Node,
  type NodeOperator,
  type Project,
  type RequestLog,
  type User
} from "@fyxvo/database";
import bs58 from "bs58";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";
import { buildApiApp } from "../src/app.js";
import { SolanaBlockchainClient } from "../src/blockchain.js";
import type {
  AdminOverview,
  AdminOverviewBase,
  AdminStats,
  AnalyticsOverview,
  ApiKeyRecord,
  ApiRepository,
  AuthenticatedUser,
  CreateFeedbackSubmissionInput,
  CreateInterestSubmissionInput,
  CreateApiKeyInput,
  CreateNotificationInput,
  ApiKeyAnalyticsItem,
  CreateProjectInput,
  ErrorLogItem,
  FundingHistoryItem,
  FundingRecordInput,
  IdempotencyLookup,
  LeaderboardEntry,
  MethodBreakdownItem,
  NewsletterSubscribeInput,
  NotificationItem,
  OperatorSummary,
  PerformanceMetricInput,
  ProjectAnalytics,
  ProjectHealthScore,
  ProjectWithOwner,
  RequestLogInput,
  SaveIdempotencyInput,
  UpdateProjectInput,
  WebhookDeliveryRecord,
  SupportTicketRecord,
  BlogPostRecord,
  OperatorActivityItem,
  DailyRequestCount,
  AdminPlatformStats,
  NewsletterSubscriberList,
  SearchResults
} from "../src/types.js";

function makeEnv(overrides: Partial<Record<string, string>> = {}) {
  return loadApiEnv({
    FYXVO_ENV: "test",
    LOG_LEVEL: "error",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/fyxvo_test",
    REDIS_URL: "redis://localhost:6379",
    WEB_ORIGIN: "http://localhost:3000",
    SOLANA_CLUSTER: "devnet",
    SOLANA_RPC_URL: "https://api.devnet.solana.com",
    SOLANA_WS_URL: "wss://api.devnet.solana.com",
    REQUEST_TIMEOUT_MS: "5000",
    API_HOST: "127.0.0.1",
    API_PORT: "4100",
    API_JWT_SECRET: "fyxvo-test-jwt-secret-that-is-long-enough",
    API_RATE_LIMIT_MAX: "100",
    API_RATE_LIMIT_WINDOW_MS: "60000",
    FYXVO_ENABLE_USDC: "true",
    USDC_MINT_ADDRESS: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    ...overrides
  });
}

function shortWallet(walletAddress: string): string {
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

class MemoryApiRepository implements ApiRepository {
  private readonly users = new Map<string, User>();
  private readonly projects = new Map<string, Project>();
  private readonly apiKeys = new Map<string, ApiKey & { plainKeyHash?: string }>();
  private readonly requestLogs = new Map<string, RequestLog>();
  private readonly fundingCoordinates = new Map<string, FundingCoordinate>();
  private readonly interestSubmissions = new Map<string, InterestSubmission>();
  private readonly feedbackSubmissions = new Map<string, FeedbackSubmission>();
  private readonly idempotencyRecords = new Map<string, IdempotencyRecord>();
  private readonly incidents = new Map<
    string,
    { id: string; severity: "info" | "warning" | "critical"; description: string; createdAt: string; resolvedAt: string | null }
  >();
  private readonly assistantConversations = new Map<
    string,
    {
      id: string;
      userId: string;
      title: string;
      createdAt: string;
      updatedAt: string;
      lastMessageAt: string;
      messages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
    }
  >();
  private readonly operatorSummaries: OperatorSummary[];
  private readonly onProjectCreated?: (project: Project) => void;

  constructor(input: { onProjectCreated?: (project: Project) => void } = {}) {
    this.onProjectCreated = input.onProjectCreated;
    const operatorId = randomUUID();
    const nodeId = randomUUID();
    const now = new Date();
    const operator: NodeOperator = {
      id: operatorId,
      name: "Atlas Operator",
      email: "atlas@fyxvo.dev",
      walletAddress: Keypair.generate().publicKey.toBase58(),
      status: NodeOperatorStatus.ACTIVE,
      createdAt: now,
      updatedAt: now
    };
    const node: Node = {
      id: nodeId,
      operatorId,
      projectId: null,
      name: "atlas-devnet-1",
      network: NodeNetwork.DEVNET,
      endpoint: "https://atlas-devnet-1.fyxvo.dev",
      region: "us-east-1",
      status: NodeStatus.ONLINE,
      lastHeartbeatAt: now,
      createdAt: now,
      updatedAt: now
    };
    const metrics: Metrics = {
      id: randomUUID(),
      nodeId,
      cpuUsage: 0.32,
      memoryUsage: 0.48,
      diskUsage: 0.27,
      requestCount: 1284,
      errorRate: 0.01,
      recordedAt: now
    };

    this.operatorSummaries = [
      {
        operator,
        nodes: [
          {
            ...node,
            latestMetrics: {
              cpuUsage: metrics.cpuUsage,
              memoryUsage: metrics.memoryUsage,
              errorRate: metrics.errorRate,
              recordedAt: metrics.recordedAt
            }
          }
        ]
      }
    ];
  }

  setUserRole(walletAddress: string, role: User["role"]) {
    const user = [...this.users.values()].find((candidate) => candidate.walletAddress === walletAddress);
    if (!user) {
      throw new Error(`User for wallet ${walletAddress} was not found.`);
    }

    this.users.set(user.id, {
      ...user,
      role,
      updatedAt: new Date()
    });
  }

  projectCount() {
    return this.projects.size;
  }

  private mapUser(user: User): AuthenticatedUser & { authNonce: string; onboardingDismissed: boolean; createdAt: Date; tosAcceptedAt: Date | null; emailVerified: boolean } {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      authNonce: user.authNonce,
      sessionVersion: user.sessionVersion,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      status: user.status,
      onboardingDismissed: false,
      createdAt: user.createdAt,
      tosAcceptedAt: null,
      emailVerified: false,
    };
  }

  private getProjectCounts(projectId: string) {
    return {
      apiKeys: [...this.apiKeys.values()].filter((apiKey) => apiKey.projectId === projectId).length,
      requestLogs: [...this.requestLogs.values()].filter((requestLog) => requestLog.projectId === projectId)
        .length,
      fundingRequests: [...this.fundingCoordinates.values()].filter(
        (fundingRequest) => fundingRequest.projectId === projectId
      ).length
    };
  }

  private mapProject(project: Project): ProjectWithOwner {
    const owner = this.users.get(project.ownerId);
    if (!owner) {
      throw new Error(`Owner ${project.ownerId} was not found.`);
    }

    return {
      ...project,
      owner: this.mapUser(owner),
      _count: this.getProjectCounts(project.id)
    };
  }

  async findUserByWallet(walletAddress: string) {
    const user = [...this.users.values()].find((candidate) => candidate.walletAddress === walletAddress);
    return user ? this.mapUser(user) : null;
  }

  async findUserById(userId: string) {
    const user = this.users.get(userId);
    return user ? this.mapUser(user) : null;
  }

  async createOrRefreshWalletUser(walletAddress: string, authNonce: string) {
    const existing = [...this.users.values()].find((candidate) => candidate.walletAddress === walletAddress);
    const now = new Date();
    const user: User = existing
      ? {
          ...existing,
          authNonce,
          displayName: shortWallet(walletAddress),
          status: UserStatus.ACTIVE,
          updatedAt: now
        }
      : {
          id: randomUUID(),
          walletAddress,
          authNonce,
          sessionVersion: 1,
          email: null,
          displayName: shortWallet(walletAddress),
          role: UserRole.MEMBER,
          status: UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now
        };

    this.users.set(user.id, user);
    return this.mapUser(user);
  }

  async rotateUserNonce(userId: string, authNonce: string) {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} was not found.`);
    }

    this.users.set(userId, {
      ...user,
      authNonce,
      updatedAt: new Date()
    });
  }

  async getNextChainProjectId() {
    const highest = [...this.projects.values()].reduce(
      (current, project) => (project.chainProjectId > current ? project.chainProjectId : current),
      0n
    );
    return highest + 1n;
  }

  async listProjects(user: AuthenticatedUser) {
    return [...this.projects.values()]
      .filter((project) =>
        user.role === UserRole.OWNER || user.role === UserRole.ADMIN ? true : project.ownerId === user.id
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map((project) => this.mapProject(project));
  }

  async findProjectById(projectId: string) {
    const project = this.projects.get(projectId);
    return project ? this.mapProject(project) : null;
  }

  async createProject(input: CreateProjectInput) {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      ownerId: input.ownerId,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      chainProjectId: input.chainProjectId,
      onChainProjectPda: input.onChainProjectPda,
      createdAt: now,
      updatedAt: now
    };

    this.projects.set(project.id, project);
    this.onProjectCreated?.(project);
    return this.mapProject(project);
  }

  async updateProject(projectId: string, input: UpdateProjectInput) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} was not found.`);
    }

    const nextProject: Project = {
      ...project,
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      updatedAt: new Date()
    };

    this.projects.set(projectId, nextProject);
    return this.mapProject(nextProject);
  }

  async deleteProject(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} was not found.`);
    }

    this.projects.delete(projectId);
    for (const [apiKeyId, apiKey] of this.apiKeys.entries()) {
      if (apiKey.projectId === projectId) {
        this.apiKeys.delete(apiKeyId);
      }
    }

    return this.mapProject(project);
  }

  async listApiKeys(projectId: string): Promise<ApiKeyRecord[]> {
    return [...this.apiKeys.values()]
      .filter((apiKey) => apiKey.projectId === projectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .map(({ plainKeyHash: _plainKeyHash, ...apiKey }) => apiKey);
  }

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    const now = new Date();
    const apiKey: ApiKey & { plainKeyHash?: string } = {
      id: randomUUID(),
      projectId: input.projectId,
      createdById: input.createdById,
      label: input.label,
      prefix: input.prefix,
      keyHash: input.keyHash,
      status: ApiKeyStatus.ACTIVE,
      scopes: [...input.scopes],
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.apiKeys.set(apiKey.id, apiKey);
    const { plainKeyHash: _plainKeyHash, ...output } = apiKey;
    return output;
  }

  async createInterestSubmission(input: CreateInterestSubmissionInput) {
    const submission: InterestSubmission = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role,
      team: input.team ?? null,
      useCase: input.useCase,
      expectedRequestVolume: input.expectedRequestVolume,
      interestAreas: [...input.interestAreas],
      operatorInterest: input.operatorInterest,
      source: input.source,
      status: "NEW",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.interestSubmissions.set(submission.id, submission);
    return submission;
  }

  async createFeedbackSubmission(input: CreateFeedbackSubmissionInput) {
    const submission: FeedbackSubmission = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      role: input.role ?? null,
      team: input.team ?? null,
      walletAddress: input.walletAddress ?? null,
      projectId: input.projectId ?? null,
      category: input.category,
      message: input.message,
      source: input.source,
      page: input.page ?? null,
      status: "NEW",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.feedbackSubmissions.set(submission.id, submission);
    return submission;
  }

  async revokeApiKey(projectId: string, apiKeyId: string) {
    const apiKey = this.apiKeys.get(apiKeyId);
    if (!apiKey || apiKey.projectId !== projectId) {
      return null;
    }

    const revoked: ApiKey & { plainKeyHash?: string } = {
      ...apiKey,
      status: ApiKeyStatus.REVOKED,
      revokedAt: new Date(),
      updatedAt: new Date()
    };
    this.apiKeys.set(apiKeyId, revoked);
    const { plainKeyHash: _plainKeyHash, ...output } = revoked;
    return output;
  }

  async saveFundingCoordinate(input: FundingRecordInput) {
    const fundingCoordinate: FundingCoordinate = {
      id: randomUUID(),
      projectId: input.projectId,
      requestedById: input.requestedById,
      asset: input.asset,
      amount: input.amount,
      recentBlockhash: input.recentBlockhash,
      transactionBase64: input.transactionBase64,
      idempotencyKey: input.idempotencyKey,
      transactionSignature: null,
      confirmedAt: null,
      createdAt: new Date(),
      expiresAt: input.expiresAt
    };

    this.fundingCoordinates.set(fundingCoordinate.id, fundingCoordinate);
    return fundingCoordinate;
  }

  async findFundingCoordinate(fundingRequestId: string) {
    return this.fundingCoordinates.get(fundingRequestId) ?? null;
  }

  async confirmFundingCoordinate(input: {
    readonly fundingRequestId: string;
    readonly transactionSignature: string;
    readonly confirmedAt: Date;
  }) {
    const existing = this.fundingCoordinates.get(input.fundingRequestId);
    if (!existing) {
      throw new Error(`Funding request ${input.fundingRequestId} was not found.`);
    }

    const next: FundingCoordinate = {
      ...existing,
      transactionSignature: input.transactionSignature,
      confirmedAt: input.confirmedAt
    };
    this.fundingCoordinates.set(next.id, next);
    return next;
  }

  async getAnalyticsOverview(projectIds?: readonly string[]): Promise<AnalyticsOverview> {
    const projectIdSet = projectIds ? new Set(projectIds) : null;
    const requestLogs = [...this.requestLogs.values()].filter((requestLog) =>
      projectIdSet ? !!requestLog.projectId && projectIdSet.has(requestLog.projectId) : true
    );
    const projectCount = projectIdSet
      ? [...this.projects.values()].filter((project) => projectIdSet.has(project.id)).length
      : this.projects.size;
    const apiKeyCount = projectIdSet
      ? [...this.apiKeys.values()].filter((apiKey) => projectIdSet.has(apiKey.projectId)).length
      : this.apiKeys.size;
    const fundingRequestCount = projectIdSet
      ? [...this.fundingCoordinates.values()].filter((entry) => projectIdSet.has(entry.projectId)).length
      : this.fundingCoordinates.size;
    const durationSum = requestLogs.reduce((total, requestLog) => total + requestLog.durationMs, 0);
    const byService = new Map<string, number>();

    for (const requestLog of requestLogs) {
      byService.set(requestLog.service, (byService.get(requestLog.service) ?? 0) + 1);
    }

    return {
      totals: {
        projects: projectCount,
        apiKeys: apiKeyCount,
        fundingRequests: fundingRequestCount,
        requestLogs: requestLogs.length
      },
      latency: {
        averageMs: requestLogs.length === 0 ? 0 : Math.round(durationSum / requestLogs.length),
        maxMs: requestLogs.reduce((max, requestLog) => Math.max(max, requestLog.durationMs), 0)
      },
      requestsByService: [...byService.entries()].map(([service, count]) => ({
        service,
        count
      }))
    };
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} was not found.`);
    }

    const requestLogs = [...this.requestLogs.values()]
      .filter((requestLog) => requestLog.projectId === projectId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    const statusCodes = new Map<number, number>();

    for (const requestLog of requestLogs) {
      statusCodes.set(requestLog.statusCode, (statusCodes.get(requestLog.statusCode) ?? 0) + 1);
    }

    return {
      project: this.mapProject(project),
      totals: this.getProjectCounts(projectId),
      latency: {
        averageMs:
          requestLogs.length === 0
            ? 0
            : Math.round(
                requestLogs.reduce((total, requestLog) => total + requestLog.durationMs, 0) /
                  requestLogs.length
              ),
        maxMs: requestLogs.reduce((max, requestLog) => Math.max(max, requestLog.durationMs), 0),
        p95Ms: (() => {
          if (requestLogs.length === 0) return 0;
          const sorted = [...requestLogs].sort((a, b) => a.durationMs - b.durationMs);
          return sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)]?.durationMs ?? 0;
        })()
      },
      statusCodes: [...statusCodes.entries()].map(([statusCode, count]) => ({
        statusCode,
        count
      })),
      recentRequests: requestLogs.slice(0, 10)
    };
  }

  async getAdminStats(): Promise<AdminStats> {
    return {
      totals: {
        users: this.users.size,
        projects: this.projects.size,
        apiKeys: this.apiKeys.size,
        nodes: this.operatorSummaries.reduce((total, operator) => total + operator.nodes.length, 0),
        nodeOperators: this.operatorSummaries.length,
        fundingRequests: this.fundingCoordinates.size,
        requestLogs: this.requestLogs.size
      }
    };
  }

  async getErrorLog(projectId: string, limit: number): Promise<ErrorLogItem[]> {
    return [...this.requestLogs.values()]
      .filter((r) => r.projectId === projectId && r.statusCode >= 400)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        route: r.route,
        method: r.method,
        service: r.service,
        statusCode: r.statusCode,
        durationMs: r.durationMs,
        createdAt: r.createdAt.toISOString(),
        apiKeyPrefix: null
      }));
  }

  async getMethodBreakdown(projectId: string, _since: Date): Promise<MethodBreakdownItem[]> {
    const logs = [...this.requestLogs.values()].filter((r) => r.projectId === projectId);
    const byRoute = new Map<string, typeof logs>();
    for (const log of logs) {
      const key = `${log.route}::${log.service}`;
      const arr = byRoute.get(key) ?? [];
      arr.push(log);
      byRoute.set(key, arr);
    }
    return [...byRoute.entries()].map(([, entries]) => {
      const first = entries[0]!;
      const errorCount = entries.filter((e) => e.statusCode >= 400).length;
      return {
        route: first.route,
        service: first.service,
        count: entries.length,
        averageLatencyMs: Math.round(entries.reduce((s, e) => s + e.durationMs, 0) / entries.length),
        errorRate: entries.length > 0 ? errorCount / entries.length : 0,
        errorCount
      };
    });
  }

  async getApiKeyAnalytics(_projectId: string, apiKeyId: string, _since: Date): Promise<ApiKeyAnalyticsItem> {
    const logs = [...this.requestLogs.values()].filter((r) => r.apiKeyId === apiKeyId);
    const errorLogs = logs.filter((r) => r.statusCode >= 400);
    const sorted = [...logs].sort((a, b) => a.durationMs - b.durationMs);
    const p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]?.durationMs ?? 0;
    return {
      apiKeyId,
      totalRequests: logs.length,
      successRequests: logs.length - errorLogs.length,
      errorRequests: errorLogs.length,
      errorRate: logs.length > 0 ? errorLogs.length / logs.length : 0,
      averageLatencyMs: logs.length > 0 ? Math.round(logs.reduce((s, r) => s + r.durationMs, 0) / logs.length) : 0,
      p95LatencyMs: p95,
      dailyBuckets: []
    };
  }

  async getAdminOverview(): Promise<AdminOverviewBase> {
    const latestFunding = [...this.fundingCoordinates.values()]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8);
    const recentErrors = [...this.requestLogs.values()]
      .filter((requestLog) => requestLog.statusCode >= 400)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8);
    const recentProjectActivity = [...this.requestLogs.values()]
      .filter((requestLog) => requestLog.projectId !== null)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8);

    const recentInterestSubmissions = [...this.interestSubmissions.values()]
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 8);

    return {
      protocol: {
        readiness: null,
        authorityPlan: {
          mode: "single-signer",
          protocolAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
          pauseAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
          upgradeAuthorityHint: null,
          warnings: [
            "Single-signer authority is still configured. Move protocol, pause, and upgrade control behind a governed signer before mainnet beta."
          ]
        },
        treasury: {
          solBalance: null,
          usdcBalance: null,
          reservedSolRewards: null,
          reservedUsdcRewards: null,
          protocolSolFeesOwed: null,
          protocolUsdcFeesOwed: null,
          feeWithdrawalReady: false,
          reconciliationWarnings: [
            "Treasury account data is unavailable. Fee and reserve reconciliation cannot be verified from the admin surface."
          ]
        }
      },
      worker: {
        status: "healthy",
        lastCursorAt: new Date("2026-03-19T06:20:00.000Z"),
        lastCursorKey: "metrics-aggregation",
        lastRollupAt: new Date("2026-03-19T06:19:00.000Z"),
        staleThresholdMinutes: 15
      },
      recentErrors: recentErrors.map((entry) => ({
        id: entry.id,
        service: entry.service,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        createdAt: entry.createdAt,
        project: entry.projectId
          ? (() => {
              const project = this.projects.get(entry.projectId);
              return project
                ? {
                    id: project.id,
                    name: project.name,
                    slug: project.slug
                  }
                : null;
            })()
          : null
      })),
      recentFundingEvents: latestFunding.map((entry) => {
        const project = this.projects.get(entry.projectId);
        const requestedBy = this.users.get(entry.requestedById);
        if (!project || !requestedBy) {
          throw new Error("Funding event dependencies were not found.");
        }

        return {
          id: entry.id,
          asset: entry.asset,
          amount: entry.amount.toString(),
          createdAt: entry.createdAt,
          confirmedAt: entry.confirmedAt,
          transactionSignature: entry.transactionSignature,
          project: {
            id: project.id,
            name: project.name,
            slug: project.slug
          },
          requestedBy: {
            id: requestedBy.id,
            displayName: requestedBy.displayName,
            walletAddress: requestedBy.walletAddress
          }
        };
      }),
      recentProjectActivity: recentProjectActivity.map((entry) => ({
        id: entry.id,
        service: entry.service,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        createdAt: entry.createdAt,
        project: entry.projectId
          ? (() => {
              const project = this.projects.get(entry.projectId);
              return project
                ? {
                    id: project.id,
                    name: project.name,
                    slug: project.slug
                  }
                : null;
            })()
          : null
      })),
      interestSubmissions: {
        total: this.interestSubmissions.size,
        recent: recentInterestSubmissions.map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
          role: entry.role,
          team: entry.team,
          useCase: entry.useCase,
          expectedRequestVolume: entry.expectedRequestVolume,
          interestAreas: entry.interestAreas as string[],
          operatorInterest: entry.operatorInterest,
          source: entry.source,
          status: entry.status,
          createdAt: entry.createdAt
        }))
      },
      recentApiKeyActivity: [...this.apiKeys.values()]
        .sort((left, right) => {
          const leftTimestamp = left.lastUsedAt?.getTime() ?? left.createdAt.getTime();
          const rightTimestamp = right.lastUsedAt?.getTime() ?? right.createdAt.getTime();
          return rightTimestamp - leftTimestamp;
        })
        .slice(0, 8)
        .map((entry) => {
          const project = this.projects.get(entry.projectId);
          const createdBy = this.users.get(entry.createdById);
          if (!project || !createdBy) {
            throw new Error("API key activity dependencies were not found.");
          }

          return {
            id: entry.id,
            label: entry.label,
            prefix: entry.prefix,
            status: entry.status,
            lastUsedAt: entry.lastUsedAt,
            createdAt: entry.createdAt,
            project: {
              id: project.id,
              name: project.name,
              slug: project.slug
            },
            createdBy: {
              id: createdBy.id,
              displayName: createdBy.displayName,
              walletAddress: createdBy.walletAddress
            }
          };
        }),
      feedbackSubmissions: {
        total: this.feedbackSubmissions.size,
        open: [...this.feedbackSubmissions.values()].filter((entry) => entry.status !== "CLOSED").length,
        recent: [...this.feedbackSubmissions.values()]
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, 8)
          .map((entry) => ({
            id: entry.id,
            name: entry.name,
            email: entry.email,
            role: entry.role,
            team: entry.team,
            walletAddress: entry.walletAddress,
            category: entry.category,
            message: entry.message,
            source: entry.source,
            page: entry.page,
            status: entry.status,
            createdAt: entry.createdAt,
            project: entry.projectId
              ? (() => {
                  const project = this.projects.get(entry.projectId);
                  return project
                    ? {
                        id: project.id,
                        name: project.name,
                        slug: project.slug
                      }
                    : null;
                })()
              : null
          }))
      },
      launchFunnel: {
        periodDays: 14,
        counts: {
          landingCtaClicks: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/landing_cta_clicked").length,
          walletConnectIntent: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/wallet_connect_intent").length,
          projectCreationStarted: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/project_creation_started").length,
          fundingFlowStarted: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/funding_flow_started").length,
          apiKeyCreated: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/api_key_created").length,
          interestSubmitted: [...this.requestLogs.values()].filter((entry) => entry.service === "web" && entry.route === "/events/interest_form_submitted").length
        }
      }
    };
  }

  async listOperators(): Promise<OperatorSummary[]> {
    return this.operatorSummaries;
  }

  async getIdempotencyRecord(input: IdempotencyLookup) {
    const key = `${input.key}:${input.method}:${input.route}:${input.actorKey}`;
    const record = this.idempotencyRecords.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      this.idempotencyRecords.delete(key);
      return null;
    }

    return record;
  }

  async saveIdempotencyRecord(input: SaveIdempotencyInput) {
    const key = `${input.key}:${input.method}:${input.route}:${input.actorKey}`;
    const now = new Date();
    const existing = this.idempotencyRecords.get(key);
    const record: IdempotencyRecord = {
      id: existing?.id ?? randomUUID(),
      key: input.key,
      route: input.route,
      method: input.method,
      actorKey: input.actorKey,
      requestHash: input.requestHash,
      statusCode: input.statusCode,
      responseBody: input.responseBody,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: input.expiresAt
    };

    this.idempotencyRecords.set(key, record);
    return record;
  }

  async createNotification(input: CreateNotificationInput): Promise<NotificationItem> {
    return {
      id: randomUUID(),
      type: input.type,
      title: input.title,
      message: input.message,
      read: false,
      projectId: input.projectId ?? null,
      projectName: null,
      createdAt: new Date().toISOString()
    };
  }

  async markNotificationRead(_userId: string, _notificationId: string): Promise<void> {}

  async markAllNotificationsRead(_userId: string): Promise<void> {}

  async getFundingHistory(_userId: string, projectIds: readonly string[]): Promise<FundingHistoryItem[]> {
    const projectIdSet = new Set(projectIds);
    return [...this.fundingCoordinates.values()]
      .filter((entry) => projectIdSet.has(entry.projectId))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, 100)
      .map((entry) => {
        const project = this.projects.get(entry.projectId);
        return {
          id: entry.id,
          projectId: entry.projectId,
          projectName: project?.name ?? "",
          asset: entry.asset,
          amount: entry.amount.toString(),
          status: entry.confirmedAt ? "confirmed" : "pending",
          transactionSignature: entry.transactionSignature ?? null,
          createdAt: entry.createdAt.toISOString(),
          confirmedAt: entry.confirmedAt ? entry.confirmedAt.toISOString() : null
        };
      });
  }

  async recordRequestLog(input: RequestLogInput) {
    const requestLog: RequestLog = {
      id: randomUUID(),
      requestId: input.requestId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      projectId: input.projectId ?? null,
      apiKeyId: input.apiKeyId ?? null,
      userId: input.userId ?? null,
      service: input.service,
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      createdAt: new Date()
    };

    this.requestLogs.set(requestLog.id, requestLog);
  }

  private mapAssistantConversationSummary(conversation: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    lastMessageAt: string;
    messages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>;
  }) {
    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messages.length
    };
  }

  async listIncidents(limit = 20) {
    return [...this.incidents.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async createIncident(input: { severity: "info" | "warning" | "critical"; description: string }) {
    const incident = {
      id: randomUUID(),
      severity: input.severity,
      description: input.description,
      createdAt: new Date().toISOString(),
      resolvedAt: null
    };
    this.incidents.set(incident.id, incident);
    return incident;
  }

  async updateIncident(
    incidentId: string,
    input: { severity?: "info" | "warning" | "critical"; description?: string; resolvedAt?: string | null }
  ) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} was not found.`);
    }

    const nextIncident = {
      ...incident,
      ...(input.severity !== undefined ? { severity: input.severity } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.resolvedAt !== undefined ? { resolvedAt: input.resolvedAt } : {})
    };
    this.incidents.set(incidentId, nextIncident);
    return nextIncident;
  }

  async countAssistantMessagesThisHour(_userId: string, _since: Date): Promise<number> { return 0; }

  async listAssistantConversations(userId: string, limit = 20) {
    return [...this.assistantConversations.values()]
      .filter((conversation) => conversation.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, limit)
      .map((conversation) => this.mapAssistantConversationSummary(conversation));
  }

  async getAssistantConversation(userId: string, conversationId: string) {
    const conversation = this.assistantConversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    return {
      ...this.mapAssistantConversationSummary(conversation),
      messages: [...conversation.messages]
    };
  }

  async createAssistantConversation(input: { userId: string; title: string }) {
    const now = new Date().toISOString();
    const conversation = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      messages: [] as Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }>
    };
    this.assistantConversations.set(conversation.id, conversation);
    return this.mapAssistantConversationSummary(conversation);
  }

  async saveAssistantConversationMessages(input: {
    userId: string;
    conversationId: string;
    titleFromFirstUserMessage?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  }) {
    const conversation = this.assistantConversations.get(input.conversationId);
    if (!conversation || conversation.userId !== input.userId) {
      throw new Error(`Conversation ${input.conversationId} was not found.`);
    }

    const createdAtBase = Date.now();
    const messages = input.messages.slice(-50).map((message, index) => ({
      id: randomUUID(),
      role: message.role,
      content: message.content,
      createdAt: new Date(createdAtBase + index).toISOString()
    }));
    const lastMessageAt = messages.at(-1)?.createdAt ?? conversation.lastMessageAt;
    const nextConversation = {
      ...conversation,
      title: conversation.messages.length === 0 && input.titleFromFirstUserMessage
        ? input.titleFromFirstUserMessage
        : conversation.title,
      updatedAt: lastMessageAt,
      lastMessageAt,
      messages
    };
    this.assistantConversations.set(conversation.id, nextConversation);

    return {
      ...this.mapAssistantConversationSummary(nextConversation),
      messages: [...nextConversation.messages]
    };
  }

  async clearAssistantConversation(userId: string, conversationId: string): Promise<void> {
    const conversation = this.assistantConversations.get(conversationId);
    if (!conversation || conversation.userId !== userId) {
      return;
    }

    this.assistantConversations.delete(conversationId);
  }

  // Stubs for new methods not needed in unit tests
  async listWebhooks(_projectId: string) { return []; }
  async createWebhook(_input: { projectId: string; url: string; events: string[]; secret: string }) { return { id: randomUUID(), projectId: _input.projectId, url: _input.url, events: _input.events, secret: _input.secret, active: true, lastTriggeredAt: null, createdAt: new Date().toISOString() }; }
  async findWebhook(_webhookId: string, _projectId: string) { return null; }
  async deleteWebhook(_webhookId: string, _projectId: string): Promise<void> {}
  async listProjectMembers(_projectId: string) { return []; }
  async findProjectMember(_projectId: string, _userId: string) { return null; }
  async findProjectMemberById(_memberId: string) { return null; }
  async createProjectMember(_input: { projectId: string; userId: string; invitedBy: string }) { return { id: randomUUID(), projectId: _input.projectId, userId: _input.userId, role: "member", invitedBy: _input.invitedBy, invitedAt: new Date().toISOString(), acceptedAt: null, user: { walletAddress: "", displayName: "" } }; }
  async acceptProjectMember(_memberId: string): Promise<void> {}
  async deleteProjectMember(_memberId: string, _projectId: string): Promise<void> {}
  async findPublicProject(_publicSlug: string) { return null; }
  async createEnterpriseInterest(_input: { companyName: string; contactEmail: string; estimatedMonthlyReqs: string; useCase: string }): Promise<void> {}
  async logActivity(_input: { projectId: string; userId?: string | null; action: string; details?: Record<string, unknown> | null }): Promise<void> {}
  async listActivityLog(_projectId: string, _limit?: number) { return []; }
  async getActiveAnnouncement() { return null; }
  async upsertAnnouncement(_input: { message: string; severity: string; startAt?: Date | null; endAt?: Date | null }): Promise<void> {}
  async getWhatsNew(_userId: string) { return null; }
  async dismissWhatsNew(_userId: string, _version: string): Promise<void> {}
  async recordWebhookDelivery(_input: { webhookId: string; eventType: string; payload: unknown; attemptNumber: number; responseStatus?: number | null; responseBody?: string | null; success: boolean; nextRetryAt?: Date | null }): Promise<string> { return "test-delivery-id"; }
  async getWebhookDeliveries(_webhookId: string, _limit?: number): Promise<WebhookDeliveryRecord[]> { return []; }
  async getPendingWebhookRetries(): Promise<{ id: string; webhookId: string; webhook: { url: string; secret: string }; payload: unknown; eventType: string; attemptNumber: number }[]> { return []; }
  async updateWebhookDelivery(_id: string, _data: { responseStatus?: number; responseBody?: string; success: boolean; nextRetryAt?: Date | null }): Promise<void> {}
  async recordPerformanceMetric(_input: PerformanceMetricInput): Promise<void> {}
  async getPerformanceMetricSummary(_days?: number): Promise<{ page: string; avgFcp: number | null; avgLcp: number | null; sampleCount: number }[]> { return []; }
  async subscribeToStatus(_email: string): Promise<void> {}
  async getProjectHealthScore(_projectId: string): Promise<ProjectHealthScore> { return { score: 80, activated: true, hasFunding: true, hasApiKeys: true, hasTraffic: true, successRate: 1.0 }; }
  async getOperatorActivity(_limit?: number): Promise<OperatorActivityItem[]> { return []; }
  async getOperatorDailyRequests(_days?: number): Promise<DailyRequestCount[]> { return []; }
  async getNodeDistribution(_projectId: string, _days?: number): Promise<Array<{ node: string; count: number; avgLatencyMs: number }>> { return []; }
  async recordClientError(_input: { component: string; message: string; page: string }): Promise<void> { return; }
  async createSupportTicket(_input: { userId: string; projectId?: string; category: string; priority: string; subject: string; description: string }): Promise<SupportTicketRecord> { throw new Error("not implemented"); }
  async listSupportTickets(_userId: string): Promise<SupportTicketRecord[]> { return []; }
  async getSupportTicket(_id: string, _userId: string): Promise<SupportTicketRecord | null> { return null; }
  async adminListSupportTickets(_status?: string): Promise<SupportTicketRecord[]> { return []; }
  async adminRespondToTicket(_id: string, _response: string, _status: string): Promise<SupportTicketRecord> { throw new Error("not implemented"); }
  async listBlogPosts(_visibleOnly?: boolean): Promise<BlogPostRecord[]> { return []; }
  async getBlogPost(_slug: string): Promise<BlogPostRecord | null> { return null; }
  async createBlogPost(_input: { slug: string; title: string; summary: string; content: string; publishedAt?: Date; visible?: boolean }): Promise<BlogPostRecord> { throw new Error("not implemented"); }
  async subscribeNewsletter(_input: NewsletterSubscribeInput): Promise<void> {}
  async getNewsletterCount(): Promise<number> { return 0; }
  async getLeaderboard(): Promise<LeaderboardEntry[]> { return []; }
  async setEmailVerificationToken(_userId: string, _token: string, _expiry: Date): Promise<void> {}
  async verifyEmail(_token: string): Promise<{ success: boolean }> { return { success: false }; }
  async acceptTos(_userId: string): Promise<void> {}
  async getTosStatus(_userId: string): Promise<{ accepted: boolean; acceptedAt: string | null }> { return { accepted: false, acceptedAt: null }; }
  async findUserByReferralCode(_referralCode: string): Promise<{ id: string } | null> { return null; }
  async markReferralConverted(_clickId: string): Promise<void> {}
  async findLatestUnconvertedClick(_referrerId: string): Promise<{ id: string } | null> { return null; }
  async getAdminPlatformStats(): Promise<AdminPlatformStats> {
    return {
      totalUsers: this.users.size,
      totalProjects: this.projects.size,
      requestsToday: 0,
      requestsThisWeek: 0,
      newsletterCount: 0,
      recentSignups: [],
    };
  }
  async getNewsletterSubscribers(_limit?: number): Promise<NewsletterSubscriberList> {
    return { count: 0, recent: [] };
  }
  async getLatencyHeatmap(_projectId: string, _range: "24h" | "7d" | "30d"): Promise<number[][]> {
    return Array.from({ length: 24 }, () => Array(7).fill(0));
  }
  async findRequestByTraceId(_projectId: string, _traceId: string): Promise<Record<string, unknown> | null> { return null; }
  async getFirstSuccessfulProjectRequest(projectId: string): Promise<{ method: string; durationMs: number; createdAt: string } | null> {
    const rows = [...this.requestLogs.values()]
      .filter((entry) => entry.projectId === projectId && entry.statusCode < 400)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
    const first = rows[0];
    if (!first) return null;
    return {
      method: first.method,
      durationMs: first.durationMs,
      createdAt: first.createdAt.toISOString()
    };
  }
  async countRecentRequests(_since: Date): Promise<number> { return 0; }
  async getSuccessRateTrend(_projectId: string, _range: "24h" | "7d" | "30d"): Promise<Array<{ time: string; successRate: number }>> { return []; }
  async transferProjectOwnership(_projectId: string, _newOwnerId: string, _previousOwnerId: string): Promise<void> { return Promise.resolve(); }
  async listWebhookEvents(_projectId: string): Promise<Array<{ id: string; webhookId: string; webhookUrl: string; webhookName: string; eventType: string; status: string; responseStatus: number | null; attemptNumber: number; createdAt: string }>> { return []; }
  async redeliverWebhookEvent(_deliveryId: string, _projectId: string): Promise<void> { return Promise.resolve(); }
  async globalSearch(_userId: string, _query: string): Promise<SearchResults> {
    return { projects: [], apiKeys: [], requests: [] };
  }
  async getHealthHistory(_projectId: string): Promise<Array<{ date: string; score: number }>> { return []; }
  async generateInviteLink(_projectId: string, _createdById: string): Promise<{ token: string; expiresAt: string }> {
    return { token: "stub-token", expiresAt: new Date(Date.now() + 48 * 3_600_000).toISOString() };
  }
  async lookupInviteToken(_token: string): Promise<{ projectId: string; projectName: string; inviterWallet: string } | null> { return null; }
  async acceptInviteToken(_token: string, _userId: string): Promise<void> { return Promise.resolve(); }
  async declineInviteToken(_token: string, _userId: string): Promise<void> { return Promise.resolve(); }
  async upsertDigestSchedule(_userId: string): Promise<void> { return Promise.resolve(); }
  async deleteDigestSchedule(_userId: string): Promise<void> { return Promise.resolve(); }
}

function createAssistantSseResponse(chunks: readonly string[]) {
  let index = 0;

  return new Response(
    new ReadableStream({
      pull(controller) {
        if (index >= chunks.length) {
          controller.close();
          return;
        }

        controller.enqueue(new TextEncoder().encode(chunks[index]!));
        index += 1;
      }
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/event-stream"
      }
    }
  );
}

async function createTestApp(options: {
  rateLimitMax?: number;
  envOverrides?: Partial<Record<string, string>>;
} = {}) {
  const env = makeEnv({
    ...(options.rateLimitMax !== undefined ? { API_RATE_LIMIT_MAX: String(options.rateLimitMax) } : {}),
    ...options.envOverrides
  });
  const programId = new PublicKey(getSolanaNetworkConfig(env.SOLANA_CLUSTER).programIds.fyxvo);
  const protocolConfigPda = PublicKey.findProgramAddressSync(
    [fyxvoProgramSeeds.protocolConfig],
    programId
  )[0];
  const treasuryPda = PublicKey.findProgramAddressSync([fyxvoProgramSeeds.treasury], programId)[0];
  const operatorRegistryPda = PublicKey.findProgramAddressSync(
    [fyxvoProgramSeeds.operatorRegistry, protocolConfigPda.toBuffer()],
    programId
  )[0];
  const treasuryUsdcVault = getAssociatedTokenAddressSync(
    new PublicKey(env.USDC_MINT_ADDRESS),
    treasuryPda,
    true
  );
  const activatedProjectPdas = new Set<string>();
  const repository = new MemoryApiRepository({
    onProjectCreated(project) {
      activatedProjectPdas.add(project.onChainProjectPda);
    }
  });
  const blockchain = new SolanaBlockchainClient({
    rpcUrl: env.SOLANA_RPC_URL,
    expectedAdminAuthority: env.FYXVO_ADMIN_AUTHORITY,
    programId: getSolanaNetworkConfig(env.SOLANA_CLUSTER).programIds.fyxvo,
    usdcMintAddress: env.USDC_MINT_ADDRESS,
    connection: {
      async getLatestBlockhash() {
        return {
          blockhash: Keypair.generate().publicKey.toBase58(),
          lastValidBlockHeight: 4242
        };
      },
      async getBalance() {
        return 1_500_000_000;
      },
      async getAccountInfo(address) {
        const publicKey = address instanceof PublicKey ? address.toBase58() : new PublicKey(address).toBase58();

        if (publicKey === programId.toBase58()) {
          return {
            executable: true,
            owner: SystemProgram.programId,
            lamports: 1,
            data: Buffer.alloc(0),
            rentEpoch: 0
          };
        }

        if (publicKey === protocolConfigPda.toBase58()) {
          const data = Buffer.alloc(140, 0);
          anchorAccountDiscriminator("ProtocolConfig").copy(data, 0);
          new PublicKey(env.FYXVO_ADMIN_AUTHORITY).toBuffer().copy(data, 8);
          treasuryPda.toBuffer().copy(data, 40);
          operatorRegistryPda.toBuffer().copy(data, 72);
          new PublicKey(env.USDC_MINT_ADDRESS).toBuffer().copy(data, 104);
          data.writeUInt16LE(500, 136);
          data.writeUInt8(0, 138);
          data.writeUInt8(255, 139);
          return {
            executable: false,
            owner: programId,
            lamports: 1,
            data,
            rentEpoch: 0
          };
        }

        if (publicKey === treasuryPda.toBase58()) {
          const data = Buffer.alloc(121, 0);
          anchorAccountDiscriminator("Treasury").copy(data, 0);
          protocolConfigPda.toBuffer().copy(data, 8);
          treasuryUsdcVault.toBuffer().copy(data, 40);
          data.writeUInt8(255, 120);
          return {
            executable: false,
            owner: programId,
            lamports: 1,
            data,
            rentEpoch: 0
          };
        }

        if (publicKey === operatorRegistryPda.toBase58()) {
          const data = Buffer.alloc(49, 0);
          anchorAccountDiscriminator("OperatorRegistry").copy(data, 0);
          protocolConfigPda.toBuffer().copy(data, 8);
          data.writeUInt8(255, 48);
          return {
            executable: false,
            owner: programId,
            lamports: 1,
            data,
            rentEpoch: 0
          };
        }

        if (publicKey === treasuryUsdcVault.toBase58()) {
          return {
            executable: false,
            owner: programId,
            lamports: 1,
            data: Buffer.alloc(165, 0),
            rentEpoch: 0
          };
        }

        if (!activatedProjectPdas.has(publicKey)) {
          return null;
        }

        const projectData = Buffer.alloc(177, 0);
        anchorAccountDiscriminator("ProjectAccount").copy(projectData, 0);
        projectData.writeBigUInt64LE(4_750_000n, 112);
        projectData.writeBigUInt64LE(2_500_000n, 120);
        projectData.writeBigUInt64LE(4_250_000n, 128);
        projectData.writeBigUInt64LE(2_000_000n, 136);

        return {
          executable: false,
          owner: SystemProgram.programId,
          lamports: 1,
          data: projectData,
          rentEpoch: 0
        };
      },
      async getTokenAccountBalance() {
        return {
          context: {
            apiVersion: "2.3.0",
            slot: 100
          },
          value: {
            amount: "2500000",
            decimals: 6,
            uiAmount: 2.5,
            uiAmountString: "2.5"
          }
        };
      }
    }
  });
  const app = await buildApiApp({
    env,
    repository,
    blockchain,
    healthcheck: async () => true,
    logger: false
  });

  await app.ready();
  return { app, repository };
}

async function authenticateWallet(input: {
  readonly app: Awaited<ReturnType<typeof createTestApp>>["app"];
  readonly repository: MemoryApiRepository;
  readonly role?: User["role"];
}) {
  const wallet = Keypair.generate();
  const walletAddress = wallet.publicKey.toBase58();
  const challengeResponse = await input.app.inject({
    method: "POST",
    url: "/v1/auth/challenge",
    payload: {
      walletAddress
    }
  });

  expect(challengeResponse.statusCode).toBe(200);
  const challengeBody = challengeResponse.json<{
    walletAddress: string;
    nonce: string;
    message: string;
  }>();

  if (input.role && input.role !== UserRole.MEMBER) {
    input.repository.setUserRole(walletAddress, input.role);
  }

  const signature = bs58.encode(
    nacl.sign.detached(Buffer.from(challengeBody.message, "utf8"), wallet.secretKey)
  );
  const verifyResponse = await input.app.inject({
    method: "POST",
    url: "/v1/auth/verify",
    payload: {
      walletAddress,
      message: challengeBody.message,
      signature
    }
  });

  expect(verifyResponse.statusCode).toBe(200);
  const verifyBody = verifyResponse.json<{
    token: string;
    user: {
      id: string;
      walletAddress: string;
      role: User["role"];
    };
  }>();

  return {
    token: verifyBody.token,
    userId: verifyBody.user.id,
    wallet
  };
}

const appsToClose = new Set<Awaited<ReturnType<typeof createTestApp>>["app"]>();

afterEach(async () => {
  vi.restoreAllMocks();

  for (const app of appsToClose) {
    await app.close();
    appsToClose.delete(app);
  }
});

describe("Fyxvo API service", () => {
  it("reports health, status, and rate limits traffic", async () => {
    const healthyContext = await createTestApp();
    appsToClose.add(healthyContext.app);

    const healthResponse = await healthyContext.app.inject({
      method: "GET",
      url: "/health"
    });
    expect(healthResponse.statusCode).toBe(200);
    expect(healthResponse.json()).toMatchObject({
      status: "ok",
      service: "api",
      assistantAvailable: false
    });

    const statusResponse = await healthyContext.app.inject({
      method: "GET",
      url: "/v1/status"
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      service: "fyxvo-api",
      environment: "test",
      assistantAvailable: false,
      solanaCluster: "devnet",
      authorityPlan: {
        mode: "single-signer",
        protocolAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
        pauseAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem"
      }
    });

    const limitedContext = await createTestApp({
      rateLimitMax: 1
    });
    appsToClose.add(limitedContext.app);

    const first = await limitedContext.app.inject({
      method: "GET",
      url: "/health"
    });
    const second = await limitedContext.app.inject({
      method: "GET",
      url: "/health"
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);
    expect(second.json()).toMatchObject({
      code: "rate_limited",
      error: "Too Many Requests"
    });
  });

  it("returns assistant availability, 503 when not configured, 500 on upstream failure, and streams SSE responses", async () => {
    const unavailableContext = await createTestApp();
    appsToClose.add(unavailableContext.app);
    const unavailableAuth = await authenticateWallet({ app: unavailableContext.app });

    const unavailableResponse = await unavailableContext.app.inject({
      method: "POST",
      url: "/v1/assistant/chat",
      headers: {
        authorization: `Bearer ${unavailableAuth.token}`
      },
      payload: {
        messages: [{ role: "user", content: "How do I use the gateway?" }]
      }
    });

    expect(unavailableResponse.statusCode).toBe(503);
    expect(unavailableResponse.json()).toMatchObject({
      code: "assistant_unavailable"
    });

    const configuredContext = await createTestApp({
      envOverrides: {
        ANTHROPIC_API_KEY: "anthropic-test-key"
      }
    });
    appsToClose.add(configuredContext.app);
    const configuredAuth = await authenticateWallet({ app: configuredContext.app });

    const healthResponse = await configuredContext.app.inject({
      method: "GET",
      url: "/health"
    });
    expect(healthResponse.json()).toMatchObject({
      assistantAvailable: true
    });

    const statusResponse = await configuredContext.app.inject({
      method: "GET",
      url: "/v1/status"
    });
    expect(statusResponse.json()).toMatchObject({
      assistantAvailable: true
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("provider failure", {
        status: 500,
        headers: {
          "content-type": "text/plain"
        }
      })
    );

    const failedUpstreamResponse = await configuredContext.app.inject({
      method: "POST",
      url: "/v1/assistant/chat",
      headers: {
        authorization: `Bearer ${configuredAuth.token}`
      },
      payload: {
        messages: [{ role: "user", content: "Tell me about pricing." }]
      }
    });

    expect(failedUpstreamResponse.statusCode).toBe(500);
    expect(failedUpstreamResponse.json()).toMatchObject({
      code: "assistant_internal_error"
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      createAssistantSseResponse([
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
        'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" from Fyxvo"}}\n\n',
        "data: [DONE]\n\n"
      ])
    );

    const streamingResponse = await configuredContext.app.inject({
      method: "POST",
      url: "/v1/assistant/chat",
      headers: {
        authorization: `Bearer ${configuredAuth.token}`
      },
      payload: {
        messages: [{ role: "user", content: "Say hello." }]
      }
    });

    expect(streamingResponse.statusCode).toBe(200);
    expect(streamingResponse.headers["content-type"]).toContain("text/event-stream");
    expect(streamingResponse.body).toContain('{"text":"Hello"}');
    expect(streamingResponse.body).toContain('{"text":" from Fyxvo"}');
    expect(streamingResponse.body).toContain("data: [DONE]");
  });

  it("authenticates wallets and supports project CRUD with idempotency", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const unauthorized = await context.app.inject({
      method: "GET",
      url: "/v1/projects"
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({
      code: "unauthorized"
    });

    const session = await authenticateWallet({
      app: context.app,
      repository: context.repository
    });

    const createPayload = {
      slug: "alpha-project",
      name: "Alpha Project",
      description: "Primary development project"
    };
    const created = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${session.token}`,
        "idempotency-key": "project-alpha"
      },
      payload: createPayload
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json<{
      item: {
        id: string;
        slug: string;
        name: string;
        chainProjectId: string;
      };
    }>();
    expect(createdBody.item.slug).toBe("alpha-project");
    expect(createdBody.item.chainProjectId).toBe("1");

    const replayed = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${session.token}`,
        "idempotency-key": "project-alpha"
      },
      payload: createPayload
    });
    expect(replayed.statusCode).toBe(201);
    expect(replayed.json<{ item: { id: string } }>().item.id).toBe(createdBody.item.id);
    expect(context.repository.projectCount()).toBe(1);

    const conflict = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${session.token}`,
        "idempotency-key": "project-alpha"
      },
      payload: {
        ...createPayload,
        slug: "alpha-project-renamed"
      }
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({
      code: "idempotency_conflict"
    });

    const listResponse = await context.app.inject({
      method: "GET",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${session.token}`
      }
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json<{ items: Array<{ id: string }> }>().items).toHaveLength(1);

    const getResponse = await context.app.inject({
      method: "GET",
      url: `/v1/projects/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${session.token}`
      }
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      item: {
        id: createdBody.item.id,
        slug: "alpha-project"
      }
    });

    const updated = await context.app.inject({
      method: "PATCH",
      url: `/v1/projects/${createdBody.item.id}`,
      headers: {
        authorization: `Bearer ${session.token}`
      },
      payload: {
        name: "Alpha Project Updated",
        description: null
      }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      item: {
        id: createdBody.item.id,
        name: "Alpha Project Updated",
        description: null
      }
    });

    const secondProject = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${session.token}`
      },
      payload: {
        slug: "beta-project",
        name: "Beta Project"
      }
    });
    const secondProjectId = secondProject.json<{ item: { id: string } }>().item.id;
    const deleted = await context.app.inject({
      method: "DELETE",
      url: `/v1/projects/${secondProjectId}`,
      headers: {
        authorization: `Bearer ${session.token}`
      }
    });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toMatchObject({
      item: {
        id: secondProjectId
      }
    });
  });

  it("manages API keys, prepares funding transactions, and reads on-chain state", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const owner = await authenticateWallet({
      app: context.app,
      repository: context.repository
    });
    const projectResponse = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        slug: "payments-project",
        name: "Payments Project"
      }
    });
    const projectId = projectResponse.json<{ item: { id: string } }>().item.id;

    const apiKeyResponse = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        label: "Server Key",
        scopes: ["analytics:read", "funding:prepare"]
      }
    });
    expect(apiKeyResponse.statusCode).toBe(201);
    const apiKeyBody = apiKeyResponse.json<{
      item: { id: string; prefix: string; status: string };
      plainTextKey: string;
    }>();
    expect(apiKeyBody.plainTextKey.startsWith("fyxvo_live_")).toBe(true);
    expect(apiKeyBody.item.status).toBe(ApiKeyStatus.ACTIVE);

    const apiKeysList = await context.app.inject({
      method: "GET",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(apiKeysList.statusCode).toBe(200);
    expect(apiKeysList.json<{ items: Array<{ id: string }> }>().items).toHaveLength(1);

    const invalidScopeResponse = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        label: "Broken Priority Key",
        scopes: ["priority:relay"]
      }
    });
    expect(invalidScopeResponse.statusCode).toBe(400);
    expect(invalidScopeResponse.json()).toMatchObject({
      code: "invalid_api_key_scope_set",
      details: {
        requiredScopes: ["rpc:request"]
      }
    });

    const revoked = await context.app.inject({
      method: "DELETE",
      url: `/v1/projects/${projectId}/api-keys/${apiKeyBody.item.id}`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toMatchObject({
      item: {
        id: apiKeyBody.item.id,
        status: ApiKeyStatus.REVOKED
      }
    });

    const funderWallet = Keypair.generate();
    const solFunding = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/funding/prepare`,
      headers: {
        authorization: `Bearer ${owner.token}`,
        "idempotency-key": "fund-sol"
      },
      payload: {
        asset: "SOL",
        amount: "5000000",
        funderWalletAddress: funderWallet.publicKey.toBase58()
      }
    });
    expect(solFunding.statusCode).toBe(201);
    const solFundingBody = solFunding.json<{
      item: {
        fundingRequestId: string;
        recentBlockhash: string;
        transactionBase64: string;
        amount: string;
        asset: string;
        projectPda: string;
      };
    }>();
    expect(solFundingBody.item.asset).toBe("SOL");
    expect(solFundingBody.item.amount).toBe("5000000");
    const decodedTransaction = VersionedTransaction.deserialize(
      Buffer.from(solFundingBody.item.transactionBase64, "base64")
    );
    expect(decodedTransaction.signatures).toHaveLength(1);
    expect([...decodedTransaction.signatures[0]].every((byte) => byte === 0)).toBe(true);

    const usdcFunding = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/funding/prepare`,
      headers: {
        authorization: `Bearer ${owner.token}`,
        "idempotency-key": "fund-usdc"
      },
      payload: {
        asset: "USDC",
        amount: "2500000",
        funderWalletAddress: funderWallet.publicKey.toBase58()
      }
    });
    expect(usdcFunding.statusCode).toBe(201);
    expect(usdcFunding.json()).toMatchObject({
      item: {
        asset: "USDC",
        amount: "2500000"
      }
    });

    const onChainResponse = await context.app.inject({
      method: "GET",
      url: `/v1/projects/${projectId}/onchain`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(onChainResponse.statusCode).toBe(200);
    expect(onChainResponse.json()).toMatchObject({
      item: {
        projectPda: solFundingBody.item.projectPda,
        projectAccountExists: true,
        projectAccountDataLength: 177,
        treasurySolBalance: 1_500_000_000,
        balances: {
          totalSolFunded: "4750000",
          availableSolCredits: "4250000"
        },
        treasuryUsdcVault: {
          amount: "2500000"
        }
      }
    });
  });

  it("returns analytics for project activity", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const owner = await authenticateWallet({
      app: context.app,
      repository: context.repository
    });
    const projectResponse = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        slug: "analytics-project",
        name: "Analytics Project"
      }
    });
    const projectId = projectResponse.json<{ item: { id: string } }>().item.id;

    await context.app.inject({
      method: "GET",
      url: `/v1/projects/${projectId}`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        label: "Analytics Key",
        scopes: ["analytics:read"]
      }
    });
    await context.app.inject({
      method: "GET",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/funding/prepare`,
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        asset: "SOL",
        amount: "7500000",
        funderWalletAddress: owner.wallet.publicKey.toBase58()
      }
    });
    await context.app.inject({
      method: "GET",
      url: `/v1/projects/${projectId}/onchain`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });

    const overview = await context.app.inject({
      method: "GET",
      url: "/v1/analytics/overview",
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(overview.statusCode).toBe(200);
    expect(overview.json<{ item: AnalyticsOverview }>().item).toMatchObject({
      totals: {
        projects: 1,
        apiKeys: 1,
        fundingRequests: 1
      }
    });
    expect(overview.json<{ item: AnalyticsOverview }>().item.totals.requestLogs).toBeGreaterThanOrEqual(4);

    const projectAnalytics = await context.app.inject({
      method: "GET",
      url: `/v1/analytics/projects/${projectId}`,
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(projectAnalytics.statusCode).toBe(200);
    const projectAnalyticsBody = projectAnalytics.json<{ item: ProjectAnalytics }>().item;
    expect(projectAnalyticsBody.totals.apiKeys).toBe(1);
    expect(projectAnalyticsBody.totals.fundingRequests).toBe(1);
    expect(projectAnalyticsBody.totals.requestLogs).toBeGreaterThanOrEqual(4);
    expect(projectAnalyticsBody.recentRequests.some((requestLog) => requestLog.route === "/v1/projects/:projectId/onchain")).toBe(true);
  });

  it("captures public developer interest with validation", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const invalid = await context.app.inject({
      method: "POST",
      url: "/v1/interest",
      payload: {
        name: "A",
        email: "not-an-email"
      }
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toMatchObject({
      code: "validation_error"
    });

    const created = await context.app.inject({
      method: "POST",
      url: "/v1/interest",
      payload: {
        name: "Jordan Lee",
        email: "jordan@northwind.dev",
        role: "Developer",
        team: "Northwind",
        useCase:
          "We want funded devnet RPC with a clean path into higher-throughput relay traffic and analytics.",
        expectedRequestVolume: "250k to 1M requests per day",
        interestAreas: ["rpc", "priority-relay", "analytics"],
        operatorInterest: false,
        source: "web"
      }
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      item: {
        email: "jordan@northwind.dev",
        status: "NEW"
      }
    });
  });

  it("captures alpha feedback and attaches project context for authenticated sessions", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);
    const owner = await authenticateWallet({
      app: context.app,
      repository: context.repository,
      role: UserRole.OWNER
    });

    const createdProject = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: {
        authorization: `Bearer ${owner.token}`,
        "idempotency-key": randomUUID()
      },
      payload: {
        slug: "alpha-team",
        name: "Alpha Team",
        description: "Private alpha project"
      }
    });
    const projectId = createdProject.json<{ item: ProjectWithOwner }>().item.id;

    const created = await context.app.inject({
      method: "POST",
      url: "/v1/feedback",
      headers: {
        authorization: `Bearer ${owner.token}`
      },
      payload: {
        name: "Jordan Lee",
        email: "jordan@northwind.dev",
        role: "Developer",
        team: "Northwind",
        category: "ONBOARDING_FRICTION",
        message:
          "Funding was clear, but I wanted the API keys page linked immediately after the SOL confirmation finished.",
        source: "dashboard",
        page: "/dashboard",
        projectId
      }
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      item: {
        email: "jordan@northwind.dev",
        status: "NEW"
      }
    });

    const admin = await context.app.inject({
      method: "GET",
      url: "/v1/admin/overview",
      headers: {
        authorization: `Bearer ${owner.token}`
      }
    });
    expect(admin.statusCode).toBe(200);
    const body = admin.json<{ item: AdminOverview }>().item;
    expect(body.feedbackSubmissions.total).toBe(1);
    expect(body.feedbackSubmissions.open).toBe(1);
    expect(body.feedbackSubmissions.recent[0]).toMatchObject({
      category: "ONBOARDING_FRICTION",
      source: "dashboard",
      page: "/dashboard",
      project: {
        id: projectId,
        slug: "alpha-team"
      }
    });
  });

  it("captures first-party launch events for funnel tracking", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);
    const adminSession = await authenticateWallet({
      app: context.app,
      repository: context.repository,
      role: UserRole.OWNER
    });

    const invalid = await context.app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        name: "unknown_event",
        source: "home-hero"
      }
    });
    expect(invalid.statusCode).toBe(400);

    const tracked = await context.app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        name: "landing_cta_clicked",
        source: "home-hero-quickstart"
      }
    });
    expect(tracked.statusCode).toBe(202);
    expect(tracked.json()).toMatchObject({
      accepted: true
    });

    const admin = await context.app.inject({
      method: "GET",
      url: "/v1/admin/overview",
      headers: {
        authorization: `Bearer ${adminSession.token}`
      }
    });
    expect(admin.statusCode).toBe(200);
    expect(admin.json<{ item: AdminOverview }>().item.launchFunnel.counts.landingCtaClicks).toBe(1);
  });

  it("enforces admin access and serves admin endpoints", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const member = await authenticateWallet({
      app: context.app,
      repository: context.repository
    });
    const forbidden = await context.app.inject({
      method: "GET",
      url: "/v1/admin/stats",
      headers: {
        authorization: `Bearer ${member.token}`
      }
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({
      code: "forbidden"
    });

    const admin = await authenticateWallet({
      app: context.app,
      repository: context.repository,
      role: UserRole.ADMIN
    });

    const stats = await context.app.inject({
      method: "GET",
      url: "/v1/admin/stats",
      headers: {
        authorization: `Bearer ${admin.token}`
      }
    });
    expect(stats.statusCode).toBe(200);
    expect(stats.json()).toMatchObject({
      item: {
        totals: {
          users: 2,
          nodeOperators: 1,
          nodes: 1
        }
      }
    });

    const operators = await context.app.inject({
      method: "GET",
      url: "/v1/admin/operators",
      headers: {
        authorization: `Bearer ${admin.token}`
      }
    });
    expect(operators.statusCode).toBe(200);
    expect(operators.json()).toMatchObject({
      items: [
        {
          operator: {
            name: "Atlas Operator",
            status: NodeOperatorStatus.ACTIVE
          },
          nodes: [
            {
              name: "atlas-devnet-1",
              status: NodeStatus.ONLINE,
              latestMetrics: {
                cpuUsage: 0.32
              }
            }
          ]
        }
      ]
    });

    const overview = await context.app.inject({
      method: "GET",
      url: "/v1/admin/overview",
      headers: {
        authorization: `Bearer ${admin.token}`
      }
    });
    expect(overview.statusCode).toBe(200);
    const overviewBody = overview.json<{
      item: {
        worker: {
          status: string;
          lastCursorKey: string | null;
        };
        protocol: {
          authorityPlan: {
            mode: string;
          };
          treasury: {
            feeWithdrawalReady: boolean;
          };
        };
        recentErrors: Array<{
          service: string;
          route: string;
          statusCode: number;
        }>;
        interestSubmissions: {
          total: number;
        };
        feedbackSubmissions: {
          total: number;
          open: number;
        };
        recentApiKeyActivity: Array<{
          label: string;
        }>;
        protocol: {
          authorityPlan: {
            mode: string;
          };
          treasury: {
            feeWithdrawalReady: boolean;
          };
        };
        launchFunnel: {
          counts: {
            landingCtaClicks: number;
          };
        };
        recentProjectActivity: unknown[];
        recentFundingEvents: unknown[];
      };
    }>();
    expect(overviewBody.item.worker).toMatchObject({
      status: "healthy",
      lastCursorKey: "metrics-aggregation"
    });
    expect(overviewBody.item.protocol).toMatchObject({
      authorityPlan: {
        mode: "single-signer"
      },
      treasury: {
        feeWithdrawalReady: false
      }
    });
    expect(overviewBody.item.recentErrors[0]).toMatchObject({
      service: "api",
      route: "/v1/admin/stats",
      statusCode: 403
    });
    expect(overviewBody.item.interestSubmissions.total).toBe(0);
    expect(overviewBody.item.feedbackSubmissions).toMatchObject({
      total: 0,
      open: 0
    });
    expect(overviewBody.item.recentApiKeyActivity).toEqual([]);
    expect(overviewBody.item.protocol.authorityPlan.mode).toBe("single-signer");
    expect(overviewBody.item.protocol.treasury.feeWithdrawalReady).toBe(false);
    expect(overviewBody.item.launchFunnel.counts.landingCtaClicks).toBe(0);
    expect(overviewBody.item.recentProjectActivity).toEqual([]);
    expect(overviewBody.item.recentFundingEvents).toEqual([]);
  });

  it("enforces API key scope dependencies when creating keys", async () => {
    const context = await createTestApp();
    appsToClose.add(context.app);

    const owner = await authenticateWallet({
      app: context.app,
      repository: context.repository
    });

    const projectResponse = await context.app.inject({
      method: "POST",
      url: "/v1/projects",
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { slug: "scope-test-project", name: "Scope Test Project" }
    });
    const projectId = projectResponse.json<{ item: { id: string } }>().item.id;

    // An API key requesting priority:relay without rpc:request is rejected — rpc:request is a
    // prerequisite for the gateway relay endpoints and must accompany priority:relay.
    const missingRpcScope = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { label: "Bad priority key", scopes: ["priority:relay"] }
    });
    expect(missingRpcScope.statusCode).toBe(400);
    expect(missingRpcScope.json()).toMatchObject({
      code: "invalid_api_key_scope_set",
      details: { requiredScopes: expect.arrayContaining(["rpc:request"]) }
    });

    // An API key requesting project:write without project:read is rejected — project:read is
    // required when project:write is granted.
    const missingReadScope = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { label: "Bad write key", scopes: ["project:write"] }
    });
    expect(missingReadScope.statusCode).toBe(400);
    expect(missingReadScope.json()).toMatchObject({
      code: "invalid_api_key_scope_set",
      details: { requiredScopes: expect.arrayContaining(["project:read"]) }
    });

    // A key with only rpc:request scope is valid and can be created — it covers the standard
    // RPC relay path but not the priority relay path.
    const rpcOnlyKey = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { label: "RPC-only key", scopes: ["rpc:request"] }
    });
    expect(rpcOnlyKey.statusCode).toBe(201);
    expect(rpcOnlyKey.json()).toMatchObject({
      item: { status: "ACTIVE" },
      plainTextKey: expect.stringMatching(/^fyxvo_live_/)
    });

    // A key with the full correct scope set for priority relay is also valid.
    const priorityKey = await context.app.inject({
      method: "POST",
      url: `/v1/projects/${projectId}/api-keys`,
      headers: { authorization: `Bearer ${owner.token}` },
      payload: { label: "Priority relay key", scopes: ["rpc:request", "priority:relay"] }
    });
    expect(priorityKey.statusCode).toBe(201);
    expect(priorityKey.json()).toMatchObject({
      item: { status: "ACTIVE" },
      plainTextKey: expect.stringMatching(/^fyxvo_live_/)
    });

    // Unauthenticated requests to project-management endpoints are always rejected regardless of
    // any API key scope — the project management API requires a JWT session.
    const noAuthProjectList = await context.app.inject({
      method: "GET",
      url: "/v1/projects"
    });
    expect(noAuthProjectList.statusCode).toBe(401);
    expect(noAuthProjectList.json()).toMatchObject({ code: "unauthorized" });
  });
});
