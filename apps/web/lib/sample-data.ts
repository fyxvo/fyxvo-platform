import type {
  AdminOverview,
  AdminStats,
  AnalyticsOverview,
  OnChainProjectSnapshot,
  OperatorSummary,
  PortalApiKey,
  PortalProject,
  PortalUser,
  ProjectAnalytics,
  SampleStatusNarrative,
  SampleTrendPoint
} from "./types";

const owner: PortalUser = {
  id: "preview-owner-1",
  walletAddress: "7bN4AqvpQAgx2j4r6rGfHc9GkgxJ5dThv7m6L7Q4J4r4",
  displayName: "Avery Chen",
  role: "OWNER",
  status: "ACTIVE"
};

export const previewProjects: PortalProject[] = [
  {
    id: "preview-project-1",
    slug: "solstice-labs",
    name: "Solstice Labs",
    displayName: null,
    description:
      "High-throughput Solana infrastructure for treasury automation, webhook relays, and wallet-triggered execution.",
    chainProjectId: "18",
    onChainProjectPda: "9w5M8wQJRmL6x4uJg4gN8J7kY7YQu2D38R4Uu5qN4r7D",
    ownerId: owner.id,
    lowBalanceThresholdSol: null,
    dailyRequestAlertThreshold: null,
    templateType: null,
    environment: "production",
    starred: true,
    notes: null,
    archivedAt: null,
    owner,
    _count: {
      apiKeys: 4,
      requestLogs: 184231,
      fundingRequests: 16
    }
  },
  {
    id: "preview-project-2",
    slug: "aurora-payments",
    name: "Aurora Payments",
    displayName: null,
    description:
      "Priority relay traffic for settlement, merchant callbacks, and regional node failover on devnet.",
    chainProjectId: "21",
    onChainProjectPda: "7xLh7MrmP3nxu8yWJr3uL2yK8nZ7nN8hQn6T7xV2N8P1",
    ownerId: owner.id,
    lowBalanceThresholdSol: null,
    dailyRequestAlertThreshold: null,
    templateType: null,
    environment: "development",
    starred: false,
    notes: null,
    archivedAt: null,
    owner,
    _count: {
      apiKeys: 2,
      requestLogs: 89214,
      fundingRequests: 11
    }
  }
];

const previewPrimaryProject = previewProjects[0]!;

export const previewApiKeys: PortalApiKey[] = [
  {
    id: "preview-key-1",
    projectId: "preview-project-1",
    createdById: owner.id,
    label: "Production traffic",
    prefix: "fyxvo_live_prod",
    status: "ACTIVE",
    scopes: ["project:read", "rpc:request", "priority:relay"],
    lastUsedAt: "2026-03-18T18:44:00.000Z",
    expiresAt: null,
    revokedAt: null,
    createdAt: "2026-03-10T08:00:00.000Z",
    updatedAt: "2026-03-18T18:44:00.000Z"
  },
  {
    id: "preview-key-2",
    projectId: "preview-project-1",
    createdById: owner.id,
    label: "Analytics ingestion",
    prefix: "fyxvo_live_anly",
    status: "ACTIVE",
    scopes: ["project:read", "analytics:read"],
    lastUsedAt: "2026-03-18T17:10:00.000Z",
    expiresAt: "2026-04-18T17:10:00.000Z",
    revokedAt: null,
    createdAt: "2026-03-09T13:22:00.000Z",
    updatedAt: "2026-03-18T17:10:00.000Z"
  }
];

export const previewOverview: AnalyticsOverview = {
  totals: {
    projects: 2,
    apiKeys: 6,
    fundingRequests: 27,
    requestLogs: 273445
  },
  latency: {
    averageMs: 72,
    maxMs: 311
  },
  requestsByService: [
    { service: "gateway", count: 198420 },
    { service: "api", count: 49115 },
    { service: "worker", count: 25910 }
  ]
};

