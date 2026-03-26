export interface PortalUser {
  readonly id: string;
  readonly walletAddress: string;
  readonly displayName: string;
  readonly role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  readonly status: "ACTIVE" | "INVITED" | "DISABLED";
  readonly onboardingDismissed?: boolean;
  readonly createdAt?: string | null;
  readonly tosAcceptedAt?: string | null;
  readonly emailVerified?: boolean;
}

export interface PortalProject {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly displayName: string | null;
  readonly description: string | null;
  readonly chainProjectId: string;
  readonly onChainProjectPda: string;
  readonly ownerId: string;
  readonly lowBalanceThresholdSol: number | null;
  readonly dailyRequestAlertThreshold: number | null;
  readonly templateType: string | null;
  readonly environment: "development" | "staging" | "production";
  readonly starred: boolean;
  readonly notes: string | null;
  readonly notesUpdatedAt?: string | null;
  readonly notesEditedByWallet?: string | null;
  readonly githubUrl: string | null;
  readonly isPublic: boolean;
  readonly publicSlug: string | null;
  readonly leaderboardVisible?: boolean;
  readonly dailyCostAlertLamports?: string | null;
  readonly dailyBudgetLamports?: string | null;
  readonly monthlyBudgetLamports?: string | null;
  readonly budgetWarningThresholdPct?: number | null;
  readonly budgetHardStop?: boolean;
  readonly archivedAt: string | null;
  readonly firstRequestCelebrationShown?: boolean;
  readonly hasTraffic?: boolean;
  readonly owner: PortalUser;
  readonly _count?: {
    readonly apiKeys: number;
    readonly requestLogs: number;
    readonly fundingRequests: number;
  };
}

export interface ProjectActivationPreparation {
  readonly projectPda: string;
  readonly protocolConfigPda: string;
  readonly treasuryPda: string;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly lastValidBlockHeight: number;
}

export interface ProjectActivationVerification {
  readonly signature: string;
  readonly confirmedAt: string;
  readonly explorerUrl: string;
  readonly onchain: OnChainProjectSnapshot;
}

