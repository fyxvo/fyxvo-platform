import type { FyxvoProtocolReadiness } from "@fyxvo/config";
import type {
  ApiKey,
  FeedbackSubmission,
  FundingCoordinate,
  InterestSubmission,
  IdempotencyRecord,
  Node,
  NodeOperator,
  Project,
  RequestLog,
  User
} from "@fyxvo/database";

type UserRole = User["role"];
type UserStatus = User["status"];

export type AuthenticatedUser = Pick<
  User,
  "id" | "walletAddress" | "displayName" | "email" | "role" | "status" | "sessionVersion"
>;

export type ProjectWithOwner = Project & {
  owner: AuthenticatedUser;
  _count?: {
    apiKeys: number;
    requestLogs: number;
    fundingRequests: number;
  };
};

export type ApiKeyRecord = Pick<
  ApiKey,
  | "id"
  | "projectId"
  | "createdById"
  | "label"
  | "prefix"
  | "status"
  | "scopes"
  | "lastUsedAt"
  | "expiresAt"
  | "revokedAt"
  | "createdAt"
  | "updatedAt"
> & {
  createdBy?: AuthenticatedUser;
};

export interface CreateProjectInput {
  readonly ownerId: string;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly templateType?: string;
  readonly chainProjectId: bigint;
  readonly onChainProjectPda: string;
}

export interface UpdateProjectInput {
  readonly slug?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly displayName?: string | null;
  readonly lowBalanceThresholdSol?: number | null;
  readonly dailyRequestAlertThreshold?: number | null;
  readonly archivedAt?: Date | null;
  readonly environment?: "development" | "staging" | "production";
  readonly starred?: boolean;
  readonly notes?: string | null;
  readonly githubUrl?: string | null;
  readonly isPublic?: boolean;
  readonly publicSlug?: string | null;
}