export const previewProjectAnalytics: ProjectAnalytics = {
  project: previewPrimaryProject,
  totals: {
    requestLogs: 184231,
    apiKeys: 4,
    fundingRequests: 16
  },
  latency: {
    averageMs: 61,
    maxMs: 244
  },
  statusCodes: [
    { statusCode: 200, count: 172402 },
    { statusCode: 202, count: 8314 },
    { statusCode: 402, count: 2119 },
    { statusCode: 429, count: 834 },
    { statusCode: 503, count: 562 }
  ],
  recentRequests: [
    {
      id: "request-1",
      route: "/priority",
      method: "POST",
      statusCode: 200,
      durationMs: 42,
      createdAt: "2026-03-18T18:52:00.000Z",
      service: "gateway"
    },
    {
      id: "request-2",
      route: "/v1/projects",
      method: "GET",
      statusCode: 200,
      durationMs: 66,
      createdAt: "2026-03-18T18:47:00.000Z",
      service: "api"
    },
    {
      id: "request-3",
      route: "/rpc",
      method: "POST",
      statusCode: 429,
      durationMs: 11,
      createdAt: "2026-03-18T18:42:00.000Z",
      service: "gateway"
    }
  ]
};

export const previewOnchain: OnChainProjectSnapshot = {
  projectPda: previewPrimaryProject.onChainProjectPda,
  treasuryPda: "5gS7uYTrL1QWxFAt2k5Lgq8Jm7mke7pYJ2r1Yx8QJ9Q2",
  treasurySolBalance: 18_420_000_000,
  projectAccountExists: true,
  projectAccountDataLength: 177,
  treasuryUsdcVault: {
    address: "7kVJq9LuP7sAhaW5GqQ1H9t8HcMh81M1a1S5R6m7F2Q3",
    amount: "845000000"
  }
};

export const previewAdminStats: AdminStats = {
  totals: {
    users: 126,
    projects: 38,
    apiKeys: 174,
    nodes: 42,
    nodeOperators: 12,
    fundingRequests: 441,
    requestLogs: 9_214_008
  }
};

