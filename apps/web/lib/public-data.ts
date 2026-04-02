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
  managedOperatorWallet: "8TZ1Q5TqNmbDkza57ZssfmufMxX8hxoKV28uhWg4Qnph",
  managedOperatorAccount: "5DnhYryvZAKWLY6kuzQKYrUdNBCskQ3oZgnrMmj6Fwi6",
  protocolAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
  pauseAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
} as const;

export const requestPricingTiers = [
  {
    name: "Standard RPC",
    lamports: 50_000,
    description:
      "Default lane for everyday JSON-RPC reads and standard gateway traffic.",
  },
  {
    name: "Write and compute-heavy methods",
    lamports: 200_000,
    description:
      "Higher-cost traffic is billed at the 4x lane when methods or writes put more pressure on upstream nodes.",
  },
  {
    name: "Priority relay",
    lamports: 200_000,
    description:
      "Low-latency path for time-sensitive transaction submission with its own scope and routing lane.",
  },
] as const;

export const mainnetPayAsYouGo = {
  standardLamports: 50_000,
  standardUsdc: 0.5,
  priorityLamports: 200_000,
  priorityUsdc: 2,
  volumeDiscounts: [
    {
      threshold: "10 million monthly requests",
      discount: "10% off",
      detail: "The discount applies automatically once a project crosses 10 million requests in a billing month.",
    },
    {
      threshold: "100 million monthly requests",
      discount: "20% off",
      detail: "The higher discount applies automatically once a project crosses 100 million requests in a billing month.",
    },
  ],
} as const;

export interface MainnetPlanTier {
  readonly slug: string;
  readonly name: string;
  readonly segment: "individual" | "team" | "enterprise" | "payg";
  readonly monthlyPrice: string;
  readonly standardRequests: string;
  readonly priorityRequests: string;
  readonly projects: string;
  readonly apiKeys: string;
  readonly analyticsRetention: string;
  readonly webhooks: string;
  readonly teamMembers: string;
  readonly sla: string;
  readonly supportResponse: string;
  readonly summary: string;
  readonly details: readonly string[];
}

