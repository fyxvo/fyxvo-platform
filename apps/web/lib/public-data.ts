import { API_BASE, GATEWAY_BASE } from "./env";

export interface PublicApiHealth {
  status: string;
  service: string;
  version: string;
  environment?: string;
  commit?: string;
  assistantAvailable?: boolean;
  timestamp: string;
  dependencies?: {
    database?: { ok: boolean; responseTimeMs?: number };
    redis?: { ok: boolean; responseTimeMs?: number };
    solana?: { ok: boolean; responseTimeMs?: number; protocolReady?: boolean };
  };
}

export interface PublicApiStatus {
  status: string;
  service: string;
  version: string;
  commit?: string;
  environment?: string;
  region?: string;
  assistantAvailable?: boolean;
  solanaCluster?: string;
  solanaRpcUrl?: string;
  programId?: string;
  adminAuthority?: string;
  timestamp: string;
  acceptedAssets?: {
    sol?: boolean;
    usdcEnabled?: boolean;
    usdcMintAddress?: string;
  };
  protocolReadiness?: {
    ready?: boolean;
    reasons?: string[];
    addresses?: {
      programId?: string;
      protocolConfig?: string;
      treasury?: string;
      operatorRegistry?: string;
      treasuryUsdcVault?: string;
    };
  };
}

export interface PublicGatewayHealth {
  status: string;
  service: string;
  version: string;
  commit?: string;
  environment?: string;
  region?: string;
  solanaCluster?: string;
  timestamp: string;
  dependencies?: {
    redis?: { ok: boolean; responseTimeMs?: number };
    upstream?: { ok: boolean; responseTimeMs?: number; nodeCount?: number; url?: string };
  };
  metrics?: {
    totals?: { requests?: number; successes?: number; errors?: number };
    standard?: { averageLatencyMs?: number; successRate?: number };
    priority?: { averageLatencyMs?: number; successRate?: number };
  };
}

export interface PublicNetworkStats {
  totalRequests: number;
  totalProjects: number;
  totalApiKeys: number;
  totalSolFees: string;
  updatedAt: string;
  region?: string;
}

export interface PublicUpdatePost {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  publishedAt: string | null;
  visible?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicLeaderboardEntry {
  rank: number;
  projectName: string;
  totalRequests: number;
  avgLatencyMs: number;
  hasPublicPage: boolean;
  publicSlug: string | null;
}

export interface PublicExploreProject {
  id: string;
  projectName: string;
  publicSlug: string | null;
  templateType: string;
  tags: string[];
  leaderboardVisible: boolean;
  requestVolume7d: number;
  averageLatencyMs7d: number;
  successRate7d: number;
  healthSummary: string;
  reputationBadge: string | null;
  createdAt: string;
}

async function fetchJson<T>(url: string, revalidate = 60): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getPublicApiHealth(): Promise<PublicApiHealth | null> {
  return fetchJson<PublicApiHealth>(`${API_BASE}/health`, 30);
}

export async function getPublicApiStatus(): Promise<PublicApiStatus | null> {
  return fetchJson<PublicApiStatus>(`${API_BASE}/v1/status`, 30);
}

export async function getPublicGatewayHealth(): Promise<PublicGatewayHealth | null> {
  return fetchJson<PublicGatewayHealth>(`${GATEWAY_BASE}/health`, 30);
}

export async function getPublicNetworkStats(): Promise<PublicNetworkStats | null> {
  return fetchJson<PublicNetworkStats>(`${API_BASE}/v1/network/stats`, 60);
}

export async function getPublicUpdates(): Promise<PublicUpdatePost[]> {
  const response = await fetchJson<{ posts: PublicUpdatePost[] }>(`${API_BASE}/v1/updates`, 300);
  return response?.posts ?? [];
}

export async function getPublicUpdate(slug: string): Promise<PublicUpdatePost | null> {
  return fetchJson<PublicUpdatePost>(`${API_BASE}/v1/updates/${slug}`, 300);
}

export async function getPublicLeaderboard(): Promise<PublicLeaderboardEntry[]> {
  const response = await fetchJson<{ entries: PublicLeaderboardEntry[] }>(
    `${API_BASE}/v1/leaderboard`,
    120
  );
  return response?.entries ?? [];
}

export async function getPublicExploreProjects(): Promise<PublicExploreProject[]> {
  const response = await fetchJson<{ items: PublicExploreProject[] }>(
    `${API_BASE}/v1/explore`,
    120
  );
  return response?.items ?? [];
}

export const protocolAddresses = {
  programId: "Gsi8tsTm7BinEgcYd1Uc4wtNBjMrjYfbtKdoDpGdvkJc",
  protocolConfig: "J4uiLhB3qaYUFvu6YAT6oTrBbe7qXfwZFfLm2ph5GTAH",
  treasury: "HvgY6dGviH5xosaHvVBNKwt2gTTnJYJ9aG7dWC4wqST1",
  operatorRegistry: "9k4Xr4qfVMSN14aNkFdDFHbd74syujkyYcGKGTWYxmRQ",
  treasuryUsdcVault: "2epkxnyGfX6FPYRmPa2tystcd1UrvjYFR5wJh6uKZj5i",
  protocolAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
  pauseAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
} as const;

export const requestPricingTiers = [
  {
    name: "Standard RPC",
    lamports: 5000,
    description:
      "Default lane for everyday JSON-RPC reads and standard gateway traffic.",
  },
  {
    name: "Write and compute-heavy methods",
    lamports: 20000,
    description:
      "Higher-cost traffic is billed at the live 4x lane when methods or writes put more pressure on upstream nodes.",
  },
  {
    name: "Priority relay",
    lamports: 20000,
    description:
      "Low-latency path for time-sensitive transaction submission with its own scope and routing lane.",
  },
] as const;

export const marketingMilestones: PublicUpdatePost[] = [
  {
    slug: "devnet-private-alpha-live",
    title: "Devnet private alpha is live",
    summary:
      "The hosted web app, API, gateway, and worker are now operating together on devnet.",
    content:
      "Fyxvo is live in devnet private alpha with wallet authentication, project activation, SOL funding, project-scoped API keys, analytics, alerts, assistant workflows, and public trust surfaces available through the hosted stack.",
    publishedAt: "2026-03-28T00:00:00.000Z",
  },
  {
    slug: "funded-relay-pricing-published",
    title: "Funded relay pricing is published",
    summary:
      "Pricing is request-based in lamports instead of monthly SaaS plans or free-tier bundles.",
    content:
      "The relay charges 1,000 lamports for standard RPC, 3,000 lamports for compute-heavy methods, and 5,000 lamports for priority relay requests. Volume discounts apply automatically at one million and ten million monthly requests. There is no free tier in the live devnet deployment.",
    publishedAt: "2026-03-27T00:00:00.000Z",
  },
  {
    slug: "public-status-and-trust-surfaces-online",
    title: "Public status and trust surfaces are online",
    summary:
      "Status, security, reliability, leaderboard, explore, and public project-page surfaces are part of the product contract.",
    content:
      "Fyxvo now exposes public trust surfaces for status, protocol addresses, public project pages, badges, explore listings, and opt-in leaderboard participation. These pages are meant to make the operating posture visible instead of hiding it behind private dashboards only.",
    publishedAt: "2026-03-26T00:00:00.000Z",
  },
];