export const previewAdminOverview: AdminOverview = {
  protocol: {
    readiness: {
      ready: true,
      cluster: "devnet",
      programId: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa",
      expectedProgramId: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa",
      expectedAdminAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
      expectedUsdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      addresses: {
        programId: "FQ5pyjBQvfadKPPxd66YXksgn8veYnjEw2R1g6aQnFaa",
        protocolConfig: "GCWgmpoS2booNCp5VNP6z9HdYmkXpoXpM3rPK8kziqKX",
        treasury: "3JaVp2CsJASutTAzVAjNfXi4yAR5f8uH1zoXAgaSh3px",
        operatorRegistry: "Df3tPaGGietrQdqjX7FGkuYb1XF6o36Vat2q92BmioWC",
        treasuryUsdcVault: "31xqm4gxzqQhxLr8RpBpMggr4DywGUnMLDWPKdR5Baa9"
      },
      checks: {
        programDeployed: true,
        programExecutable: true,
        protocolConfigExists: true,
        treasuryExists: true,
        operatorRegistryExists: true,
        treasuryUsdcVaultExists: true,
        adminAuthorityMatches: true,
        usdcMintMatches: true,
        treasuryMatches: true,
        treasuryUsdcVaultMatches: true,
        operatorRegistryMatches: true
      },
      acceptedAssets: {
        sol: true,
        usdcConfigured: true
      },
      reasons: []
    },
    authorityPlan: {
      mode: "single-signer",
      protocolAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
      pauseAuthority: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
      upgradeAuthorityHint: null,
      warnings: [
        "Single-signer authority is still configured. Move protocol, pause, and upgrade control behind a governed signer before mainnet beta."
      ]
    },
    treasury: {
      solBalance: "18420000000",
      usdcBalance: "845000000",
      reservedSolRewards: "1800000000",
      reservedUsdcRewards: "0",
      protocolSolFeesOwed: "92000000",
      protocolUsdcFeesOwed: "0",
      feeWithdrawalReady: false,
      reconciliationWarnings: [
        "Fee withdrawal is not implemented yet. Treat protocol fees owed as tracked liabilities, not withdrawable revenue."
      ]
    }
  },
  worker: {
    status: "healthy",
    lastCursorAt: "2026-03-19T06:20:00.000Z",
    lastCursorKey: "metrics-aggregation",
    lastRollupAt: "2026-03-19T06:19:00.000Z",
    staleThresholdMinutes: 15
  },
  recentErrors: [
    {
      id: "error-1",
      service: "gateway",
      route: "/priority",
      method: "POST",
      statusCode: 429,
      durationMs: 12,
      createdAt: "2026-03-19T06:11:00.000Z",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      }
    },
    {
      id: "error-2",
      service: "api",
      route: "/v1/projects",
      method: "POST",
      statusCode: 409,
      durationMs: 48,
      createdAt: "2026-03-19T05:58:00.000Z",
      project: null
    }
  ],
  recentFundingEvents: [
    {
      id: "funding-1",
      asset: "SOL",
      amount: "1500000000",
      createdAt: "2026-03-19T06:07:00.000Z",
      confirmedAt: "2026-03-19T06:08:00.000Z",
      transactionSignature: "5VZfhYCvFmRPVNNHNzXyYNLHj2TvciFKxQrPP9mWMKw368kUTpYc4Bq7rxUMUm7vHyUzL3ccYNpUzcuF9SYERVNh",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      },
      requestedBy: {
        id: owner.id,
        displayName: owner.displayName,
        walletAddress: owner.walletAddress
      }
    }
  ],
  recentProjectActivity: [
    {
      id: "activity-1",
      service: "gateway",
      route: "/rpc",
      method: "POST",
      statusCode: 200,
      durationMs: 38,
      createdAt: "2026-03-19T06:12:00.000Z",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      }
    },
    {
      id: "activity-2",
      service: "api",
      route: "/v1/projects/preview-project-1/funding/verify",
      method: "POST",
      statusCode: 200,
      durationMs: 122,
      createdAt: "2026-03-19T06:08:00.000Z",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      }
    }
  ],
  interestSubmissions: {
    total: 3,
    recent: [
      {
        id: "interest-1",
        name: "Jordan Lee",
        email: "jordan@northwind.dev",
        role: "Developer",
        team: "Northwind",
        useCase:
          "Validating wallet-triggered treasury automation and webhook relay traffic on devnet before widening internal usage.",
        expectedRequestVolume: "100k to 1M/day",
        interestAreas: ["rpc", "priority-relay", "analytics"],
        operatorInterest: false,
        source: "contact-page",
        status: "NEW",
        createdAt: "2026-03-19T06:18:00.000Z"
      },
      {
        id: "interest-2",
        name: "Mina Ortiz",
        email: "mina@relayworks.io",
        role: "Platform lead",
        team: "RelayWorks",
        useCase:
          "Testing latency-sensitive settlement traffic that needs a separate priority path, clear rate behavior, and founder support during rollout.",
        expectedRequestVolume: "More than 10M/day",
        interestAreas: ["priority-relay", "operator-participation"],
        operatorInterest: true,
        source: "pricing-page",
        status: "CONTACTED",
        createdAt: "2026-03-19T05:42:00.000Z"
      }
    ]
  },
  recentApiKeyActivity: [
    {
      id: "api-key-activity-1",
      label: "Production traffic",
      prefix: "fyxvo_live_prod",
      status: "ACTIVE",
      lastUsedAt: "2026-03-19T06:17:00.000Z",
      createdAt: "2026-03-10T08:00:00.000Z",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      },
      createdBy: {
        id: owner.id,
        displayName: owner.displayName,
        walletAddress: owner.walletAddress
      }
    },
    {
      id: "api-key-activity-2",
      label: "Analytics ingestion",
      prefix: "fyxvo_live_anly",
      status: "ACTIVE",
      lastUsedAt: "2026-03-19T05:49:00.000Z",
      createdAt: "2026-03-09T13:22:00.000Z",
      project: {
        id: "preview-project-1",
        name: "Solstice Labs",
        slug: "solstice-labs"
      },
      createdBy: {
        id: owner.id,
        displayName: owner.displayName,
        walletAddress: owner.walletAddress
      }
    }
  ],
  feedbackSubmissions: {
    total: 4,
    open: 3,
    recent: [
      {
        id: "feedback-1",
        name: "Jordan Lee",
        email: "jordan@northwind.dev",
        role: "Developer",
        team: "Northwind",
        walletAddress: "AgMDb4kHaUKqZSjZvFUoKpXYYTjz5Lg5pf3CwYuyAsem",
        category: "ONBOARDING_FRICTION",
        message:
          "The funding confirmation step was clear, but I wanted the API keys page linked immediately after the transaction confirmed.",
        source: "dashboard",
        page: "/funding",
        status: "NEW",
        createdAt: "2026-03-19T06:21:00.000Z",
        project: {
          id: "preview-project-1",
          name: "Solstice Labs",
          slug: "solstice-labs"
        }
      },
      {
        id: "feedback-2",
        name: "Mina Ortiz",
        email: "mina@relayworks.io",
        role: "Platform lead",
        team: "RelayWorks",
        walletAddress: null,
        category: "SUPPORT_REQUEST",
        message:
          "We want a review of priority relay fit before sending a larger devnet workload through the managed operator path.",
        source: "contact-page",
        page: "/contact",
        status: "FOLLOW_UP",
        createdAt: "2026-03-19T05:56:00.000Z",
        project: null
      }
    ]
  },
  launchFunnel: {
    periodDays: 14,
    counts: {
      landingCtaClicks: 118,
      walletConnectIntent: 46,
      projectCreationStarted: 17,
      fundingFlowStarted: 12,
      apiKeyCreated: 9,
      interestSubmitted: 3
    }
  }
};

