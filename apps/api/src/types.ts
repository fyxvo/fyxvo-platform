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
  readonly chainProjectId: bigint;
  readonly onChainProjectPda: string;
}

export interface UpdateProjectInput {
  readonly slug?: string;
  readonly name?: string;
  readonly description?: string | null;
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
  readonly type: "funding_confirmed" | "api_key_created" | "api_key_revoked" | "project_activated" | "error_spike";
  readonly title: string;
  readonly message: string;
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

export interface ApiRepository {
  findUserByWallet(walletAddress: string): Promise<AuthenticatedUser & { authNonce: string } | null>;
  findUserById(userId: string): Promise<AuthenticatedUser & { authNonce: string } | null>;
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
