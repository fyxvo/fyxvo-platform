import { API_BASE } from "./env";
import type {
  AdminOverview,
  AdminStats,
  AnalyticsOverview,
  ApiHealth,
  ApiStatus,
  AssistantConversation,
  AssistantRateLimitStatus,
  AuthChallenge,
  CreateApiKeyResult,
  EmailDeliveryStatus,
  FundingHistoryItem,
  FundingPreparation,
  OnchainSnapshot,
  Operator,
  PortalApiKey,
  PortalProject,
  ProjectAnalytics,
  ProjectBudgetStatus,
  WalletSession,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function createAuthChallenge(walletAddress: string): Promise<AuthChallenge> {
  return apiFetch<AuthChallenge>("/v1/auth/challenge", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
}

export async function verifyWalletSession(params: {
  walletAddress: string;
  message: string;
  signature: string;
}): Promise<WalletSession> {
  return apiFetch<WalletSession>("/v1/auth/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(token: string): Promise<PortalProject[]> {
  const response = await apiFetch<{ items: PortalProject[] }>("/v1/projects", { token });
  return response.items;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export async function listApiKeys(params: {
  projectId: string;
  token: string;
}): Promise<PortalApiKey[]> {
  const response = await apiFetch<{ items: PortalApiKey[] }>(
    `/v1/projects/${params.projectId}/api-keys`,
    {
      token: params.token,
    }
  );
  return response.items;
}

export async function createApiKey(params: {
  projectId: string;
  token: string;
  label: string;
  colorTag?: string;
  scopes: string[];
}): Promise<CreateApiKeyResult> {
  const { projectId, token, ...body } = params;
  return apiFetch<CreateApiKeyResult>(`/v1/projects/${projectId}/api-keys`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function revokeApiKey(params: {
  projectId: string;
  keyId: string;
  token: string;
}): Promise<void> {
  await apiFetch<void>(`/v1/projects/${params.projectId}/api-keys/${params.keyId}`, {
    method: "DELETE",
    token: params.token,
  });
}

// ─── Funding ──────────────────────────────────────────────────────────────────

export async function prepareFunding(params: {
  projectId: string;
  token: string;
  asset: string;
  amount: string;
  funderWalletAddress: string;
}): Promise<FundingPreparation> {
  const { projectId, token, ...body } = params;
  const response = await apiFetch<{ item: FundingPreparation }>(
    `/v1/projects/${projectId}/funding/prepare`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }
  );
  return response.item;
}

export async function getFundingHistory(params: {
  projectId: string;
  token: string;
}): Promise<FundingHistoryItem[]> {
  return apiFetch<FundingHistoryItem[]>(`/v1/projects/${params.projectId}/activity`, {
    token: params.token,
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getAnalyticsOverview(token: string): Promise<AnalyticsOverview> {
  const response = await apiFetch<{ item: AnalyticsOverview }>("/v1/analytics/overview", {
    token,
  });
  return response.item;
}

export async function getProjectAnalytics(params: {
  projectId: string;
  token: string;
}): Promise<ProjectAnalytics> {
  const response = await apiFetch<{ item: ProjectAnalytics }>(
    `/v1/analytics/projects/${params.projectId}`,
    {
      token: params.token,
    }
  );
  return response.item;
}

// ─── Onchain ──────────────────────────────────────────────────────────────────

export async function getOnchainSnapshot(params: {
  projectId: string;
  token: string;
}): Promise<OnchainSnapshot> {
  const response = await apiFetch<{ item: OnchainSnapshot }>(
    `/v1/projects/${params.projectId}/onchain`,
    {
      token: params.token,
    }
  );
  return response.item;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export async function getProjectBudgetStatus(params: {
  projectId: string;
  token: string;
}): Promise<ProjectBudgetStatus> {
  const response = await apiFetch<{ item: ProjectBudgetStatus }>(
    `/v1/projects/${params.projectId}/budget`,
    {
      token: params.token,
    }
  );
  return response.item;
}

// ─── Operators ────────────────────────────────────────────────────────────────

export async function getOperators(token: string): Promise<Operator[]> {
  const response = await apiFetch<{ items: Operator[] }>("/v1/admin/operators", { token });
  return response.items;
}

// ─── Assistant ────────────────────────────────────────────────────────────────

export async function listAssistantConversations(token: string): Promise<{
  items: AssistantConversation[];
}> {
  return apiFetch<{ items: AssistantConversation[] }>("/v1/assistant/conversations", { token });
}

export async function getLatestAssistantConversation(token: string): Promise<{
  item: AssistantConversation | null;
}> {
  return apiFetch<{ item: AssistantConversation | null }>("/v1/assistant/conversations/latest", {
    token,
  });
}

export async function getAssistantConversation(params: {
  conversationId: string;
  token: string;
}): Promise<{ item: AssistantConversation }> {
  return apiFetch<{ item: AssistantConversation }>(
    `/v1/assistant/conversations/${params.conversationId}`,
    { token: params.token }
  );
}

export async function createAssistantConversation(params: {
  title: string;
  token: string;
}): Promise<{ item: AssistantConversation }> {
  return apiFetch<{ item: AssistantConversation }>("/v1/assistant/conversations", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ title: params.title }),
  });
}

export async function updateAssistantConversation(params: {
  conversationId: string;
  token: string;
  title?: string;
  pinned?: boolean;
}): Promise<{ item: AssistantConversation }> {
  const { conversationId, token, ...body } = params;
  return apiFetch<{ item: AssistantConversation }>(
    `/v1/assistant/conversations/${conversationId}`,
    {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    }
  );
}

export async function clearAssistantConversation(
  conversationId: string,
  token: string
): Promise<void> {
  await apiFetch<void>(`/v1/assistant/conversations/${conversationId}`, {
    method: "DELETE",
    token,
  });
}

export async function getAssistantRateLimitStatus(
  token: string
): Promise<AssistantRateLimitStatus> {
  return apiFetch<AssistantRateLimitStatus>("/v1/assistant/rate-limit-status", { token });
}

export async function submitAssistantFeedback(params: {
  conversationId: string;
  messageId: string;
  rating: "up" | "down";
  note?: string;
  token: string;
}): Promise<{ item: { id: string; rating: string; note: string | null; createdAt: string } }> {
  const { conversationId, messageId, token, ...body } = params;
  return apiFetch(`/v1/assistant/messages/${messageId}/feedback`, {
    method: "POST",
    token,
    body: JSON.stringify({ conversationId, ...body }),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminOverview(token: string): Promise<AdminOverview> {
  return apiFetch<AdminOverview>("/v1/admin/overview", { token });
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch<AdminStats>("/v1/admin/stats", { token });
}

export async function getAdminAssistantStats(token: string): Promise<{
  item: {
    requestsToday: number;
    requestsThisWeek: number;
    failedRequestsToday: number;
    failedRequestsThisWeek: number;
    internalFailuresToday: number;
    averageResponseTimeMs: number;
    averageTokensPerResponse: number;
    rateLimitHitsToday: number;
    messagesPerDay: { date: string; count: number }[];
    topPromptCategories: { category: string; count: number }[];
    topLinkedDocsSections: { section: string; count: number }[];
    feedback: { positive: number; negative: number; withNotes: number; recent: unknown[] };
    recentFailures: unknown[];
  };
}> {
  return apiFetch("/v1/admin/assistant/stats", { token });
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function getEmailDeliveryStatus(token: string): Promise<EmailDeliveryStatus> {
  return apiFetch<EmailDeliveryStatus>("/v1/me/email-delivery-status", { token });
}

// ─── API Health ───────────────────────────────────────────────────────────────

export async function fetchApiHealth(): Promise<ApiHealth> {
  return apiFetch<ApiHealth>("/health");
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  return apiFetch<ApiStatus>("/v1/status");
}

// ─── Interest ─────────────────────────────────────────────────────────────────

export async function submitInterest(params: {
  name: string;
  email: string;
  role: string;
  team?: string;
  useCase: string;
  expectedRequestVolume: string;
  interestAreas: string[];
  operatorInterest?: boolean;
  source?: string;
}): Promise<{ item: { id: string; status: string; createdAt: string; email: string }; message: string }> {
  return apiFetch("/v1/interest", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

export async function trackProductEvent(params: {
  name: string;
  source: string;
  projectId?: string;
  properties?: Record<string, unknown>;
}): Promise<{ accepted: boolean; requestId: string }> {
  return apiFetch("/v1/events", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
