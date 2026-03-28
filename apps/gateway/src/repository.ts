import { createHash } from "node:crypto";
import {
  ApiKeyStatus,
  NodeNetwork,
  NodeStatus,
  Prisma,
  type RequestLog,
  type Node as DatabaseNode,
  type PrismaClientType
} from "@fyxvo/database";
import type { GatewayRepository, ProjectAccessContext, RoutedRpcNode } from "./types.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function networkFromCluster(cluster: "devnet"): DatabaseNode["network"] {
  return cluster === "devnet" ? NodeNetwork.DEVNET : NodeNetwork.DEVNET;
}

function parseScopes(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function parseLoggedRouteMethods(route: string) {
  if (!route.startsWith("batch:")) {
    return [route];
  }
  return route
    .slice("batch:".length)
    .split(",")
    .map((value) => value.trim().replace(/\s+\+\d+$/, ""))
    .filter((value) => value.length > 0);
}

function estimateRequestLogLamports(row: Pick<RequestLog, "route" | "mode">) {
  const methods = parseLoggedRouteMethods(row.route);
  if (methods.length === 0) {
    return 0n;
  }
  return methods.reduce((sum, method) => {
    if (row.mode === "priority") {
      return sum + 5_000n;
    }
    if (["sendTransaction", "sendRawTransaction", "simulateTransaction", "requestAirdrop"].includes(method)) {
      return sum + 4_000n;
    }
    if (
      [
        "getProgramAccounts",
        "getLargestAccounts",
        "getTokenLargestAccounts",
        "getTokenAccountsByOwner",
        "getTokenAccountsByDelegate",
        "getParsedTokenAccountsByOwner",
        "getParsedTokenAccountsByDelegate",
        "getMultipleAccounts",
        "getParsedMultipleAccounts",
        "getSignaturesForAddress",
        "getConfirmedSignaturesForAddress2",
        "getBlockProduction",
      ].includes(method)
    ) {
      return sum + 3_000n;
    }
    return sum + 1_000n;
  }, 0n);
}

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export class PrismaGatewayRepository implements GatewayRepository {
  constructor(
    private readonly prisma: PrismaClientType,
    private readonly cluster: "devnet",
    private readonly fallbackUpstreamUrls: readonly string[] = []
  ) {}

  async findProjectAccessByApiKey(apiKey: string): Promise<ProjectAccessContext | null> {
    const record = await this.prisma.apiKey.findFirst({
      where: {
        keyHash: sha256(apiKey),
        status: ApiKeyStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
      },
      include: {
        project: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!record) {
      return null;
    }

    return {
      apiKey: {
        id: record.id,
        projectId: record.projectId,
        label: record.label,
        prefix: record.prefix,
        scopes: parseScopes(record.scopes),
        status: record.status,
        expiresAt: record.expiresAt
      },
      project: {
        id: record.project.id,
        slug: record.project.slug,
        name: record.project.name,
        ownerId: record.project.ownerId,
        ownerWalletAddress: record.project.owner.walletAddress,
        chainProjectId: record.project.chainProjectId,
        onChainProjectPda: record.project.onChainProjectPda,
        dailyBudgetLamports: record.project.dailyBudgetLamports,
        monthlyBudgetLamports: record.project.monthlyBudgetLamports,
        budgetWarningThresholdPct: record.project.budgetWarningThresholdPct,
        budgetHardStop: record.project.budgetHardStop,
      }
    };
  }

  async getProjectBudgetUsage(projectId: string) {
    const now = new Date();
    const [dailyRows, monthlyRows] = await Promise.all([
      this.prisma.requestLog.findMany({
        where: {
          projectId,
          simulated: false,
          createdAt: { gte: startOfUtcDay(now) },
        },
        select: { route: true, mode: true },
      }),
      this.prisma.requestLog.findMany({
        where: {
          projectId,
          simulated: false,
          createdAt: { gte: startOfUtcMonth(now) },
        },
        select: { route: true, mode: true },
      }),
    ]);

    return {
      dailyLamports: dailyRows.reduce((sum, row) => sum + estimateRequestLogLamports(row), 0n),
      monthlyLamports: monthlyRows.reduce((sum, row) => sum + estimateRequestLogLamports(row), 0n),
    };
  }

  async listUpstreamNodes(projectId?: string): Promise<RoutedRpcNode[]> {
    const nodes = await this.prisma.node.findMany({
      where: {
        network: networkFromCluster(this.cluster),
        status: {
          in: [NodeStatus.ONLINE, NodeStatus.DEGRADED]
        },
        ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {})
      },
      include: {
        operator: true
      }
    });

    if (nodes.length > 0) {
      return nodes.map((node: DatabaseNode & { operator: { name: string } }) => ({
        id: node.id,
        projectId: node.projectId,
        name: node.name,
        endpoint: node.endpoint,
        region: node.region,
        status: node.status,
        lastHeartbeatAt: node.lastHeartbeatAt,
        operatorName: node.operator.name
      }));
    }

    return this.fallbackUpstreamUrls.map((endpoint, index) => ({
      id: `managed-fallback-${index + 1}`,
      projectId: null,
      name: `managed-upstream-${index + 1}`,
      endpoint,
      region: "managed",
      status: NodeStatus.ONLINE,
      lastHeartbeatAt: null,
      operatorName: "Managed infrastructure"
    }));
  }

  async touchApiKeyUsage(apiKeyId: string): Promise<void> {
    await this.prisma.apiKey.update({
      where: {
        id: apiKeyId
      },
      data: {
        lastUsedAt: new Date()
      }
    });
  }

  async recordRequestLog(input: {
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
    readonly mode?: "standard" | "priority";
    readonly simulated?: boolean;
    readonly cacheHit?: boolean;
    readonly fyxvoHint?: unknown;
  }): Promise<void> {
    const data: Prisma.RequestLogUncheckedCreateInput = {
      route: input.route,
      method: input.method,
      statusCode: input.statusCode,
      durationMs: input.durationMs,
      service: "gateway" as const,
      ...(input.requestId ? { requestId: input.requestId } : {}),
      ...(input.apiKeyId ? { apiKeyId: input.apiKeyId } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      ...(input.userAgent ? { userAgent: input.userAgent } : {}),
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
                : (input.fyxvoHint as Prisma.InputJsonValue),
          }
        : {})
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

    await this.prisma.requestLog.create({ data });
  }

  async ping(): Promise<boolean> {
    await this.prisma.$queryRaw`SELECT 1`;
    return true;
  }
}
