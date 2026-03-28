import type {
  AdminOverview,
  AdminStats,
  AnalyticsOverview,
  OnchainSnapshot,
  Operator,
  PortalApiKey,
  PortalProject,
  ProjectAnalytics,
} from "./types";

export const previewProjects: PortalProject[] = [
  {
    id: "preview-project-1",
    name: "Northwind Labs",
    slug: "northwind-labs",
    publicSlug: "northwind",
    description: "High-frequency trading infrastructure on Solana devnet.",
    status: "ACTIVE",
    network: "devnet",
    owner: {
      id: "user-preview-1",
      walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4",
      email: "owner@fyxvo.dev",
      name: "Jordan",
      role: "OWNER",
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: "2026-03-18T19:00:00.000Z",
    },
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-03-18T19:00:00.000Z",
  },
  {
    id: "preview-project-2",
    name: "Meridian Protocol",
    slug: "meridian-protocol",
    publicSlug: "meridian",
    description: "DeFi liquidity routing across Solana AMMs.",
    status: "ACTIVE",
    network: "devnet",
    owner: {
      id: "user-preview-1",
      walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4",
      email: "owner@fyxvo.dev",
      name: "Jordan",
      role: "OWNER",
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: "2026-03-18T19:00:00.000Z",
    },
    createdAt: "2026-02-05T12:00:00.000Z",
    updatedAt: "2026-03-20T10:00:00.000Z",
  },
];

export const previewOnchain: OnchainSnapshot = {
  projectPda: "9w5M8wQJRmL6x4uJg4gN8J7kY7YQu2D38R4Uu5qN4r7D",
  treasuryPda: "5gS7uYTrL1QWxFAt2k5Lgq8Jm7mke7pYJ2r1Yx8QJ9Q2",
  balanceLamports: 2_500_000_000,
  balanceSol: 2.5,
  treasuryUsdcVault: null,
  operatorCount: 3,
  requestCount: 14_820,
  updatedAt: "2026-03-26T00:00:00.000Z",
};

export const previewApiKeys: PortalApiKey[] = [
  {
    id: "key-preview-1",
    projectId: "preview-project-1",
    createdById: "user-preview-1",
    label: "Default relay key",
    prefix: "fyxvo_live_dflt",
    status: "ACTIVE",
    scopes: ["project:read", "rpc:request"],
    colorTag: "blue",
    lastUsedAt: "2026-03-25T22:10:00.000Z",
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-01-15T08:00:00.000Z",
    updatedAt: "2026-03-25T22:10:00.000Z",
  },
  {
    id: "key-preview-2",
    projectId: "preview-project-1",
    createdById: "user-preview-1",
    label: "Analytics reader",
    prefix: "fyxvo_live_anlt",
    status: "ACTIVE",
    scopes: ["project:read"],
    colorTag: "green",
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-02-20T09:00:00.000Z",
    updatedAt: "2026-02-20T09:00:00.000Z",
  },
];

export const previewOverview: AnalyticsOverview = {
  totals: {
    projects: 2,
    apiKeys: 4,
    fundingRequests: 3,
    requestLogs: 89_060,
  },
  latency: {
    averageMs: 18,
    maxMs: 78,
  },
  requestsByService: [
    { service: "gateway", count: 80_200 },
    { service: "api", count: 8_860 },
  ],
};

export const previewProjectAnalytics: ProjectAnalytics = {
  project: previewProjects[0]!,
  totals: {
    requestLogs: 46_200,
    apiKeys: 2,
    fundingRequests: 1,
  },
  latency: {
    averageMs: 16,
    maxMs: 72,
    p95Ms: 38,
  },
  statusCodes: [
    { statusCode: 200, count: 45_900 },
    { statusCode: 429, count: 180 },
    { statusCode: 500, count: 120 },
  ],
  recentRequests: [],
};

export const previewAdminOverview: AdminOverview = {
  totalProjects: 47,
  totalUsers: 38,
  totalRequests: 1_240_000,
  activeProjects: 31,
  updatedAt: "2026-03-26T00:00:00.000Z",
};

export const previewAdminStats: AdminStats = {
  requestsToday: 8_200,
  requestsThisWeek: 54_700,
  activeProjects: 31,
  newProjectsThisWeek: 3,
  totalUsers: 38,
  newUsersThisWeek: 5,
  p95Ms: 45,
  errorRateToday: 0.004,
  updatedAt: "2026-03-26T00:00:00.000Z",
};

export const previewOperators: Operator[] = [
  {
    id: "op-1",
    name: "Node Alpha",
    walletAddress: "ALPHAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    region: "us-east-1",
    status: "ACTIVE",
    uptimePct: 99.97,
    registeredAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "op-2",
    name: "Node Beta",
    walletAddress: "BETAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    region: "eu-west-1",
    status: "ACTIVE",
    uptimePct: 99.92,
    registeredAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "op-3",
    name: "Node Gamma",
    walletAddress: "GAMMAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    region: "ap-southeast-1",
    status: "ACTIVE",
    uptimePct: 99.85,
    registeredAt: "2026-02-01T00:00:00.000Z",
  },
];
