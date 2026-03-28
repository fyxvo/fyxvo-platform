// ─── User / Auth ─────────────────────────────────────────────────────────────

export interface PortalUser {
  id: string;
  walletAddress: string;
  email?: string | null;
  name?: string | null;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthChallenge {
  walletAddress: string;
  nonce: string;
  message: string;
}

export interface WalletSession {
  token: string;
  user: PortalUser;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface PortalProject {
  id: string;
  name: string;
  slug: string;
  displayName?: string | null;
  publicSlug?: string | null;
  templateType?: string | null;
  description?: string | null;
  tags?: string[];
  isPublic?: boolean;
  leaderboardVisible?: boolean;
  status: string;
  network: string;
  owner: PortalUser;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends PortalProject {
  ownerReputationLevel?: string;
  notes?: string | null;
  githubUrl?: string | null;
  lowBalanceThresholdSol?: number | null;
  dailyRequestAlertThreshold?: number | null;
  dailyBudgetLamports?: string | null;
  monthlyBudgetLamports?: string | null;
  budgetWarningThresholdPct?: number | null;
  budgetHardStop?: boolean;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface PortalApiKey {
  id: string;
  projectId: string;
  createdById: string;
  label: string;
  prefix: string;
  status: string;
  scopes: string[];
  colorTag?: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResult {
  item: PortalApiKey;
  plainTextKey: string;
}

// ─── Funding ──────────────────────────────────────────────────────────────────

export interface FundingPreparation {
  fundingRequestId: string;
  projectPda: string;
  protocolConfigPda: string;
  treasuryPda: string;
  recentBlockhash: string;
  transactionBase64: string;
  lastValidBlockHeight: number;
  amount: string;
  asset: string;
  treasuryUsdcVault?: string;
}

export interface ProjectActivation {
  projectPda: string;
  protocolConfigPda: string;
  treasuryPda: string;
  recentBlockhash: string;
  transactionBase64: string;
  lastValidBlockHeight: number;
}

export interface ProjectActivationVerification {
  signature: string;
  confirmedAt: string;
  explorerUrl: string;
  onchain: {
    projectPda: string;
    treasuryPda: string;
    treasurySolBalance?: number;
    projectAccountExists?: boolean;
    projectAccountDataLength?: number;
    balances?: Record<string, string | number>;
  };
}

export interface FundingVerification {
  fundingRequestId: string;
  signature: string;
  confirmedAt: string;
  explorerUrl: string;
  onchain: {
    projectPda: string;
    treasuryPda: string;
    treasurySolBalance?: number;
    projectAccountExists?: boolean;
    projectAccountDataLength?: number;
    balances?: Record<string, string | number>;
  };
}

export interface CreateProjectResult {
  item: PortalProject;
  activation: ProjectActivation;
}

export interface FundingHistoryItem {
  id: string;
  projectId: string;
  asset: string;
  amount: string;
  status: string;
  txSignature?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Onchain ──────────────────────────────────────────────────────────────────

export interface OnchainSnapshot {
  projectPda: string;
  treasuryPda: string;
  balanceLamports: number;
  balanceSol: number;
  treasuryUsdcVault?: { address: string; balance: number } | null;
  operatorCount: number;
  requestCount: number;
  updatedAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totals: {
    projects: number;
    apiKeys: number;
    fundingRequests: number;
    requestLogs: number;
  };
  latency: {
    averageMs: number;
    maxMs: number;
  };
  requestsByService: Array<{
    service: string;
    count: number;
  }>;
}

export interface ProjectAnalytics {
  project: ProjectDetail;
  totals: {
    requestLogs: number;
    apiKeys: number;
    fundingRequests: number;
  };
  latency: {
    averageMs: number;
    maxMs: number;
    p95Ms: number;
  };
  statusCodes: Array<{
    statusCode: number;
    count: number;
  }>;
  recentRequests: Array<Record<string, unknown>>;
}

export interface MethodBreakdownItem {
  route: string;
  service: string;
  count: number;
  averageLatencyMs: number;
  errorRate: number;
  errorCount: number;
}

export interface ProjectRequestLogItem {
  id: string;
  traceId: string | null;
  timestamp: string;
  route: string;
  httpMethod: string;
  mode: "standard" | "priority" | null;
  latencyMs: number;
  success: boolean;
  statusCode: number;
  apiKeyPrefix: string | null;
  simulated: boolean;
  upstreamNode: string | null;
  region: string | null;
  requestSize: number | null;
  responseSize: number | null;
  cacheHit: boolean | null;
  fyxvoHint: unknown;
  service: string;
}

export interface ProjectRequestLogList {
  items: ProjectRequestLogItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ProjectRequestTrace {
  id: string;
  requestId: string;
  method: string;
  durationMs: number;
  statusCode: number;
  route: string;
  service: string;
  createdAt: string;
  upstreamNode: string | null;
  region: string | null;
  requestSize: number | null;
  responseSize: number | null;
  cacheHit: boolean | null;
  simulated: boolean;
  mode: "standard" | "priority" | null;
  fyxvoHint: unknown;
}

export interface AlertCenterItem {
  alertKey: string;
  id: string;
  type: "low_balance" | "daily_cost" | "error_rate" | "webhook_failure" | "assistant" | "incident" | "notification";
  severity: "info" | "warning" | "critical";
  state: "new" | "acknowledged" | "resolved";
  projectId: string | null;
  projectName: string | null;
  title: string;
  description: string;
  createdAt: string;
  groupCount?: number;
  relatedIncident?: {
    id: string;
    serviceName: string;
    description: string;
  } | null;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationPreferences {
  email: string | null;
  notifyProjectActivation: boolean;
  notifyApiKeyEvents: boolean;
  notifyFundingConfirmed: boolean;
  notifyLowBalance: boolean;
  notifyDailyAlert: boolean;
  notifyWeeklySummary: boolean;
  notifyReferralConversion: boolean;
}

export interface WebhookItem {
  id: string;
  projectId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  webhookId: string;
  eventType: string;
  success: boolean;
  status: string;
  responseStatus: number | null;
  responseBody: string | null;
  attemptNumber: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  payload: Record<string, unknown> | null;
  attemptedAt: string;
}

export interface ProjectMemberItem {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    walletAddress: string;
    displayName: string;
  };
}

export interface TransactionHistoryItem {
  id: string;
  projectId: string;
  projectName: string;
  asset: string;
  amount: string;
  status: string;
  transactionSignature: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export interface SupportTicket {
  id: string;
  userId: string;
  projectId: string | null;
  projectName: string | null;
  projectSlug: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  adminResponse: string | null;
  adminRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface ReferralStats {
  referralCode: string | null;
  totalClicks: number;
  conversions: number;
}

export interface InviteMetadata {
  projectId: string;
  projectName: string;
  inviterWallet: string;
}

// ─── Operators ────────────────────────────────────────────────────────────────

export interface Operator {
  id: string;
  name: string;
  walletAddress: string;
  region: string;
  status: string;
  uptimePct: number;
  registeredAt: string;
}

export interface OperatorRegistration {
  id: string;
  endpoint: string;
  operatorWalletAddress: string;
  name: string;
  region: string;
  contact: string;
  status: "pending" | "approved" | "rejected" | string;
  rejectionReason?: string | null;
  createdAt: string;
  approvedAt?: string | null;
}

export interface OperatorNetworkEntry {
  name: string;
  region: string;
  endpointHost: string;
}

export interface OperatorNetworkSummary {
  activeOperatorCount: number;
  operators: OperatorNetworkEntry[];
  totalRegistered: number;
}

export interface MainnetReadinessCheck {
  key: string;
  label: string;
  status: "healthy" | "needs_attention" | "blocked" | string;
  detail: string;
}

export interface MainnetReadinessSnapshot {
  timestamp: string;
  environment: string;
  targetReserveLamports: string;
  confirmedFundingLamports: string;
  treasurySolBalanceLamports: string | number | null;
  assistantAvailable: boolean;
  emailDeliveryConfigured: boolean;
  authorityMode: string;
  upgradeAuthorityConfigured: boolean;
  protocolReady: boolean;
  activeIncidentCount: number;
  supportBacklogCount?: number;
  pendingMigrations?: {
    detected: boolean;
    count: number;
    names?: string[];
  };
  treasuryWarnings?: string[];
  paidBetaEligible: boolean;
  mainnetBetaEligible: boolean;
  paidBetaBlockers: string[];
  mainnetBetaBlockers: string[];
  checks: MainnetReadinessCheck[];
  gate: {
    armed: boolean;
    armedAt: string | null;
    armedByWallet?: string | null;
    notes: string | null;
  };
}

// ─── Assistant ────────────────────────────────────────────────────────────────

export interface AssistantConversation {
  id: string;
  title: string;
  pinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  messages?: AssistantMessage[];
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AssistantRateLimitStatus {
  messagesUsedThisHour: number;
  messagesRemainingThisHour: number;
  limit: number;
  windowResetAt: string;
  resetAt: string;
  model: string;
  assistantAvailable: boolean;
}

export interface WhatsNewItem {
  id: string;
  title: string;
  description: string;
  version: string;
  publishedAt: string;
}

export interface SearchResult {
  type: "project" | "api_key" | "request";
  displayName: string;
  description?: string;
  path: string;
}

export interface SearchResults {
  projects: SearchResult[];
  apiKeys: SearchResult[];
  requests: SearchResult[];
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminOverview {
  worker: {
    status: "healthy" | "attention" | "idle";
    lastCursorAt: string | null;
    lastCursorKey: string | null;
    lastRollupAt: string | null;
    staleThresholdMinutes: number;
  };
  recentErrors: Array<{
    id: string;
    service: string;
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    createdAt: string;
    project: { id: string; name: string; slug: string } | null;
  }>;
  recentFundingEvents: Array<{
    id: string;
    asset: string;
    amount: string;
    createdAt: string;
    confirmedAt: string | null;
    transactionSignature: string | null;
    project: { id: string; name: string; slug: string };
    requestedBy: { id: string; displayName: string; walletAddress: string };
  }>;
  recentProjectActivity: Array<{
    id: string;
    service: string;
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    createdAt: string;
    project: { id: string; name: string; slug: string } | null;
  }>;
  interestSubmissions: {
    total: number;
    recent: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      team: string | null;
      useCase: string;
      expectedRequestVolume: string;
      interestAreas: string[];
      operatorInterest: boolean;
      source: string;
      status: string;
      createdAt: string;
    }>;
  };
  recentApiKeyActivity: Array<{
    id: string;
    label: string;
    prefix: string;
    status: string;
    lastUsedAt: string | null;
    createdAt: string;
    project: { id: string; name: string; slug: string };
    createdBy: { id: string; displayName: string; walletAddress: string };
  }>;
  feedbackSubmissions: {
    total: number;
    open: number;
    recent: Array<{
      id: string;
      name: string;
      email: string;
      role: string | null;
      team: string | null;
      walletAddress: string | null;
      category: string;
      message: string;
      source: string;
      page: string | null;
      status: string;
      createdAt: string;
      project: { id: string; name: string; slug: string } | null;
    }>;
  };
  launchFunnel: {
    periodDays: number;
    counts: {
      landingCtaClicks: number;
      walletConnectIntent: number;
      projectCreationStarted: number;
      fundingFlowStarted: number;
      apiKeyCreated: number;
      interestSubmitted: number;
    };
  };
  protocol: {
    readiness: unknown;
    authorityPlan: {
      mode: string;
      protocolAuthority: string | null;
      pauseAuthority: string | null;
      upgradeAuthorityHint: string | null;
      splitAuthorities: boolean;
    };
    treasury: {
      solBalance: string | null;
      usdcBalance: string | null;
      reservedSolRewards: string | null;
      reservedUsdcRewards: string | null;
      protocolSolFeesOwed: string | null;
      protocolUsdcFeesOwed: string | null;
      feeWithdrawalReady: boolean;
      reconciliationWarnings: string[];
    };
  };
}

export interface AdminStats {
  requestsToday: number;
  requestsThisWeek: number;
  activeProjects: number;
  newProjectsThisWeek: number;
  totalUsers: number;
  newUsersThisWeek: number;
  p95Ms: number;
  errorRateToday: number;
  updatedAt: string;
}

export interface AdminPlatformStats {
  totalUsers: number;
  totalProjects: number;
  requestsToday: number;
  requestsThisWeek: number;
  newsletterCount: number;
  recentSignups: Array<{
    walletAddress: string;
    createdAt: string;
    projectCount: number;
  }>;
}

export interface FeedbackInboxItem {
  id: string;
  type:
    | "feedback_submission"
    | "assistant_feedback"
    | "support_ticket"
    | "newsletter_signup"
    | "referral_conversion";
  title: string;
  summary: string;
  source: string;
  createdAt: string;
  actor: string;
  project: { id: string; name: string; slug: string } | null;
  status: "new" | "reviewed" | "planned" | "resolved" | string;
  tags: string[];
}

export interface AdminErrorEntry {
  id: string;
  route: string;
  method: string;
  statusCode: number;
  message: string;
  stack: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface IncidentUpdateItem {
  id: string;
  status: string;
  severity: string | null;
  message: string;
  affectedServices: string[];
  createdAt: string;
}

export interface IncidentItem {
  id: string;
  serviceName: string;
  severity: string;
  description: string;
  startedAt: string;
  resolvedAt: string | null;
  updates?: IncidentUpdateItem[];
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface ProjectBudgetStatus {
  dailyBudgetLamports: number | null;
  monthlyBudgetLamports: number | null;
  warningThresholdPct: number;
  hardStop: boolean;
  dailySpendLamports: number;
  monthlySpendLamports: number;
  dailyUsagePct: number | null;
  monthlyUsagePct: number | null;
  dailyWarningTriggered: boolean;
  monthlyWarningTriggered: boolean;
}

// ─── Interest ─────────────────────────────────────────────────────────────────

export interface InterestSubmission {
  id: string;
  status: string;
  createdAt: string;
  email: string;
}

// ─── API Health ───────────────────────────────────────────────────────────────

export interface ApiHealth {
  status: string;
  service: string;
  version: string;
  assistantAvailable: boolean;
  timestamp: string;
}

export interface ApiStatus extends ApiHealth {
  environment: string;
}

export interface PublicProjectProfile {
  id: string;
  name: string;
  displayName: string | null;
  slug: string;
  publicSlug: string;
  totalRequests: number;
  avgLatencyMs: number;
  requestVolume7d: Array<Record<string, unknown>>;
}

export interface ProjectWidgetData {
  projectName: string;
  projectSlug: string;
  publicSlug: string | null;
  requestsToday: number;
  gatewayStatus: string;
  avgLatencyMs: number;
  requestVolume7d: Array<{ date: string; count: number }>;
  isPublic: boolean;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export interface EmailDeliveryStatus {
  configured: boolean;
  provider: string;
  email: string;
  emailVerified: boolean;
  verificationRequired: boolean;
  digestEnabled: boolean;
  digestNextSendAt: string | null;
  digestLastSentAt: string | null;
  latestDigestGeneratedAt: string | null;
  latestDigestSent: string | null;
  statusSubscriberActive: boolean;
}
