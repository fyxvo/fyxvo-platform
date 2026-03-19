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

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
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
        where: { projectId },
        _avg: { durationMs: true },
        _max: { durationMs: true }
      }),
      this.prisma.requestLog.groupBy({
        by: ["statusCode"],
        where: { projectId },
        _count: { statusCode: true }
      }),
      this.prisma.requestLog.findMany({
        where: { projectId },
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
