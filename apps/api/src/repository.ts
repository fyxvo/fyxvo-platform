import { createHash } from "node:crypto";
import {
  ApiKeyStatus,
  type PrismaClientType,
  type PrismaNamespace
} from "@fyxvo/database";
import type {
  AdminOverviewBase,
  AdminStats,
  AnalyticsOverview,
  ApiKeyAnalyticsItem,
  ApiKeyRecord,
  ApiRepository,
  AuthenticatedUser,
  CreateFeedbackSubmissionInput,
  CreateInterestSubmissionInput,
  CreateApiKeyInput,
  CreateProjectInput,
  ErrorLogItem,
  FundingRecordInput,
  IdempotencyLookup,
  MethodBreakdownItem,
  NotificationItem,
  OperatorSummary,
  ProjectAnalytics,
  ProjectWithOwner,
  RequestLogInput,
  SaveIdempotencyInput,
  UpdateProjectInput
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
}) {
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
      orderBy: {
        createdAt: "asc"
      }
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
        ...(input.description !== undefined ? { description: input.description } : {})
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
        ...(input.description !== undefined ? { description: input.description } : {})
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

  async getNotifications(userId: string, projectIds: readonly string[]): Promise<NotificationItem[]> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const projectFilter = projectIds.length > 0 ? { in: projectIds as string[] } : undefined;

    const [recentFunding, recentKeys, recentRevocations] = await Promise.all([
      this.prisma.fundingCoordinate.findMany({
        where: {
          requestedById: userId,
          confirmedAt: { not: null, gte: since }
        },
        orderBy: { confirmedAt: "desc" },
        take: 10,
        include: { project: { select: { id: true, name: true } } }
      }),
      this.prisma.apiKey.findMany({
        where: {
          createdById: userId,
          createdAt: { gte: since },
          ...(projectFilter ? { projectId: { in: projectFilter.in } } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { project: { select: { id: true, name: true } } }
      }),
      this.prisma.apiKey.findMany({
        where: {
          createdById: userId,
          status: "REVOKED",
          revokedAt: { gte: since },
          ...(projectFilter ? { projectId: { in: projectFilter.in } } : {})
        },
        orderBy: { revokedAt: "desc" },
        take: 5,
        include: { project: { select: { id: true, name: true } } }
      })
    ]);

    const notifications: NotificationItem[] = [];

    for (const fc of recentFunding) {
      notifications.push({
        id: `funding-${fc.id}`,
        type: "funding_confirmed",
        title: "SOL deposit confirmed",
        message: `${(Number(fc.amount) / 1e9).toFixed(4)} SOL funded to ${fc.project.name}`,
        projectId: fc.projectId,
        projectName: fc.project.name,
        createdAt: (fc.confirmedAt ?? fc.createdAt).toISOString()
      });
    }

    for (const key of recentKeys) {
      notifications.push({
        id: `apikey-created-${key.id}`,
        type: "api_key_created",
        title: "API key created",
        message: `Key "${key.label}" (${key.prefix}…) created for ${key.project.name}`,
        projectId: key.projectId,
        projectName: key.project.name,
        createdAt: key.createdAt.toISOString()
      });
    }

    for (const key of recentRevocations) {
      notifications.push({
        id: `apikey-revoked-${key.id}`,
        type: "api_key_revoked",
        title: "API key revoked",
        message: `Key "${key.label}" (${key.prefix}…) was revoked from ${key.project.name}`,
        projectId: key.projectId,
        projectName: key.project.name,
        createdAt: (key.revokedAt ?? key.updatedAt).toISOString()
      });
    }

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 20);
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

    return {
      project: mapProject(project),
      totals: {
        requestLogs: project._count.requestLogs,
        apiKeys: project._count.apiKeys,
        fundingRequests: project._count.fundingRequests
      },
      latency: {
        averageMs: Math.round(requestSummary._avg.durationMs ?? 0),
        maxMs: requestSummary._max.durationMs ?? 0
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
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}
