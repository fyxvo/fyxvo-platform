import { createHash, randomBytes } from "node:crypto";
import {
  ApiKeyStatus,
  Prisma,
  type PrismaClientType,
  type PrismaNamespace
} from "@fyxvo/database";
import type {
  ActivityLogItem,
  AdminOverviewBase,
  AdminStats,
  AnalyticsOverview,
  ApiKeyAnalyticsItem,
  ApiKeyRecord,
  ApiRepository,
  AssistantStats,
  AuthenticatedUser,
  CreateFeedbackSubmissionInput,
  CreateInterestSubmissionInput,
  CreateApiKeyInput,
  CreateNotificationInput,
  CreateProjectInput,
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
  ProjectMemberItem,
  ProjectWithOwner,
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
  SearchResults
} from "./types.js";

type PrismaProject = PrismaNamespace.ProjectGetPayload<{
  include: {
    owner: true;
    _count: {
      select: {
        apiKeys: true;
        requestLogs: true;
        fundingRequests: true;
      };
    };
  };
}>;

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
    _count: project._count
  };
}

function shortWallet(walletAddress: string): string {
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

function toJsonValue(value: Record<string, unknown>): PrismaNamespace.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, candidate) =>
      typeof candidate === "bigint" ? candidate.toString() : candidate
    )
  ) as PrismaNamespace.InputJsonValue;
}

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
      where: user.role === "OWNER" || user.role === "ADMIN" ? {} : { ownerId: user.id },
      include: {
        owner: true,
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
        ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
        ...(input.environment !== undefined ? { environment: input.environment } : {}),
        ...(input.starred !== undefined ? { starred: input.starred } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.githubUrl !== undefined ? { githubUrl: input.githubUrl } : {}),
        ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        ...(input.publicSlug !== undefined ? { publicSlug: input.publicSlug } : {}),
        ...(input.leaderboardVisible !== undefined ? { leaderboardVisible: input.leaderboardVisible } : {})
      },
      include: {
        owner: true,
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
    return this.prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        createdById: true,
        label: true,
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
  }

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord> {
    return this.prisma.apiKey.create({
      data: {
        projectId: input.projectId,
        createdById: input.createdById,
        label: input.label,
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

  async recordRequestLog(input: RequestLogInput) {
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
        const { requestId: _requestId, ...withoutRequestId } = input;
        await this.prisma.requestLog.create({
          data: withoutRequestId
        });
        return;
      }
    }

    await this.prisma.requestLog.create({
      data: input
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
    return {
      requestsToday: 0,
      requestsThisWeek: 0,
      averageResponseTimeMs: 0,
      rateLimitHitsToday: 0,
    };
  }

  async listIncidents(limit: number): Promise<IncidentItem[]> {
    const rows = await this.prisma.incident.findMany({
      orderBy: { startedAt: "desc" },
      take: limit
    });
    return rows.map((row) => ({
      id: row.id,
      serviceName: row.serviceName,
      severity: row.severity,
      description: row.description,
      startedAt: row.startedAt.toISOString(),
      resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null
    }));
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ann: any = await db.systemAnnouncement.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });
    if (!ann) return null;
    return { id: ann.id as string, message: ann.message as string, severity: ann.severity as string, active: ann.active as boolean, createdAt: (ann.createdAt as Date).toISOString() };
  }

  async upsertAnnouncement(input: { message: string; severity: string }): Promise<void> {
    // Deactivate existing announcements and create a new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.systemAnnouncement.updateMany({ where: { active: true }, data: { active: false } });
    await db.systemAnnouncement.create({ data: { message: input.message, severity: input.severity, active: true } });
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
        responseStatus: input.responseStatus ?? null,
        responseBody: input.responseBody ? input.responseBody.slice(0, 1000) : null,
        success: input.success,
        nextRetryAt: input.nextRetryAt ?? null,
      },
      select: { id: true },
    });
    return rec.id as string;
  }

  async getWebhookDeliveries(webhookId: string, limit = 20): Promise<WebhookDeliveryRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const rows = await db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { attemptedAt: "desc" },
      take: limit,
      select: { id: true, webhookId: true, eventType: true, success: true, responseStatus: true, attemptNumber: true, attemptedAt: true },
    }) as WebhookDeliveryRecord[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map((r: { attemptedAt: Date | string } & Record<string, unknown>) => ({
      ...r,
      attemptedAt: r.attemptedAt instanceof Date ? r.attemptedAt.toISOString() : String(r.attemptedAt),
    })) as WebhookDeliveryRecord[];
  }

  async getPendingWebhookRetries(): Promise<{ id: string; webhookId: string; webhook: { url: string; secret: string }; payload: unknown; eventType: string; attemptNumber: number }[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    return db.webhookDelivery.findMany({
      where: { success: false, nextRetryAt: { lte: new Date() }, attemptNumber: { lt: 5 } },
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
        responseStatus: data.responseStatus ?? null,
        responseBody: data.responseBody ? data.responseBody.slice(0, 1000) : null,
        success: data.success,
        nextRetryAt: data.nextRetryAt ?? null,
      },
    });
  }

  async recordPerformanceMetric(input: PerformanceMetricInput): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    await db.performanceMetric.create({
      data: {
        page: input.page.slice(0, 200),
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
      SELECT page, AVG(fcp) as "avgFcp", AVG(lcp) as "avgLcp", COUNT(*) as "sampleCount"
      FROM "PerformanceMetric"
      WHERE "createdAt" >= ${cutoff}
      GROUP BY page
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
        activated: true,
        balance: true,
        _count: { select: { apiKeys: true } },
      },
    });
    if (!project) return { score: 0, activated: false, hasFunding: false, hasApiKeys: false, hasTraffic: false, successRate: null };

    const reqCount = await this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });
    const successCount = await this.prisma.requestLog.count({ where: { projectId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, statusCode: { lt: 400 } } });

    const activated = project.activated as boolean;
    const balNum = Number(project.balance ?? 0n);
    const hasFunding = balNum > 1_000_000; // > 0.001 SOL in lamports
    const hasApiKeys = (project._count?.apiKeys ?? 0) > 0;
    const hasTraffic = reqCount > 0;
    const successRate = reqCount > 0 ? successCount / reqCount : null;

    let score = 0;
    if (activated) score += 30;
    if (hasFunding) score += 20;
    if (hasApiKeys) score += 20;
    if (hasTraffic) score += 20;
    if (successRate !== null) score += Math.round(successRate * 10);

    return { score: Math.min(100, score), activated, hasFunding, hasApiKeys, hasTraffic, successRate };
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
    const rows = await db.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map((r: unknown) => this._mapTicket(r));
  }

  async getSupportTicket(id: string, userId: string): Promise<SupportTicketRecord | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.supportTicket.findFirst({ where: { id, userId } });
    return row ? this._mapTicket(row) : null;
  }

  async adminListSupportTickets(status?: string): Promise<SupportTicketRecord[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const where = status ? { status } : {};
    const rows = await db.supportTicket.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map((r: unknown) => this._mapTicket(r));
  }

  async adminRespondToTicket(id: string, response: string, status: string): Promise<SupportTicketRecord> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const row = await db.supportTicket.update({
      where: { id },
      data: { adminResponse: response, status, resolvedAt: status === "resolved" ? new Date() : null },
    });
    return this._mapTicket(row);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _mapTicket(r: any): SupportTicketRecord {
    return {
      id: r.id as string,
      userId: r.userId as string,
      projectId: (r.projectId as string | null) ?? null,
      category: r.category as string,
      priority: r.priority as string,
      subject: r.subject as string,
      description: r.description as string,
      status: r.status as string,
      adminResponse: (r.adminResponse as string | null) ?? null,
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
        statusCode: true, route: true, service: true, createdAt: true,
      },
    });
    if (!log) return null;
    return {
      ...log,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
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
    attemptNumber: number;
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
        attemptNumber: true,
        createdAt: true,
        webhook: { select: { url: true, events: true } },
      },
    }) as Array<{
      id: string;
      webhookId: string;
      eventType: string;
      status: string;
      responseStatus: number | null;
      attemptNumber: number;
      createdAt: Date | string;
      webhook: { url: string; events: unknown };
    }>;
    return rows.map((r) => ({
      id: r.id,
      webhookId: r.webhookId,
      webhookUrl: r.webhook.url,
      webhookName: r.webhook.url,
      eventType: r.eventType,
      status: r.status,
      responseStatus: r.responseStatus,
      attemptNumber: r.attemptNumber,
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

  async getHealthHistory(projectId: string): Promise<Array<{ date: string; score: number }>> {
    const days = 7;
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
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}
