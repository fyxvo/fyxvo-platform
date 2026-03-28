import { API_BASE } from "./env";
import type {
  AdminOverview,
  AdminPlatformStats,
  AdminStats,
  AlertCenterItem,
  AnalyticsOverview,
  ApiHealth,
  ApiStatus,
  AssistantConversation,
  AssistantRateLimitStatus,
  MethodBreakdownItem,
  NotificationPreferences,
  AuthChallenge,
  CreateApiKeyResult,
  CreateProjectResult,
  EmailDeliveryStatus,
  FeedbackInboxItem,
  FundingHistoryItem,
  FundingPreparation,
  FundingVerification,
  IncidentItem,
  OnchainSnapshot,
  PortalApiKey,
  PortalProject,
  ProjectDetail,
  ProjectActivationVerification,
  ProjectAnalytics,
  ProjectBudgetStatus,
  ProjectMemberItem,
  ProjectRequestLogList,
  ProjectRequestTrace,
  PublicProjectProfile,
  InviteMetadata,
  MainnetReadinessSnapshot,
  OperatorNetworkSummary,
  OperatorRegistration,
  ReferralStats,
  SearchResults,
  SupportTicket,
  TransactionHistoryItem,
  WalletSession,
  WebhookItem,
  WebhookDeliveryRecord,
  WhatsNewItem,
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

  if (res.status === 204) {
    return undefined as T;
  }

  const contentLength = res.headers.get("content-length");
  if (contentLength === "0") {
    return undefined as T;
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

export async function createProject(params: {
  token: string;
  slug: string;
  name: string;
  description?: string;
  templateType?: "blank" | "defi" | "indexing";
}): Promise<CreateProjectResult> {
  const { token, ...body } = params;
  return apiFetch<CreateProjectResult>("/v1/projects", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function verifyProjectActivation(params: {
  projectId: string;
  token: string;
  signature: string;
}): Promise<ProjectActivationVerification> {
  const { projectId, token, signature } = params;
  const response = await apiFetch<{ item: ProjectActivationVerification }>(
    `/v1/projects/${projectId}/activation/verify`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ signature }),
    }
  );
  return response.item;
}

export async function getProject(params: {
  projectId: string;
  token: string;
}): Promise<ProjectDetail> {
  const response = await apiFetch<{ item: ProjectDetail }>(`/v1/projects/${params.projectId}`, {
    token: params.token,
  });
  return response.item;
}

export async function updateProject(params: {
  projectId: string;
  token: string;
  slug?: string;
  name?: string;
  description?: string | null;
  displayName?: string | null;
  isPublic?: boolean;
  publicSlug?: string | null;
  leaderboardVisible?: boolean;
}): Promise<ProjectDetail> {
  const { projectId, token, ...body } = params;
  const response = await apiFetch<{ item: ProjectDetail }>(`/v1/projects/${projectId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
  return response.item;
}

export async function archiveProject(params: {
  projectId: string;
  token: string;
}): Promise<PortalProject> {
  const response = await apiFetch<{ item: PortalProject }>(`/v1/projects/${params.projectId}`, {
    method: "DELETE",
    token: params.token,
  });
  return response.item;
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

export async function verifyFunding(params: {
  projectId: string;
  token: string;
  fundingRequestId: string;
  signature: string;
}): Promise<FundingVerification> {
  const { projectId, token, fundingRequestId, signature } = params;
  const response = await apiFetch<{ item: FundingVerification }>(
    `/v1/projects/${projectId}/funding/verify`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ fundingRequestId, signature }),
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
  range?: "1h" | "6h" | "24h" | "7d" | "30d";
}): Promise<ProjectAnalytics> {
  const search = params.range ? `?range=${params.range}` : "";
  const response = await apiFetch<{ item: ProjectAnalytics }>(
    `/v1/analytics/projects/${params.projectId}${search}`,
    {
      token: params.token,
    }
  );
  return response.item;
}

export async function getMethodBreakdown(params: {
  projectId: string;
  token: string;
  range?: "1h" | "6h" | "24h" | "7d" | "30d";
}): Promise<MethodBreakdownItem[]> {
  const search = params.range ? `?range=${params.range}` : "";
  const response = await apiFetch<{ items: MethodBreakdownItem[] }>(
    `/v1/projects/${params.projectId}/analytics/methods${search}`,
    {
      token: params.token,
    }
  );
  return response.items;
}

export async function getProjectRequestLogs(params: {
  projectId: string;
  token: string;
  range?: "1h" | "6h" | "24h" | "7d" | "30d";
  page?: number;
  pageSize?: number;
}): Promise<ProjectRequestLogList> {
  const search = new URLSearchParams();
  if (params.range) search.set("range", params.range);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  const query = search.toString();
  return apiFetch<ProjectRequestLogList>(
    `/v1/projects/${params.projectId}/requests${query ? `?${query}` : ""}`,
    { token: params.token }
  );
}

export async function getProjectRequestTrace(params: {
  projectId: string;
  traceId: string;
  token: string;
}): Promise<ProjectRequestTrace> {
  return apiFetch<ProjectRequestTrace>(
    `/v1/projects/${params.projectId}/requests/${params.traceId}`,
    { token: params.token }
  );
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

export async function getAlerts(token: string): Promise<AlertCenterItem[]> {
  const response = await apiFetch<{ items: AlertCenterItem[] }>("/v1/alerts", { token });
  return response.items;
}

export async function updateAlertState(params: {
  alertKey: string;
  token: string;
  state: "new" | "acknowledged" | "resolved";
  projectId?: string | null;
}): Promise<void> {
  await apiFetch(`/v1/alerts/${encodeURIComponent(params.alertKey)}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify({
      state: params.state,
      projectId: params.projectId ?? null,
    }),
  });
}