export interface PortalApiKey {
  readonly id: string;
  readonly projectId: string;
  readonly createdById: string;
  readonly label: string;
  readonly colorTag?: string | null;
  readonly prefix: string;
  readonly status: string;
  readonly scopes: readonly string[];
  readonly lastUsedAt: string | null;
  readonly lastUsedRegion?: string | null;
  readonly lastUsedUpstreamNode?: string | null;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InterestSubmissionReceipt {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
  readonly email: string;
}

export interface InterestSubmissionInput {
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly team?: string;
  readonly useCase: string;
  readonly expectedRequestVolume: string;
  readonly interestAreas: readonly string[];
  readonly operatorInterest: boolean;
  readonly source: string;
}

export interface FeedbackSubmissionReceipt {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
  readonly email: string;
}

export interface FeedbackSubmissionInput {
  readonly name: string;
  readonly email: string;
  readonly role?: string;
  readonly team?: string;
  readonly walletAddress?: string;
  readonly projectId?: string;
  readonly category: "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";
  readonly message: string;
  readonly source: string;
  readonly page?: string;
}

export type LaunchEventName =
  | "landing_cta_clicked"
  | "wallet_connect_intent"
  | "project_creation_started"
  | "funding_flow_started"
  | "api_key_created"
  | "interest_form_submitted";

export interface PortalHealth {
  readonly status: string;
  readonly service: string;
  readonly version?: string;
  readonly commit?: string | null;
  readonly environment?: string;
  readonly timestamp: string;
  readonly assistantAvailable?: boolean;
  readonly database?: boolean;
  readonly chain?: boolean;
  readonly protocolReady?: boolean;
}

export interface PortalProtocolReadiness {
  readonly ready: boolean;
  readonly cluster: "devnet";
  readonly programId: string;
  readonly expectedProgramId: string;
  readonly expectedAdminAuthority: string;
  readonly expectedUsdcMint: string;
  readonly addresses: {
    readonly programId: string;
    readonly protocolConfig: string;
    readonly treasury: string;
    readonly operatorRegistry: string;
    readonly treasuryUsdcVault: string;
  };
  readonly checks: {
    readonly programDeployed: boolean;
    readonly programExecutable: boolean;
    readonly protocolConfigExists: boolean;
    readonly treasuryExists: boolean;
    readonly operatorRegistryExists: boolean;
    readonly treasuryUsdcVaultExists: boolean;
    readonly adminAuthorityMatches: boolean;
    readonly usdcMintMatches: boolean;
    readonly treasuryMatches: boolean;
    readonly treasuryUsdcVaultMatches: boolean;
    readonly operatorRegistryMatches: boolean;
  };
  readonly acceptedAssets: {
    readonly sol: true;
    readonly usdcConfigured: boolean;
  };
  readonly reasons: string[];
}

export interface PortalServiceStatus {
  readonly status?: string;
  readonly service: string;
  readonly version?: string;
  readonly commit?: string | null;
  readonly timestamp?: string;
  readonly environment?: string;
  readonly region?: string;
  readonly assistantAvailable?: boolean;
  readonly solanaCluster?: string;
  readonly adminAuthority?: string;
  readonly authorityPlan?: {
    readonly mode?: "single-signer" | "multisig" | "governed";
    readonly protocolAuthority?: string;
    readonly pauseAuthority?: string;
    readonly upgradeAuthorityHint?: string | null;
    readonly warnings?: readonly string[];
  };
  readonly programId?: string;
  readonly nodeCount?: number;
  readonly pricing?: {
    readonly standard?: number;
    readonly priority?: number;
    readonly writeMultiplier?: number;
  };
  readonly scopeEnforcement?: {
    readonly enabled?: boolean;
    readonly standardRequiredScopes?: readonly string[];
    readonly priorityRequiredScopes?: readonly string[];
  };
  readonly metrics?: {
    readonly totals?: {
      readonly requests?: number;
      readonly successes?: number;
      readonly errors?: number;
      readonly upstreamFailures?: number;
    };
    readonly standard?: {
      readonly averageLatencyMs?: number;
      readonly successRate?: number;
      readonly requests?: number;
      readonly errors?: number;
    };
    readonly priority?: {
      readonly averageLatencyMs?: number;
      readonly successRate?: number;
      readonly requests?: number;
      readonly errors?: number;
    };
  };
  readonly dependencies?: {
    readonly databaseConfigured?: boolean;
    readonly redisConfigured?: boolean;
  };
  readonly acceptedAssets?: {
    readonly sol?: boolean;
    readonly usdcEnabled?: boolean;
    readonly usdcMintAddress?: string;
  };
  readonly protocolReadiness?: PortalProtocolReadiness | null;
  readonly upstreamReachable?: boolean;
  readonly upstream?: string;
  readonly error?: string;
}

export interface AnalyticsOverview {
  readonly totals: {
    readonly projects: number;
    readonly apiKeys: number;
    readonly fundingRequests: number;
    readonly requestLogs: number;
  };
  readonly latency: {
    readonly averageMs: number;
    readonly maxMs: number;
  };
  readonly requestsByService: Array<{
    readonly service: string;
    readonly count: number;
  }>;
}

export interface ProjectChecklist {
  readonly projectId: string;
  readonly steps: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly complete: boolean;
    readonly href: string;
  }>;
  readonly completedCount: number;
  readonly totalCount: number;
}

export interface ProjectAnalytics {
  readonly project: PortalProject;
  readonly totals: {
    readonly requestLogs: number;
    readonly apiKeys: number;
    readonly fundingRequests: number;
  };
  readonly latency: {
    readonly averageMs: number;
    readonly maxMs: number;
    readonly p95Ms?: number;
  };
  readonly statusCodes: Array<{
    readonly statusCode: number;
    readonly count: number;
  }>;
  readonly recentRequests: Array<{
    readonly id: string;
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly createdAt: string;
    readonly service: string;
  }>;
}

