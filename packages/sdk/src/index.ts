/**
 * Supported HTTP methods for direct Fyxvo API requests.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Generic JSON object helper.
 */
export type JsonObject = Record<string, unknown>;

/**
 * Shared request options for raw SDK requests.
 */
export interface RequestOptions<TBody = unknown> {
  readonly method?: HttpMethod;
  readonly path?: string;
  readonly query?: Record<string, string | number | boolean | undefined>;
  readonly body?: TBody;
  readonly headers?: HeadersInit;
  readonly signal?: AbortSignal;
}

/**
 * Common low-level client options.
 */
export interface BaseClientOptions {
  readonly baseUrl: string;
  readonly timeoutMs?: number;
  readonly headers?: HeadersInit;
  readonly fetcher?: typeof fetch;
}

/**
 * Gateway client options for API key-authenticated relay access.
 */
export interface FyxvoGatewayClientOptions extends BaseClientOptions {
  readonly apiKey: string;
}

/**
 * Control-plane API client options for JWT-authenticated workspace access.
 */
export interface FyxvoApiClientOptions extends BaseClientOptions {
  readonly jwtToken: string;
}

/**
 * Minimal health payload returned by the API and gateway health endpoints.
 */
export interface HealthResponse {
  readonly status: string;
  readonly service: string;
  readonly version?: string;
  readonly timestamp: string;
}

/**
 * Public network statistics returned by the control plane.
 */
export interface NetworkStats {
  readonly totalRequests: number;
  readonly totalProjects: number;
  readonly totalApiKeys: number;
  readonly totalSolFees: string;
  readonly updatedAt: string;
  readonly region?: string;
}

/**
 * Gateway status payload returned by `GET /v1/status`.
 */
export interface GatewayStatusResponse {
  readonly status: string;
  readonly service: string;
  readonly version: string;
  readonly commit: string | null;
  readonly timestamp: string;
  readonly environment: string;
  readonly region: string;
  readonly solanaCluster: string;
  readonly programId: string;
  readonly controlPlaneOrigin: string;
  readonly nodeCount: number;
  readonly pricing: {
    readonly standard: number;
    readonly priority: number;
    readonly writeMultiplier: number;
  };
  readonly acceptedAssets: {
    readonly sol: true;
    readonly usdcEnabled: boolean;
  };
  readonly scopeEnforcement: {
    readonly enabled: boolean;
    readonly standardRequiredScopes: readonly string[];
    readonly priorityRequiredScopes: readonly string[];
  };
  readonly metrics: JsonObject;
}

/**
 * Control-plane status payload returned by `GET /v1/status`.
 */
export interface ApiStatusResponse {
  readonly status: string;
  readonly service: string;
  readonly version: string;
  readonly environment: string;
  readonly commit?: string | null;
  readonly timestamp: string;
  readonly assistantAvailable?: boolean;
  readonly acceptedAssets?: {
    readonly sol?: boolean;
    readonly usdcEnabled?: boolean;
    readonly usdcMintAddress?: string;
  };
}

/**
 * Solana JSON-RPC request shape sent through the gateway.
 */
export interface RpcRequest<TParams = unknown> {
  readonly method: string;
  readonly params?: TParams;
  readonly id?: string | number;
}

/**
 * Successful JSON-RPC response shape.
 */
export interface RpcSuccess<TResult> {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly result: TResult;
}

/**
 * Failed JSON-RPC response shape.
 */