export async function getTransactions(token: string): Promise<TransactionHistoryItem[]> {
  const response = await apiFetch<{ items: TransactionHistoryItem[] }>("/v1/transactions", {
    token,
  });
  return response.items;
}

export async function getNotificationPreferences(
  token: string
): Promise<NotificationPreferences> {
  return apiFetch<NotificationPreferences>("/v1/notifications/preferences", { token });
}

export async function updateNotificationPreferences(params: {
  token: string;
  email?: string | null;
  notifyProjectActivation?: boolean;
  notifyApiKeyEvents?: boolean;
  notifyFundingConfirmed?: boolean;
  notifyLowBalance?: boolean;
  notifyDailyAlert?: boolean;
  notifyWeeklySummary?: boolean;
  notifyReferralConversion?: boolean;
}): Promise<{ success: true }> {
  const { token, ...body } = params;
  return apiFetch("/v1/notifications/preferences", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function requestEmailVerification(token: string): Promise<{
  requested?: boolean;
  alreadyVerified?: boolean;
  expiresAt?: string;
  message?: string;
}> {
  return apiFetch("/v1/me/verify-email/request", {
    method: "POST",
    token,
  });
}

export async function sendEmailDeliveryTest(token: string): Promise<{
  sent?: boolean;
  recipient?: string;
  message?: string;
}> {
  return apiFetch("/v1/me/email-delivery/test", {
    method: "POST",
    token,
  });
}

export async function enrollDigest(token: string): Promise<{ enrolled: true }> {
  return apiFetch("/v1/me/digest", {
    method: "POST",
    token,
  });
}

export async function unenrollDigest(token: string): Promise<{ removed: true }> {
  return apiFetch("/v1/me/digest", {
    method: "DELETE",
    token,
  });
}

export async function getProjectMembers(params: {
  projectId: string;
  token: string;
}): Promise<ProjectMemberItem[]> {
  const response = await apiFetch<{ items: ProjectMemberItem[] }>(
    `/v1/projects/${params.projectId}/members`,
    { token: params.token }
  );
  return response.items;
}

export async function inviteProjectMember(params: {
  projectId: string;
  token: string;
  walletAddress: string;
}): Promise<{ item: ProjectMemberItem }> {
  return apiFetch(`/v1/projects/${params.projectId}/members/invite`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ walletAddress: params.walletAddress }),
  });
}

export async function getProjectWebhooks(params: {
  projectId: string;
  token: string;
}): Promise<WebhookItem[]> {
  const response = await apiFetch<{ items: WebhookItem[] }>(
    `/v1/projects/${params.projectId}/webhooks`,
    { token: params.token }
  );
  return response.items;
}

export async function createProjectWebhook(params: {
  projectId: string;
  token: string;
  url: string;
  events: string[];
}): Promise<{ item: WebhookItem }> {
  return apiFetch(`/v1/projects/${params.projectId}/webhooks`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ url: params.url, events: params.events }),
  });
}

export async function deleteProjectWebhook(params: {
  projectId: string;
  webhookId: string;
  token: string;
}): Promise<void> {
  await apiFetch(`/v1/projects/${params.projectId}/webhooks/${params.webhookId}`, {
    method: "DELETE",
    token: params.token,
  });
}

export async function getWebhookDeliveries(params: {
  projectId: string;
  webhookId: string;
  token: string;
}): Promise<WebhookDeliveryRecord[]> {
  const response = await apiFetch<{ items: WebhookDeliveryRecord[] }>(
    `/v1/projects/${params.projectId}/webhooks/${params.webhookId}/deliveries`,
    { token: params.token }
  );
  return response.items;
}

