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
  publicSlug?: string | null;
  templateType?: string | null;
  description?: string | null;
  status: string;
  network: string;
  owner: PortalUser;
  createdAt: string;
  updatedAt: string;
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
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRateToday: number;
  successRateToday: number;
  updatedAt: string;
}

export interface ProjectAnalytics {
  projectId: string;
  requestsToday: number;
  requestsThisWeek: number;
  requestsThisMonth: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRateToday: number;
  topMethods: { method: string; count: number }[];
  updatedAt: string;
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

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminOverview {
  totalProjects: number;
  totalUsers: number;
  totalRequests: number;
  activeProjects: number;
  updatedAt: string;
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
