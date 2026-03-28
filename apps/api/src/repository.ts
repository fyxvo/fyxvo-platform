import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  ApiKeyStatus,
  NodeNetwork,
  NodeOperatorStatus,
  NodeStatus,
  Prisma,
  UserRole,
  type PrismaClientType,
  type PrismaNamespace
} from "@fyxvo/database";
import type {
  ActivityLogItem,
  AssistantConversationDetail,
  AssistantMessageFeedback,
  AssistantPlaygroundPayload,
  AssistantSuggestedAction,
  AssistantConversationSummary,
  AdminObservabilitySummary,
  AdminOverviewBase,
  AdminStats,
  AlertCenterItem,
  AlertStateValue,
  AnalyticsOverview,
  ApiKeyAnalyticsItem,
  ApiKeyRecord,
  ApiRepository,
  AssistantStats,
  AuthenticatedUser,
  CreateFeedbackSubmissionInput,
  CreateInterestSubmissionInput,
  CreateOperatorRegistrationInput,
  CreateApiKeyInput,
  CreateNotificationInput,
  CreateProjectInput,
  EmailDeliveryStatus,
  ErrorLogItem,
  FundingHistoryItem,
  FundingRecordInput,
  IdempotencyLookup,
  LeaderboardEntry,
  MethodBreakdownItem,
  NetworkStats,
  NewsletterSubscribeInput,
  NotificationItem,
  NotificationPrefsUpdate,
  OperatorSummary,
  ProjectAnalytics,
  ProjectRequestLogFilters,
  ProjectRequestLogList,
  ProjectMemberItem,
  ProjectWithOwner,
  PlaygroundRecipeRecord,
  RequestLogInput,
  SaveIdempotencyInput,
  ServiceHealthHistory,
  SystemAnnouncementItem,
  UpdateProjectInput,
  WebhookItem,
  IncidentItem,
  ReferralStats,
  WhatsNewItem,
  WebhookDeliveryRecord,
  PerformanceMetricInput,
  ProjectHealthScore,
  SupportTicketRecord,
  BlogPostRecord,
  OperatorActivityItem,
  DailyRequestCount,
  AdminPlatformStats,
  NewsletterSubscriberList,
  OperatorNetworkEntry,
  OperatorRegistrationRecord,
  SearchResults
} from "./types.js";

type PrismaProject = PrismaNamespace.ProjectGetPayload<{
  include: {
    owner: true;
    members: {
      select: {
        userId: true;
      };
    };
    _count: {
      select: {
        apiKeys: true;
        requestLogs: true;
        fundingRequests: true;
      };
    };
  };
}>;

function rangeToMs(range: ProjectRequestLogFilters["range"]) {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function mapUser(user: {
  id: string;
  walletAddress: string;
  authNonce: string;
  sessionVersion: number;
  displayName: string;
  email: string | null;
  role: AuthenticatedUser["role"];
  status: AuthenticatedUser["status"];
  onboardingDismissed?: boolean;
  createdAt?: Date;
  tosAcceptedAt?: Date | null;
  emailVerified?: boolean;
}) {
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    authNonce: user.authNonce,
    sessionVersion: user.sessionVersion,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    status: user.status,
    onboardingDismissed: user.onboardingDismissed ?? false,
    createdAt: user.createdAt ?? new Date(0),
    tosAcceptedAt: user.tosAcceptedAt ?? null,
    emailVerified: user.emailVerified ?? false,
  };
}

function mapProject(project: PrismaProject): ProjectWithOwner {
  return {
    ...project,
    owner: mapUser(project.owner),
    memberUserIds: project.members
      .map((member) => member.userId)
      .filter((value): value is string => Boolean(value)),
    _count: project._count
  };
}

function shortWallet(walletAddress: string): string {
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

function effectiveApiKeyStatus(status: ApiKeyStatus, expiresAt: Date | null): string {
  if (status === ApiKeyStatus.ACTIVE && expiresAt && expiresAt.getTime() <= Date.now()) {
    return "EXPIRED";
  }
  return status;
}

function toJsonValue(value: Record<string, unknown>): PrismaNamespace.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, candidate) =>
      typeof candidate === "bigint" ? candidate.toString() : candidate
    )
  ) as PrismaNamespace.InputJsonValue;
}

function mapAssistantConversationSummary(row: {
  id: string;
  title: string;
  pinned?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  _count?: { messages?: number };
}): AssistantConversationSummary {
  return {
    id: row.id,
    title: row.title,
    pinned: row.pinned ?? false,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: row.lastMessageAt.toISOString(),
    messageCount: row._count?.messages ?? 0,
  };
}