export async function redeliverWebhookDelivery(params: {
  projectId: string;
  deliveryId: string;
  token: string;
}): Promise<{ success: true }> {
  return apiFetch(`/v1/projects/${params.projectId}/webhooks/events/${params.deliveryId}/redeliver`, {
    method: "POST",
    token: params.token,
  });
}

export async function getSupportTickets(token: string): Promise<SupportTicket[]> {
  const response = await apiFetch<{ tickets: SupportTicket[] }>("/v1/support/tickets", { token });
  return response.tickets;
}

export async function createSupportTicket(params: {
  token: string;
  projectId?: string;
  category: "general" | "billing" | "technical" | "security";
  priority: "low" | "normal" | "high" | "urgent";
  subject: string;
  description: string;
}): Promise<SupportTicket> {
  const { token, ...body } = params;
  return apiFetch("/v1/support/tickets", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

// ─── Operators ────────────────────────────────────────────────────────────────

export async function getAdminOperators(token: string): Promise<{
  items: OperatorRegistration[];
  activeOperators: unknown[];
}> {
  return apiFetch<{ items: OperatorRegistration[]; activeOperators: unknown[] }>("/v1/admin/operators", {
    token,
  });
}

export async function approveOperatorRegistration(params: {
  registrationId: string;
  token: string;
}): Promise<{
  item: {
    registration: OperatorRegistration;
    operatorId: string;
    nodeId: string;
    nodeStatus: string;
  };
}> {
  return apiFetch(`/v1/admin/operators/${params.registrationId}/approve`, {
    method: "POST",
    token: params.token,
  });
}

export async function rejectOperatorRegistration(params: {
  registrationId: string;
  token: string;
  reason?: string;
}): Promise<{ item: OperatorRegistration }> {
  return apiFetch(`/v1/admin/operators/${params.registrationId}/reject`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify(params.reason ? { reason: params.reason } : {}),
  });
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

export async function getWhatsNew(token: string): Promise<WhatsNewItem | null> {
  const response = await apiFetch<{ item: WhatsNewItem | null }>("/v1/whats-new", { token });
  return response.item;
}

export async function dismissWhatsNew(params: {
  token: string;
  version: string;
}): Promise<{ success: true }> {
  return apiFetch("/v1/whats-new/dismiss", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({ version: params.version }),
  });
}

export async function getReferralStats(token: string): Promise<ReferralStats> {
  return apiFetch<ReferralStats>("/v1/referral/stats", { token });
}

export async function generateReferralCode(token: string): Promise<{ referralCode: string }> {
  return apiFetch<{ referralCode: string }>("/v1/referral/generate", {
    method: "POST",
    token,
  });
}

export async function recordReferralClick(code: string): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(`/v1/referral/click/${code}`, {
    method: "POST",
  });
}