export const previewOperators: OperatorSummary[] = [
  {
    operator: {
      id: "operator-1",
      name: "Atlas Nodeworks",
      email: "ops@atlasnodeworks.dev",
      walletAddress: "FYXVOOPERATORD3VNET11111111111111111111111111",
      status: "ACTIVE",
      reputationScore: 0.98,
      createdAt: "2026-01-03T10:00:00.000Z",
      updatedAt: "2026-03-18T18:40:00.000Z"
    },
    nodes: [
      {
        id: "node-1",
        projectId: "preview-project-1",
        name: "atlas-devnet-use1",
        network: "DEVNET",
        endpoint: "https://rpc-01.fyxvo.dev",
        region: "us-east-1",
        status: "ONLINE",
        reliabilityScore: 0.97,
        lastHeartbeatAt: "2026-03-18T18:52:00.000Z",
        latestMetrics: {
          cpuUsage: 0.34,
          memoryUsage: 0.59,
          errorRate: 0.01,
          recordedAt: "2026-03-18T18:52:00.000Z"
        }
      },
      {
        id: "node-2",
        projectId: "preview-project-2",
        name: "atlas-devnet-euw1",
        network: "DEVNET",
        endpoint: "https://rpc-02.fyxvo.dev",
        region: "eu-west-1",
        status: "DEGRADED",
        reliabilityScore: 0.88,
        lastHeartbeatAt: "2026-03-18T18:49:00.000Z",
        latestMetrics: {
          cpuUsage: 0.65,
          memoryUsage: 0.72,
          errorRate: 0.04,
          recordedAt: "2026-03-18T18:49:00.000Z"
        }
      }
    ]
  }
];

export const dashboardTrend: SampleTrendPoint[] = [
  { label: "00:00", value: 28 },
  { label: "04:00", value: 42 },
  { label: "08:00", value: 66 },
  { label: "12:00", value: 79 },
  { label: "16:00", value: 71 },
  { label: "20:00", value: 92 }
];

export const fundingTrend: SampleTrendPoint[] = [
  { label: "Mon", value: 9.2 },
  { label: "Tue", value: 11.1 },
  { label: "Wed", value: 13.7 },
  { label: "Thu", value: 12.8 },
  { label: "Fri", value: 15.4 },
  { label: "Sat", value: 14.9 },
  { label: "Sun", value: 16.3 }
];

export const statusNarrative: SampleStatusNarrative[] = [
  {
    timestamp: "2026-03-18T18:40:00.000Z",
    title: "Gateway node rebalance completed",
    body:
      "Traffic shifted back to the primary east coast pool after the worker cleared elevated latency across one European fallback node.",
    tone: "success"
  },
  {
    timestamp: "2026-03-18T16:20:00.000Z",
    title: "Funding throughput guardrail engaged",
    body:
      "Two projects hit their priority reserve floor, and the gateway correctly throttled high-cost relay traffic until treasury balances recovered.",
    tone: "warning"
  },
  {
    timestamp: "2026-03-18T09:05:00.000Z",
    title: "Scheduled devnet snapshot rotation",
    body:
      "Treasury, API, and gateway services rotated to the latest devnet ledger snapshot without any user-visible downtime.",
    tone: "neutral"
  }
];

export const docsSections = [
  {
    title: "Who Fyxvo fits today",
    body:
      "Fyxvo is for Solana teams that want a real devnet path for funded RPC, project activation, analytics visibility, and honest status instead of a mock control panel."
  },
  {
    title: "What is live right now",
    body:
      "SOL funding, wallet auth, standard relay, priority relay, request logging, and analytics are live on devnet. USDC stays gated until it is explicitly enabled."
  },
  {
    title: "How to reach first value",
    body:
      "Connect a wallet, activate one project, fund it with a small SOL transaction, issue one key, and send one request to the hosted relay. The docs below are organized around that exact path."
  }
] as const;