export const mainnetPricingTiers: readonly MainnetPlanTier[] = [
  {
    slug: "starter",
    name: "Starter",
    segment: "individual",
    monthlyPrice: "29 USDC / month",
    standardRequests: "2 million",
    priorityRequests: "100,000",
    projects: "3",
    apiKeys: "10",
    analyticsRetention: "7 days",
    webhooks: "Not included",
    teamMembers: "1",
    sla: "Shared infrastructure",
    supportResponse: "Email support",
    summary:
      "A simple self-serve subscription for a solo developer who wants a funded project, scoped keys, analytics, and alerts without managing a large team workspace.",
    details: [
      "Includes 2 million standard RPC requests and 100,000 priority relay requests each month.",
      "Supports up to 3 projects and 10 API keys.",
      "Includes standard analytics with 7-day retention and email alerts.",
      "Overages are billed automatically at the published per-request rate.",
    ],
  },
  {
    slug: "builder",
    name: "Builder",
    segment: "team",
    monthlyPrice: "99 USDC / month",
    standardRequests: "10 million",
    priorityRequests: "500,000",
    projects: "10",
    apiKeys: "50",
    analyticsRetention: "30 days",
    webhooks: "Included",
    teamMembers: "Up to 5",
    sla: "Shared infrastructure",
    supportResponse: "Within 24 hours",
    summary:
      "A collaborative plan for a product team that wants more traffic headroom, better analytics retention, webhook support, and shared workspace access.",
    details: [
      "Includes 10 million standard RPC requests and 500,000 priority relay requests each month.",
      "Supports up to 10 projects and 50 API keys.",
      "Includes advanced analytics with 30-day retention, webhook support, and team collaboration for up to 5 members.",
      "Overages are billed automatically.",
    ],
  },
  {
    slug: "scale",
    name: "Scale",
    segment: "team",
    monthlyPrice: "299 USDC / month",
    standardRequests: "50 million",
    priorityRequests: "2 million",
    projects: "Unlimited",
    apiKeys: "Unlimited",
    analyticsRetention: "90 days + CSV export",
    webhooks: "Included",
    teamMembers: "Up to 20",
    sla: "Priority shared infrastructure",
    supportResponse: "Within 4 hours",
    summary:
      "A high-volume team plan for applications that need broad project access, full analytics retention, exports, and assistant support without leaving the self-serve flow.",
    details: [
      "Includes 50 million standard RPC requests and 2 million priority relay requests each month.",
      "Supports unlimited projects and unlimited API keys.",
      "Includes full analytics with 90-day retention and CSV export, webhooks, team collaboration for up to 20 members, and the AI assistant with full context.",
      "Overages are billed automatically.",
    ],
  },
  {
    slug: "pay-as-you-go",
    name: "Pay per request",
    segment: "payg",
    monthlyPrice: "No subscription",
    standardRequests: "Metered",
    priorityRequests: "Metered",
    projects: "Based on funded treasury",
    apiKeys: "Based on workspace limits",
    analyticsRetention: "Based on workspace tier",
    webhooks: "Available when enabled on the workspace",
    teamMembers: "Based on workspace tier",
    sla: "Shared infrastructure",
    supportResponse: "Standard support",
    summary:
      "A treasury-funded option for teams that prefer to meter usage directly on chain instead of precommitting to a monthly subscription plan.",
    details: [
      "Standard RPC costs 50,000 lamports or 0.5 USDC per request.",
      "Priority relay costs 200,000 lamports or 2 USDC per request.",
      "Volume discounts apply automatically at 10 million monthly requests for 10 percent off and at 100 million monthly requests for 20 percent off.",
      "There is no free tier on mainnet.",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    segment: "enterprise",
    monthlyPrice: "999 USDC / month",
    standardRequests: "200 million",
    priorityRequests: "10 million",
    projects: "Unlimited",
    apiKeys: "Unlimited",
    analyticsRetention: "1 year",
    webhooks: "Included",
    teamMembers: "Custom RBAC",
    sla: "99.9%",
    supportResponse: "Dedicated support channel",
    summary:
      "A self-serve enterprise plan for production teams that need high-volume access, strict controls, and longer-lived operational data without a manual approval gate.",
    details: [
      "Includes 200 million standard RPC requests and 10 million priority relay requests.",
      "Adds custom rate limits, full RBAC, 1-year data retention, and a dedicated account dashboard.",
      "Activates automatically when the monthly USDC funding amount is confirmed on chain.",
    ],
  },
  {
    slug: "business",
    name: "Business",
    segment: "enterprise",
    monthlyPrice: "2,999 USDC / month",
    standardRequests: "1 billion",
    priorityRequests: "50 million",
    projects: "Unlimited",
    apiKeys: "Unlimited",
    analyticsRetention: "1 year+",
    webhooks: "Included",
    teamMembers: "Custom RBAC",
    sla: "99.95%",
    supportResponse: "Named account manager",
    summary:
      "A higher-throughput enterprise plan for teams that need dedicated relay capacity, stronger integrations, and a direct operating relationship without leaving the self-serve product flow.",
    details: [
      "Includes 1 billion standard RPC requests and 50 million priority relay requests.",
      "Adds dedicated relay nodes, custom analytics integrations, and a named account manager.",
      "Activates automatically when the monthly USDC funding amount is confirmed on chain.",
    ],
  },
  {
    slug: "network",
    name: "Network",
    segment: "enterprise",
    monthlyPrice: "9,999 USDC / month",
    standardRequests: "Unlimited",
    priorityRequests: "Unlimited",
    projects: "Unlimited",
    apiKeys: "Unlimited",
    analyticsRetention: "Custom",
    webhooks: "Included",
    teamMembers: "Custom RBAC",
    sla: "99.99%",
    supportResponse: "Direct protocol line",
    summary:
      "A top-tier enterprise plan for infrastructure-heavy teams that need dedicated capacity, commercial flexibility, and direct participation in the network economics.",
    details: [
      "Includes unlimited requests on dedicated infrastructure.",
      "Adds custom contract terms, white-label options, operator revenue sharing, and direct protocol governance participation.",
      "Activates automatically when the monthly USDC funding amount is confirmed on chain.",
    ],
  },
] as const;

export const mainnetRevenueSplit = {
  operators: "80%",
  treasury: "10%",
  infrastructureFund: "10%",
} as const;

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
    title: "Mainnet pricing is published",
    summary:
      "Mainnet launch pricing combines self-serve subscriptions, self-serve enterprise plans, and treasury-funded pay-per-request billing.",
    content:
      "The launch pricing model includes Starter, Builder, Scale, Growth, Business, and Network subscriptions alongside treasury-funded pay-per-request billing at 50,000 lamports or 0.5 USDC for standard traffic and 200,000 lamports or 2 USDC for priority traffic. Volume discounts apply automatically at 10 million and 100 million monthly requests, and there is no free tier on mainnet.",
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
