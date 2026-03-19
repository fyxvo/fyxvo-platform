import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
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
  CreateProjectInput,
  FundingRecordInput,
  IdempotencyLookup,
  OperatorSummary,
  ProjectAnalytics,
  ProjectWithOwner,
  RequestLogInput,
  SaveIdempotencyInput,
  UpdateProjectInput
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

  private mapUser(user: User): AuthenticatedUser & { authNonce: string } {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      authNonce: user.authNonce,
      sessionVersion: user.sessionVersion,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      status: user.status
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
        maxMs: requestLogs.reduce((max, requestLog) => Math.max(max, requestLog.durationMs), 0)
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
}

async function createTestApp(options: { rateLimitMax?: number } = {}) {
  const env = makeEnv(
    options.rateLimitMax !== undefined ? { API_RATE_LIMIT_MAX: String(options.rateLimitMax) } : {}
  );
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
      database: true,
      chain: true
    });

    const statusResponse = await healthyContext.app.inject({
      method: "GET",
      url: "/v1/status"
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      service: "fyxvo-api",
      environment: "test",
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
});
