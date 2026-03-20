import type {
  AdminOverview,
  AdminStats,
  AnalyticsOverview,
  AnalyticsRange,
  ApiKeyAnalytics,
  ErrorLogEntry,
  FeedbackSubmissionInput,
  FeedbackSubmissionReceipt,
  FundingHistoryItem,
  FundingPreparation,
  FundingVerification,
  InterestSubmissionInput,
  InterestSubmissionReceipt,
  LaunchEventName,
  MethodBreakdown,
  Notification,
  OnChainProjectSnapshot,
  OperatorSummary,
  PortalApiKey,
  PortalHealth,
  PortalProject,
  ProjectActivationPreparation,
  ProjectActivationVerification,
  PortalServiceStatus,
  PortalUser,
  ProjectAnalytics,
  ProjectChecklist
} from "./types";
import { webEnv } from "./env";

class PortalApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown
  ) {
    super(message);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new PortalApiError(
      typeof body === "object" && body !== null && "error" in body ? String(body.error) : `Request failed with status ${response.status}.`,
      response.status,
      body
    );
  }

  return body as T;
}

async function requestApi<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, webEnv.apiBaseUrl), {
    ...init,
    headers,
    cache: "no-store"
  });

  return parseResponse<T>(response);
}

export async function fetchApiHealth() {
  return requestApi<PortalHealth>("/health");
}

export async function fetchApiStatus() {
  return requestApi<PortalServiceStatus>("/v1/status");
}

export async function fetchGatewayHealth() {
  const response = await fetch(new URL("/health", webEnv.gatewayBaseUrl), {
    cache: "no-store"
  });
  return parseResponse<PortalHealth>(response);
}

export async function fetchGatewayStatus() {
  const response = await fetch(new URL("/v1/status", webEnv.gatewayBaseUrl), {
    cache: "no-store"
  });
  return parseResponse<PortalServiceStatus>(response);
}

export async function createAuthChallenge(walletAddress: string) {
  return requestApi<{ walletAddress: string; nonce: string; message: string }>(
    "/v1/auth/challenge",
    {
      method: "POST",
      body: JSON.stringify({ walletAddress })
    }
  );
}

export async function verifyWalletSession(input: {
  readonly walletAddress: string;
  readonly message: string;
  readonly signature: string;
}) {
  return requestApi<{ token: string; user: PortalUser }>(
    "/v1/auth/verify",
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export async function submitInterest(input: InterestSubmissionInput) {
  return requestApi<{ item: InterestSubmissionReceipt; message: string }>(
    "/v1/interest",
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
}

export async function submitFeedback(input: FeedbackSubmissionInput, token?: string) {
  return requestApi<{ item: FeedbackSubmissionReceipt; message: string }>(
    "/v1/feedback",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    token
  );
}

export async function trackProductEvent(input: {
  readonly name: LaunchEventName;
  readonly source: string;
  readonly projectId?: string;
  readonly token?: string;
}) {
  return requestApi<{ accepted: boolean; requestId: string }>(
    "/v1/events",
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        source: input.source,
        ...(input.projectId ? { projectId: input.projectId } : {})
      }),
      keepalive: true
    },
    input.token
  );
}

export async function listProjects(token: string) {
  const response = await requestApi<{ items: PortalProject[] }>("/v1/projects", undefined, token);
  return response.items;
}

export async function getProject(projectId: string, token: string) {
  const response = await requestApi<{ item: PortalProject }>(`/v1/projects/${projectId}`, undefined, token);
  return response.item;
}

export async function createProject(input: {
  readonly token: string;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
}) {
  return requestApi<{ item: PortalProject; activation: ProjectActivationPreparation }>(
    "/v1/projects",
    {
      method: "POST",
      headers: {
        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        ...(input.description ? { description: input.description } : {})
      })
    },
    input.token
  );
}