export interface CreateNotificationInput {
  readonly userId: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly projectId?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface CreateApiKeyInput {
  readonly projectId: string;
  readonly createdById: string;
  readonly label: string;
  readonly prefix: string;
  readonly keyHash: string;
  readonly scopes: readonly string[];
  readonly expiresAt?: Date | null;
}

export interface FundingRecordInput {
  readonly projectId: string;
  readonly requestedById: string;
  readonly asset: "SOL" | "USDC";
  readonly amount: bigint;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly idempotencyKey: string;
  readonly expiresAt: Date;
}

export interface CreateInterestSubmissionInput {
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly team?: string | null;
  readonly useCase: string;
  readonly expectedRequestVolume: string;
  readonly interestAreas: readonly string[];
  readonly operatorInterest: boolean;
  readonly source: string;
}

export interface CreateFeedbackSubmissionInput {
  readonly name: string;
  readonly email: string;
  readonly role?: string | null;
  readonly team?: string | null;
  readonly walletAddress?: string | null;
  readonly projectId?: string | null;
  readonly category: "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";
  readonly message: string;
  readonly source: string;
  readonly page?: string | null;
}

export type LaunchEventName =
  | "landing_cta_clicked"
  | "wallet_connect_intent"
  | "project_creation_started"
  | "funding_flow_started"
  | "api_key_created"
  | "interest_form_submitted";

export interface CreateLaunchEventInput {
  readonly name: LaunchEventName;
  readonly source: string;
  readonly projectId?: string;
}

export interface ProjectActivationVerification {
  readonly signature: string;
  readonly confirmedAt: string;
  readonly explorerUrl: string;
  readonly onchain: OnChainProjectSnapshot;
}

export interface FundingVerification {
  readonly fundingRequestId: string;
  readonly signature: string;
  readonly confirmedAt: string;
  readonly explorerUrl: string;
  readonly onchain: OnChainProjectSnapshot;
}

export interface IdempotencyLookup {
  readonly key: string;
  readonly route: string;
  readonly method: string;
  readonly actorKey: string;
}

export interface SaveIdempotencyInput extends IdempotencyLookup {
  readonly requestHash: string;
  readonly statusCode: number;
  readonly responseBody: Record<string, unknown>;
  readonly expiresAt: Date;
}

export interface RequestLogInput {
  readonly requestId?: string;
  readonly idempotencyKey?: string;
  readonly projectId?: string;
  readonly apiKeyId?: string;
  readonly userId?: string;
  readonly service: string;
  readonly route: string;
  readonly method: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly ipAddress?: string;
  readonly userAgent?: string;
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

export interface ProjectAnalytics {
  readonly project: ProjectWithOwner;
  readonly totals: {
    readonly requestLogs: number;
    readonly apiKeys: number;
    readonly fundingRequests: number;
  };
  readonly latency: {
    readonly averageMs: number;
    readonly maxMs: number;
    readonly p95Ms: number;
  };
  readonly statusCodes: Array<{
    readonly statusCode: number;
    readonly count: number;
  }>;
  readonly recentRequests: RequestLog[];
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

export interface NotificationItem {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly read: boolean;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly createdAt: string;
}

export interface ApiKeyAnalyticsItem {
  readonly apiKeyId: string;
  readonly totalRequests: number;
  readonly successRequests: number;
  readonly errorRequests: number;
  readonly errorRate: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly dailyBuckets: Array<{ readonly date: string; readonly count: number; readonly errors: number }>;
}

export interface MethodBreakdownItem {
  readonly route: string;
  readonly service: string;
  readonly count: number;
  readonly averageLatencyMs: number;
  readonly errorRate: number;
  readonly errorCount: number;
}

export interface ErrorLogItem {
  readonly id: string;
  readonly route: string;
  readonly method: string;
  readonly service: string;
  readonly statusCode: number;
  readonly durationMs: number;
  readonly createdAt: string;
  readonly apiKeyPrefix: string | null;
}

export interface AdminProtocolOverview {
  readonly readiness: FyxvoProtocolReadiness | null;
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
}

export interface AdminOverviewBase {
  readonly worker: {
    readonly status: "healthy" | "attention" | "idle";
    readonly lastCursorAt: Date | null;
    readonly lastCursorKey: string | null;
    readonly lastRollupAt: Date | null;
    readonly staleThresholdMinutes: number;
  };
  readonly recentErrors: Array<{
    readonly id: string;
    readonly service: string;
    readonly route: string;
    readonly method: string;
    readonly statusCode: number;
    readonly durationMs: number;
    readonly createdAt: Date;
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
    readonly createdAt: Date;
    readonly confirmedAt: Date | null;
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
    readonly createdAt: Date;
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
      readonly status: InterestSubmission["status"];
      readonly createdAt: Date;
    }>;
  };
  readonly recentApiKeyActivity: Array<{
    readonly id: string;
    readonly label: string;
    readonly prefix: string;
    readonly status: string;
    readonly lastUsedAt: Date | null;
    readonly createdAt: Date;
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
      readonly category: FeedbackSubmission["category"];
      readonly message: string;
      readonly source: string;
      readonly page: string | null;
      readonly status: FeedbackSubmission["status"];
      readonly createdAt: Date;
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

export interface AdminOverview extends AdminOverviewBase {
  readonly protocol: AdminProtocolOverview;
}

export interface OperatorSummary {
  readonly operator: NodeOperator;
  readonly nodes: Array<
    Node & {
      latestMetrics?: {
        readonly cpuUsage: number;
        readonly memoryUsage: number;
        readonly errorRate: number;
        readonly recordedAt: Date;
      };
    }
  >;
}

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

export interface NetworkStats {
  readonly totalRequests: number;
  readonly totalProjects: number;
  readonly totalApiKeys: number;
  readonly totalSolFees: string; // lamports as string to avoid BigInt JSON issues
  readonly updatedAt: string;
}

export interface ServiceHealthEntry {
  readonly id: string;
  readonly serviceName: string;
  readonly status: string;
  readonly responseTimeMs: number | null;
  readonly errorMessage: string | null;
  readonly checkedAt: string;
}

export type ServiceHealthHistory = Record<string, ServiceHealthEntry[]>;

export interface IncidentItem {
  readonly id: string;
  readonly serviceName: string;
  readonly severity: string;
  readonly description: string;
  readonly startedAt: string;
  readonly resolvedAt: string | null;
}

export interface ReferralStats {
  readonly referralCode: string | null;
  readonly totalClicks: number;
  readonly conversions: number;
}

export interface WebhookItem {
  readonly id: string;
  readonly projectId: string;
  readonly url: string;
  readonly events: string[];
  readonly secret: string;
  readonly active: boolean;
  readonly lastTriggeredAt: string | null;
  readonly createdAt: string;
}

export interface ActivityLogItem {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string | null;
  readonly action: string;
  readonly details: Record<string, unknown> | null;
  readonly createdAt: string;
  readonly actorWallet: string | null;
}

export interface SystemAnnouncementItem {
  readonly id: string;
  readonly message: string;
  readonly severity: string;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface WhatsNewItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly publishedAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  eventType: string;
  success: boolean;
  responseStatus: number | null;
  attemptNumber: number;
  attemptedAt: string;
}

export interface PerformanceMetricInput {
  page: string;
  fcp?: number | null;
  lcp?: number | null;
  tti?: number | null;
  ua?: string | null;
}

export interface ProjectHealthScore {
  score: number;
  activated: boolean;
  hasFunding: boolean;
  hasApiKeys: boolean;
  hasTraffic: boolean;
  successRate: number | null;
}

export interface ProjectMemberItem {
  readonly id: string;
  readonly projectId: string;
  readonly userId: string;
  readonly role: string;
  readonly invitedBy: string | null;
  readonly invitedAt: string;
  readonly acceptedAt: string | null;
  readonly user: {
    readonly walletAddress: string;
    readonly displayName: string;
  };
}

export interface NotificationPrefsUpdate {
  readonly onboardingDismissed?: boolean;
  readonly email?: string | null;
  readonly notifyProjectActivation?: boolean;
  readonly notifyApiKeyEvents?: boolean;
  readonly notifyFundingConfirmed?: boolean;
  readonly notifyLowBalance?: boolean;
  readonly notifyDailyAlert?: boolean;
  readonly notifyWeeklySummary?: boolean;
  readonly notifyReferralConversion?: boolean;
}

export interface ApiRepository {
  findUserByWallet(walletAddress: string): Promise<AuthenticatedUser & { authNonce: string; onboardingDismissed: boolean; createdAt: Date } | null>;
  findUserById(userId: string): Promise<AuthenticatedUser & { authNonce: string; onboardingDismissed: boolean; createdAt: Date } | null>;
  updateUser(userId: string, data: NotificationPrefsUpdate): Promise<void>;
  createOrRefreshWalletUser(
    walletAddress: string,
    authNonce: string
  ): Promise<AuthenticatedUser & { authNonce: string }>;
  rotateUserNonce(userId: string, authNonce: string): Promise<void>;
  getNextChainProjectId(): Promise<bigint>;
  listProjects(user: AuthenticatedUser): Promise<ProjectWithOwner[]>;
  findProjectById(projectId: string): Promise<ProjectWithOwner | null>;
  createProject(input: CreateProjectInput): Promise<ProjectWithOwner>;
  updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectWithOwner>;
  deleteProject(projectId: string): Promise<ProjectWithOwner>;
  listApiKeys(projectId: string): Promise<ApiKeyRecord[]>;
  createApiKey(input: CreateApiKeyInput): Promise<ApiKeyRecord>;
  createInterestSubmission(input: CreateInterestSubmissionInput): Promise<InterestSubmission>;
  createFeedbackSubmission(input: CreateFeedbackSubmissionInput): Promise<FeedbackSubmission>;
  revokeApiKey(projectId: string, apiKeyId: string): Promise<ApiKeyRecord | null>;
  saveFundingCoordinate(input: FundingRecordInput): Promise<FundingCoordinate>;
  findFundingCoordinate(fundingRequestId: string): Promise<FundingCoordinate | null>;
  confirmFundingCoordinate(input: {
    readonly fundingRequestId: string;
    readonly transactionSignature: string;
    readonly confirmedAt: Date;
  }): Promise<FundingCoordinate>;
  getAnalyticsOverview(projectIds?: readonly string[]): Promise<AnalyticsOverview>;
  getProjectAnalytics(projectId: string, since?: Date): Promise<ProjectAnalytics>;
  getNotifications(userId: string, projectIds: readonly string[]): Promise<NotificationItem[]>;
  createNotification(input: CreateNotificationInput): Promise<NotificationItem>;
  markNotificationRead(userId: string, notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getApiKeyAnalytics(projectId: string, apiKeyId: string, since: Date): Promise<ApiKeyAnalyticsItem>;
  getMethodBreakdown(projectId: string, since: Date): Promise<MethodBreakdownItem[]>;
  getErrorLog(projectId: string, limit: number): Promise<ErrorLogItem[]>;
  getExportRows(projectId: string, since: Date): Promise<Array<Record<string, string | number>>>;
  getAdminStats(): Promise<AdminStats>;
  getAdminOverview(): Promise<AdminOverviewBase>;
  listOperators(): Promise<OperatorSummary[]>;
  getIdempotencyRecord(input: IdempotencyLookup): Promise<IdempotencyRecord | null>;
  saveIdempotencyRecord(input: SaveIdempotencyInput): Promise<IdempotencyRecord>;
  recordRequestLog(input: RequestLogInput): Promise<void>;
  getFundingHistory(userId: string, projectIds: readonly string[]): Promise<FundingHistoryItem[]>;
  getNetworkStats(): Promise<NetworkStats>;
  getServiceHealthHistory(limitPerService: number): Promise<ServiceHealthHistory>;
  getAssistantStats(): Promise<AssistantStats>;
  listIncidents(limit: number): Promise<IncidentItem[]>;
  getReferralStats(userId: string): Promise<ReferralStats>;
  recordReferralClick(referralCode: string): Promise<{ referrerId: string } | null>;
  generateReferralCode(userId: string): Promise<string>;
  countAssistantMessagesThisHour(userId: string, since: Date): Promise<number>;
  listWebhooks(projectId: string): Promise<WebhookItem[]>;
  createWebhook(input: { projectId: string; url: string; events: string[]; secret: string }): Promise<WebhookItem>;
  findWebhook(webhookId: string, projectId: string): Promise<WebhookItem | null>;
  deleteWebhook(webhookId: string, projectId: string): Promise<void>;
  listProjectMembers(projectId: string): Promise<ProjectMemberItem[]>;
  findProjectMember(projectId: string, userId: string): Promise<ProjectMemberItem | null>;
  findProjectMemberById(memberId: string): Promise<ProjectMemberItem | null>;
  createProjectMember(input: { projectId: string; userId: string; invitedBy: string }): Promise<ProjectMemberItem>;
  acceptProjectMember(memberId: string): Promise<void>;
  deleteProjectMember(memberId: string, projectId: string): Promise<void>;
  findPublicProject(publicSlug: string): Promise<ProjectWithOwner | null>;
  createEnterpriseInterest(input: { companyName: string; contactEmail: string; estimatedMonthlyReqs: string; useCase: string }): Promise<void>;
  logActivity(input: { projectId: string; userId?: string | null; action: string; details?: Record<string, unknown> | null }): Promise<void>;
  listActivityLog(projectId: string, limit?: number): Promise<ActivityLogItem[]>;
  getActiveAnnouncement(): Promise<SystemAnnouncementItem | null>;
  upsertAnnouncement(input: { message: string; severity: string }): Promise<void>;
  getWhatsNew(userId: string): Promise<WhatsNewItem | null>;
  dismissWhatsNew(userId: string, version: string): Promise<void>;

  recordWebhookDelivery(input: {
    webhookId: string;
    eventType: string;
    payload: unknown;
    attemptNumber: number;
    responseStatus?: number | null;
    responseBody?: string | null;
    success: boolean;
    nextRetryAt?: Date | null;
  }): Promise<string>; // returns delivery id

  getWebhookDeliveries(webhookId: string, limit?: number): Promise<WebhookDeliveryRecord[]>;
  getPendingWebhookRetries(): Promise<{ id: string; webhookId: string; webhook: { url: string; secret: string }; payload: unknown; eventType: string; attemptNumber: number }[]>;
  updateWebhookDelivery(id: string, data: { responseStatus?: number; responseBody?: string; success: boolean; nextRetryAt?: Date | null }): Promise<void>;

  recordPerformanceMetric(input: PerformanceMetricInput): Promise<void>;
  getPerformanceMetricSummary(days?: number): Promise<{ page: string; avgFcp: number | null; avgLcp: number | null; sampleCount: number }[]>;

  subscribeToStatus(email: string): Promise<void>;

  getProjectHealthScore(projectId: string): Promise<ProjectHealthScore>;
}

export interface ProjectCreationPreparation {
  readonly projectPda: string;
  readonly protocolConfigPda: string;
  readonly treasuryPda: string;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly lastValidBlockHeight: number;
}

export interface FundingPreparation {
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

export interface AssistantStats {
  readonly requestsToday: number;
  readonly requestsThisWeek: number;
  readonly averageResponseTimeMs: number;
  readonly rateLimitHitsToday: number;
}

export interface BlockchainClient {
  prepareProjectCreationTransaction(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
  }): Promise<ProjectCreationPreparation>;
  prepareFundingTransaction(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly funderWalletAddress: string;
    readonly asset: "SOL" | "USDC";
    readonly amount: bigint;
    readonly funderTokenAccount?: string;
  }): Promise<FundingPreparation>;
  readProjectOnChain(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
  }): Promise<OnChainProjectSnapshot>;
  waitForConfirmedProjectActivation(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly signature: string;
  }): Promise<ProjectActivationVerification>;
  waitForConfirmedFunding(input: {
    readonly ownerWalletAddress: string;
    readonly chainProjectId: bigint;
    readonly storedProjectPda: string;
    readonly signature: string;
  }): Promise<Omit<FundingVerification, "fundingRequestId">>;
  getLatestBlockhash(): Promise<{
    readonly blockhash: string;
    readonly lastValidBlockHeight: number;
  }>;
  getProtocolReadiness(): Promise<FyxvoProtocolReadiness>;
}

export interface JwtClaims {
  readonly sub: string;
  readonly walletAddress: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly sessionVersion: number;
}