export interface RpcFailure {
  readonly jsonrpc: "2.0";
  readonly id: string | number | null;
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

/**
 * Union of successful and failed JSON-RPC responses.
 */
export type RpcResponse<TResult> = RpcSuccess<TResult> | RpcFailure;

/**
 * Project record returned by the control-plane API.
 */
export interface ProjectRecord {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly displayName?: string | null;
  readonly description?: string | null;
  readonly publicSlug?: string | null;
  readonly templateType?: string | null;
  readonly isPublic?: boolean;
  readonly leaderboardVisible?: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Activation preparation returned when a project is created.
 */
export interface ProjectActivation {
  readonly projectPda: string;
  readonly protocolConfigPda: string;
  readonly treasuryPda: string;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly lastValidBlockHeight: number;
}

/**
 * Input payload used to create a project.
 */
export interface CreateProjectInput {
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly templateType?: "blank" | "defi" | "indexing";
}

/**
 * Full project creation response.
 */
export interface CreateProjectResult<TProject extends ProjectRecord = ProjectRecord> {
  readonly item: TProject;
  readonly activation: ProjectActivation;
}

/**
 * API key record returned by the control plane.
 */
export interface ApiKeyRecord {
  readonly id: string;
  readonly projectId: string;
  readonly createdById: string;
  readonly label: string;
  readonly prefix: string;
  readonly status: string;
  readonly scopes: readonly string[];
  readonly colorTag?: string | null;
  readonly lastUsedAt: string | null;
  readonly expiresAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Input payload used to create an API key.
 */
export interface CreateApiKeyInput {
  readonly label: string;
  readonly colorTag?: string | null;
  readonly scopes: readonly string[];
  readonly expiresAt?: string;
}

/**
 * Response returned when an API key is created.
 */
export interface CreateApiKeyResult<TApiKey extends ApiKeyRecord = ApiKeyRecord> {
  readonly item: TApiKey;
  readonly plainTextKey: string;
}

/**
 * Account and latency totals shown in the analytics overview.
 */
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
  readonly requestsByService: ReadonlyArray<{
    readonly service: string;
    readonly count: number;
  }>;
}

/**
 * Project-scoped analytics payload returned by the control plane.
 */
export interface ProjectAnalytics<TProject extends ProjectRecord = ProjectRecord> {
  readonly project: TProject;
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
  readonly statusCodes: ReadonlyArray<{
    readonly statusCode: number;
    readonly count: number;
  }>;
  readonly recentRequests: ReadonlyArray<JsonObject>;
}

/**
 * Funding preparation payload returned before a SOL or USDC funding transaction is signed.
 */
export interface FundingPreparation {
  readonly fundingRequestId: string;
  readonly projectPda: string;
  readonly protocolConfigPda: string;
  readonly treasuryPda: string;
  readonly recentBlockhash: string;
  readonly transactionBase64: string;
  readonly lastValidBlockHeight: number;
  readonly amount: string;
  readonly asset: "SOL" | "USDC";
  readonly treasuryUsdcVault?: string;
}

/**
 * Verified funding response returned by the control plane.
 */
export interface FundingVerification {
  readonly fundingRequestId: string;
  readonly signature: string;
  readonly confirmedAt: string;
  readonly explorerUrl: string;
  readonly onchain: {
    readonly projectPda: string;
    readonly treasuryPda: string;
    readonly treasurySolBalance?: number;
    readonly projectAccountExists?: boolean;
    readonly projectAccountDataLength?: number;
    readonly balances?: Record<string, string | number>;
  };
}

/**
 * Alert item returned by the alerts center.
 */
export interface AlertItem {
  readonly alertKey: string;
  readonly id: string;
  readonly type: string;
  readonly severity: string;
  readonly state: string;
  readonly projectId: string | null;
  readonly projectName: string | null;
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly metadata?: Record<string, unknown> | null;
}

/**
 * Input payload used for SOL funding preparation.
 */
export interface PrepareSolFundingInput {
  readonly amount: string;
  readonly funderWalletAddress: string;
}

/**
 * Input payload used for USDC funding preparation.
 */
export interface PrepareUsdcFundingInput extends PrepareSolFundingInput {
  readonly funderTokenAccount?: string;
}

/**
 * Input payload used to verify a submitted funding transaction.
 */
export interface VerifyFundingInput {
  readonly fundingRequestId: string;
  readonly signature: string;
}

/**
 * Error thrown by the SDK for HTTP, network, and timeout failures.
 */
export class FyxvoError extends Error {
  /**
   * Creates a typed Fyxvo SDK error.
   */
  constructor(
    message: string,
    readonly code: string,
    readonly statusCode?: number,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "FyxvoError";
  }
}

/**
 * Error thrown when the Fyxvo API returns a non-2xx response.
 */
export class FyxvoApiError extends FyxvoError {
  /**
   * Creates a response error.
   */
  constructor(message: string, statusCode: number, code = "api_error", details?: unknown) {
    super(message, code, statusCode, details);
    this.name = "FyxvoApiError";
  }
}

/**
 * Error thrown when the request fails before a response is received.
 */
export class FyxvoNetworkError extends FyxvoError {
  /**
   * Creates a network error.
   */
  constructor(message: string, details?: unknown) {
    super(message, "network_error", undefined, details);
    this.name = "FyxvoNetworkError";
  }
}

/**
 * Error thrown when a request exceeds the configured timeout.
 */
export class FyxvoTimeoutError extends FyxvoError {
  /**
   * Creates a timeout error for the configured timeout window.
   */
  constructor(timeoutMs: number) {
    super(`The request exceeded the timeout of ${timeoutMs}ms.`, "timeout_error");
    this.name = "FyxvoTimeoutError";
  }
}

/**
 * Type guard for Fyxvo SDK errors.
 */
export function isFyxvoError(error: unknown): error is FyxvoError {
  return error instanceof FyxvoError;
}

function buildUrl(
  baseUrl: string,
  path = "/",
  query?: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `fyxvo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

class FyxvoHttpClient {
  protected readonly fetcher: typeof fetch;
  protected readonly timeoutMs: number;
  protected readonly defaultHeaders: Headers;
  protected readonly baseUrl: string;

  constructor(options: BaseClientOptions, authHeaders?: HeadersInit) {
    this.fetcher = options.fetcher ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.defaultHeaders = new Headers(options.headers);
    this.baseUrl = options.baseUrl;

    if (authHeaders) {
      new Headers(authHeaders).forEach((value, key) => this.defaultHeaders.set(key, value));
    }
  }

  protected async send<TResponse, TBody = unknown>({
    method = "GET",
    path = "/",
    query,
    body,
    headers,
    signal,
  }: RequestOptions<TBody>): Promise<TResponse> {
    const url = buildUrl(this.baseUrl, path, query);
    const requestHeaders = new Headers(this.defaultHeaders);

    if (headers) {
      new Headers(headers).forEach((value, key) => requestHeaders.set(key, value));
    }

    if (body !== undefined && !requestHeaders.has("content-type")) {
      requestHeaders.set("content-type", "application/json");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("fyxvo-timeout"), this.timeoutMs);
    const forwardAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      const response = await this.fetcher(url, {
        method,
        headers: requestHeaders,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      if (!response.ok) {
        const details = await parseResponseBody(response);
        const responseCode =
          typeof details === "object" && details !== null && "code" in details && typeof details.code === "string"
            ? details.code
            : "api_error";
        throw new FyxvoApiError(
          `Request to ${url.toString()} failed with status ${response.status}.`,
          response.status,
          responseCode,
          details
        );
      }

      if (response.status === 204) {
        return undefined as TResponse;
      }

      return (await parseResponseBody(response)) as TResponse;
    } catch (error: unknown) {
      if (error instanceof FyxvoError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw signal?.aborted
          ? new FyxvoNetworkError("The request was aborted.", error)
          : new FyxvoTimeoutError(this.timeoutMs);
      }

      throw new FyxvoNetworkError(
        error instanceof Error ? error.message : "The request failed before a response was received.",
        error
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
}

/**
 * Low-level gateway client for authenticated relay traffic.
 */
export class FyxvoGatewayClient extends FyxvoHttpClient {
  /**
   * Creates a gateway client.
   */
  constructor(options: FyxvoGatewayClientOptions) {
    super(options, { "x-api-key": options.apiKey });
  }

  /**
   * Sends a raw authenticated request to the gateway.
   */
  request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
    return this.send<TResponse, TBody>(options);
  }

  /**
   * Sends a standard JSON-RPC request through `/rpc`.
   */
  rpc<TResult, TParams = unknown>(
    payload: RpcRequest<TParams>,
    options: Omit<RequestOptions<{ jsonrpc: "2.0"; id: string | number; method: string; params: unknown }>, "method" | "body"> = {}
  ): Promise<RpcResponse<TResult>> {
    const requestId = payload.id ?? createRequestId();
    return this.send<RpcResponse<TResult>>({
      ...options,
      method: "POST",
      path: options.path ?? "/rpc",
      body: {
        jsonrpc: "2.0",
        id: requestId,
        method: payload.method,
        params: payload.params ?? [],
      },
    });
  }

  /**
   * Sends a priority JSON-RPC request through `/priority`.
   */
  priorityRpc<TResult, TParams = unknown>(
    payload: RpcRequest<TParams>,
    options: Omit<RequestOptions<{ jsonrpc: "2.0"; id: string | number; method: string; params: unknown }>, "method" | "body"> = {}
  ): Promise<RpcResponse<TResult>> {
    return this.rpc<TResult, TParams>(payload, {
      ...options,
      path: options.path ?? "/priority",
    });
  }

  /**
   * Reads the gateway health endpoint.
   */
  getHealth(): Promise<HealthResponse> {
    return this.send<HealthResponse>({ path: "/health" });
  }

  /**
   * Reads the gateway public status endpoint.
   */
  getStatus(): Promise<GatewayStatusResponse> {
    return this.send<GatewayStatusResponse>({ path: "/v1/status" });
  }
}

/**
 * Low-level authenticated control-plane client.
 */
export class FyxvoApiClient extends FyxvoHttpClient {
  /**
   * Creates a control-plane API client.
   */
  constructor(options: FyxvoApiClientOptions) {
    super(options, { Authorization: `Bearer ${options.jwtToken}` });
  }

  /**
   * Sends a raw authenticated request to the control-plane API.
   */
  request<TResponse, TBody = unknown>(options: RequestOptions<TBody>): Promise<TResponse> {
    return this.send<TResponse, TBody>(options);
  }

  /**
   * Lists every project accessible to the authenticated user.
   */
  async listProjects<TProject extends ProjectRecord = ProjectRecord>(): Promise<TProject[]> {
    const response = await this.send<{ items: TProject[] }>({ path: "/v1/projects" });
    return response.items;
  }

  /**
   * Fetches a single project by project id.
   */
  async getProject<TProject extends ProjectRecord = ProjectRecord>(projectId: string): Promise<TProject> {
    const response = await this.send<{ item: TProject }>({ path: `/v1/projects/${projectId}` });
    return response.item;
  }

  /**
   * Creates a project and returns its activation payload.
   */
  createProject<TProject extends ProjectRecord = ProjectRecord>(
    input: CreateProjectInput
  ): Promise<CreateProjectResult<TProject>> {
    return this.send<CreateProjectResult<TProject>>({
      method: "POST",
      path: "/v1/projects",
      body: input,
    });
  }

  /**
   * Lists API keys for a project.
   */
  async listApiKeys<TApiKey extends ApiKeyRecord = ApiKeyRecord>(projectId: string): Promise<TApiKey[]> {
    const response = await this.send<{ items: TApiKey[] }>({
      path: `/v1/projects/${projectId}/api-keys`,
    });
    return response.items;
  }

  /**
   * Creates a new API key for a project.
   */
  createApiKey<TApiKey extends ApiKeyRecord = ApiKeyRecord>(
    projectId: string,
    input: CreateApiKeyInput
  ): Promise<CreateApiKeyResult<TApiKey>> {
    return this.send<CreateApiKeyResult<TApiKey>>({
      method: "POST",
      path: `/v1/projects/${projectId}/api-keys`,
      body: input,
    });
  }

  /**
   * Revokes an API key for a project.
   */
  revokeApiKey(projectId: string, apiKeyId: string): Promise<void> {
    return this.send<void>({
      method: "DELETE",
      path: `/v1/projects/${projectId}/api-keys/${apiKeyId}`,
    });
  }

  /**
   * Fetches the authenticated analytics overview.
   */
  async getAnalyticsOverview<TOverview extends AnalyticsOverview = AnalyticsOverview>(): Promise<TOverview> {
    const response = await this.send<{ item: TOverview }>({ path: "/v1/analytics/overview" });
    return response.item;
  }

  /**
   * Fetches project-level analytics for a selected range.
   */
  async getProjectAnalytics<TAnalytics extends ProjectAnalytics = ProjectAnalytics>(
    projectId: string,
    range?: "1h" | "6h" | "24h" | "7d" | "30d"
  ): Promise<TAnalytics> {
    const response = await this.send<{ item: TAnalytics }>({
      path: `/v1/analytics/projects/${projectId}`,
      ...(range ? { query: { range } } : {}),
    });
    return response.item;
  }

  /**
   * Prepares a SOL funding transaction for a project.
   */
  async prepareSOLFunding<TFunding extends FundingPreparation = FundingPreparation>(
    projectId: string,
    input: PrepareSolFundingInput
  ): Promise<TFunding> {
    const response = await this.send<{ item: TFunding }>({
      method: "POST",
      path: `/v1/projects/${projectId}/funding/prepare`,
      body: {
        asset: "SOL",
        amount: input.amount,
        funderWalletAddress: input.funderWalletAddress,
      },
    });
    return response.item;
  }

  /**
   * Prepares a USDC funding transaction for a project.
   */
  async prepareUSDCFunding<TFunding extends FundingPreparation = FundingPreparation>(
    projectId: string,
    input: PrepareUsdcFundingInput
  ): Promise<TFunding> {
    const response = await this.send<{ item: TFunding }>({
      method: "POST",
      path: `/v1/projects/${projectId}/funding/prepare`,
      body: {
        asset: "USDC",
        amount: input.amount,
        funderWalletAddress: input.funderWalletAddress,
        ...(input.funderTokenAccount ? { funderTokenAccount: input.funderTokenAccount } : {}),
      },
    });
    return response.item;
  }

  /**
   * Verifies a submitted funding transaction.
   */
  async verifyFunding<TVerification extends FundingVerification = FundingVerification>(
    projectId: string,
    input: VerifyFundingInput
  ): Promise<TVerification> {
    const response = await this.send<{ item: TVerification }>({
      method: "POST",
      path: `/v1/projects/${projectId}/funding/verify`,
      body: input,
    });
    return response.item;
  }

  /**
   * Lists alert center items for the authenticated user.
   */
  async listAlerts<TAlert extends AlertItem = AlertItem>(): Promise<TAlert[]> {
    const response = await this.send<{ items: TAlert[] }>({ path: "/v1/alerts" });
    return response.items;
  }

  /**
   * Marks an alert as acknowledged.
   */
  acknowledgeAlert(alertKey: string, projectId?: string | null): Promise<{ ok: true }> {
    return this.send<{ ok: true }>({
      method: "PATCH",
      path: `/v1/alerts/${encodeURIComponent(alertKey)}`,
      body: {
        state: "acknowledged",
        projectId: projectId ?? null,
      },
    });
  }

  /**
   * Marks an alert as resolved.
   */
  resolveAlert(alertKey: string, projectId?: string | null): Promise<{ ok: true }> {
    return this.send<{ ok: true }>({
      method: "PATCH",
      path: `/v1/alerts/${encodeURIComponent(alertKey)}`,
      body: {
        state: "resolved",
        projectId: projectId ?? null,
      },
    });
  }

  /**
   * Fetches public network totals from the control plane.
   */
  getNetworkStats<TStats extends NetworkStats = NetworkStats>(): Promise<TStats> {
    return this.send<TStats>({ path: "/v1/network/stats" });
  }

  /**
   * Reads the control-plane health endpoint.
   */
  getHealth(): Promise<HealthResponse> {
    return this.send<HealthResponse>({ path: "/health" });
  }

  /**
   * Reads the public control-plane status endpoint.
   */
  getStatus(): Promise<ApiStatusResponse> {
    return this.send<ApiStatusResponse>({ path: "/v1/status" });
  }
}

/**
 * Creates a low-level gateway client for relay access.
 */
export function createFyxvoClient(options: FyxvoGatewayClientOptions): FyxvoGatewayClient {
  return new FyxvoGatewayClient(options);
}

/**
 * Creates an authenticated control-plane API client.
 */
export function createFyxvoApiClient(options: FyxvoApiClientOptions): FyxvoApiClient {
  return new FyxvoApiClient(options);
}