export async function updateProject(input: {
  readonly projectId: string;
  readonly token: string;
  readonly displayName?: string | null;
  readonly lowBalanceThresholdSol?: number | null;
  readonly dailyRequestAlertThreshold?: number | null;
  readonly name?: string;
  readonly description?: string | null;
  readonly environment?: "development" | "staging" | "production";
  readonly starred?: boolean;
  readonly notes?: string | null;
}) {
  const { projectId, token, ...body } = input;
  return requestApi<{ item: PortalProject }>(
    `/v1/projects/${projectId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body)
    },
    token
  );
}

export async function deleteProject(input: {
  readonly projectId: string;
  readonly token: string;
}) {
  return requestApi<{ item: PortalProject }>(
    `/v1/projects/${input.projectId}`,
    {
      method: "DELETE"
    },
    input.token
  );
}

export async function verifyProjectActivation(input: {
  readonly projectId: string;
  readonly token: string;
  readonly signature: string;
}) {
  const response = await requestApi<{ item: ProjectActivationVerification }>(
    `/v1/projects/${input.projectId}/activation/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        signature: input.signature
      })
    },
    input.token
  );
  return response.item;
}

export async function listApiKeys(projectId: string, token: string) {
  const response = await requestApi<{ items: PortalApiKey[] }>(
    `/v1/projects/${projectId}/api-keys`,
    undefined,
    token
  );
  return response.items;
}

export async function createApiKey(input: {
  readonly projectId: string;
  readonly token: string;
  readonly label: string;
  readonly scopes: readonly string[];
  readonly expiresAt?: string;
}) {
  return requestApi<{ item: PortalApiKey; plainTextKey: string }>(
    `/v1/projects/${input.projectId}/api-keys`,
    {
      method: "POST",
      body: JSON.stringify({
        label: input.label,
        scopes: input.scopes,
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {})
      })
    },
    input.token
  );
}

export async function revokeApiKey(input: {
  readonly projectId: string;
  readonly apiKeyId: string;
  readonly token: string;
}) {
  return requestApi<{ item: PortalApiKey }>(
    `/v1/projects/${input.projectId}/api-keys/${input.apiKeyId}`,
    {
      method: "DELETE"
    },
    input.token
  );
}

export async function rotateApiKey(input: {
  readonly projectId: string;
  readonly apiKeyId: string;
  readonly token: string;
}) {
  return requestApi<{ item: PortalApiKey; plainTextKey: string }>(
    `/v1/projects/${input.projectId}/api-keys/${input.apiKeyId}/rotate`,
    { method: "POST" },
    input.token
  );
}

export async function getAnalyticsOverview(token: string) {
  const response = await requestApi<{ item: AnalyticsOverview }>("/v1/analytics/overview", undefined, token);
  return response.item;
}

export async function getProjectAnalytics(projectId: string, token: string, range?: AnalyticsRange) {
  const path = range
    ? `/v1/analytics/projects/${projectId}?range=${range}`
    : `/v1/analytics/projects/${projectId}`;
  const response = await requestApi<{ item: ProjectAnalytics }>(path, undefined, token);
  return response.item;
}

export async function getNotifications(token: string) {
  const response = await requestApi<{ items: Notification[] }>("/v1/notifications", undefined, token);
  return response.items;
}

export async function markNotificationRead(notificationId: string, token: string) {
  await requestApi<{ ok: boolean }>(`/v1/notifications/${notificationId}/read`, { method: "POST" }, token);
}

export async function markAllNotificationsRead(token: string) {
  await requestApi<{ ok: boolean }>("/v1/notifications/read-all", { method: "POST" }, token);
}

export async function getApiKeyAnalytics(projectId: string, apiKeyId: string, token: string, range?: AnalyticsRange) {
  const path = range
    ? `/v1/projects/${projectId}/api-keys/${apiKeyId}/analytics?range=${range}`
    : `/v1/projects/${projectId}/api-keys/${apiKeyId}/analytics`;
  const response = await requestApi<{ item: ApiKeyAnalytics }>(path, undefined, token);
  return response.item;
}

export async function getMethodBreakdown(projectId: string, token: string, range?: AnalyticsRange) {
  const path = range
    ? `/v1/projects/${projectId}/analytics/methods?range=${range}`
    : `/v1/projects/${projectId}/analytics/methods`;
  const response = await requestApi<{ items: MethodBreakdown[] }>(path, undefined, token);
  return response.items;
}

export async function getErrorLog(projectId: string, token: string) {
  const response = await requestApi<{ items: ErrorLogEntry[] }>(
    `/v1/projects/${projectId}/analytics/errors`,
    undefined,
    token
  );
  return response.items;
}