export type RequestLogRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface ProjectRequestLogItem {
  readonly id: string;
  readonly traceId: string | null;
  readonly timestamp: string;
  readonly route: string;
  readonly httpMethod: string;
  readonly mode: "standard" | "priority" | null;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly statusCode: number;
  readonly apiKeyPrefix: string | null;
  readonly simulated: boolean;
  readonly upstreamNode: string | null;
  readonly region: string | null;
  readonly requestSize: number | null;
  readonly responseSize: number | null;
  readonly cacheHit: boolean | null;
  readonly fyxvoHint: unknown;
  readonly service: string;
}

export interface ProjectRequestLogList {
  readonly items: ProjectRequestLogItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly totalPages: number;
}

export interface PlaygroundRecipe {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly method: string;
  readonly mode: "standard" | "priority";
  readonly simulationEnabled: boolean;
  readonly params: Record<string, string>;
  readonly notes: string | null;
  readonly tags: readonly string[];
  readonly pinned: boolean;
  readonly lastUsedAt: string | null;
  readonly sharedToken: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AlertCenterItem {
  readonly alertKey: string;
  readonly id: string;
  readonly type: "low_balance" | "daily_cost" | "error_rate" | "webhook_failure" | "assistant" | "incident" | "notification";
  readonly severity: "info" | "warning" | "critical";
  readonly state: "new" | "acknowledged" | "resolved";
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly groupCount?: number;
  readonly relatedIncident?: { readonly id: string; readonly serviceName: string; readonly description: string } | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface ProjectHealthScore {
  readonly score: number;
  readonly activated: boolean;
  readonly hasFunding: boolean;
  readonly hasApiKeys: boolean;
  readonly hasTraffic: boolean;
  readonly successRate: number | null;
  readonly breakdown?: Array<{
    readonly key: string;
    readonly label: string;
    readonly value: number;
    readonly max: number;
    readonly summary: string;
  }>;
  readonly weeklyChange?: {
    readonly direction: "up" | "flat" | "down";
    readonly delta: number;
    readonly reason: string;
  };
}

export interface OnChainProjectSnapshot {
  readonly projectPda: string;
  readonly treasuryPda: string;
  readonly treasurySolBalance: number;
  readonly projectAccountExists: boolean;
  readonly projectAccountDataLength: number;
  readonly balances?: {
    readonly totalSolFunded: string;
    readonly totalUsdcFunded: string;
    readonly availableSolCredits: string;
    readonly availableUsdcCredits: string;
    readonly outstandingSolRewards: string;
    readonly outstandingUsdcRewards: string;
    readonly totalSolRewardsAccrued: string;
    readonly totalUsdcRewardsAccrued: string;
  };
  readonly treasuryUsdcVault?: {
    readonly address: string;
    readonly amount: string;
  };
}

export interface FundingPreparation {
  readonly fundingRequestId: string;
  readonly projectPda: string;
  readonly protocolConfigPda: string;
  readonly treasuryPda: string;
  readonly treasuryUsdcVault?: string;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly lastValidBlockHeight: number;
  readonly amount: string;
  readonly asset: "SOL" | "USDC";
}

export interface FundingVerification {
  readonly fundingRequestId: string;
  readonly signature: string;
  readonly confirmedAt: string;
  readonly explorerUrl: string;
  readonly onchain: OnChainProjectSnapshot;
}

export interface AdminStats {
  readonly totals: {
    readonly users: number;
    readonly projects: number;
    readonly apiKeys: number;
    readonly nodes: number;
    readonly nodeOperators: number;
    readonly fundingRequests: number;
    readonly requestLogs: number;
  };
}

export interface AdminOverview {
  readonly protocol: {
    readonly readiness: PortalProtocolReadiness | null;
    readonly authorityPlan: {
      readonly mode: "single-signer" | "multisig" | "governed";
      readonly protocolAuthority: string;
      readonly pauseAuthority: string;
      readonly upgradeAuthorityHint: string | null;
      readonly warnings: readonly string[];
    };
    readonly treasury: {
      readonly solBalance: string | null;
      readonly usdcBalance: string | null;
      readonly reservedSolRewards: string | null;
      readonly reservedUsdcRewards: string | null;
      readonly protocolSolFeesOwed: string | null;
      readonly protocolUsdcFeesOwed: string | null;
      readonly feeWithdrawalReady: boolean;
      readonly reconciliationWarnings: readonly string[];
    };
  };
  readonly worker: {
    readonly status: "healthy" | "attention" | "idle";
    readonly lastCursorAt: string | null;
    readonly lastCursorKey: string | null;
    readonly lastRollupAt: string | null;
    readonly staleThresholdMinutes: number;
  };
  readonly recentErrors: Array<{
    readonly id: string;
    readonly service: string;
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly createdAt: string;
    readonly project: {
      readonly id: string;
      readonly name: string;
      readonly slug: string;
    } | null;
  }>;
  readonly recentFundingEvents: Array<{
    readonly id: string;
    readonly asset: string;
    readonly amount: string;
    readonly createdAt: string;
    readonly confirmedAt: string | null;
    readonly transactionSignature: string | null;
    readonly project: {
      readonly id: string;
      readonly name: string;
      readonly slug: string;
    };
    readonly requestedBy: {
      readonly id: string;
      readonly displayName: string;
      readonly walletAddress: string;
    };
  }>;
  readonly recentProjectActivity: Array<{
    readonly id: string;
    readonly service: string;
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly createdAt: string;
    readonly project: {
      readonly id: string;
      readonly name: string;
      readonly slug: string;
    } | null;
  }>;
  readonly interestSubmissions: {
    readonly total: number;
    readonly recent: Array<{
      readonly id: string;
      readonly name: string;
      readonly email: string;
      readonly role: string;
      readonly team: string | null;
      readonly useCase: string;
      readonly expectedRequestVolume: string;
      readonly interestAreas: readonly string[];
      readonly operatorInterest: boolean;
      readonly source: string;
      readonly status: string;
      readonly createdAt: string;
    }>;
  };
  readonly recentApiKeyActivity: Array<{
    readonly id: string;
    readonly label: string;
    readonly prefix: string;
    readonly status: string;
    readonly lastUsedAt: string | null;
    readonly createdAt: string;
    readonly project: {
      readonly id: string;
      readonly name: string;
      readonly slug: string;
    };
    readonly createdBy: {
      readonly id: string;
      readonly displayName: string;
      readonly walletAddress: string;
    };
  }>;
  readonly feedbackSubmissions: {
    readonly total: number;
    readonly open: number;
    readonly recent: Array<{
      readonly id: string;
      readonly name: string;
      readonly email: string;
      readonly role: string | null;
      readonly team: string | null;
      readonly walletAddress: string | null;
      readonly category: "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";
      readonly message: string;
      readonly source: string;
      readonly page: string | null;
      readonly status: string;
      readonly createdAt: string;
      readonly project: {
        readonly id: string;
        readonly name: string;
        readonly slug: string;
      } | null;
    }>;
  };
  readonly launchFunnel: {
    readonly periodDays: number;
    readonly counts: {
      readonly landingCtaClicks: number;
      readonly walletConnectIntent: number;
      readonly projectCreationStarted: number;
      readonly fundingFlowStarted: number;
      readonly apiKeyCreated: number;
      readonly interestSubmitted: number;
    };
  };
}

export interface AdminObservability {
  readonly topFailingMethods: Array<{ readonly route: string; readonly count: number }>;
  readonly topWebhookFailureDestinations: Array<{ readonly url: string; readonly failures: number }>;
  readonly highestErrorRateProjects: Array<{ readonly projectId: string; readonly projectName: string; readonly slug: string; readonly errorRate: number; readonly totalRequests: number }>;
  readonly lowestRemainingRunwayProjects: Array<{ readonly projectId: string; readonly projectName: string; readonly slug: string; readonly treasurySol: number | null; readonly requestCount7d: number }>;
  readonly assistant: {
    readonly errorRate: number;
    readonly averageLatencyMs: number;
  };
  readonly supportCategories: Array<{ readonly category: string; readonly count: number }>;
}

export interface OperatorSummary {
  readonly operator: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly walletAddress: string;
    readonly status: string;
    readonly reputationScore?: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
  readonly nodes: Array<{
    readonly id: string;
    readonly projectId: string | null;
    readonly name: string;
    readonly network: string;
    readonly endpoint: string;
    readonly region: string;
    readonly status: string;
    readonly reliabilityScore?: number;
    readonly lastHeartbeatAt: string | null;
    readonly latestMetrics?: {
      readonly cpuUsage: number;
      readonly memoryUsage: number;
      readonly errorRate: number;
      readonly recordedAt: string;
    };
  }>;
}

export interface Notification {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly read: boolean;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly createdAt: string;
  readonly metadata?: unknown;
}

export interface ApiKeyAnalytics {
  readonly apiKeyId: string;
  readonly totalRequests: number;
  readonly successRequests: number;
  readonly errorRequests: number;
  readonly errorRate: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly dailyBuckets: ReadonlyArray<{ readonly date: string; readonly count: number; readonly errors: number }>;
}

export interface MethodBreakdown {
  readonly route: string;
  readonly service: string;
  readonly count: number;
  readonly averageLatencyMs: number;
  readonly errorRate: number;
  readonly errorCount: number;
}

export interface ErrorLogEntry {
  readonly id: string;
  readonly route: string;
  readonly method: string;
  readonly service: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly createdAt: string;
  readonly apiKeyPrefix: string | null;
}

export type AnalyticsRange = "1h" | "6h" | "24h" | "7d" | "30d";

export interface FundingHistoryItem {
  readonly id: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly asset: string;
  readonly amount: string;
  readonly status: string;
  readonly transactionSignature: string | null;
  readonly createdAt: string;
  readonly confirmedAt: string | null;
}

export interface SampleTrendPoint {
  readonly label: string;
  readonly value: number;
}

export interface SampleStatusNarrative {
  readonly timestamp: string;
  readonly title: string;
  readonly body: string;
  readonly tone: "success" | "warning" | "danger" | "neutral";
}

export interface NetworkStats {
  readonly totalRequests: number;
  readonly totalProjects: number;
  readonly totalApiKeys: number;
  readonly totalSolFees?: string;
  readonly updatedAt: string;
}

export interface AssistantActionLink {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly kind:
    | "playground"
    | "funding"
    | "api_keys"
    | "analytics"
    | "docs"
    | "invite"
    | "project";
}

export interface AssistantPlaygroundPayload {
  readonly method: string;
  readonly params?: Record<string, string>;
  readonly snippet?: string;
  readonly mode?: "standard" | "priority";
  readonly simulate?: boolean;
}

export interface AssistantMessageFeedback {
  readonly id: string;
  readonly rating: "up" | "down";
  readonly note: string | null;
  readonly createdAt: string;
}

export interface AssistantConversationMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: string;
  readonly projectId?: string | null;
  readonly matchedDocsSection?: string | null;
  readonly suggestedActions?: readonly AssistantActionLink[];
  readonly playgroundPayload?: AssistantPlaygroundPayload | null;
  readonly promptCategory?: string | null;
  readonly responseTimeMs?: number | null;
  readonly inputTokenEstimate?: number | null;
  readonly outputTokenEstimate?: number | null;
  readonly feedback?: AssistantMessageFeedback | null;
}

export interface AssistantConversationSummary {
  readonly id: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastMessageAt: string;
  readonly messageCount: number;
}

export interface AssistantConversationDetail extends AssistantConversationSummary {
  readonly messages: readonly AssistantConversationMessage[];
}

export interface AssistantRateLimitStatus {
  readonly messagesUsedThisHour: number;
  readonly messagesRemainingThisHour: number;
  readonly limit: number;
  readonly windowResetAt: string;
  readonly resetAt: string;
  readonly model: string;
  readonly assistantAvailable: boolean;
}

export interface AssistantAdminStats {
  readonly requestsToday: number;
  readonly requestsThisWeek: number;
  readonly averageResponseTimeMs: number;
  readonly averageTokensPerResponse: number;
  readonly rateLimitHitsToday: number;
  readonly messagesPerDay: ReadonlyArray<{ readonly date: string; readonly count: number }>;
  readonly topPromptCategories: ReadonlyArray<{ readonly category: string; readonly count: number }>;
  readonly topLinkedDocsSections: ReadonlyArray<{ readonly section: string; readonly count: number }>;
  readonly feedback: {
    readonly positive: number;
    readonly negative: number;
    readonly withNotes: number;
    readonly recent: ReadonlyArray<{
      readonly id: string;
      readonly rating: "up" | "down";
      readonly note: string | null;
      readonly createdAt: string;
      readonly conversationId: string;
      readonly messageId: string;
    }>;
  };
}

export interface WebDeploymentStatus {
  readonly status: string;
  readonly service: string;
  readonly version: string;
  readonly commit: string | null;
  readonly environment: string;
  readonly timestamp: string;
}

export interface AdminDeploymentReadiness {
  readonly service: string;
  readonly version: string;
  readonly commit: string | null;
  readonly environment: string;
  readonly timestamp: string;
  readonly assistantAvailable: boolean;
  readonly pendingMigrations: {
    readonly checkedAt: string;
    readonly detected: boolean;
    readonly count: number;
    readonly names: readonly string[];
    readonly error: string | null;
  };
}

export interface ReleaseReadinessSummary {
  readonly timestamp: string;
  readonly environment: string;
  readonly infrastructure: {
    readonly status: "healthy" | "needs_attention" | "blocked";
    readonly apiCommit: string | null;
    readonly gatewayHealth: string;
    readonly assistantAvailable: boolean;
    readonly currentIncidentCount: number;
    readonly cspViolationsLast24h: number;
    readonly webhookFailureRate: number;
    readonly supportBacklogCount: number;
  };
  readonly product: {
    readonly status: "healthy" | "needs_attention" | "blocked";
    readonly totalUsers: number;
    readonly totalActiveProjects: number;
    readonly projectsWithRecentTraffic: number;
    readonly projectsWithLowBalanceAlerts: number;
    readonly projectsWithHighErrorRates: number;
    readonly assistantUsageToday: number;
    readonly newsletterSubscribers: number;
    readonly leaderboardOptIns: number;
    readonly publicProjectPagesCount: number;
  };
  readonly operations: {
    readonly status: "healthy" | "needs_attention" | "blocked";
    readonly pendingMigrations: {
      readonly checkedAt: string;
      readonly detected: boolean;
      readonly count: number;
      readonly names: readonly string[];
      readonly error: string | null;
    };
    readonly latestAnnouncement: {
      readonly message: string;
      readonly severity: string;
      readonly createdAt: string;
    } | null;
    readonly latestBlogPost: {
      readonly title: string;
      readonly slug: string;
      readonly publishedAt: string | null;
    } | null;
    readonly latestChangelogVersion: {
      readonly version: string;
      readonly title: string;
      readonly publishedAt: string;
    } | null;
    readonly openSupportTickets: number;
    readonly activeIncidents: ReadonlyArray<{
      readonly id: string;
      readonly serviceName: string;
      readonly severity: string;
      readonly description: string;
      readonly startedAt: string;
    }>;
    readonly digestGenerationStatus: {
      readonly latestGeneratedAt: string | null;
      readonly latestSent: boolean | null;
      readonly dueSchedules: number;
    };
    readonly statusSubscriberCount: number;
  };
}

export interface RetentionCohortWindowSummary {
  readonly windowDays: number | null;
  readonly generatedAt: string;
  readonly newUsersByDay: ReadonlyArray<{ readonly date: string; readonly count: number }>;
  readonly retained: {
    readonly day1: number;
    readonly day7: number;
    readonly day30: number;
  };
  readonly totals: {
    readonly newUsers: number;
    readonly firstTrafficProjects: number;
    readonly repeatTrafficProjects: number;
    readonly assistantUsers: number;
    readonly playgroundUsers: number;
    readonly apiKeyCreators: number;
    readonly fundedUsers: number;
    readonly publicSharers: number;
    readonly requestUsers: number;
  };
}

export interface RetentionCohortSummary {
  readonly sevenDay: RetentionCohortWindowSummary;
  readonly thirtyDay: RetentionCohortWindowSummary;
  readonly allTime: RetentionCohortWindowSummary;
}

export interface CostBreakdownItem {
  readonly method: string;
  readonly pricingTier: "standard" | "compute_heavy" | "write" | "priority";
  readonly count: number;
  readonly totalLamports: number;
  readonly estimatedSol: number;
  readonly shareOfTotalSpend: number;
}

export interface CostBreakdownSummary {
  readonly range: AnalyticsRange;
  readonly totalLamports: number;
  readonly items: ReadonlyArray<CostBreakdownItem>;
}

export interface ProjectBudgetStatus {
  readonly dailyBudgetLamports: string | null;
  readonly monthlyBudgetLamports: string | null;
  readonly warningThresholdPct: number;
  readonly hardStop: boolean;
  readonly dailySpendLamports: number;
  readonly monthlySpendLamports: number;
  readonly dailyUsagePct: number | null;
  readonly monthlyUsagePct: number | null;
  readonly dailyWarningTriggered: boolean;
  readonly monthlyWarningTriggered: boolean;
}

export interface SessionDiagnostics {
  readonly sessionActive: boolean;
  readonly walletAddress: string;
  readonly authMode: string;
  readonly issuedAt: string | null;
  readonly expiresAt: string | null;
  readonly termsAccepted: boolean;
  readonly onboardingDismissed: boolean;
  readonly assistantAvailable: boolean;
  readonly environment: string;
  readonly suggestions: readonly string[];
}

export interface StatusIncidentUpdate {
  readonly id: string;
  readonly status: string;
  readonly severity: string | null;
  readonly message: string;
  readonly affectedServices: readonly string[];
  readonly createdAt: string;
}

export interface StatusIncident {
  readonly id: string;
  readonly serviceName: string;
  readonly severity: string;
  readonly description: string;
  readonly startedAt: string;
  readonly resolvedAt: string | null;
  readonly updates?: ReadonlyArray<StatusIncidentUpdate>;
}

export interface AccessAuditItem {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string | null;
  readonly action: string;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: string;
  readonly actorWallet: string | null;
}

export interface ExploreProjectEntry {
  readonly id: string;
  readonly projectName: string;
  readonly publicSlug: string | null;
  readonly templateType: string;
  readonly tags: readonly string[];
  readonly leaderboardVisible: boolean;
  readonly requestVolume7d: number;
  readonly averageLatencyMs7d: number;
  readonly successRate7d: number;
  readonly healthSummary: string;
  readonly reputationBadge: string;
  readonly createdAt: string;
}

export interface OnboardingFunnelSummary {
  readonly windowDays: number;
  readonly generatedAt: string;
  readonly steps: ReadonlyArray<{
    readonly key: string;
    readonly label: string;
    readonly count: number;
    readonly previousCount: number;
    readonly conversionPercentage: number;
    readonly trend: "up" | "flat" | "down";
  }>;
}

export interface FeedbackInboxItem {
  readonly id: string;
  readonly type:
    | "feedback_submission"
    | "assistant_feedback"
    | "support_ticket"
    | "newsletter_signup"
    | "referral_conversion";
  readonly title: string;
  readonly summary: string;
  readonly source: string;
  readonly createdAt: string;
  readonly actor: string;
  readonly project: {
    readonly id: string;
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly status: "new" | "reviewed" | "planned" | "resolved";
  readonly tags: readonly string[];
}

export interface DashboardPreferences {
  readonly widgetOrder: readonly string[];
  readonly hiddenWidgets: readonly string[];
  readonly updatedAt: string | null;
}

export interface SavedViewRecord {
  readonly id: string;
  readonly kind: "alerts" | "request_logs";
  readonly name: string;
  readonly projectId: string | null;
  readonly filters: Record<string, unknown>;
  readonly isDefault: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface BookmarkRecord {
  readonly id: string;
  readonly projectId: string | null;
  readonly label: string;
  readonly href: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