export async function confirmEmailVerification(token: string): Promise<{ success: true }> {
  return apiFetch<{ success: true }>("/v1/me/verify-email/confirm", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function registerOperator(params: {
  endpoint: string;
  operatorWalletAddress: string;
  name: string;
  region: string;
  contact: string;
}): Promise<{ item: OperatorRegistration }> {
  return apiFetch<{ item: OperatorRegistration }>("/v1/operators/register", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getOperatorNetwork(): Promise<OperatorNetworkSummary> {
  return apiFetch<OperatorNetworkSummary>("/v1/operators/network");
}

export async function getMyOperatorRegistrations(token: string): Promise<OperatorRegistration[]> {
  const response = await apiFetch<{ items: OperatorRegistration[] }>("/v1/operators/my-registration", {
    token
  });
  return response.items;
}

export async function getInviteMetadata(token: string): Promise<InviteMetadata> {
  return apiFetch<InviteMetadata>(`/v1/invite/${token}`);
}

export async function acceptInvite(params: {
  token: string;
  authToken: string;
}): Promise<{ accepted: true }> {
  return apiFetch<{ accepted: true }>(`/v1/invite/${params.token}/accept`, {
    method: "POST",
    token: params.authToken,
  });
}

export async function declineInvite(params: {
  token: string;
  authToken: string;
}): Promise<{ declined: true }> {
  return apiFetch<{ declined: true }>(`/v1/invite/${params.token}/decline`, {
    method: "POST",
    token: params.authToken,
  });
}

export async function searchWorkspace(params: {
  token: string;
  q: string;
}): Promise<SearchResults> {
  const query = new URLSearchParams({ q: params.q }).toString();
  return apiFetch<SearchResults>(`/v1/search?${query}`, {
    token: params.token,
  });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminOverview(token: string): Promise<AdminOverview> {
  const response = await apiFetch<{ item: AdminOverview }>("/v1/admin/overview", { token });
  return response.item;
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  const response = await apiFetch<{ item: AdminStats }>("/v1/admin/stats", { token });
  return response.item;
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

export async function getAdminPlatformStats(token: string): Promise<AdminPlatformStats> {
  const response = await apiFetch<{ item: AdminPlatformStats }>("/v1/admin/platform-stats", {
    token,
  });
  return response.item;
}

export async function getFeedbackInbox(params: {
  token: string;
  type?: "all" | "feedback_submission" | "assistant_feedback" | "support_ticket" | "newsletter_signup" | "referral_conversion";
  status?: "all" | "new" | "reviewed" | "planned" | "resolved";
}): Promise<FeedbackInboxItem[]> {
  const query = new URLSearchParams();
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  const response = await apiFetch<{ items: FeedbackInboxItem[] }>(
    `/v1/admin/feedback-inbox${query.toString() ? `?${query.toString()}` : ""}`,
    { token: params.token }
  );
  return response.items;
}

export async function reviewFeedbackInboxItem(params: {
  token: string;
  itemType: FeedbackInboxItem["type"];
  itemId: string;
  status?: "new" | "reviewed" | "planned" | "resolved";
  tags?: string[];
}): Promise<{
  item: {
    id: string;
    itemType: string;
    itemId: string;
    status: string;
    tags: string[];
    updatedAt: string;
  };
}> {
  return apiFetch(`/v1/admin/feedback-inbox/${params.itemType}/${params.itemId}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify({
      ...(params.status ? { status: params.status } : {}),
      ...(params.tags ? { tags: params.tags } : {}),
    }),
  });
}

export async function listIncidents(): Promise<IncidentItem[]> {
  const response = await apiFetch<{ incidents: IncidentItem[] }>("/v1/incidents");
  return response.incidents;
}

export async function createIncident(params: {
  token: string;
  serviceName: string;
  severity: "info" | "warning" | "critical" | "degraded";
  description: string;
}): Promise<IncidentItem> {
  const response = await apiFetch<{ item: IncidentItem }>("/v1/admin/incidents", {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      serviceName: params.serviceName,
      severity: params.severity,
      description: params.description,
    }),
  });
  return response.item;
}

export async function updateIncident(params: {
  token: string;
  incidentId: string;
  severity?: "info" | "warning" | "critical" | "degraded";
  description?: string;
  status?: "open" | "resolved";
}): Promise<IncidentItem> {
  const response = await apiFetch<{ item: IncidentItem }>(`/v1/admin/incidents/${params.incidentId}`, {
    method: "PATCH",
    token: params.token,
    body: JSON.stringify({
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.description ? { description: params.description } : {}),
      ...(params.status ? { status: params.status } : {}),
    }),
  });
  return response.item;
}

export async function addIncidentUpdate(params: {
  token: string;
  incidentId: string;
  message: string;
  status?: "update" | "escalated" | "resolved";
  severity?: "info" | "warning" | "critical" | "degraded";
  affectedServices?: string[];
}): Promise<{ item: IncidentItem }> {
  return apiFetch(`/v1/admin/incidents/${params.incidentId}/updates`, {
    method: "POST",
    token: params.token,
    body: JSON.stringify({
      message: params.message,
      ...(params.status ? { status: params.status } : {}),
      ...(params.severity ? { severity: params.severity } : {}),
      ...(params.affectedServices ? { affectedServices: params.affectedServices } : {}),
    }),
  });
}

export async function getMainnetReadinessGate(token?: string | null): Promise<MainnetReadinessSnapshot> {
  const response = await apiFetch<{ item: MainnetReadinessSnapshot }>("/v1/admin/mainnet-readiness-gate", {
    ...(token ? { token } : {}),
  });
  return response.item;
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function getEmailDeliveryStatus(token: string): Promise<EmailDeliveryStatus> {
  const response = await apiFetch<{ item: EmailDeliveryStatus }>("/v1/me/email-delivery-status", {
    token,
  });
  return response.item;
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

export async function submitFeedback(params: {
  name: string;
  email: string;
  role?: string;
  team?: string;
  category: "BUG_REPORT" | "SUPPORT_REQUEST" | "ONBOARDING_FRICTION" | "PRODUCT_FEEDBACK";
  message: string;
  source?: string;
  page?: string;
  projectId?: string;
  walletAddress?: string;
  token?: string;
}): Promise<{ item: { id: string; status: string; createdAt: string; email: string }; message: string }> {
  const { token, ...body } = params;
  return apiFetch("/v1/feedback", {
    method: "POST",
    ...(token ? { token } : {}),
    body: JSON.stringify(body),
  });
}

export async function getPublicProject(publicSlug: string): Promise<PublicProjectProfile | null> {
  try {
    return await apiFetch<PublicProjectProfile>(`/v1/public/projects/${publicSlug}`);
  } catch {
    return null;
  }
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
