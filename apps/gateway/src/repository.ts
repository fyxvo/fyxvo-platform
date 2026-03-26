import { createHash } from "node:crypto";
import {
  ApiKeyStatus,
  NodeNetwork,
  NodeStatus,
  Prisma,
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

export class PrismaGatewayRepository implements GatewayRepository {
  constructor(
    private readonly prisma: PrismaClientType,
    private readonly cluster: "devnet"
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
        onChainProjectPda: record.project.onChainProjectPda
      }
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
