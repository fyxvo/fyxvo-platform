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
  MethodBreakdownItem,
  NetworkStats,
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
  ReferralStats
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
    const project = await this.prisma.project.update({
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
        ...(input.publicSlug !== undefined ? { publicSlug: input.publicSlug } : {})
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
      where: { projectId },
      include: { user: { select: { walletAddress: true, displayName: true } } },
      orderBy: { invitedAt: "asc" }
    });
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      userId: r.userId,
      role: r.role,
      invitedBy: r.invitedBy ?? null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      user: { walletAddress: r.user.walletAddress, displayName: r.user.displayName },
    }));
  }

  async findProjectMember(projectId: string, userId: string): Promise<ProjectMemberItem | null> {
    const r = await this.prisma.projectMember.findFirst({
      where: { projectId, userId },
      include: { user: { select: { walletAddress: true, displayName: true } } }
    });
    if (!r) return null;
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
    if (!r) return null;
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
      userId: r.userId,
      role: r.role,
      invitedBy: r.invitedBy ?? null,
      invitedAt: r.invitedAt.toISOString(),
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      user: { walletAddress: r.user.walletAddress, displayName: r.user.displayName },
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
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}