function mapAssistantFeedback(row: {
  id: string;
  rating: string;
  note: string | null;
  createdAt: Date;
}): AssistantMessageFeedback {
  return {
    id: row.id,
    rating: row.rating as "up" | "down",
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapAssistantMessage(row: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
  projectId?: string | null;
  matchedDocsSection?: string | null;
  suggestedActions?: Prisma.JsonValue | null;
  playgroundPayload?: Prisma.JsonValue | null;
  promptCategory?: string | null;
  responseTimeMs?: number | null;
  inputTokenEstimate?: number | null;
  outputTokenEstimate?: number | null;
  feedback?: {
    id: string;
    rating: string;
    note: string | null;
    createdAt: Date;
  } | null;
}) {
  return {
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    projectId: row.projectId ?? null,
    matchedDocsSection: row.matchedDocsSection ?? null,
    suggestedActions: (row.suggestedActions as AssistantSuggestedAction[] | null | undefined) ?? [],
    playgroundPayload: (row.playgroundPayload as AssistantPlaygroundPayload | null | undefined) ?? null,
    promptCategory: row.promptCategory ?? null,
    responseTimeMs: row.responseTimeMs ?? null,
    inputTokenEstimate: row.inputTokenEstimate ?? null,
    outputTokenEstimate: row.outputTokenEstimate ?? null,
    feedback: row.feedback ? mapAssistantFeedback(row.feedback) : null,
  };
}

type AssistantFeedbackRow = {
  id: string;
  rating: string;
  note: string | null;
  createdAt: Date;
  conversationId: string;
  messageId: string;
};

export class PrismaApiRepository implements ApiRepository {
  constructor(private readonly prisma: PrismaClientType) {}

  async findUserByWallet(walletAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress }
    });
    return user ? mapUser(user) : null;
  }

  async findUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    return user ? mapUser(user) : null;
  }

  async createOrRefreshWalletUser(walletAddress: string, authNonce: string) {
    const user = await this.prisma.user.upsert({
      where: { walletAddress },
      update: {
        authNonce,
        status: "ACTIVE",
        displayName: {
          set: shortWallet(walletAddress)
        }
      },
      create: {
        walletAddress,
        authNonce,
        displayName: shortWallet(walletAddress),
        status: "ACTIVE",
        role: "MEMBER"
      }
    });

    return mapUser(user);
  }

  async rotateUserNonce(userId: string, authNonce: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { authNonce }
    });
  }

  async updateUser(userId: string, data: NotificationPrefsUpdate): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.onboardingDismissed !== undefined ? { onboardingDismissed: data.onboardingDismissed } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.notifyProjectActivation !== undefined ? { notifyProjectActivation: data.notifyProjectActivation } : {}),
        ...(data.notifyApiKeyEvents !== undefined ? { notifyApiKeyEvents: data.notifyApiKeyEvents } : {}),
        ...(data.notifyFundingConfirmed !== undefined ? { notifyFundingConfirmed: data.notifyFundingConfirmed } : {}),
        ...(data.notifyLowBalance !== undefined ? { notifyLowBalance: data.notifyLowBalance } : {}),
        ...(data.notifyDailyAlert !== undefined ? { notifyDailyAlert: data.notifyDailyAlert } : {}),
        ...(data.notifyWeeklySummary !== undefined ? { notifyWeeklySummary: data.notifyWeeklySummary } : {}),
        ...(data.notifyReferralConversion !== undefined ? { notifyReferralConversion: data.notifyReferralConversion } : {}),
      },
    });
  }

  async acceptTos(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { tosAcceptedAt: new Date() },
    });
  }

  async getNextChainProjectId() {
    const aggregate = await this.prisma.project.aggregate({
      _max: {
        chainProjectId: true
      }
    });

    return (aggregate._max.chainProjectId ?? 0n) + 1n;
  }

  async listProjects(user: AuthenticatedUser) {
    const projects = await this.prisma.project.findMany({
      where: user.role === "OWNER" || user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id, acceptedAt: { not: null } } } },
            ],
          },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            fundingRequests: true
          }
        }
      },
      orderBy: [
        { starred: "desc" },
        { createdAt: "asc" }
      ]
    });

    return projects.map(mapProject);
  }

  async findProjectById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            fundingRequests: true
          }
        }
      }
    });

    return project ? mapProject(project) : null;
  }

  async createProject(input: CreateProjectInput) {
    const project = await this.prisma.project.create({
      data: {
        ownerId: input.ownerId,
        slug: input.slug,
        name: input.name,
        chainProjectId: input.chainProjectId,
        onChainProjectPda: input.onChainProjectPda,
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.templateType !== undefined ? { templateType: input.templateType } : {})
      },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            fundingRequests: true
          }
        }
      }
    });

    return mapProject(project);
  }

  async updateProject(projectId: string, input: UpdateProjectInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = await (this.prisma.project as any).update({
      where: { id: projectId },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.lowBalanceThresholdSol !== undefined ? { lowBalanceThresholdSol: input.lowBalanceThresholdSol } : {}),
        ...(input.dailyRequestAlertThreshold !== undefined ? { dailyRequestAlertThreshold: input.dailyRequestAlertThreshold } : {}),
        ...(input.dailyBudgetLamports !== undefined ? { dailyBudgetLamports: input.dailyBudgetLamports } : {}),
        ...(input.monthlyBudgetLamports !== undefined ? { monthlyBudgetLamports: input.monthlyBudgetLamports } : {}),
        ...(input.budgetWarningThresholdPct !== undefined ? { budgetWarningThresholdPct: input.budgetWarningThresholdPct } : {}),
        ...(input.budgetHardStop !== undefined ? { budgetHardStop: input.budgetHardStop } : {}),
        ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
        ...(input.environment !== undefined ? { environment: input.environment } : {}),
        ...(input.starred !== undefined ? { starred: input.starred } : {}),
        ...(input.notes !== undefined
          ? {
              notes: input.notes,
              notesUpdatedAt: new Date(),
              notesEditedByWallet: input.notesEditedByWallet ?? null,
            }
          : {}),
        ...(input.githubUrl !== undefined ? { githubUrl: input.githubUrl } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(input.publicSlug !== undefined ? { publicSlug: input.publicSlug } : {}),
        ...(input.leaderboardVisible !== undefined ? { leaderboardVisible: input.leaderboardVisible } : {})
      },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            fundingRequests: true
          }
        }
      }
    });

    return mapProject(project);
  }

  async deleteProject(projectId: string) {
    const project = await this.prisma.project.delete({
      where: { id: projectId },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
            fundingRequests: true
          }
        }
      }
    });

    return mapProject(project);
  }

  async listApiKeys(projectId: string): Promise<ApiKeyRecord[]> {
    const rows = await this.prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        createdById: true,
        label: true,
        colorTag: true,
        prefix: true,
        status: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const latestRequestByKey = new Map<string, { region: string | null; upstreamNode: string | null }>();
    if (rows.length > 0) {
      const requestRows = await this.prisma.requestLog.findMany({
        where: {
          apiKeyId: { in: rows.map((row) => row.id) },
        },
        orderBy: { createdAt: "desc" },
        select: { apiKeyId: true, region: true, upstreamNode: true },
        take: rows.length * 5,
      });
      for (const request of requestRows) {
        if (request.apiKeyId && !latestRequestByKey.has(request.apiKeyId)) {
          latestRequestByKey.set(request.apiKeyId, {
            region: request.region ?? null,
            upstreamNode: request.upstreamNode ?? null,
          });
        }
      }
    }

    return rows.map((row) => ({
      ...row,
      status: effectiveApiKeyStatus(row.status, row.expiresAt),
      lastUsedRegion: latestRequestByKey.get(row.id)?.region ?? null,
      lastUsedUpstreamNode: latestRequestByKey.get(row.id)?.upstreamNode ?? null,
    }));
  }

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    const row = await this.prisma.apiKey.create({
      data: {
        projectId: input.projectId,
        createdById: input.createdById,
        label: input.label,
        colorTag: input.colorTag ?? null,
        prefix: input.prefix,
        keyHash: input.keyHash,
        scopes: input.scopes as PrismaNamespace.JsonArray,
        expiresAt: input.expiresAt ?? null
      },
      select: {
        id: true,
        projectId: true,
        createdById: true,
        label: true,
        colorTag: true,
        prefix: true,
        status: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return { ...row, status: effectiveApiKeyStatus(row.status, row.expiresAt), lastUsedRegion: null, lastUsedUpstreamNode: null };
  }

  async createInterestSubmission(input: CreateInterestSubmissionInput) {
    return this.prisma.interestSubmission.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        team: input.team ?? null,
        useCase: input.useCase,
        expectedRequestVolume: input.expectedRequestVolume,
        interestAreas: input.interestAreas as PrismaNamespace.JsonArray,
        operatorInterest: input.operatorInterest,
        source: input.source
      }
    });
  }

  async createFeedbackSubmission(input: CreateFeedbackSubmissionInput) {
    return this.prisma.feedbackSubmission.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role ?? null,
        team: input.team ?? null,
        walletAddress: input.walletAddress ?? null,
        projectId: input.projectId ?? null,
        category: input.category,
        message: input.message,
        source: input.source,
        page: input.page ?? null
      }
    });
  }

  async createOperatorRegistration(input: CreateOperatorRegistrationInput): Promise<OperatorRegistrationRecord> {
    return this.prisma.operatorRegistration.create({
      data: {
        endpoint: input.endpoint,
        operatorWalletAddress: input.operatorWalletAddress,
        name: input.name,
        region: input.region,
        contact: input.contact,
        status: "pending"
      }
    });
  }

  async listOperatorRegistrationsByWallet(walletAddress: string): Promise<OperatorRegistrationRecord[]> {
    return this.prisma.operatorRegistration.findMany({
      where: {
        operatorWalletAddress: walletAddress
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async getOperatorRegistrationById(id: string): Promise<OperatorRegistrationRecord | null> {
    return this.prisma.operatorRegistration.findUnique({
      where: { id }
    });
  }

  async approveOperatorRegistration(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.operatorRegistration.findUnique({
        where: { id }
      });

      if (!registration) {
        throw new Error("Operator registration not found.");
      }

      const matchingOperators = await tx.nodeOperator.findMany({
        where: {
          OR: [
            { walletAddress: registration.operatorWalletAddress },
            { email: registration.contact }
          ]
        }
      });

      const operatorByWallet = matchingOperators.find(
        (entry) => entry.walletAddress === registration.operatorWalletAddress
      );
      const operatorByEmail = matchingOperators.find((entry) => entry.email === registration.contact);

      if (operatorByWallet && operatorByEmail && operatorByWallet.id !== operatorByEmail.id) {
        throw new Error("The registration conflicts with an existing operator record.");
      }

      const operator =
        operatorByWallet ??
        operatorByEmail ??
        (await tx.nodeOperator.create({
          data: {
            name: registration.name,
            email: registration.contact,
            walletAddress: registration.operatorWalletAddress,
            status: NodeOperatorStatus.ACTIVE
          }
        }));

      const ensuredOperator =
        operatorByWallet || operatorByEmail
          ? await tx.nodeOperator.update({
              where: { id: operator.id },
              data: {
                name: registration.name,
                email: registration.contact,
                walletAddress: registration.operatorWalletAddress,
                status: NodeOperatorStatus.ACTIVE
              }
            })
          : operator;

      const existingNode = await tx.node.findUnique({
        where: { endpoint: registration.endpoint }
      });

      const nodeName = registration.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "fyxvo-operator-node";
      const node =
        existingNode
          ? await tx.node.update({
              where: { id: existingNode.id },
              data: {
                operatorId: ensuredOperator.id,
                name: nodeName,
                network: NodeNetwork.DEVNET,
                endpoint: registration.endpoint,
                region: registration.region,
                status: NodeStatus.ONLINE
              }
            })
          : await tx.node.create({
              data: {
                operatorId: ensuredOperator.id,
                name: nodeName,
                network: NodeNetwork.DEVNET,
                endpoint: registration.endpoint,
                region: registration.region,
                status: NodeStatus.ONLINE
              }
            });

      const approvedRegistration = await tx.operatorRegistration.update({
        where: { id: registration.id },
        data: {
          status: "approved",
          rejectionReason: null,
          approvedAt: new Date()
        }
      });

      return {
        registration: approvedRegistration,
        operator: ensuredOperator,
        node
      };
    });
  }

  async rejectOperatorRegistration(id: string, reason?: string | null): Promise<OperatorRegistrationRecord | null> {
    const existing = await this.prisma.operatorRegistration.findUnique({
      where: { id }
    });

    if (!existing) {
      return null;
    }

    return this.prisma.operatorRegistration.update({
      where: { id },
      data: {
        status: "rejected",
        rejectionReason: reason ?? null
      }
    });
  }

  async listActiveOperatorNetwork(): Promise<OperatorNetworkEntry[]> {
    const nodes = await this.prisma.node.findMany({
      where: {
        network: NodeNetwork.DEVNET,
        status: {
          in: [NodeStatus.ONLINE, NodeStatus.DEGRADED]
        }
      },
      include: {
        operator: true
      },
      orderBy: [
        { createdAt: "asc" },
        { name: "asc" }
      ]
    });

    return nodes.map((node) => ({
      name: node.operator.name,
      region: node.region,
      endpointHost: new URL(node.endpoint).hostname
    }));
  }

  async revokeApiKey(projectId: string, apiKeyId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        projectId
      }
    });

    if (!existing) {
      return null;
    }

    return this.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        revokedAt: new Date()
      },
      select: {
        id: true,
        projectId: true,
        createdById: true,
        label: true,
        colorTag: true,
        prefix: true,
        status: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true
      }
    }).then((row) => ({ ...row, status: effectiveApiKeyStatus(row.status, row.expiresAt), lastUsedRegion: null, lastUsedUpstreamNode: null }));
  }

  async saveFundingCoordinate(input: FundingRecordInput) {
    return this.prisma.fundingCoordinate.create({
      data: input
    });
  }

  async findFundingCoordinate(fundingRequestId: string) {
    return this.prisma.fundingCoordinate.findUnique({
      where: { id: fundingRequestId }
    });
  }

  async confirmFundingCoordinate(input: {
    readonly fundingRequestId: string;
    readonly transactionSignature: string;
    readonly confirmedAt: Date;
  }) {
    return this.prisma.fundingCoordinate.update({
      where: { id: input.fundingRequestId },
      data: {
        transactionSignature: input.transactionSignature,
        confirmedAt: input.confirmedAt
      }
    });
  }

  async getAnalyticsOverview(projectIds?: readonly string[]): Promise<AnalyticsOverview> {
    const where = projectIds ? { projectId: { in: [...projectIds] } } : {};
    const [projects, apiKeys, fundingRequests, requestLogs, latency, byService] = await Promise.all([
      this.prisma.project.count({ where: projectIds ? { id: { in: [...projectIds] } } : {} }),
      this.prisma.apiKey.count({ where: projectIds ? { projectId: { in: [...projectIds] } } : {} }),
      this.prisma.fundingCoordinate.count({
        where: projectIds ? { projectId: { in: [...projectIds] } } : {}
      }),
      this.prisma.requestLog.count({ where }),
      this.prisma.requestLog.aggregate({
        where,
        _avg: { durationMs: true },
        _max: { durationMs: true }
      }),
      this.prisma.requestLog.groupBy({
        by: ["service"],
        where,
        _count: { service: true }
      })
    ]);

    return {
      totals: {
        projects,
        apiKeys,
        fundingRequests,
        requestLogs
      },
      latency: {
        averageMs: Math.round(latency._avg.durationMs ?? 0),
        maxMs: latency._max.durationMs ?? 0
      },
      requestsByService: byService.map((entry: { service: string; _count: { service: number } }) => ({
        service: entry.service,
        count: entry._count.service
      }))
    };
  }

  async getAdminStats(): Promise<AdminStats> {
    const [users, projects, apiKeys, nodes, nodeOperators, fundingRequests, requestLogs] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.apiKey.count(),
        this.prisma.node.count(),
        this.prisma.nodeOperator.count(),
        this.prisma.fundingCoordinate.count(),
        this.prisma.requestLog.count()
      ]);

    return {
      totals: {
        users,
        projects,
        apiKeys,
        nodes,
        nodeOperators,
        fundingRequests,
        requestLogs
      }
    };
  }

  async getAdminOverview(): Promise<AdminOverviewBase> {
    const staleThresholdMinutes = 15;
    const launchFunnelPeriodDays = 14;
    const launchFunnelWindowStart = new Date(Date.now() - launchFunnelPeriodDays * 24 * 60 * 60 * 1000);
    const launchEventRoutes = {
      landingCtaClicks: "/events/landing_cta_clicked",
      walletConnectIntent: "/events/wallet_connect_intent",
      projectCreationStarted: "/events/project_creation_started",
      fundingFlowStarted: "/events/funding_flow_started",
      apiKeyCreated: "/events/api_key_created",
      interestSubmitted: "/events/interest_form_submitted"
    } as const;
    const [latestCursor, latestRollup, recentErrors, recentFundingEvents, recentProjectActivity, interestSubmissionTotal, recentInterestSubmissions, recentApiKeyActivity, feedbackSubmissionTotal, openFeedbackSubmissionCount, recentFeedbackSubmissions, launchEventCounts] =
      await Promise.all([
        this.prisma.workerCursor.findFirst({
          orderBy: {
            updatedAt: "desc"
          },
          select: {
            key: true,
            updatedAt: true
          }
        }),
        this.prisma.projectUsageRollup.findFirst({
          orderBy: {
            updatedAt: "desc"
          },
          select: {
            updatedAt: true
          }
        }),
        this.prisma.requestLog.findMany({
          where: {
            statusCode: {
              gte: 400
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 8,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }),
        this.prisma.fundingCoordinate.findMany({
          orderBy: {
            createdAt: "desc"
          },
          take: 8,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            requestedBy: {
              select: {
                id: true,
                displayName: true,
                walletAddress: true
              }
            }
          }
        }),
        this.prisma.requestLog.findMany({
          where: {
            projectId: {
              not: null
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 8,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }),
        this.prisma.interestSubmission.count(),
        this.prisma.interestSubmission.findMany({
          orderBy: {
            createdAt: "desc"
          },
          take: 8
        }),
        this.prisma.apiKey.findMany({
          orderBy: [
            {
              lastUsedAt: "desc"
            },
            {
              createdAt: "desc"
            }
          ],
          take: 8,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            createdBy: {
              select: {
                id: true,
                displayName: true,
                walletAddress: true
              }
            }
          }
        }),
        this.prisma.feedbackSubmission.count(),
        this.prisma.feedbackSubmission.count({
          where: {
            status: {
              in: ["NEW", "REVIEWING", "FOLLOW_UP"]
            }
          }
        }),
        this.prisma.feedbackSubmission.findMany({
          orderBy: {
            createdAt: "desc"
          },
          take: 8,
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }),
        this.prisma.requestLog.groupBy({
          by: ["route"],
          where: {
            service: "web",
            route: {
              in: Object.values(launchEventRoutes)
            },
            createdAt: {
              gte: launchFunnelWindowStart
            }
          },
          _count: {
            route: true
          }
        })
      ]);

    const freshestWorkerTimestamp = Math.max(
      latestCursor?.updatedAt.getTime() ?? 0,
      latestRollup?.updatedAt.getTime() ?? 0
    );
    const workerStatus =
      freshestWorkerTimestamp === 0
        ? "idle"
        : Date.now() - freshestWorkerTimestamp <= staleThresholdMinutes * 60_000
          ? "healthy"
          : "attention";
    const launchCountsByRoute = new Map(
      launchEventCounts.map((entry: { route: string; _count: { route: number } }) => [
        entry.route,
        entry._count.route
      ])
    );

    return {
      worker: {
        status: workerStatus,
        lastCursorAt: latestCursor?.updatedAt ?? null,
        lastCursorKey: latestCursor?.key ?? null,
        lastRollupAt: latestRollup?.updatedAt ?? null,
        staleThresholdMinutes
      },
      recentErrors: recentErrors.map((entry) => ({
        id: entry.id,
        service: entry.service,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        createdAt: entry.createdAt,
        project: entry.project
      })),
      recentFundingEvents: recentFundingEvents.map((entry) => ({
        id: entry.id,
        asset: entry.asset,
        amount: entry.amount.toString(),
        createdAt: entry.createdAt,
        confirmedAt: entry.confirmedAt,
        transactionSignature: entry.transactionSignature,
        project: entry.project,
        requestedBy: entry.requestedBy
      })),
      recentProjectActivity: recentProjectActivity.map((entry) => ({
        id: entry.id,
        service: entry.service,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        durationMs: entry.durationMs,
        createdAt: entry.createdAt,
        project: entry.project
      })),
      interestSubmissions: {
        total: interestSubmissionTotal,
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
      recentApiKeyActivity: recentApiKeyActivity.map((entry) => ({
        id: entry.id,
        label: entry.label,
        prefix: entry.prefix,
        status: entry.status,
        lastUsedAt: entry.lastUsedAt,
        createdAt: entry.createdAt,
        project: entry.project,
        createdBy: entry.createdBy
      })),
      feedbackSubmissions: {
        total: feedbackSubmissionTotal,
        open: openFeedbackSubmissionCount,
        recent: recentFeedbackSubmissions.map((entry) => ({
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
          project: entry.project
        }))
      },
      launchFunnel: {
        periodDays: launchFunnelPeriodDays,
        counts: {
          landingCtaClicks: launchCountsByRoute.get(launchEventRoutes.landingCtaClicks) ?? 0,
          walletConnectIntent: launchCountsByRoute.get(launchEventRoutes.walletConnectIntent) ?? 0,
          projectCreationStarted: launchCountsByRoute.get(launchEventRoutes.projectCreationStarted) ?? 0,
          fundingFlowStarted: launchCountsByRoute.get(launchEventRoutes.fundingFlowStarted) ?? 0,
          apiKeyCreated: launchCountsByRoute.get(launchEventRoutes.apiKeyCreated) ?? 0,
          interestSubmitted: launchCountsByRoute.get(launchEventRoutes.interestSubmitted) ?? 0
        }
      }
    };
  }

  async listOperators(): Promise<OperatorSummary[]> {
    const operators = await this.prisma.nodeOperator.findMany({
      include: {
        nodes: {
          include: {
            metrics: {
              orderBy: {
                recordedAt: "desc"
              },
              take: 1
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return operators.map((operator: (typeof operators)[number]) => ({
      operator,
      nodes: operator.nodes.map((node: (typeof operator.nodes)[number]) => ({
        ...node,
        ...(node.metrics[0]
          ? {
              latestMetrics: {
                cpuUsage: node.metrics[0].cpuUsage,
                memoryUsage: node.metrics[0].memoryUsage,
                errorRate: node.metrics[0].errorRate,
                recordedAt: node.metrics[0].recordedAt
              }
            }
          : {})
      }))
    }));
  }

  async getIdempotencyRecord(input: IdempotencyLookup) {
    return this.prisma.idempotencyRecord.findUnique({
      where: {
        key_method_route_actorKey: {
          key: input.key,
          method: input.method,
          route: input.route,
          actorKey: input.actorKey
        }
      }
    });
  }

  async saveIdempotencyRecord(input: SaveIdempotencyInput) {
    return this.prisma.idempotencyRecord.upsert({
      where: {
        key_method_route_actorKey: {
          key: input.key,
          method: input.method,
          route: input.route,
          actorKey: input.actorKey
        }
      },
      update: {
        requestHash: input.requestHash,
        statusCode: input.statusCode,
        responseBody: toJsonValue(input.responseBody),
        expiresAt: input.expiresAt
      },
      create: {
        key: input.key,
        route: input.route,
        method: input.method,
        actorKey: input.actorKey,
        requestHash: input.requestHash,
        statusCode: input.statusCode,
        responseBody: toJsonValue(input.responseBody),
        expiresAt: input.expiresAt
      }
    });
  }

  async getNotifications(userId: string, _projectIds: readonly string[]): Promise<NotificationItem[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { project: { select: { id: true, name: true } } }
    });

    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      projectId: n.projectId ?? null,
      projectName: n.project?.name ?? null,
      createdAt: n.createdAt.toISOString()
    }));
  }

  async createNotification(input: CreateNotificationInput): Promise<NotificationItem> {
    const n = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.metadata ? { metadata: input.metadata as PrismaNamespace.InputJsonValue } : {})
      },
      include: { project: { select: { id: true, name: true } } }
    });

    return {
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      projectId: n.projectId ?? null,
      projectName: n.project?.name ?? null,
      createdAt: n.createdAt.toISOString()
    };
  }

  async markNotificationRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true }
    });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });
  }

  async getProjectAnalytics(projectId: string, since?: Date): Promise<ProjectAnalytics> {
    const where = since ? { projectId, createdAt: { gte: since } } : { projectId };

    const [project, requestSummary, statusCodes, recentRequests] = await Promise.all([
      this.prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: {
          owner: true,
          members: {
            select: { userId: true },
          },
          _count: {
            select: {
              apiKeys: true,
              requestLogs: true,
              fundingRequests: true
            }
          }
        }
      }),
      this.prisma.requestLog.aggregate({
        where,
        _avg: { durationMs: true },
        _max: { durationMs: true }
      }),
      this.prisma.requestLog.groupBy({
        by: ["statusCode"],
        where,
        _count: { statusCode: true }
      }),
      this.prisma.requestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

    const allLatencies = await this.prisma.requestLog.findMany({
      where,
      select: { durationMs: true },
      orderBy: { durationMs: "asc" }
    });
    const p95Index = Math.floor(allLatencies.length * 0.95);
    const p95Ms = allLatencies[Math.max(0, p95Index - 1)]?.durationMs ?? 0;

    return {
      project: mapProject(project),
      totals: {
        requestLogs: project._count.requestLogs,
        apiKeys: project._count.apiKeys,
        fundingRequests: project._count.fundingRequests
      },
      latency: {
        averageMs: Math.round(requestSummary._avg.durationMs ?? 0),
        maxMs: requestSummary._max.durationMs ?? 0,
        p95Ms
      },
      statusCodes: statusCodes.map((entry: { statusCode: number; _count: { statusCode: number } }) => ({
        statusCode: entry.statusCode,
        count: entry._count.statusCode
      })),
      recentRequests
    };
  }

  async getApiKeyAnalytics(projectId: string, apiKeyId: string, since: Date): Promise<ApiKeyAnalyticsItem> {
    const where = { projectId, apiKeyId, createdAt: { gte: since } };

    const [summary, errorCount, dailyData] = await Promise.all([
      this.prisma.requestLog.aggregate({
        where,
        _count: { id: true },
        _avg: { durationMs: true }
      }),
      this.prisma.requestLog.count({ where: { ...where, statusCode: { gte: 400 } } }),
      this.prisma.$queryRaw<Array<{ date: string; count: bigint; errors: bigint }>>`
        SELECT DATE("createdAt")::text AS date,
               COUNT(*) AS count,
               COUNT(*) FILTER (WHERE "statusCode" >= 400) AS errors
        FROM "RequestLog"
        WHERE "projectId" = ${projectId}
          AND "apiKeyId" = ${apiKeyId}
          AND "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 7
      `
    ]);

    const total = summary._count.id ?? 0;
    const allLatencies = await this.prisma.requestLog.findMany({
      where,
      select: { durationMs: true },
      orderBy: { durationMs: "asc" }
    });
    const p95Index = Math.ceil(allLatencies.length * 0.95) - 1;
    const p95 = allLatencies[Math.max(0, p95Index)]?.durationMs ?? 0;

    return {
      apiKeyId,
      totalRequests: total,
      successRequests: total - errorCount,
      errorRequests: errorCount,
      errorRate: total > 0 ? errorCount / total : 0,
      averageLatencyMs: Math.round(summary._avg.durationMs ?? 0),
      p95LatencyMs: p95,
      dailyBuckets: dailyData.map((row) => ({
        date: row.date,
        count: Number(row.count),
        errors: Number(row.errors)
      }))
    };
  }

  async getMethodBreakdown(projectId: string, since: Date): Promise<MethodBreakdownItem[]> {
    const grouped = await this.prisma.requestLog.groupBy({
      by: ["route", "service"],
      where: { projectId, createdAt: { gte: since } },
      _count: { id: true },
      _avg: { durationMs: true },
      orderBy: { _count: { id: "desc" } },
      take: 10
    });

    const results: MethodBreakdownItem[] = [];
    for (const row of grouped) {
      const errorCount = await this.prisma.requestLog.count({
        where: { projectId, route: row.route, service: row.service, createdAt: { gte: since }, statusCode: { gte: 400 } }
      });
      const total = row._count.id;
      results.push({
        route: row.route,
        service: row.service,
        count: total,
        averageLatencyMs: Math.round(row._avg.durationMs ?? 0),
        errorRate: total > 0 ? errorCount / total : 0,
        errorCount
      });
    }

    return results;
  }

  async getErrorLog(projectId: string, limit: number): Promise<ErrorLogItem[]> {
    const errors = await this.prisma.requestLog.findMany({
      where: { projectId, statusCode: { gte: 400 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { apiKey: { select: { prefix: true } } }
    });

    return errors.map((entry) => ({
      id: entry.id,
      route: entry.route,
      method: entry.method,
      service: entry.service,
      statusCode: entry.statusCode,
      durationMs: entry.durationMs,
      createdAt: entry.createdAt.toISOString(),
      apiKeyPrefix: entry.apiKey?.prefix ?? null
    }));
  }

  async getExportRows(projectId: string, since: Date): Promise<Array<Record<string, string | number>>> {
    const rows = await this.prisma.requestLog.findMany({
      where: { projectId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10000,
      select: {
        id: true,
        service: true,
        route: true,
        method: true,
        statusCode: true,
        durationMs: true,
        createdAt: true
      }
    });

    return rows.map((row) => ({
      id: row.id,
      service: row.service,
      route: row.route,
      method: row.method,
      statusCode: row.statusCode,
      durationMs: row.durationMs,
      createdAt: row.createdAt.toISOString()
    }));
  }

  async listProjectRequestLogs(projectId: string, filters: ProjectRequestLogFilters): Promise<ProjectRequestLogList> {
    const page = Math.max(1, filters.page);
    const pageSize = Math.min(1000, Math.max(10, filters.pageSize));
    const since = filters.range ? new Date(Date.now() - rangeToMs(filters.range)) : undefined;
    const where: Prisma.RequestLogWhereInput = {
      projectId,
      ...(since ? { createdAt: { gte: since } } : {}),
      ...(filters.method ? { route: { equals: filters.method, mode: "insensitive" } } : {}),
      ...(filters.apiKey ? { apiKey: { prefix: { equals: filters.apiKey, mode: "insensitive" } } } : {}),
      ...(filters.mode ? { mode: filters.mode } : {}),
      ...(filters.simulatedOnly ? { simulated: true } : {}),
      ...(filters.errorsOnly ? { statusCode: { gte: 400 } } : {}),
      ...(filters.status === "success" ? { statusCode: { lt: 400 } } : {}),
      ...(filters.status === "error" ? { statusCode: { gte: 400 } } : {}),
      ...(filters.search
        ? {
            OR: [
              { route: { contains: filters.search, mode: "insensitive" } },
              { requestId: { contains: filters.search, mode: "insensitive" } },
              { upstreamNode: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [totalCount, rows] = await Promise.all([
      this.prisma.requestLog.count({ where }),
      this.prisma.requestLog.findMany({
        where,
        include: {
          apiKey: {
            select: {
              prefix: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        traceId: row.requestId ?? null,
        timestamp: row.createdAt.toISOString(),
        route: row.route,
        httpMethod: row.method,
        mode: row.mode === "standard" || row.mode === "priority" ? row.mode : null,
        latencyMs: row.durationMs,
        success: row.statusCode < 400,
        statusCode: row.statusCode,
        apiKeyPrefix: row.apiKey?.prefix ?? null,
        simulated: row.simulated,
        upstreamNode: row.upstreamNode ?? null,
        region: row.region ?? null,
        requestSize: row.requestSize ?? null,
        responseSize: row.responseSize ?? null,
        cacheHit: row.cacheHit ?? null,
        fyxvoHint: row.fyxvoHint ?? null,
        service: row.service,
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  }

  async recordRequestLog(input: RequestLogInput) {
    const data: Prisma.RequestLogUncheckedCreateInput = {
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      service: input.service,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      ...(input.requestId ? { requestId: input.requestId } : {}),
      ...(input.region ? { region: input.region } : {}),
      ...(typeof input.requestSize === "number" ? { requestSize: input.requestSize } : {}),
      ...(typeof input.responseSize === "number" ? { responseSize: input.responseSize } : {}),
      ...(input.upstreamNode ? { upstreamNode: input.upstreamNode } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(typeof input.simulated === "boolean" ? { simulated: input.simulated } : {}),
      ...(typeof input.cacheHit === "boolean" ? { cacheHit: input.cacheHit } : {}),
      ...(input.fyxvoHint !== undefined
        ? {
            fyxvoHint:
              input.fyxvoHint === null
                ? Prisma.JsonNull
                : (input.fyxvoHint as PrismaNamespace.InputJsonValue),
          }
        : {}),
    };

    if (input.requestId) {
      const existingRequest = await this.prisma.requestLog.findUnique({
        where: {
          requestId: input.requestId
        },
        select: {
          id: true
        }
      });

      if (existingRequest) {
        const { requestId: _requestId, ...withoutRequestId } = data;
        await this.prisma.requestLog.create({
          data: withoutRequestId
        });
        return;
      }
    }

    await this.prisma.requestLog.create({
      data
    });
  }

  async getServiceHealthHistory(limitPerService: number): Promise<ServiceHealthHistory> {
    const services = ["api", "gateway", "worker"];
    const result: ServiceHealthHistory = {};

    await Promise.all(
      services.map(async (serviceName) => {
        const rows = await this.prisma.serviceHealthSnapshot.findMany({
          where: { serviceName },
          orderBy: { checkedAt: "desc" },
          take: limitPerService
        });

        result[serviceName] = rows.map((row) => ({
          id: row.id,
          serviceName: row.serviceName,
          status: row.status,
          responseTimeMs: row.responseTimeMs,
          errorMessage: row.errorMessage,
          checkedAt: row.checkedAt.toISOString()
        }));
      })
    );

    return result;
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [totalRequests, totalProjects, totalApiKeys, feeResult] = await Promise.all([
      this.prisma.requestLog.count(),
      this.prisma.project.count(),
      this.prisma.apiKey.count(),
      this.prisma.fundingCoordinate.aggregate({
        where: { confirmedAt: { not: null } },
        _sum: { amount: true },
      }),
    ]);
    const totalSolFees = (feeResult._sum.amount ?? 0n).toString();
    return { totalRequests, totalProjects, totalApiKeys, totalSolFees, updatedAt: new Date().toISOString() };
  }

  async getFundingHistory(_userId: string, projectIds: readonly string[]): Promise<FundingHistoryItem[]> {
    const rows = await this.prisma.fundingCoordinate.findMany({
      where: {
        projectId: { in: [...projectIds] }
      },
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      projectName: row.project.name,
      asset: row.asset,
      amount: row.amount.toString(),
      status: row.confirmedAt ? "confirmed" : "pending",
      transactionSignature: row.transactionSignature ?? null,
      createdAt: row.createdAt.toISOString(),
      confirmedAt: row.confirmedAt ? row.confirmedAt.toISOString() : null
    }));
  }

  async getAssistantStats(): Promise<AssistantStats> {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const assistantRoute = "/v1/assistant/chat";

    const [
      requestsToday,
      requestsThisWeek,
      failedRequestsToday,
      failedRequestsThisWeek,
      internalFailuresToday,
      responseTimeAggregate,
      rateLimitHitsToday,
      recentLogs,
      assistantMessages,
      feedbackRows,
      recentFailureRows,
    ] =
      await Promise.all([
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: { lt: 400 },
            createdAt: { gte: startOfToday },
          },
        }),
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: { lt: 400 },
            createdAt: { gte: startOfWeek },
          },
        }),
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: { gte: 400 },
            createdAt: { gte: startOfToday },
          },
        }),
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: { gte: 400 },
            createdAt: { gte: startOfWeek },
          },
        }),
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: { gte: 500 },
            createdAt: { gte: startOfToday },
          },
        }),
        this.prisma.requestLog.aggregate({
          where: {
            route: assistantRoute,
            statusCode: { lt: 400 },
            createdAt: { gte: startOfWeek },
          },
          _avg: { durationMs: true },
        }),
        this.prisma.requestLog.count({
          where: {
            route: assistantRoute,
            statusCode: 429,
            createdAt: { gte: startOfToday },
          },
        }),
        this.prisma.requestLog.findMany({
          where: {
            route: assistantRoute,
            statusCode: { lt: 400 },
            createdAt: { gte: startOfWeek },
          },
          select: { createdAt: true },
        }),
        this.prisma.assistantMessage.findMany({
          where: {
            role: "assistant",
            createdAt: { gte: startOfWeek },
          },
          select: {
            matchedDocsSection: true,
            promptCategory: true,
            outputTokenEstimate: true,
          },
        }),
        this.prisma.assistantFeedback.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            rating: true,
            note: true,
            createdAt: true,
            conversationId: true,
            messageId: true,
          },
        }),
        this.prisma.requestLog.findMany({
          where: {
            route: assistantRoute,
            statusCode: { gte: 400 },
            createdAt: { gte: startOfWeek },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            statusCode: true,
            createdAt: true,
            durationMs: true,
          },
        }),
      ]);

    const countsByDay = new Map<string, number>();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(startOfToday.getTime() - offset * 24 * 60 * 60 * 1000);
      countsByDay.set(date.toISOString().slice(0, 10), 0);
    }
    for (const row of recentLogs) {
      const key = row.createdAt.toISOString().slice(0, 10);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const promptCategories = new Map<string, number>();
    const docsSections = new Map<string, number>();
    let outputTokenTotal = 0;
    let outputTokenCount = 0;
    for (const message of assistantMessages) {
      if (message.promptCategory) {
        promptCategories.set(message.promptCategory, (promptCategories.get(message.promptCategory) ?? 0) + 1);
      }
      if (message.matchedDocsSection) {
        docsSections.set(message.matchedDocsSection, (docsSections.get(message.matchedDocsSection) ?? 0) + 1);
      }
      if (typeof message.outputTokenEstimate === "number") {
        outputTokenTotal += message.outputTokenEstimate;
        outputTokenCount += 1;
      }
    }

    const [positive, negative, withNotes] = await Promise.all([
      this.prisma.assistantFeedback.count({ where: { rating: "up" } }),
      this.prisma.assistantFeedback.count({ where: { rating: "down" } }),
      this.prisma.assistantFeedback.count({ where: { note: { not: null } } }),
    ]);

    return {
      requestsToday,
      requestsThisWeek,
      failedRequestsToday,
      failedRequestsThisWeek,
      internalFailuresToday,
      averageResponseTimeMs: Math.round(responseTimeAggregate._avg.durationMs ?? 0),
      averageTokensPerResponse: outputTokenCount > 0 ? Math.round(outputTokenTotal / outputTokenCount) : 0,
      rateLimitHitsToday,
      messagesPerDay: [...countsByDay.entries()].map(([date, count]) => ({ date, count })),
      topPromptCategories: [...promptCategories.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count })),
      topLinkedDocsSections: [...docsSections.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([section, count]) => ({ section, count })),
      feedback: {
        positive,
        negative,
        withNotes,
        recent: feedbackRows.map((row: AssistantFeedbackRow) => ({
          id: row.id,
          rating: row.rating as "up" | "down",
          note: row.note,
          createdAt: row.createdAt.toISOString(),
          conversationId: row.conversationId,
          messageId: row.messageId,
        })),
      },
      recentFailures: recentFailureRows.map((row) => ({
        statusCode: row.statusCode,
        createdAt: row.createdAt.toISOString(),
        durationMs: row.durationMs,
      })),
    };
  }

  async getAdminObservability(): Promise<AdminObservabilitySummary> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const assistantRoute = "/v1/assistant/chat";

    const [
      topFailingMethods,
      topWebhookFailureDestinations,
      errorProjects,
      runwayProjects,
      assistantAggregate,
      assistantFailures,
      supportCategories,
    ] = await Promise.all([
      this.prisma.requestLog.groupBy({
        by: ["route"],
        where: {
          service: "gateway",
          statusCode: { gte: 400 },
          createdAt: { gte: since24h },
        },
        _count: { route: true },
        orderBy: { _count: { route: "desc" } },
        take: 5,
      }),
      this.prisma.webhookDelivery.groupBy({
        by: ["webhookId"],
        where: {
          status: { in: ["failed", "permanent_failure"] },
          createdAt: { gte: since24h },
        },
        _count: { webhookId: true },
        orderBy: { _count: { webhookId: "desc" } },
        take: 5,
      }),
      this.prisma.project.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          requestLogs: {
            where: { createdAt: { gte: since24h } },
            select: { statusCode: true },
          },
        },
      }),
      this.prisma.project.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          requestLogs: {
            where: { createdAt: { gte: since7d } },
            select: { id: true },
          },
          fundingRequests: {
            where: { confirmedAt: { not: null } },
            select: { amount: true },
          },
        },
      }),
      this.prisma.requestLog.aggregate({
        where: {
          route: assistantRoute,
          createdAt: { gte: since24h },
        },
        _avg: { durationMs: true },
      }),
      this.prisma.requestLog.findMany({
        where: {
          route: assistantRoute,
          createdAt: { gte: since24h },
        },
        select: { statusCode: true },
      }),
      this.prisma.supportTicket.groupBy({
        by: ["category"],
        _count: { category: true },
        orderBy: { _count: { category: "desc" } },
        take: 5,
      }),
    ]);

    const webhookIds = topWebhookFailureDestinations.map((entry) => entry.webhookId);
    const webhookLookup = webhookIds.length > 0
      ? await this.prisma.webhook.findMany({
          where: { id: { in: webhookIds } },
          select: { id: true, url: true },
        })
      : [];
    const webhookUrlById = new Map(webhookLookup.map((item) => [item.id, item.url]));

    return {
      topFailingMethods: topFailingMethods.map((entry) => ({
        route: entry.route,
        count: entry._count.route,
      })),
      topWebhookFailureDestinations: topWebhookFailureDestinations.map((entry) => ({
        url: webhookUrlById.get(entry.webhookId) ?? entry.webhookId,
        failures: entry._count.webhookId,
      })),
      highestErrorRateProjects: errorProjects
        .map((project) => {
          const totalRequests = project.requestLogs.length;
          const errorCount = project.requestLogs.filter((row) => row.statusCode >= 400).length;
          return {
            projectId: project.id,
            projectName: project.name,
            slug: project.slug,
            errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
            totalRequests,
          };
        })
        .filter((project) => project.totalRequests > 0)
        .sort((left, right) => right.errorRate - left.errorRate || right.totalRequests - left.totalRequests)
        .slice(0, 5),
      lowestRemainingRunwayProjects: runwayProjects
        .map((project) => {
          const fundedLamports = project.fundingRequests.reduce((sum, row) => sum + Number(row.amount), 0);
          return {
            projectId: project.id,
            projectName: project.name,
            slug: project.slug,
            treasurySol: fundedLamports > 0 ? fundedLamports / 1_000_000_000 : null,
            requestCount7d: project.requestLogs.length,
          };
        })
        .sort((left, right) => {
          const leftRunway = left.treasurySol ?? Number.POSITIVE_INFINITY;
          const rightRunway = right.treasurySol ?? Number.POSITIVE_INFINITY;
          return leftRunway - rightRunway || right.requestCount7d - left.requestCount7d;
        })
        .slice(0, 5),
      assistant: {
        errorRate:
          assistantFailures.length > 0
            ? assistantFailures.filter((row) => row.statusCode >= 400).length / assistantFailures.length
            : 0,
        averageLatencyMs: Math.round(assistantAggregate._avg.durationMs ?? 0),
      },
      supportCategories: supportCategories.map((entry) => ({
        category: entry.category,
        count: entry._count.category,
      })),
    };
  }

  async listIncidents(limit: number): Promise<IncidentItem[]> {
    const rows = await this.prisma.incident.findMany({
      include: {
        updates: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { startedAt: "desc" },
      take: limit
    });
    return rows.map((row) => ({
      id: row.id,
      serviceName: row.serviceName,
      severity: row.severity,
      description: row.description,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      updates: row.updates.map((update) => ({
        id: update.id,
        status: update.status,
        severity: update.severity ?? null,
        message: update.message,
        affectedServices: update.affectedServices,
        createdAt: update.createdAt.toISOString(),
      })),
    }));
  }

  async createIncident(input: { serviceName: string; severity: string; description: string }): Promise<IncidentItem> {
    const row = await this.prisma.incident.create({
      data: {
        serviceName: input.serviceName,
        severity: input.severity,
        description: input.description,
        updates: {
          create: {
            status: "opened",
            severity: input.severity,
            message: input.description,
            affectedServices: [input.serviceName],
          },
        },
      },
      include: {
        updates: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return {
      id: row.id,
      serviceName: row.serviceName,
      severity: row.severity,
      description: row.description,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      updates: row.updates.map((update) => ({
        id: update.id,
        status: update.status,
        severity: update.severity ?? null,
        message: update.message,
        affectedServices: update.affectedServices,
        createdAt: update.createdAt.toISOString(),
      })),
    };
  }

  async updateIncident(
    id: string,
    input: { severity?: string; description?: string; resolvedAt?: Date | null }
  ): Promise<IncidentItem> {
    const row = await this.prisma.incident.update({
      where: { id },
      data: {
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.resolvedAt !== undefined ? { resolvedAt: input.resolvedAt } : {}),
      },
      include: {
        updates: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return {
      id: row.id,
      serviceName: row.serviceName,
      severity: row.severity,
      description: row.description,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
      updates: row.updates.map((update) => ({
        id: update.id,
        status: update.status,
        severity: update.severity ?? null,
        message: update.message,
        affectedServices: update.affectedServices,
        createdAt: update.createdAt.toISOString(),
      })),
    };
  }

  async getReferralStats(userId: string): Promise<ReferralStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralClicks: true }
    });
    if (!user) {
      return { referralCode: null, totalClicks: 0, conversions: 0 };
    }
    return {
      referralCode: user.referralCode,
      totalClicks: user.referralClicks.length,
      conversions: user.referralClicks.filter((c) => c.convertedToSignup).length
    };
  }

  async recordReferralClick(referralCode: string): Promise<{ referrerId: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true }
    });
    if (!user) return null;

    await this.prisma.referralClick.create({
      data: { referrerId: user.id }
    });
    return { referrerId: user.id };
  }

  async generateReferralCode(userId: string): Promise<string> {
    // Generate unique 8-char alphanumeric code
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code: string;
    let attempts = 0;
    do {
      code = Array.from(randomBytes(8))
        .map((b) => alphabet[b % alphabet.length])
        .join("");
      const existing = await this.prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code }
    });
    return code;
  }

  async countAssistantMessagesThisHour(userId: string, since: Date): Promise<number> {
    return this.prisma.requestLog.count({
      where: {
        userId,
        route: "/v1/assistant/chat",
        createdAt: { gte: since },
        statusCode: { lt: 400 },
      }
    });
  }

  async listWebhooks(projectId: string): Promise<WebhookItem[]> {
    const rows = await this.prisma.webhook.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" }
    });
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      url: r.url,
      events: r.events as string[],
      secret: r.secret,
      active: r.active,
      lastTriggeredAt: r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createWebhook(input: { projectId: string; url: string; events: string[]; secret: string }): Promise<WebhookItem> {
    const r = await this.prisma.webhook.create({
      data: {
        projectId: input.projectId,
        url: input.url,
        events: input.events as PrismaNamespace.InputJsonValue,
        secret: input.secret,
      }
    });
    return {
      id: r.id,
      projectId: r.projectId,
      url: r.url,
      events: input.events,
      secret: r.secret,
      active: r.active,
      lastTriggeredAt: r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async findWebhook(webhookId: string, projectId: string): Promise<WebhookItem | null> {
    const r = await this.prisma.webhook.findFirst({
      where: { id: webhookId, projectId }
    });
    if (!r) return null;
    return {
      id: r.id,
      projectId: r.projectId,
      url: r.url,
      events: r.events as string[],
      secret: r.secret,
      active: r.active,
      lastTriggeredAt: r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async deleteWebhook(webhookId: string, projectId: string): Promise<void> {
    await this.prisma.webhook.deleteMany({ where: { id: webhookId, projectId } });
  }

  async listProjectMembers(projectId: string): Promise<ProjectMemberItem[]> {
    const rows = await this.prisma.projectMember.findMany({
      where: { projectId, userId: { not: null } },
      include: { user: { select: { walletAddress: true, displayName: true } } },
      orderBy: { invitedAt: "asc" }
    });
    return rows
      .filter((r) => r.userId !== null && r.user !== null)
      .map((r) => ({
        id: r.id,
        projectId: r.projectId,
        userId: r.userId as string,
        role: r.role,
        invitedBy: r.invitedBy ?? null,
        invitedAt: r.invitedAt.toISOString(),
        acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
        user: { walletAddress: r.user!.walletAddress, displayName: r.user!.displayName },
      }));
  }

  async findProjectMember(projectId: string, userId: string): Promise<ProjectMemberItem | null> {
    const r = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
      include: { user: { select: { walletAddress: true, displayName: true } } }
    });
    if (!r || !r.userId || !r.user) return null;
    return {
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      role: r.role,
      invitedBy: r.invitedBy ?? null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      user: { walletAddress: r.user.walletAddress, displayName: r.user.displayName },
    };
  }

  async findProjectMemberById(memberId: string): Promise<ProjectMemberItem | null> {
    const r = await this.prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { user: { select: { walletAddress: true, displayName: true } } }
    });
    if (!r || !r.userId || !r.user) return null;
    return {
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      role: r.role,
      invitedBy: r.invitedBy ?? null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      user: { walletAddress: r.user.walletAddress, displayName: r.user.displayName },
    };
  }

  async createProjectMember(input: { projectId: string; userId: string; invitedBy: string }): Promise<ProjectMemberItem> {
    const r = await this.prisma.projectMember.create({
      data: { projectId: input.projectId, userId: input.userId, invitedBy: input.invitedBy },
      include: { user: { select: { walletAddress: true, displayName: true } } }
    });
    return {
      id: r.id,
      projectId: r.projectId,
      userId: r.userId ?? input.userId,
      role: r.role,
      invitedBy: r.invitedBy ?? null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      user: { walletAddress: r.user?.walletAddress ?? "", displayName: r.user?.displayName ?? "" },
    };
  }

  async acceptProjectMember(memberId: string): Promise<void> {
    await this.prisma.projectMember.update({
      where: { id: memberId },
      data: { acceptedAt: new Date() }
    });
  }

  async deleteProjectMember(memberId: string, projectId: string): Promise<void> {
    await this.prisma.projectMember.deleteMany({ where: { id: memberId, projectId } });
  }

  async findPublicProject(publicSlug: string): Promise<ProjectWithOwner | null> {
    const project = await this.prisma.project.findFirst({
      where: { publicSlug, isPublic: true },
      include: {
        owner: true,
        members: {
          select: { userId: true },
        },
        _count: {
          select: { apiKeys: true, requestLogs: true, fundingRequests: true }
        }
      }
    });
    if (!project) return null;
    return mapProject(project);
  }

  async createEnterpriseInterest(input: { companyName: string; contactEmail: string; estimatedMonthlyReqs: string; useCase: string }): Promise<void> {
    await this.prisma.enterpriseInterest.create({ data: input });
  }

  async logActivity(input: { projectId: string; userId?: string | null; action: string; details?: Record<string, unknown> | null }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.activityLog.create({
      data: {
        projectId: input.projectId,
        userId: input.userId ?? null,
        action: input.action,
        details: input.details ? (input.details as PrismaNamespace.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async listActivityLog(projectId: string, limit = 50): Promise<ActivityLogItem[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logs: any[] = await db.activityLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { user: { select: { walletAddress: true } } },
    });
    return logs.map((log) => ({
      id: log.id as string,
      projectId: log.projectId as string,
      userId: log.userId as string | null,
      action: log.action as string,
      details: log.details as Record<string, unknown> | null,
      createdAt: (log.createdAt as Date).toISOString(),
      actorWallet: (log.user?.walletAddress as string | undefined)
        ? `${(log.user.walletAddress as string).slice(0, 4)}…${(log.user.walletAddress as string).slice(-4)}`
        : null,
    }));
  }

  async getActiveAnnouncement(): Promise<SystemAnnouncementItem | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ann: any = await db.systemAnnouncement.findFirst({
      where: {
        active: true,
        OR: [
          { startAt: null, endAt: null },
          { startAt: null, endAt: { gte: now } },
          { startAt: { lte: now }, endAt: null },
          { startAt: { lte: now }, endAt: { gte: now } },
        ],
      },
      orderBy: [{ startAt: "desc" }, { createdAt: "desc" }],
    });
    if (!ann) return null;
    return {
      id: ann.id as string,
      message: ann.message as string,
      severity: ann.severity as string,
      active: ann.active as boolean,
      startAt: ann.startAt ? (ann.startAt as Date).toISOString() : null,
      endAt: ann.endAt ? (ann.endAt as Date).toISOString() : null,
      createdAt: (ann.createdAt as Date).toISOString(),
    };
  }

  async upsertAnnouncement(input: { message: string; severity: string; startAt?: Date | null; endAt?: Date | null }): Promise<void> {
    // Deactivate existing announcements and create a new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.systemAnnouncement.updateMany({ where: { active: true }, data: { active: false } });
    await db.systemAnnouncement.create({
      data: {
        message: input.message,
        severity: input.severity,
        active: true,
        startAt: input.startAt ?? null,
        endAt: input.endAt ?? null,
      }
    });
  }

  async listAssistantConversations(
    userId: string,
    limit = 20,
    query?: string,
    includeArchived = true
  ): Promise<AssistantConversationSummary[]> {
    const rows = await this.prisma.assistantConversation.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { archivedAt: null }),
        ...(query?.trim()
          ? {
              OR: [
                { title: { contains: query.trim(), mode: "insensitive" } },
                {
                  messages: {
                    some: {
                      content: { contains: query.trim(), mode: "insensitive" },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ pinned: "desc" }, { lastMessageAt: "desc" }],
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
    return rows.map((row: {
      id: string;
      title: string;
      pinned: boolean;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      lastMessageAt: Date;
      _count: { messages: number };
    }) => mapAssistantConversationSummary(row));
  }

  async getLatestAssistantConversation(userId: string): Promise<AssistantConversationDetail | null> {
    const row = await this.prisma.assistantConversation.findFirst({
      where: { userId, archivedAt: null },
      orderBy: { lastMessageAt: "desc" },
      select: { id: true },
    });
    if (!row) return null;
    return this.getAssistantConversation(userId, row.id);
  }

  async getAssistantConversation(userId: string, conversationId: string): Promise<AssistantConversationDetail | null> {
    const row = await this.prisma.assistantConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
          include: {
            feedback: true,
          },
        },
      },
    });
    if (!row) return null;
    return {
      ...mapAssistantConversationSummary(row),
      messages: row.messages.map((message) => mapAssistantMessage(message)),
    };
  }

  async createAssistantConversation(input: { userId: string; title: string }): Promise<AssistantConversationSummary> {
    const row = await this.prisma.assistantConversation.create({
      data: {
        userId: input.userId,
        title: input.title.slice(0, 80),
        archivedAt: null,
      },
      include: { _count: { select: { messages: true } } },
    });
    return mapAssistantConversationSummary(row);
  }

  async updateAssistantConversation(
    userId: string,
    conversationId: string,
    input: { pinned?: boolean; title?: string; archived?: boolean }
  ): Promise<AssistantConversationSummary | null> {
    const existing = await this.prisma.assistantConversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!existing) return null;

    const row = await this.prisma.assistantConversation.update({
      where: { id: conversationId },
      data: {
        ...(typeof input.pinned === "boolean" ? { pinned: input.pinned } : {}),
        ...(typeof input.title === "string" && input.title.trim()
          ? { title: input.title.trim().slice(0, 80) }
          : {}),
        ...(typeof input.archived === "boolean"
          ? {
              archivedAt: input.archived ? new Date() : null,
              ...(input.archived ? { pinned: false } : {}),
            }
          : {}),
      },
      include: { _count: { select: { messages: true } } },
    });
    return mapAssistantConversationSummary(row);
  }

  async saveAssistantConversationMessages(input: {
    userId: string;
    conversationId?: string;
    titleFromFirstUserMessage?: string;
    messages: Array<{
      role: "user" | "assistant";
      content: string;
      projectId?: string | null;
      matchedDocsSection?: string | null;
      suggestedActions?: readonly AssistantSuggestedAction[] | null;
      playgroundPayload?: AssistantPlaygroundPayload | null;
      promptCategory?: string | null;
      responseTimeMs?: number | null;
      inputTokenEstimate?: number | null;
      outputTokenEstimate?: number | null;
    }>;
  }): Promise<AssistantConversationDetail> {
    const titleSource =
      input.titleFromFirstUserMessage?.trim() ||
      input.messages.find((message) => message.role === "user")?.content?.trim() ||
      "New conversation";
    const title = titleSource.length > 80 ? `${titleSource.slice(0, 77).trimEnd()}...` : titleSource;

    const conversation = input.conversationId
      ? await this.prisma.assistantConversation.findFirst({
          where: { id: input.conversationId, userId: input.userId },
        })
      : null;

    const conversationId = conversation?.id ?? (await this.prisma.assistantConversation.create({
      data: {
        userId: input.userId,
        title,
        archivedAt: null,
      },
      select: { id: true },
    })).id;

    await this.prisma.$transaction(async (tx) => {
      const cappedMessages = input.messages.slice(-50);
      const existingMessages = await tx.assistantMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: { feedback: true },
      });

      const isPrefixMatch =
        existingMessages.length <= cappedMessages.length &&
        existingMessages.every((message, index) => {
          const candidate = cappedMessages[index];
          return candidate?.role === message.role && candidate?.content === message.content;
        });

      if (!isPrefixMatch) {
        await tx.assistantMessage.deleteMany({ where: { conversationId } });
      }

      const messagesToCreate = isPrefixMatch ? cappedMessages.slice(existingMessages.length) : cappedMessages;
      if (messagesToCreate.length > 0) {
        await tx.assistantMessage.createMany({
          data: messagesToCreate.map((message) => ({
            conversationId,
            role: message.role,
            content: message.content,
            projectId: message.projectId ?? null,
            matchedDocsSection: message.matchedDocsSection ?? null,
            ...(message.suggestedActions
              ? {
                  suggestedActions: message.suggestedActions as unknown as PrismaNamespace.InputJsonValue,
                }
              : {}),
            ...(message.playgroundPayload
              ? {
                  playgroundPayload: message.playgroundPayload as unknown as PrismaNamespace.InputJsonValue,
                }
              : {}),
            promptCategory: message.promptCategory ?? null,
            responseTimeMs: message.responseTimeMs ?? null,
            inputTokenEstimate: message.inputTokenEstimate ?? null,
            outputTokenEstimate: message.outputTokenEstimate ?? null,
          })),
        });
      }

      const lastMessage = cappedMessages.at(-1);
      await tx.assistantConversation.update({
        where: { id: conversationId },
        data: {
          title,
          archivedAt: null,
          ...(lastMessage ? { lastMessageAt: new Date() } : {}),
        },
      });
    });

    const detail = await this.getAssistantConversation(input.userId, conversationId);
    if (!detail) {
      throw new Error("Assistant conversation could not be loaded after save.");
    }
    return detail;
  }

  async clearAssistantConversation(userId: string, conversationId: string): Promise<void> {
    await this.prisma.assistantConversation.deleteMany({
      where: { id: conversationId, userId },
    });
  }

  async upsertAssistantFeedback(input: {
    userId: string;
    conversationId: string;
    messageId: string;
    rating: "up" | "down";
    note?: string | null;
  }): Promise<AssistantMessageFeedback> {
    const message = await this.prisma.assistantMessage.findFirst({
      where: {
        id: input.messageId,
        role: "assistant",
        conversationId: input.conversationId,
        conversation: { userId: input.userId },
      },
      select: { id: true, conversationId: true },
    });

    if (!message) {
      throw new Error("Assistant message not found for feedback.");
    }

    const feedback = await this.prisma.assistantFeedback.upsert({
      where: { messageId: input.messageId },
      update: {
        rating: input.rating,
        note: input.note?.trim() ? input.note.trim() : null,
      },
      create: {
        userId: input.userId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        rating: input.rating,
        note: input.note?.trim() ? input.note.trim() : null,
      },
    });

    return mapAssistantFeedback(feedback);
  }

  async getWhatsNew(userId: string): Promise<WhatsNewItem | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const user = await db.user.findUnique({ where: { id: userId }, select: { whatsNewDismissedVersion: true } });
    const latest = await db.whatsNew.findFirst({
      where: { active: true },
      orderBy: { publishedAt: "desc" },
      select: { id: true, title: true, description: true, version: true, publishedAt: true },
    }) as { id: string; title: string; description: string; version: string; publishedAt: Date } | null;
    if (!latest) return null;
    if ((user as { whatsNewDismissedVersion?: string } | null)?.whatsNewDismissedVersion === latest.version) return null;
    return { id: latest.id, title: latest.title, description: latest.description, version: latest.version, publishedAt: latest.publishedAt.toISOString() };
  }

  async dismissWhatsNew(userId: string, version: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).user.update({ where: { id: userId }, data: { whatsNewDismissedVersion: version } });
  }

  async recordWebhookDelivery(input: {
    webhookId: string;
    eventType: string;
    payload: unknown;
    attemptNumber: number;
    responseStatus?: number | null;
    responseBody?: string | null;
    success: boolean;
    nextRetryAt?: Date | null;
  }): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const rec = await db.webhookDelivery.create({
      data: {
        webhookId: input.webhookId,
        eventType: input.eventType,
        payload: input.payload as object,
        attemptNumber: input.attemptNumber,
        status: input.success ? "delivered" : input.nextRetryAt ? "pending_retry" : "failed",
        responseStatus: input.responseStatus ?? null,
        responseBody: input.responseBody ? input.responseBody.slice(0, 1000) : null,
        nextRetryAt: input.nextRetryAt ?? null,
        deliveredAt: input.success ? new Date() : null,
      },
      select: { id: true },
    });
    return rec.id as string;
  }

  async getWebhookDeliveries(webhookId: string, limit = 20): Promise<WebhookDeliveryRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    type WebhookDeliveryRow = {
      id: string;
      webhookId: string;
      eventType: string;
      status: string;
      responseStatus: number | null;
      responseBody: string | null;
      attemptNumber: number;
      nextRetryAt: Date | string | null;
      deliveredAt: Date | string | null;
      payload: Record<string, unknown> | null;
      createdAt: Date | string;
    };
    const rows = await db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        status: true,
        responseStatus: true,
        responseBody: true,
        attemptNumber: true,
        nextRetryAt: true,
        deliveredAt: true,
        payload: true,
        createdAt: true,
      },
    }) as WebhookDeliveryRow[];
    return rows.map((r) => ({
      id: r.id,
      webhookId: r.webhookId,
      eventType: r.eventType,
      success: r.status === "delivered",
      status: r.status,
      responseStatus: r.responseStatus,
      responseBody: r.responseBody,
      attemptNumber: r.attemptNumber,
      attemptedAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      nextRetryAt: r.nextRetryAt
        ? r.nextRetryAt instanceof Date
          ? r.nextRetryAt.toISOString()
          : String(r.nextRetryAt)
        : null,
      deliveredAt: r.deliveredAt
        ? r.deliveredAt instanceof Date
          ? r.deliveredAt.toISOString()
          : String(r.deliveredAt)
        : null,
      payload: r.payload ?? null,
    }));
  }

  async getPendingWebhookRetries(): Promise<{ id: string; webhookId: string; webhook: { url: string; secret: string }; payload: unknown; eventType: string; attemptNumber: number }[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    return db.webhookDelivery.findMany({
      where: { status: { not: "delivered" }, nextRetryAt: { lte: new Date() }, attemptNumber: { lt: 5 } },
      include: { webhook: { select: { url: true, secret: true } } },
      take: 50,
    }) as Promise<{ id: string; webhookId: string; webhook: { url: string; secret: string }; payload: unknown; eventType: string; attemptNumber: number }[]>;
  }

  async updateWebhookDelivery(id: string, data: { responseStatus?: number; responseBody?: string; success: boolean; nextRetryAt?: Date | null }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.webhookDelivery.update({
      where: { id },
      data: {
        status: data.success ? "delivered" : data.nextRetryAt ? "pending_retry" : "failed",
        responseStatus: data.responseStatus ?? null,
        responseBody: data.responseBody ? data.responseBody.slice(0, 1000) : null,
        nextRetryAt: data.nextRetryAt ?? null,
        deliveredAt: data.success ? new Date() : null,
      },
    });
  }

  async recordPerformanceMetric(input: PerformanceMetricInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.performanceMetric.create({
      data: {
        pathname: input.page.slice(0, 200),
        fcp: input.fcp ?? null,
        lcp: input.lcp ?? null,
        tti: input.tti ?? null,
        ua: input.ua ? input.ua.slice(0, 50) : null,
      },
    });
  }

  async getPerformanceMetricSummary(days = 7): Promise<{ page: string; avgFcp: number | null; avgLcp: number | null; sampleCount: number }[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.$queryRaw<{ page: string; avgFcp: number | null; avgLcp: number | null; sampleCount: bigint }[]>`
      SELECT pathname as page, AVG(fcp) as "avgFcp", AVG(lcp) as "avgLcp", COUNT(*) as "sampleCount"
      FROM "PerformanceMetric"
      WHERE "createdAt" >= ${cutoff}
      GROUP BY pathname
      ORDER BY "sampleCount" DESC
      LIMIT 20
    `;
    return rows.map((r) => ({
      page: r.page,
      avgFcp: r.avgFcp !== null ? Math.round(r.avgFcp) : null,
      avgLcp: r.avgLcp !== null ? Math.round(r.avgLcp) : null,
      sampleCount: Number(r.sampleCount),
    }));
  }

  async subscribeToStatus(email: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.statusSubscriber.upsert({
      where: { email },
      create: { email },
      update: { active: true },
    });
  }

  async getProjectHealthScore(projectId: string): Promise<ProjectHealthScore> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: {
        archivedAt: true,
        isPublic: true,
        publicSlug: true,
        _count: { select: { apiKeys: true, members: true, webhooks: true } },
        webhooks: { where: { active: true }, select: { id: true } },
      },
    });
    if (!project) return { score: 0, activated: false, hasFunding: false, hasApiKeys: false, hasTraffic: false, successRate: null, breakdown: [], weeklyChange: { direction: "flat", delta: 0, reason: "Project not found." } };

    const [reqCount, successCount, simulatedCount, failedWebhookCount, last7d, previous7d] = await Promise.all([
      this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, statusCode: { lt: 400 } } }),
      this.prisma.requestLog.count({ where: { projectId, simulated: true, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      this.prisma.webhookDelivery.count({
        where: {
          webhook: { projectId },
          status: { in: ["failed", "permanent_failure"] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.getHealthHistory(projectId, 7),
      this.getHistoricalHealthWindow(projectId, 7, 7),
    ]);

    const activated = !project.archivedAt;
    const fundingSignals = await this.prisma.fundingCoordinate.count({
      where: {
        projectId,
        OR: [{ confirmedAt: { not: null } }, { transactionSignature: { not: null } }],
      },
    });
    const hasFunding = fundingSignals > 0;
    const hasApiKeys = (project._count?.apiKeys ?? 0) > 0;
    const hasTraffic = reqCount > 0;
    const successRate = reqCount > 0 ? successCount / reqCount : null;

    const breakdown = [
      {
        key: "activation",
        label: "Activation",
        value: activated ? 15 : 0,
        max: 15,
        summary: activated ? "Project is active in the workspace." : "Project still needs to stay active and unarchived.",
      },
      {
        key: "funding",
        label: "Funding health",
        value: hasFunding ? 15 : 0,
        max: 15,
        summary: hasFunding ? "Funding activity has been confirmed." : "No confirmed funding signal has been recorded yet.",
      },
      {
        key: "api_keys",
        label: "API key readiness",
        value: hasApiKeys ? 10 : 0,
        max: 10,
        summary: hasApiKeys ? "At least one API key is ready." : "No API keys are ready for this project.",
      },
      {
        key: "traffic",
        label: "Traffic presence",
        value: hasTraffic ? 10 : 0,
        max: 10,
        summary: hasTraffic ? "Recent request traffic has been observed." : "No recent request traffic has landed.",
      },
      {
        key: "success_rate",
        label: "Success rate",
        value: successRate !== null ? Math.round(successRate * 20) : 0,
        max: 20,
        summary: successRate !== null ? `${Math.round(successRate * 100)}% of recent requests succeeded.` : "No request sample yet.",
      },
      {
        key: "latency",
        label: "Latency quality",
        value: reqCount > 0 ? (successRate !== null && successRate >= 0.97 ? 10 : successRate !== null && successRate >= 0.9 ? 7 : 4) : 0,
        max: 10,
        summary: reqCount > 0 ? "Latency quality is inferred from recent successful request samples." : "No latency baseline yet.",
      },
      {
        key: "webhook_health",
        label: "Webhook health",
        value: (project.webhooks?.length ?? 0) > 0 ? (failedWebhookCount === 0 ? 8 : 4) : 4,
        max: 8,
        summary: (project.webhooks?.length ?? 0) > 0
          ? failedWebhookCount === 0
            ? "Webhook deliveries are healthy."
            : "Webhook failures need attention."
          : "No active webhooks configured yet.",
      },
      {
        key: "team",
        label: "Team readiness",
        value: (project._count?.members ?? 0) > 1 ? 6 : 3,
        max: 6,
        summary: (project._count?.members ?? 0) > 1 ? "Multiple collaborators can operate this project." : "This project still looks owner-heavy.",
      },
      {
        key: "visibility",
        label: "Visibility",
        value: project.isPublic && project.publicSlug ? 4 : 2,
        max: 4,
        summary: project.isPublic && project.publicSlug ? "A public status surface exists." : "This project is still private by default.",
      },
      {
        key: "simulation",
        label: "Simulation usage",
        value: simulatedCount > 0 ? 2 : 0,
        max: 2,
        summary: simulatedCount > 0 ? "Simulation mode is being used to validate flows safely." : "No recent simulation usage has been seen.",
      },
    ];

    const score = Math.min(100, breakdown.reduce((sum, item) => sum + item.value, 0));
    const latest = last7d[last7d.length - 1]?.score ?? score;
    const previous = previous7d[previous7d.length - 1]?.score ?? latest;
    const delta = latest - previous;
    let direction: "up" | "flat" | "down" = "flat";
    if (delta >= 5) direction = "up";
    else if (delta <= -5) direction = "down";
    let reason = "Project posture is stable.";
    if (direction === "up") {
      reason = successRate !== null && successRate >= 0.97 ? "Success rate improved." : "Recent traffic and readiness signals improved.";
    } else if (direction === "down") {
      reason = failedWebhookCount > 0 ? "Webhook failures increased." : hasTraffic ? "Recent request quality slipped." : "No recent traffic was observed.";
    }

    return { score, activated, hasFunding, hasApiKeys, hasTraffic, successRate, breakdown, weeklyChange: { direction, delta, reason } };
  }

  async getOperatorActivity(limit = 10): Promise<OperatorActivityItem[]> {
    const rows = await this.prisma.requestLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { method: true, durationMs: true, route: true, statusCode: true, createdAt: true },
    });
    return rows.map((r) => ({
      method: r.method,
      durationMs: r.durationMs,
      route: r.route,
      success: r.statusCode < 400,
      upstreamNode: null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async getOperatorDailyRequests(days = 7): Promise<DailyRequestCount[]> {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.requestLog.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const d = (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString().slice(0, 10);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  async getNodeDistribution(projectId: string, days = 30): Promise<Array<{ node: string; count: number; avgLatencyMs: number }>> {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.prisma.requestLog.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { durationMs: true },
    });
    // upstreamNode field is newly added — aggregate at durationMs level until data populates
    const total = rows.reduce((sum, r) => sum + r.durationMs, 0);
    const avgLatencyMs = rows.length > 0 ? Math.round(total / rows.length) : 0;
    return rows.length > 0 ? [{ node: "default", count: rows.length, avgLatencyMs }] : [];
  }

  async recordClientError(_input: { component: string; message: string; page: string }): Promise<void> {
    // Best-effort: no-op until a dedicated error log table is available
    return Promise.resolve();
  }

  async createSupportTicket(input: { userId: string; projectId?: string; category: string; priority: string; subject: string; description: string }): Promise<SupportTicketRecord> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.supportTicket.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        category: input.category,
        priority: input.priority,
        subject: input.subject,
        description: input.description,
      },
    });
    return this._mapTicket(row);
  }

  async listSupportTickets(userId: string): Promise<SupportTicketRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const rows = await db.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true, slug: true } } },
    });
    return rows.map((r: unknown) => this._mapTicket(r));
  }

  async getSupportTicket(id: string, userId: string): Promise<SupportTicketRecord | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.supportTicket.findFirst({
      where: { id, userId },
      include: { project: { select: { name: true, slug: true } } },
    });
    return row ? this._mapTicket(row) : null;
  }

  async adminListSupportTickets(status?: string): Promise<SupportTicketRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const where = status ? { status } : {};
    const rows = await db.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { project: { select: { name: true, slug: true } } },
    });
    return rows.map((r: unknown) => this._mapTicket(r));
  }

  async adminRespondToTicket(id: string, response: string, status: string): Promise<SupportTicketRecord> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.supportTicket.update({
      where: { id },
      data: {
        adminResponse: response,
        adminRespondedAt: new Date(),
        status,
        resolvedAt: status === "resolved" ? new Date() : status === "closed" ? new Date() : null,
      },
      include: { project: { select: { name: true, slug: true } } },
    });
    return this._mapTicket(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _mapTicket(r: any): SupportTicketRecord {
    return {
      id: r.id as string,
      userId: r.userId as string,
      projectId: (r.projectId as string | null) ?? null,
      projectName: (r.project?.name as string | undefined) ?? null,
      projectSlug: (r.project?.slug as string | undefined) ?? null,
      category: r.category as string,
      priority: r.priority as string,
      subject: r.subject as string,
      description: r.description as string,
      status: r.status as string,
      adminResponse: (r.adminResponse as string | null) ?? null,
      adminRespondedAt: r.adminRespondedAt
        ? r.adminRespondedAt instanceof Date
          ? (r.adminRespondedAt as Date).toISOString()
          : String(r.adminRespondedAt)
        : null,
      createdAt: r.createdAt instanceof Date ? (r.createdAt as Date).toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? (r.updatedAt as Date).toISOString() : String(r.updatedAt),
      resolvedAt: r.resolvedAt ? (r.resolvedAt instanceof Date ? (r.resolvedAt as Date).toISOString() : String(r.resolvedAt)) : null,
    };
  }

  async listBlogPosts(visibleOnly = true): Promise<BlogPostRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const where = visibleOnly ? { visible: true } : {};
    const rows = await db.blogPost.findMany({ where, orderBy: { publishedAt: "desc" } });
    return rows.map((r: unknown) => this._mapBlogPost(r));
  }

  async getBlogPost(slug: string): Promise<BlogPostRecord | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.blogPost.findUnique({ where: { slug } });
    return row ? this._mapBlogPost(row) : null;
  }

  async createBlogPost(input: { slug: string; title: string; summary: string; content: string; publishedAt?: Date; visible?: boolean }): Promise<BlogPostRecord> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.blogPost.create({ data: { ...input } });
    return this._mapBlogPost(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _mapBlogPost(r: any): BlogPostRecord {
    return {
      id: r.id as string,
      slug: r.slug as string,
      title: r.title as string,
      summary: r.summary as string,
      content: r.content as string,
      publishedAt: r.publishedAt ? (r.publishedAt instanceof Date ? (r.publishedAt as Date).toISOString() : String(r.publishedAt)) : null,
      visible: r.visible as boolean,
      createdAt: r.createdAt instanceof Date ? (r.createdAt as Date).toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? (r.updatedAt as Date).toISOString() : String(r.updatedAt),
    };
  }

  async subscribeNewsletter(input: NewsletterSubscribeInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.newsletterSubscriber.upsert({
      where: { email: input.email },
      update: {},
      create: { email: input.email, source: input.source ?? "landing" },
    });
  }

  async getNewsletterCount(): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    return db.newsletterSubscriber.count();
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const projects = await db.project.findMany({
      where: { leaderboardVisible: true, archivedAt: null },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        requestLogs: {
          where: { createdAt: { gte: since } },
          select: { durationMs: true },
        },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (projects as any[])
      .map((p: { name: string; publicSlug: string | null; requestLogs: Array<{ durationMs: number }> }) => {
        const totalRequests = p.requestLogs.length;
        const avgLatencyMs = totalRequests > 0
          ? Math.round(p.requestLogs.reduce((s, r) => s + r.durationMs, 0) / totalRequests)
          : 0;
        return {
          projectName: p.name,
          totalRequests,
          avgLatencyMs,
          hasPublicPage: p.publicSlug != null,
          publicSlug: p.publicSlug,
        };
      })
      .sort((a: { totalRequests: number }, b: { totalRequests: number }) => b.totalRequests - a.totalRequests)
      .slice(0, 10)
      .map((entry: Omit<LeaderboardEntry, "rank">, i: number) => ({ rank: i + 1, ...entry }));
  }

  async setEmailVerificationToken(userId: string, token: string, expiry: Date): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma.user as any).update({
      where: { id: userId },
      data: { emailVerificationToken: token, emailVerificationExpiry: expiry },
    });
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const user = await db.user.findFirst({
      where: { emailVerificationToken: token, emailVerificationExpiry: { gte: new Date() } },
    }) as { id: string } | null;
    if (!user) return { success: false };
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
    });
    return { success: true };
  }

  async getTosStatus(userId: string): Promise<{ accepted: boolean; acceptedAt: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (this.prisma.user as any).findUnique({
      where: { id: userId },
      select: { tosAcceptedAt: true },
    }) as { tosAcceptedAt: Date | null } | null;
    if (!user) return { accepted: false, acceptedAt: null };
    return {
      accepted: user.tosAcceptedAt != null,
      acceptedAt: user.tosAcceptedAt?.toISOString() ?? null,
    };
  }

  async findUserByReferralCode(referralCode: string): Promise<{ id: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    return user ?? null;
  }

  async markReferralConverted(clickId: string): Promise<void> {
    await this.prisma.referralClick.update({
      where: { id: clickId },
      data: { convertedToSignup: true },
    });
  }

  async findLatestUnconvertedClick(referrerId: string): Promise<{ id: string } | null> {
    const click = await this.prisma.referralClick.findFirst({
      where: { referrerId, convertedToSignup: false },
      orderBy: { clickedAt: "desc" },
    });
    return click ? { id: click.id } : null;
  }

  async getAdminPlatformStats(): Promise<AdminPlatformStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalProjects, requestsToday, requestsThisWeek, newsletterCount, recentSignupRows] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.requestLog.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.requestLog.count({ where: { createdAt: { gte: startOfWeek } } }),
        this.prisma.statusSubscriber.count({ where: { active: true } }),
        this.prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            walletAddress: true,
            createdAt: true,
            _count: { select: { projects: true } },
          },
        }),
      ]);

    return {
      totalUsers,
      totalProjects,
      requestsToday,
      requestsThisWeek,
      newsletterCount,
      recentSignups: recentSignupRows.map((u) => ({
        walletAddress: `${u.walletAddress.slice(0, 8)}...${u.walletAddress.slice(-4)}`,
        createdAt: u.createdAt.toISOString(),
        projectCount: u._count.projects,
      })),
    };
  }

  async getNewsletterSubscribers(limit = 20): Promise<NewsletterSubscriberList> {
    const [count, recent] = await Promise.all([
      this.prisma.statusSubscriber.count({ where: { active: true } }),
      this.prisma.statusSubscriber.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { email: true, createdAt: true },
      }),
    ]);

    return {
      count,
      recent: recent.map((s) => ({
        email: s.email,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async getLatencyHeatmap(projectId: string, range: "24h" | "7d" | "30d"): Promise<number[][]> {
    const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    const since = new Date(Date.now() - ms);
    const rows = await this.prisma.requestLog.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { createdAt: true, durationMs: true },
    });
    const sums: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    const counts: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0));
    for (const r of rows) {
      const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      const hour = d.getHours();
      const day = d.getDay();
      sums[hour]![day]! += r.durationMs;
      counts[hour]![day]! += 1;
    }
    return sums.map((row, h) => row.map((sum, d) => counts[h]![d]! > 0 ? Math.round(sum / counts[h]![d]!) : 0));
  }

  async findRequestByTraceId(projectId: string, traceId: string): Promise<Record<string, unknown> | null> {
    const log = await this.prisma.requestLog.findFirst({
      where: { projectId, requestId: traceId },
      select: {
        id: true, requestId: true, method: true, durationMs: true,
        statusCode: true, route: true, service: true, createdAt: true, upstreamNode: true, region: true,
        requestSize: true, responseSize: true, cacheHit: true, simulated: true, mode: true, fyxvoHint: true,
      },
    });
    if (!log) return null;
    return {
      ...log,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    };
  }

  async listPlaygroundRecipes(projectId: string): Promise<PlaygroundRecipeRecord[]> {
    const rows = await this.prisma.playgroundRecipe.findMany({
      where: { projectId },
      orderBy: [{ pinned: "desc" }, { lastUsedAt: "desc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      method: row.method,
      mode: row.mode === "priority" ? "priority" : "standard",
      simulationEnabled: row.simulationEnabled,
      params: (row.params as Record<string, string>) ?? {},
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      pinned: row.pinned,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      sharedToken: row.sharedToken ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async createPlaygroundRecipe(input: {
    readonly projectId: string;
    readonly name: string;
    readonly method: string;
    readonly mode: "standard" | "priority";
    readonly simulationEnabled: boolean;
    readonly params: Record<string, string>;
    readonly notes?: string | null;
    readonly tags?: readonly string[];
    readonly pinned?: boolean;
    readonly sharedToken?: string | null;
  }): Promise<PlaygroundRecipeRecord> {
    const row = await this.prisma.playgroundRecipe.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        method: input.method,
        mode: input.mode,
        simulationEnabled: input.simulationEnabled,
        params: input.params,
        notes: input.notes ?? null,
        tags: [...(input.tags ?? [])],
        pinned: input.pinned ?? false,
        sharedToken: input.sharedToken ?? null,
      },
    });

    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      method: row.method,
      mode: row.mode === "priority" ? "priority" : "standard",
      simulationEnabled: row.simulationEnabled,
      params: (row.params as Record<string, string>) ?? {},
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      pinned: row.pinned,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      sharedToken: row.sharedToken ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updatePlaygroundRecipe(
    recipeId: string,
    projectId: string,
    input: {
      readonly name?: string;
      readonly method?: string;
      readonly mode?: "standard" | "priority";
      readonly simulationEnabled?: boolean;
      readonly params?: Record<string, string>;
      readonly notes?: string | null;
      readonly tags?: readonly string[];
      readonly pinned?: boolean;
      readonly sharedToken?: string | null;
      readonly touchLastUsedAt?: boolean;
    }
  ): Promise<PlaygroundRecipeRecord | null> {
    const existing = await this.prisma.playgroundRecipe.findFirst({
      where: { id: recipeId, projectId },
    });
    if (!existing) {
      return null;
    }

    const row = await this.prisma.playgroundRecipe.update({
      where: { id: recipeId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.method !== undefined ? { method: input.method } : {}),
        ...(input.mode !== undefined ? { mode: input.mode } : {}),
        ...(input.simulationEnabled !== undefined ? { simulationEnabled: input.simulationEnabled } : {}),
        ...(input.params !== undefined ? { params: input.params } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.tags !== undefined ? { tags: [...input.tags] } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        ...(input.sharedToken !== undefined ? { sharedToken: input.sharedToken } : {}),
        ...(input.touchLastUsedAt ? { lastUsedAt: new Date() } : {}),
      },
    });

    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      method: row.method,
      mode: row.mode === "priority" ? "priority" : "standard",
      simulationEnabled: row.simulationEnabled,
      params: (row.params as Record<string, string>) ?? {},
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      pinned: row.pinned,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      sharedToken: row.sharedToken ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deletePlaygroundRecipe(recipeId: string, projectId: string): Promise<void> {
    await this.prisma.playgroundRecipe.deleteMany({
      where: { id: recipeId, projectId },
    });
  }

  async getPlaygroundRecipeBySharedToken(sharedToken: string): Promise<PlaygroundRecipeRecord | null> {
    const row = await this.prisma.playgroundRecipe.findFirst({
      where: { sharedToken },
    });
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      method: row.method,
      mode: row.mode === "priority" ? "priority" : "standard",
      simulationEnabled: row.simulationEnabled,
      params: (row.params as Record<string, string>) ?? {},
      notes: row.notes ?? null,
      tags: row.tags ?? [],
      pinned: row.pinned,
      lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
      sharedToken: row.sharedToken ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getAlertCenter(userId: string, projectIds: readonly string[], assistantAvailable: boolean): Promise<AlertCenterItem[]> {
    const [notifications, webhookFailures, incidents, projects, alertStates] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, OR: [{ projectId: null }, { projectId: { in: [...projectIds] } }] },
        orderBy: { createdAt: "desc" },
        take: 40,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.webhookDelivery.findMany({
        where: {
          webhook: { projectId: { in: [...projectIds] } },
          status: { in: ["failed", "permanent_failure"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          webhook: {
            select: {
              id: true,
              url: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.incident.findMany({
        where: { resolvedAt: null },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
      this.prisma.project.findMany({
        where: { id: { in: [...projectIds] } },
        select: {
          id: true,
          name: true,
          lowBalanceThresholdSol: true,
          requestLogs: {
            where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            select: { statusCode: true },
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma as any).alertState.findMany({
        where: { userId },
        select: { alertKey: true, state: true },
      }) as Promise<Array<{ alertKey: string; state: AlertStateValue }>>,
    ]);

    const stateByKey = new Map(alertStates.map((item) => [item.alertKey, item.state]));
    const activeIncidents = incidents.filter((incident) => incident.resolvedAt == null);
    const relatedIncidentForService = (serviceName: string) => {
      const match = activeIncidents.find((incident) => incident.serviceName.toLowerCase() === serviceName.toLowerCase());
      return match
        ? { id: match.id, serviceName: match.serviceName, description: match.description }
        : null;
    };

    const items: AlertCenterItem[] = [];
    const groupedNotifications = new Map<string, {
      latestId: string;
      type: AlertCenterItem["type"];
      severity: AlertCenterItem["severity"];
      projectId: string | null;
      projectName: string | null;
      title: string;
      description: string;
      createdAt: string;
      metadata: Record<string, unknown> | null;
      groupCount: number;
    }>();

    for (const notification of notifications) {
      const body = `${notification.title} ${notification.message}`.toLowerCase();
      const inferredType: AlertCenterItem["type"] =
        body.includes("low balance") ? "low_balance"
          : body.includes("cost") || body.includes("budget") ? "daily_cost"
            : "notification";
      const severity =
        /low balance|high error|failed|warning/i.test(`${notification.title} ${notification.message}`)
          ? "warning"
          : "info";
      const groupKey = `${inferredType}:${notification.projectId ?? "global"}:${notification.title.toLowerCase()}`;
      const existing = groupedNotifications.get(groupKey);
      const metadata = typeof notification.metadata === "object" && notification.metadata !== null
        ? (notification.metadata as Record<string, unknown>)
        : null;
      if (!existing) {
        groupedNotifications.set(groupKey, {
          latestId: notification.id,
          type: inferredType,
          severity,
          projectId: notification.projectId ?? null,
          projectName: notification.project?.name ?? null,
          title: notification.title,
          description: notification.message,
          createdAt: notification.createdAt.toISOString(),
          metadata,
          groupCount: 1,
        });
      } else {
        existing.groupCount += 1;
        if (new Date(notification.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.latestId = notification.id;
          existing.description = notification.message;
          existing.createdAt = notification.createdAt.toISOString();
          existing.metadata = metadata;
        }
      }
    }

    for (const [groupKey, notification] of groupedNotifications.entries()) {
      items.push({
        alertKey: groupKey,
        id: notification.latestId,
        type: notification.type,
        severity: notification.severity,
        state: stateByKey.get(groupKey) ?? "new",
        projectId: notification.projectId,
        projectName: notification.projectName,
        title: notification.title,
        description: notification.groupCount > 1
          ? `${notification.description} (${notification.groupCount} related alerts in this window.)`
          : notification.description,
        createdAt: notification.createdAt,
        groupCount: notification.groupCount,
        relatedIncident: notification.type === "notification" || notification.type === "low_balance"
          ? relatedIncidentForService("api")
          : null,
        metadata: notification.metadata,
      });
    }

    const groupedWebhookFailures = new Map<string, {
      latestId: string;
      projectId: string;
      projectName: string;
      url: string;
      createdAt: string;
      count: number;
      permanentFailure: boolean;
      eventType: string;
      responseStatus: number | null;
      attemptNumber: number;
      webhookId: string;
    }>();
    for (const failure of webhookFailures) {
      const groupKey = `webhook_failure:${failure.webhook.project.id}:${failure.webhook.url}`;
      const existing = groupedWebhookFailures.get(groupKey);
      if (!existing) {
        groupedWebhookFailures.set(groupKey, {
          latestId: failure.id,
          projectId: failure.webhook.project.id,
          projectName: failure.webhook.project.name,
          url: failure.webhook.url,
          createdAt: failure.createdAt.toISOString(),
          count: 1,
          permanentFailure: failure.status === "permanent_failure",
          eventType: failure.eventType,
          responseStatus: failure.responseStatus ?? null,
          attemptNumber: failure.attemptNumber,
          webhookId: failure.webhook.id,
        });
      } else {
        existing.count += 1;
        existing.permanentFailure = existing.permanentFailure || failure.status === "permanent_failure";
        if (new Date(failure.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.latestId = failure.id;
          existing.createdAt = failure.createdAt.toISOString();
          existing.eventType = failure.eventType;
          existing.responseStatus = failure.responseStatus ?? null;
          existing.attemptNumber = failure.attemptNumber;
          existing.webhookId = failure.webhook.id;
        }
      }
    }

    for (const [groupKey, failure] of groupedWebhookFailures.entries()) {
      items.push({
        alertKey: groupKey,
        id: failure.latestId,
        type: "webhook_failure",
        severity: failure.permanentFailure ? "critical" : "warning",
        state: stateByKey.get(groupKey) ?? "new",
        projectId: failure.projectId,
        projectName: failure.projectName,
        title: failure.count > 1 ? "Repeated webhook delivery failures" : "Webhook delivery failed",
        description: `${failure.url} returned ${failure.responseStatus ?? "no response"} for ${failure.eventType}.${failure.count > 1 ? ` ${failure.count} recent failures were grouped.` : ""}`,
        createdAt: failure.createdAt,
        groupCount: failure.count,
        relatedIncident: relatedIncidentForService("api"),
        metadata: {
          webhookId: failure.webhookId,
          responseStatus: failure.responseStatus,
          eventType: failure.eventType,
          attemptNumber: failure.attemptNumber,
          destination: failure.url,
        },
      });
    }

    for (const project of projects) {
      const total = project.requestLogs.length;
      const errors = project.requestLogs.filter((row) => row.statusCode >= 400).length;
      if (total > 0 && errors / total >= 0.25) {
        const alertKey = `error_rate:${project.id}`;
        items.push({
          alertKey,
          id: alertKey,
          type: "error_rate",
          severity: "warning",
          state: stateByKey.get(alertKey) ?? "new",
          projectId: project.id,
          projectName: project.name,
          title: "Error rate elevated",
          description: `${Math.round((errors / total) * 100)}% of requests returned errors in the last 24 hours.`,
          createdAt: new Date().toISOString(),
          groupCount: 1,
          relatedIncident: relatedIncidentForService("gateway"),
          metadata: { errorRate: errors / total, totalRequests: total },
        });
      }
    }

    for (const incident of incidents) {
      const alertKey = `incident:${incident.id}`;
      items.push({
        alertKey,
        id: incident.id,
        type: "incident",
        severity: incident.severity === "critical" ? "critical" : "warning",
        state: stateByKey.get(alertKey) ?? "new",
        projectId: null,
        projectName: null,
        title: `${incident.serviceName} incident`,
        description: incident.description,
        createdAt: incident.startedAt.toISOString(),
        groupCount: 1,
        relatedIncident: { id: incident.id, serviceName: incident.serviceName, description: incident.description },
        metadata: { serviceName: incident.serviceName },
      });
    }

    if (!assistantAvailable) {
      const alertKey = "assistant:availability";
      items.push({
        alertKey,
        id: "assistant-unavailable",
        type: "assistant",
        severity: "warning",
        state: stateByKey.get(alertKey) ?? "new",
        projectId: null,
        projectName: null,
        title: "Assistant availability issue",
        description: "The assistant is currently unavailable. Docs, playground, and analytics remain available.",
        createdAt: new Date().toISOString(),
        groupCount: 1,
        relatedIncident: relatedIncidentForService("api"),
        metadata: null,
      });
    }

    return items.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  async upsertAlertState(input: { userId: string; alertKey: string; state: AlertStateValue; projectId?: string | null }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.alertState.upsert({
      where: {
        userId_alertKey: {
          userId: input.userId,
          alertKey: input.alertKey,
        },
      },
      update: {
        state: input.state,
        projectId: input.projectId ?? null,
      },
      create: {
        userId: input.userId,
        alertKey: input.alertKey,
        state: input.state,
        projectId: input.projectId ?? null,
      },
    });
  }

  async getFirstSuccessfulProjectRequest(projectId: string): Promise<{
    method: string;
    durationMs: number;
    createdAt: string;
  } | null> {
    const log = await this.prisma.requestLog.findFirst({
      where: {
        projectId,
        statusCode: { lt: 400 }
      },
      select: {
        method: true,
        durationMs: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (!log) {
      return null;
    }

    return {
      method: log.method,
      durationMs: log.durationMs,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt)
    };
  }

  async countRecentRequests(since: Date): Promise<number> {
    return this.prisma.requestLog.count({ where: { createdAt: { gte: since } } });
  }

  async getSuccessRateTrend(projectId: string, range: "24h" | "7d" | "30d"): Promise<Array<{ time: string; successRate: number }>> {
    const ms = range === "24h" ? 86_400_000 : range === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    const since = new Date(Date.now() - ms);
    const bucketHours = range === "24h" ? 1 : range === "7d" ? 4 : 24;
    const rows = await this.prisma.requestLog.findMany({
      where: { projectId, createdAt: { gte: since } },
      select: { createdAt: true, statusCode: true },
      orderBy: { createdAt: "asc" },
    });
    const buckets = new Map<string, { total: number; success: number }>();
    for (const r of rows) {
      const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      const bucketMs = Math.floor(d.getTime() / (bucketHours * 3_600_000)) * (bucketHours * 3_600_000);
      const key = new Date(bucketMs).toISOString();
      const b = buckets.get(key) ?? { total: 0, success: 0 };
      b.total += 1;
      if (r.statusCode < 400) b.success += 1;
      buckets.set(key, b);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, { total, success }]) => ({
        time,
        successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 100,
      }));
  }

  async transferProjectOwnership(projectId: string, newOwnerId: string, previousOwnerId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.project.update({
        where: { id: projectId },
        data: { ownerId: newOwnerId },
      }),
      // Ensure previous owner remains a member
      this.prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: previousOwnerId } },
        update: { role: "member" },
        create: {
          projectId,
          userId: previousOwnerId,
          role: "member",
          acceptedAt: new Date(),
        },
      }),
    ]);
  }

  async listWebhookEvents(projectId: string): Promise<Array<{
    id: string;
    webhookId: string;
    webhookUrl: string;
    webhookName: string;
    eventType: string;
    status: string;
    responseStatus: number | null;
    responseBody: string | null;
    attemptNumber: number;
    nextRetryAt: string | null;
    permanentlyFailed: boolean;
    payload: Record<string, unknown> | null;
    signature: string;
    createdAt: string;
  }>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const rows = await db.webhookDelivery.findMany({
      where: { webhook: { projectId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        webhookId: true,
        eventType: true,
        status: true,
        responseStatus: true,
        responseBody: true,
        attemptNumber: true,
        nextRetryAt: true,
        createdAt: true,
        payload: true,
        webhook: { select: { url: true, events: true, secret: true } },
      },
    }) as Array<{
      id: string;
      webhookId: string;
      eventType: string;
      status: string;
      responseStatus: number | null;
      responseBody: string | null;
      attemptNumber: number;
      nextRetryAt: Date | string | null;
      createdAt: Date | string;
      payload: Record<string, unknown> | null;
      webhook: { url: string; events: unknown; secret: string };
    }>;
    return rows.map((r) => ({
      id: r.id,
      webhookId: r.webhookId,
      webhookUrl: r.webhook.url,
      webhookName: r.webhook.url,
      eventType: r.eventType,
      status: r.status,
      responseStatus: r.responseStatus,
      responseBody: r.responseBody,
      attemptNumber: r.attemptNumber,
      nextRetryAt: r.nextRetryAt
        ? r.nextRetryAt instanceof Date
          ? r.nextRetryAt.toISOString()
          : String(r.nextRetryAt)
        : null,
      permanentlyFailed: r.status === "failed" && !r.nextRetryAt,
      payload: r.payload,
      signature: createHmac("sha256", r.webhook.secret)
        .update(JSON.stringify(r.payload ?? {}))
        .digest("hex"),
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }));
  }

  async redeliverWebhookEvent(deliveryId: string, projectId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const original = await db.webhookDelivery.findFirst({
      where: { id: deliveryId, webhook: { projectId } },
      select: { webhookId: true, eventType: true, payload: true },
    }) as { webhookId: string; eventType: string; payload: unknown } | null;
    if (!original) return;
    await db.webhookDelivery.create({
      data: {
        webhookId: original.webhookId,
        eventType: original.eventType,
        payload: original.payload as object,
        attemptNumber: 1,
        status: "pending",
      },
    });
  }

  async globalSearch(userId: string, query: string): Promise<SearchResults> {
    const [projectRows, keyRows, requestRows] = await Promise.all([
      this.prisma.project.findMany({
        where: { ownerId: userId, name: { contains: query, mode: "insensitive" }, archivedAt: null },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      this.prisma.apiKey.findMany({
        where: { createdById: userId, OR: [{ label: { contains: query, mode: "insensitive" } }, { prefix: { contains: query, mode: "insensitive" } }] },
        select: { id: true, label: true, prefix: true },
        take: 5,
      }),
      this.prisma.requestLog.findMany({
        where: { userId, method: { contains: query, mode: "insensitive" } },
        select: { id: true, method: true, route: true, durationMs: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);
    return {
      projects: projectRows.map((p) => ({ type: "project" as const, displayName: p.name, description: p.slug, path: `/projects/${p.slug}` })),
      apiKeys: keyRows.map((k) => ({ type: "api_key" as const, displayName: k.label, description: k.prefix, path: "/api-keys" })),
      requests: requestRows.map((r) => ({ type: "request" as const, displayName: r.method, description: `${r.durationMs}ms`, path: `/analytics` })),
    };
  }

  async getHealthHistory(projectId: string, days: 7 | 30 = 7): Promise<Array<{ date: string; score: number }>> {
    const results: Array<{ date: string; score: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 86_400_000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const [reqCount, successCount] = await Promise.all([
        this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: dayStart, lt: dayEnd } } }),
        this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: dayStart, lt: dayEnd }, statusCode: { lt: 400 } } }),
      ]);
      let score = 40; // base
      if (reqCount > 0) score += 30;
      const rate = reqCount > 0 ? successCount / reqCount : null;
      if (rate !== null) score += Math.round(rate * 30);
      results.push({ date: dayStart.toISOString().slice(0, 10), score: Math.min(100, score) });
    }
    return results;
  }

  private async getHistoricalHealthWindow(projectId: string, days: 7 | 30, offsetWindows = 1): Promise<Array<{ date: string; score: number }>> {
    const results: Array<{ date: string; score: number }> = [];
    const totalOffsetDays = days * offsetWindows;
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(Date.now() - (i + totalOffsetDays) * 86_400_000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86_400_000);
      const [reqCount, successCount] = await Promise.all([
        this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: dayStart, lt: dayEnd } } }),
        this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: dayStart, lt: dayEnd }, statusCode: { lt: 400 } } }),
      ]);
      let score = 40;
      if (reqCount > 0) score += 30;
      const rate = reqCount > 0 ? successCount / reqCount : null;
      if (rate !== null) score += Math.round(rate * 30);
      results.push({ date: dayStart.toISOString().slice(0, 10), score: Math.min(100, score) });
    }
    return results;
  }

  async generateInviteLink(projectId: string, createdById: string): Promise<{ token: string; expiresAt: string }> {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 48 * 3_600_000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).projectMember.create({
      data: {
        projectId,
        invitedBy: createdById,
        status: "pending",
        inviteToken: token,
        inviteExpiry: expiresAt,
      },
    });
    return { token, expiresAt: expiresAt.toISOString() };
  }

  async lookupInviteToken(token: string): Promise<{ projectId: string; projectName: string; inviterWallet: string } | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).projectMember.findUnique({
      where: { inviteToken: token },
    });
    if (!member || (member.inviteExpiry && new Date(member.inviteExpiry) < new Date())) return null;
    const project = await this.prisma.project.findUnique({
      where: { id: member.projectId },
      select: { id: true, name: true, owner: { select: { walletAddress: true } } },
    });
    if (!project) return null;
    return { projectId: project.id, projectName: project.name, inviterWallet: project.owner.walletAddress };
  }

  async acceptInviteToken(token: string, userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (this.prisma as any).projectMember.findUnique({ where: { inviteToken: token } });
    if (!member) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).projectMember.update({
      where: { id: member.id },
      data: { userId, status: "active", acceptedAt: new Date(), inviteToken: null, inviteExpiry: null },
    });
  }

  async declineInviteToken(token: string, _userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).projectMember.deleteMany({ where: { inviteToken: token } });
  }

  async upsertDigestSchedule(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).digestSchedule.upsert({
      where: { userId },
      update: {},
      create: { userId, nextSendAt: new Date(Date.now() + 7 * 86_400_000) },
    });
  }

  async deleteDigestSchedule(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).digestSchedule.deleteMany({ where: { userId } });
  }

  async getPublicProjectStats(projectId: string): Promise<{
    projectId: string;
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
    uptime: number;
    lastUpdated: string;
  }> {
    const [totalRequests, successCount, latencyAgg] = await Promise.all([
      this.prisma.requestLog.count({ where: { projectId } }),
      this.prisma.requestLog.count({ where: { projectId, statusCode: { lt: 400 } } }),
      this.prisma.requestLog.aggregate({
        where: { projectId },
        _avg: { durationMs: true },
      }),
    ]);

    const since24h = new Date(Date.now() - 24 * 3_600_000);
    const snapshots = await this.prisma.serviceHealthSnapshot.findMany({
      where: { checkedAt: { gte: since24h } },
      select: { status: true },
    });
    const uptime =
      snapshots.length > 0
        ? snapshots.filter((s) => s.status === "healthy").length / snapshots.length
        : 1.0;

    return {
      projectId,
      totalRequests,
      successRate: totalRequests > 0 ? successCount / totalRequests : 1.0,
      avgLatencyMs: latencyAgg._avg.durationMs ?? 0,
      uptime,
      lastUpdated: new Date().toISOString(),
    };
  }

  async updateProjectTags(projectId: string, tags: string[]): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).project.update({ where: { id: projectId }, data: { tags } });
  }

  async getNetworkHealthCalendar(): Promise<Array<{ date: string; availability: number; color: 'green' | 'amber' | 'red' }>> {
    const days: Array<{ date: string; availability: number; color: 'green' | 'amber' | 'red' }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]!;
      const start = new Date(dateStr);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const snapshots = await this.prisma.serviceHealthSnapshot.findMany({
        where: { checkedAt: { gte: start, lt: end } },
        select: { status: true },
      });
      const total: number = snapshots.length;
      const healthy: number = snapshots.filter((s) => s.status === 'healthy').length;
      const avg = total > 0 ? healthy / total : 1.0;
      const color: 'green' | 'amber' | 'red' = avg >= 0.95 ? 'green' : avg >= 0.80 ? 'amber' : 'red';
      days.push({ date: dateStr, availability: avg, color });
    }
    return days;
  }

  async findApiKeyByHash(keyHash: string): Promise<{ id: string; projectId: string; scopes: unknown; status: string; expiresAt: Date | null } | null> {
    const record = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        status: ApiKeyStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { id: true, projectId: true, scopes: true, status: true, expiresAt: true },
    });
    return record ?? null;
  }

  async getLatestDigestRecord(userId: string): Promise<{ htmlContent: string; generatedAt: Date } | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (this.prisma as any).digestRecord.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
      select: { htmlContent: true, generatedAt: true },
    });
    return record as { htmlContent: string; generatedAt: Date } | null;
  }

  async createDigestRecord(input: { userId: string; htmlContent: string }): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (this.prisma as any).digestRecord.create({
      data: { userId: input.userId, htmlContent: input.htmlContent },
    });
  }

  async getEmailDeliveryStatus(userId: string, configured: boolean): Promise<EmailDeliveryStatus> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        emailVerified: true,
        notifyWeeklySummary: true,
      },
    });
    const [schedule, latestRecord, statusSubscriber] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma as any).digestSchedule.findUnique({
        where: { userId },
        select: {
          nextSendAt: true,
          lastSentAt: true,
        },
      }) as Promise<{ nextSendAt: Date | null; lastSentAt: Date | null } | null>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.prisma as any).digestRecord.findFirst({
        where: { userId },
        orderBy: { generatedAt: "desc" },
        select: {
          generatedAt: true,
          sent: true,
        },
      }) as Promise<{ generatedAt: Date; sent: boolean } | null>,
      user?.email
        ? this.prisma.statusSubscriber.findFirst({
            where: {
              email: user.email,
              active: true,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      configured,
      provider: configured ? "resend" : "unconfigured",
      email: user?.email ?? null,
      emailVerified: Boolean(user?.emailVerified),
      verificationRequired: Boolean(user?.email && !user?.emailVerified),
      digestEnabled: Boolean(user?.notifyWeeklySummary && schedule),
      digestNextSendAt: schedule?.nextSendAt?.toISOString() ?? null,
      digestLastSentAt: schedule?.lastSentAt?.toISOString() ?? null,
      latestDigestGeneratedAt: latestRecord?.generatedAt?.toISOString() ?? null,
      latestDigestSent: latestRecord?.sent ?? null,
      statusSubscriberActive: Boolean(statusSubscriber),
    };
  }

  async findAdminUsers(): Promise<Array<{ id: string }>> {
    return this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.OWNER] } },
      select: { id: true },
    });
  }
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}