export async function downloadAnalyticsExport(projectId: string, range: AnalyticsRange, token: string): Promise<Blob> {
  const url = new URL(`/v1/projects/${projectId}/analytics/export?range=${range}`, webEnv.apiBaseUrl);
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`Export failed: ${response.status}`);
  }
  return response.blob();
}

export async function getOnchainSnapshot(projectId: string, token: string) {
  const response = await requestApi<{ item: OnChainProjectSnapshot }>(
    `/v1/projects/${projectId}/onchain`,
    undefined,
    token
  );
  return response.item;
}

export async function prepareFunding(input: {
  readonly projectId: string;
  readonly token: string;
  readonly asset: "SOL" | "USDC";
  readonly amount: string;
  readonly funderWalletAddress: string;
  readonly funderTokenAccount?: string;
}) {
  const response = await requestApi<{ item: FundingPreparation }>(
    `/v1/projects/${input.projectId}/funding/prepare`,
    {
      method: "POST",
      headers: {
        "idempotency-key": crypto.randomUUID()
      },
      body: JSON.stringify({
        asset: input.asset,
        amount: input.amount,
        funderWalletAddress: input.funderWalletAddress,
        ...(input.funderTokenAccount ? { funderTokenAccount: input.funderTokenAccount } : {})
      })
    },
    input.token
  );
  return response.item;
}

export async function verifyFunding(input: {
  readonly projectId: string;
  readonly fundingRequestId: string;
  readonly token: string;
  readonly signature: string;
}) {
  const response = await requestApi<{ item: FundingVerification }>(
    `/v1/projects/${input.projectId}/funding/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        fundingRequestId: input.fundingRequestId,
        signature: input.signature
      })
    },
    input.token
  );
  return response.item;
}

export async function getAdminStats(token: string) {
  const response = await requestApi<{ item: AdminStats }>("/v1/admin/stats", undefined, token);
  return response.item;
}

export async function getAdminOverview(token: string) {
  const response = await requestApi<{ item: AdminOverview }>("/v1/admin/overview", undefined, token);
  return response.item;
}

export async function getOperators(token: string) {
  const response = await requestApi<{ items: OperatorSummary[] }>("/v1/admin/operators", undefined, token);
  return response.items;
}

export async function getMe(token: string) {
  return requestApi<{ user: PortalUser; projectCount: number }>("/v1/me", undefined, token);
}

export async function getFundingHistory(token: string) {
  const response = await requestApi<{ items: FundingHistoryItem[] }>("/v1/transactions", undefined, token);
  return response.items;
}

export async function getProjectChecklist(projectId: string, token: string) {
  const response = await requestApi<{ item: ProjectChecklist }>(`/v1/projects/${projectId}/checklist`, undefined, token);
  return response.item;
}

export async function getProjectRateLimits(projectId: string, token: string) {
  const response = await requestApi<{ items: ErrorLogEntry[]; count: number }>(`/v1/projects/${projectId}/analytics/rate-limits`, undefined, token);
  return response;
}

export async function getNetworkStats() {
  return requestApi<{ totalRequests: number; totalProjects: number; totalApiKeys: number; totalSolFees?: string; updatedAt: string }>("/v1/network/stats");
}

export async function updateMe(input: { onboardingDismissed?: boolean; token: string }): Promise<void> {
  await requestApi<{ success: boolean }>(
    "/v1/me",
    {
      method: "PATCH",
      body: JSON.stringify({ onboardingDismissed: input.onboardingDismissed }),
    },
    input.token
  );
}

export async function getServiceHealthHistory() {
  return requestApi<Record<string, Array<{ id: string; serviceName: string; status: string; responseTimeMs: number | null; errorMessage: string | null; checkedAt: string }>>>("/v1/network/service-health");
}

export async function getIncidents() {
  const data = await requestApi<{ incidents: Array<{ id: string; serviceName: string; severity: string; description: string; startedAt: string; resolvedAt: string | null }> }>("/v1/incidents");
  return data.incidents;
}

export async function getReferralStats(token: string) {
  return requestApi<{ referralCode: string | null; totalClicks: number; conversions: number }>("/v1/referral/stats", undefined, token);
}

export async function generateReferralCode(token: string) {
  return requestApi<{ referralCode: string }>("/v1/referral/generate", { method: "POST" }, token);
}

export async function getNotificationPreferences(token: string) {
  return requestApi<{
    email: string | null;
    notifyProjectActivation: boolean;
    notifyApiKeyEvents: boolean;
    notifyFundingConfirmed: boolean;
    notifyLowBalance: boolean;
    notifyDailyAlert: boolean;
    notifyWeeklySummary: boolean;
    notifyReferralConversion: boolean;
  }>("/v1/notifications/preferences", undefined, token);
}

export async function updateNotificationPreferences(
  prefs: Partial<{
    email: string | null;
    notifyProjectActivation: boolean;
    notifyApiKeyEvents: boolean;
    notifyFundingConfirmed: boolean;
    notifyLowBalance: boolean;
    notifyDailyAlert: boolean;
    notifyWeeklySummary: boolean;
    notifyReferralConversion: boolean;
  }>,
  token: string
) {
  return requestApi<{ success: boolean }>("/v1/notifications/preferences", { method: "PATCH", body: JSON.stringify(prefs) }, token);
}

export async function getAssistantRateLimitStatus(token: string) {
  return requestApi<{ messagesUsedThisHour: number; messagesRemainingThisHour: number; limit: number; windowResetAt: string }>("/v1/assistant/rate-limit-status", undefined, token);
}

export async function listWebhooks(projectId: string, token: string) {
  return requestApi<{ items: Array<{ id: string; url: string; events: string[]; secret: string; active: boolean; lastTriggeredAt: string | null; createdAt: string }> }>(`/v1/projects/${projectId}/webhooks`, undefined, token);
}

export async function createWebhook(projectId: string, input: { url: string; events: string[] }, token: string) {
  return requestApi<{ item: { id: string; url: string; events: string[]; secret: string; active: boolean; lastTriggeredAt: string | null; createdAt: string } }>(`/v1/projects/${projectId}/webhooks`, { method: "POST", body: JSON.stringify(input) }, token);
}

export async function deleteWebhook(projectId: string, webhookId: string, token: string) {
  return fetch(new URL(`/v1/projects/${projectId}/webhooks/${webhookId}`, webEnv.apiBaseUrl), {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function testWebhook(projectId: string, webhookId: string, token: string) {
  return requestApi<{ success: boolean; statusCode?: number; error?: string }>(`/v1/projects/${projectId}/webhooks/${webhookId}/test`, { method: "POST" }, token);
}

export async function listProjectMembers(projectId: string, token: string) {
  return requestApi<{ items: Array<{ id: string; userId: string; role: string; invitedAt: string; acceptedAt: string | null; user: { walletAddress: string; displayName: string } }> }>(`/v1/projects/${projectId}/members`, undefined, token);
}

export async function inviteProjectMember(projectId: string, walletAddress: string, token: string) {
  return requestApi<{ item: unknown }>(`/v1/projects/${projectId}/members/invite`, { method: "POST", body: JSON.stringify({ walletAddress }) }, token);
}

export async function removeProjectMember(projectId: string, memberId: string, token: string) {
  return fetch(new URL(`/v1/projects/${projectId}/members/${memberId}`, webEnv.apiBaseUrl), {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function submitEnterpriseInterest(input: { companyName: string; contactEmail: string; estimatedMonthlyReqs: string; useCase: string }) {
  return requestApi<{ success: boolean }>("/v1/enterprise/interest", { method: "POST", body: JSON.stringify(input) });
}

export async function getProjectActivity(projectId: string, token: string) {
  return requestApi<{ items: Array<{ id: string; action: string; details: Record<string, unknown> | null; actorWallet: string | null; createdAt: string }> }>(`/v1/projects/${projectId}/activity`, undefined, token);
}

export async function getActiveAnnouncement() {
  return requestApi<{ announcement: { id: string; message: string; severity: string; active: boolean; createdAt: string } | null }>("/v1/announcements/active");
}

export function isPortalApiError(error: unknown): error is PortalApiError {
  return error instanceof PortalApiError;
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 500): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0 && (err instanceof PortalApiError ? (err.status ?? 0) >= 500 : err instanceof TypeError)) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}
