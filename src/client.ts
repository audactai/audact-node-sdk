/**
 * Audact TypeScript SDK — AudactClient
 *
 * Fetch-based HTTP client for the Audact API with full TypeScript type safety,
 * dual ESM + CJS output, and streaming support for LLM proxy calls.
 *
 * Service port defaults:
 *   Validator       :8082
 *   Evidence Layer  :8083
 *   LLM Proxy       :8084
 *   Tenant Mgmt     :8085
 */

import type {
  ACVFRequest,
  ACVFResponse,
  AdminAggregateRequest,
  AdminAggregateResponse,
  Agent,
  Article50Report,
  AdmissionUrlResponse,
  AssignNumberRequest,
  AttachToolRequest,
  AttachToolResponse,
  AudactClientOptions,
  AudioReconciliationRequest,
  AudioReconciliationResponse,
  BrowserCallRequest,
  BrowserCallResponse,
  BYOConnection,
  ByoConfig,
  C2PAManifest,
  C2PAManifestListResponse,
  ListC2PAManifestsOptions,
  CalComEventType,
  CalcomOauthCallbackOptions,
  CalcomOauthStartOptions,
  CalcomOauthStartResponse,
  ChatMessage,
  ChainResponse,
  Connection,
  ConfirmDeliveryRequest,
  ConfirmDeliveryResponse,
  CallStatusResponse,
  CallingHoursCheckResponse,
  CheckCallingHoursOptions,
  CreateAgentRequest,
  CreateAgentResponse,
  CreateBYOConnectionRequest,
  CreateConfigurationRequest,
  CreateConnectionRequest,
  CreateDispatchRuleRequest,
  CreateDispatchRuleResponse,
  CreateInboundTrunkRequest,
  CreateInboundTrunkResponse,
  CreateKYCDocumentSetRequest,
  CreateNumberOrderRequest,
  CreateNumberRequest,
  CreateOutboundTrunkRequest,
  CreateOutboundTrunkResponse,
  CreateTenantRequest,
  CreateTenantResponse,
  CreateToolRequest,
  CreateVoiceOptions,
  CreateVoiceResponse,
  CreateWebhookRequest,
  CreateWebhookResponse,
  CreateWsTicketResponse,
  CallDetail,
  CallSummary,
  DeleteAgentResponse,
  DeleteConnectionOptions,
  DeleteConnectionResponse,
  DeleteToolResponse,
  DetachToolResponse,
  EvaluatePolicyRequest,
  EvaluatePolicyResponse,
  ExchangeKeyResponse,
  FinalizeScoreRequest,
  FinalizeScoreResponse,
  GenerateKeyRequest,
  GenerateKeyResponse,
  GetArticle50ReportOptions,
  GetCallsResponse,
  GetEvidenceExportOptions,
  GetPolicyResponse,
  GetReceiptResponse,
  GetMetachainOptions,
  GetTenantUsageOptions,
  GetViolationsResponse,
  HandoverRequest,
  HandoverResponse,
  HandoverStateResponse,
  HangupResponse,
  HealthResponse,
  InboundCallRequest,
  InboundCallResponse,
  KYCDocument,
  KYCDocumentSet,
  ListAgentsOptions,
  ListAgentsResponse,
  ListAgentToolsOptions,
  ListAgentToolsResponse,
  ListAvailableNumbersResponse,
  ListByoConnectionsOptions,
  ListByoConnectionsResponse,
  ListCallsOptions,
  ListComplianceEventsOptions,
  ListComplianceEventsResponse,
  ListConfigurationsResponse,
  ListConnectionEventTypesResponse,
  ListConnectionsOptions,
  ListConnectionsResponse,
  ListDispatchRulesOptions,
  ListDispatchRulesResponse,
  ListKeysResponse,
  ListKYCDocumentSetsResponse,
  ListKYCDocumentsResponse,
  ListKYCRequirementsResponse,
  ListNumberOrdersResponse,
  ListNumbersOptions,
  ListNumbersResponse,
  ListProofsOptions,
  ListToolsOptions,
  ListToolsResponse,
  ListTrunksOptions,
  ListTrunksResponse,
  ListViolationsOptions,
  ListVoicesParams,
  ListVoicesResponse,
  ListWebhookDeliveriesOptions,
  ListWebhookDeliveriesResponse,
  ListWebhookEventTypesResponse,
  ListWebhooksOptions,
  ListWebhooksResponse,
  MetaChainResponse,
  NumberOrder,
  OrgCreateTenantRequest,
  OrgCreateTenantResponse,
  OrgGetTenantResponse,
  OrgImpersonateTenantResponse,
  OrgInitializeTenantResponse,
  OrgIssueTenantKeyRequest,
  OrgIssueTenantKeyResponse,
  OrgKYCPatchRequest,
  OrgKYCResponse,
  OrgListTenantsOptions,
  OrgListTenantsResponse,
  OrgLoginRequest,
  OrgLoginResponse,
  OrgProfileResponse,
  OrgRefreshResponse,
  OrgSignupRequest,
  OrgSignupResponse,
  OrgTenantActionResponse,
  OrgUpdateProfileRequest,
  OutboundCallRequest,
  OutboundCallResponse,
  PatchAgentRequest,
  PhoneNumber,
  PipelineStatusResponse,
  PostEventRequest,
  PostEventResponse,
  ProofListResponse,
  ProofResponse,
  ProxyChatResponse,
  ReconcileAudioOptions,
  ReconcileTranscriptRequest,
  ReconcileTranscriptResponse,
  ReconstructResponse,
  RecordingResponse,
  RefreshTokenResponse,
  ResendWebhookDeliveryResponse,
  RotateKycDekResponse,
  RotateWebhookSecretResponse,
  ServiceURLs,
  SetAdmissionUrlRequest,
  SetNumberTrunkRequest,
  Tenant,
  TenantConfiguration,
  TestConnectionResponse,
  TestToolResponse,
  TestWebhookResponse,
  ToolConfig,
  TransferRequest,
  TransferResponse,
  TransferSessionResponse,
  TransferStateResponse,
  TurnDeliveryStatus,
  UpdateAgentRequest,
  UpdateBYOConnectionRequest,
  UpdateConfigurationRequest,
  UpdateTenantRequest,
  UpdateToolRequest,
  UpdateWebhookRequest,
  UsageRecord,
  ValidateAudioRequest,
  ValidateAudioResponse,
  VerifyChainResponse,
  VerifyInclusionRequest,
  VerifyInclusionResponse,
  Voice,
  WebhookEndpoint,
  WebhookEventSchema,
  WebhookSecretStatusResponse,
  AddKBExclusionRequest,
  AddKBSourceRequest,
  CreateKnowledgeBaseRequest,
  KBAgentLink,
  KBCrawlExclusion,
  KBSource,
  KBTestRetrievalRequest,
  KBTestRetrievalResponse,
  KnowledgeBase,
  ListKBAgentLinksResponse,
  ListKBExclusionsResponse,
  ListKBSourcesResponse,
  ListKnowledgeBasesOptions,
  ListKnowledgeBasesResponse,
  PatchKBAgentLinkRequest,
  PatchKBSourceRequest,
  PatchKnowledgeBaseRequest,
  PutKBAgentLinkRequest,
  UploadKBSourceFileOptions,
} from "./types.js";

import { PlatformClient } from "./platform.js";
import { PIIClient } from "./pii.js";
import { AudactError, BaseServiceClient, DEFAULT_TIMEOUT_MS } from "./base.js";

export type { APIErrorBody } from "./types.js";
export { PlatformClient, PlatformOrgClient } from "./platform.js";
export { AudactError, BaseServiceClient } from "./base.js";

// ─── Default service URLs ────────────────────────────────────────────────────

const DEFAULT_URLS: Required<ServiceURLs> = {
  validator: "http://localhost:8082",
  evidence: "http://localhost:8083",
  llmProxy: "http://localhost:8084",
  tenantManagement: "http://localhost:8085",
  // Platform-admin export/import routes are served by Tenant Management,
  // not a separate service — same default host.
  platform: "http://localhost:8085",
  voiceGateway: "http://localhost:8088",
  agentWorker: "http://localhost:8089",
  orgManagement: "http://localhost:8092",
  aggregator: "http://localhost:8087",
  audioValidator: "http://localhost:8086",
  policyEngine: "http://localhost:8081",
};

/**
 * Normalizes a public base URL: strips trailing "/" (repeated), then a
 * trailing "/v1", then any trailing "/". Sub-clients append `/v1/...` themselves.
 */
export function normalizeBaseUrl(u: string): string {
  let r = u.replace(/\/+$/, "");
  if (r.endsWith("/v1")) r = r.slice(0, -3);
  return r.replace(/\/+$/, "");
}

// ─── AudactClient ────────────────────────────────────────────────────────────

/**
 * `AudactClient` is the main entry point for the Audact TypeScript SDK.
 *
 * It exposes one namespaced accessor per Audact service:
 *
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * // Validator
 * const result = await client.validator.validate({ ... });
 *
 * // Evidence Layer
 * const receipt = await client.evidence.postEvent({ ... });
 *
 * // Tenant Management
 * const tenant = await client.tenants.create({ name: "Acme Corp" });
 *
 * // LLM Proxy (streaming)
 * for await (const chunk of client.llmProxy.proxyStream({ ... })) {
 *   process.stdout.write(chunk);
 * }
 * ```
 *
 * All methods throw {@link AudactError} on non-2xx responses or network
 * failures.
 */
export class AudactClient {
  private readonly apiKey: string;
  private readonly urls: Required<ServiceURLs>;
  private readonly timeoutMs: number;

  /** Validation pipeline API (Validator service, port 8082). */
  public readonly validator: ValidatorClient;

  /** Evidence write/read/verify API (Evidence Layer service, port 8083). */
  public readonly evidence: EvidenceClient;

  /**
   * PII vault: shred, decrypt, identities, exemptions (Evidence Layer, port
   * 8083) and the encryption switch at `client.pii.settings` (Tenant
   * Management, port 8085).
   */
  public readonly pii: PIIClient;

  /** LLM proxy with compliance validation (LLM Proxy service, port 8084). */
  public readonly llmProxy: LLMProxyClient;

  /** Tenant, API key, and configuration management (Tenant Management service, port 8085). */
  public readonly tenants: TenantClient;

  /**
   * Platform-admin cross-tenant export/import API (Tenant Management
   * service, port 8085). Requires a platform admin token (never a tenant
   * API key) passed as this client's `apiKey`.
   *
   * Also exposes `client.platform.orgs` — the platform-admin org-management
   * surface (organizations verify/reject/list, org_admin recovery; org
   * Management service, port 8092). That surface uses `PlatformBearer`, a
   * pre-minted Ed25519 token distinct from this `apiKey`: pass it via
   * `AudactClientOptions.platformToken`, or call
   * `client.platform.orgs.setAuthToken(token)` directly. The SDK never
   * mints this token itself.
   */
  public readonly platform: PlatformClient;

  /**
   * KYC document/set + number-provisioning API (Voice Gateway service, port
   * 8088). No `tenant_id` argument on any method — the tenant is always
   * resolved from the authenticated API key (SEC-027).
   */
  public readonly numbers: NumbersClient;

  /**
   * SIP call lifecycle API — outbound/inbound/browser call initiation,
   * hangup, status polling, warm handovers, and transfers (Voice Gateway
   * service, port 8088).
   */
  public readonly calls: CallsClient;

  /**
   * Webhook endpoint management API — CRUD, test-ping, delivery history +
   * dead-letter resend, event-type/schema discovery, and HMAC signing-secret
   * status/rotation (Tenant Management service, port 8085 — every
   * `/v1/webhooks*` route is served alongside tenants/configurations).
   */
  public readonly webhooks: WebhooksClient;

  /**
   * Voice agent lifecycle API — agent CRUD, duplication, TTS voice catalog
   * CRUD, and pipeline-load status (Agent Worker service, port 8089).
   */
  public readonly agents: AgentsClient;

  /**
   * Custom function-calling tool CRUD + agent-tool attachment API (Agent
   * Worker service, port 8089 — `/v1/tools*` and `/v1/agents/{id}/tools*`
   * are served alongside `/v1/agents`).
   */
  public readonly tools: ToolsClient;

  /**
   * Knowledge-base (RAG) API — KB CRUD, source ingestion, agent links with
   * retrieval tuning, crawl exclusions, and the retrieval test harness
   * (Tenant Management service, port 8085 — `/v1/knowledge-bases*` is
   * served by the same service).
   */
  public readonly knowledgeBases: KnowledgeBasesClient;

  /**
   * Cal.com integration connection management API — bring-your-own-account
   * (API-key) and OAuth connections, health checks, and event-type discovery
   * (Agent Worker service, port 8089 — `/v1/integrations*` is served
   * alongside `/v1/agents`/`/v1/tools`).
   */
  public readonly integrations: IntegrationsClient;

  /**
   * Org self-service API — signup/login/refresh/logout and org
   * profile/KYC management (Org Management service, port 8092). Uses
   * `OrgBearer`, not the tenant API key: `login()`/`signup()` are public and
   * store the returned access token on this sub-client automatically;
   * subsequent `client.org.*` calls send it as `Authorization: Bearer
   * <jwt>`. Pass `options.orgToken` to start pre-authenticated instead.
   */
  public readonly org: OrgClient;

  /**
   * Merkle aggregation proofs, public meta-chain, and offline inclusion
   * verification (Aggregator service, port 8087). `getMetachain()` and
   * `verifyInclusion()` are public endpoints; `listProofs()`/`getProof()`
   * require the tenant API key; `triggerAggregation()` additionally
   * requires the owner role.
   */
  public readonly aggregation: AggregationClient;

  /**
   * Compliance policy evaluation, jurisdiction policy documents, and the
   * calling-hours pre-check (Policy Engine service, port 8081).
   */
  public readonly policy: PolicyClient;

  /**
   * Synchronous per-turn audio validation and post-call audio-to-transcript
   * reconciliation (Audio Validator service, port 8086).
   */
  public readonly audio: AudioClient;

  /**
   * API-key ↔ JWT session bridge for dashboard-style clients (Tenant
   * Management service, port 8085): exchange a tenant API key for a
   * short-lived access token, then rotate it via the httpOnly refresh-token
   * cookie the server sets on both calls.
   */
  public readonly auth: AuthClient;

  constructor(options: AudactClientOptions) {
    this.apiKey = options.apiKey;
    const hostUrls: Partial<ServiceURLs> = {};
    if (options.baseUrl !== undefined && options.baseUrl !== "") {
      const host = normalizeBaseUrl(options.baseUrl);
      for (const key of Object.keys(DEFAULT_URLS) as (keyof ServiceURLs)[]) {
        hostUrls[key] = host;
      }
    }
    this.urls = {
      ...DEFAULT_URLS,
      ...hostUrls,
      ...options.serviceUrls,
    };
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    this.validator = new ValidatorClient(
      this.urls.validator,
      this.apiKey,
      this.timeoutMs,
    );
    this.evidence = new EvidenceClient(
      this.urls.evidence,
      this.apiKey,
      this.timeoutMs,
    );
    this.pii = new PIIClient(
      this.urls.evidence,
      this.apiKey,
      this.timeoutMs,
      this.urls.tenantManagement,
    );
    this.llmProxy = new LLMProxyClient(
      this.urls.llmProxy,
      this.apiKey,
      this.timeoutMs,
    );
    this.tenants = new TenantClient(
      this.urls.tenantManagement,
      this.apiKey,
      this.timeoutMs,
    );
    this.platform = new PlatformClient(
      this.urls.platform,
      this.apiKey,
      this.timeoutMs,
      this.urls.orgManagement,
    );
    if (options.platformToken !== undefined) {
      this.platform.orgs.setAuthToken(options.platformToken);
    }
    this.numbers = new NumbersClient(
      this.urls.voiceGateway,
      this.apiKey,
      this.timeoutMs,
    );
    this.calls = new CallsClient(
      this.urls.voiceGateway,
      this.apiKey,
      this.timeoutMs,
    );
    this.webhooks = new WebhooksClient(
      this.urls.tenantManagement,
      this.apiKey,
      this.timeoutMs,
    );
    this.agents = new AgentsClient(
      this.urls.agentWorker,
      this.apiKey,
      this.timeoutMs,
    );
    this.tools = new ToolsClient(
      this.urls.agentWorker,
      this.apiKey,
      this.timeoutMs,
    );
    this.knowledgeBases = new KnowledgeBasesClient(
      this.urls.tenantManagement,
      this.apiKey,
      this.timeoutMs,
    );
    this.integrations = new IntegrationsClient(
      this.urls.agentWorker,
      this.apiKey,
      this.timeoutMs,
    );
    this.org = new OrgClient(
      this.urls.orgManagement,
      this.apiKey,
      this.timeoutMs,
    );
    if (options.orgToken !== undefined) {
      this.org.setAuthToken(options.orgToken);
    }
    this.aggregation = new AggregationClient(
      this.urls.aggregator,
      this.apiKey,
      this.timeoutMs,
    );
    this.policy = new PolicyClient(
      this.urls.policyEngine,
      this.apiKey,
      this.timeoutMs,
    );
    this.audio = new AudioClient(
      this.urls.audioValidator,
      this.apiKey,
      this.timeoutMs,
    );
    this.auth = new AuthClient(
      this.urls.tenantManagement,
      this.apiKey,
      this.timeoutMs,
    );
  }
}

// ─── ValidatorClient ─────────────────────────────────────────────────────────

/**
 * Client for the Audact Validator service (port 8082).
 *
 * The Validator applies the seven-check ACVF compliance pipeline within a
 * 40ms hard deadline, returning a verdict of ALLOW, BLOCK, or MODIFY.
 */
export class ValidatorClient extends BaseServiceClient {
  /**
   * Validates a single conversation turn through the ACVF pipeline.
   *
   * @param req - The ACVF request containing the turn content, call context,
   *              and tenant/config identifiers.
   * @returns The validation result, including the verdict, (optionally) modified
   *          content, per-check results, compliance score, and compliance receipt.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const result = await client.validator.validate({
   *   call_id: "a1b2c3d4-...",
   *   tenant_id: "t1t2t3...",
   *   config_id: "c1c2c3...",
   *   turn: 1,
   *   content: "Hello, I am an AI assistant calling on behalf of Acme Corp.",
   *   context: {
   *     previous_turns: [],
   *     call_state: { disclosure_delivered: false },
   *   },
   * });
   * if (result.verdict === "BLOCK") {
   *   // Use your own fallback response.
   * }
   * ```
   */
  async validate(req: ACVFRequest): Promise<ACVFResponse> {
    return this.request<ACVFResponse>("POST", "/v1/validate", req);
  }

  /**
   * Computes the aggregate compliance score for a completed call and emits a
   * `compliance.call_score_finalized` webhook event.
   *
   * Returns `{status: "finalized", composite_score, total_turns,
   * turns_with_violations, fail_open_count}` when the call had recorded
   * turns, or `{status: "skipped", composite_score: null}` when it had none.
   *
   * @param callId - UUID of the call.
   * @param req - Optional agent attribution.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async finalizeCallScore(
    callId: string,
    req: FinalizeScoreRequest = {},
  ): Promise<FinalizeScoreResponse> {
    return this.request<FinalizeScoreResponse>(
      "POST",
      `/v1/calls/${encodeURIComponent(callId)}/finalize-score`,
      req,
    );
  }

  /**
   * Returns the health status of the Validator service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── EvidenceClient ───────────────────────────────────────────────────────────

/**
 * Client for the Audact Evidence Layer service (port 8083).
 *
 * Writes append-only evidence events and provides chain verification and
 * reconstruction endpoints.
 */
export class EvidenceClient extends BaseServiceClient {
  /**
   * Writes an evidence event synchronously and returns a hash receipt.
   *
   * Idempotency is supported via the `Idempotency-Key` header: pass
   * `idempotencyKey` to deduplicate retried requests within a 5-minute window.
   *
   * @param req - Event payload. `tenant_id` must match the authenticated tenant.
   * @param idempotencyKey - Optional idempotency key (any unique string).
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const receipt = await client.evidence.postEvent({
   *   call_id: "a1b2c3d4-...",
   *   tenant_id: "t1t2t3...",
   *   event_type: "CALL_START",
   *   data: { phone: "HASHED_PHONE" },
   * }, "idem-key-123");
   * console.log(receipt.hash, receipt.sequence);
   * ```
   */
  async postEvent(
    req: PostEventRequest,
    idempotencyKey?: string,
  ): Promise<PostEventResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<PostEventResponse>(
      "POST",
      "/v1/events",
      req,
      headers,
    );
  }

  /**
   * Lists compliance events (validation results, including ALLOW, plus
   * violations and fail-opens) for the tenant,
   * cursor-paginated. Calls GET /v1/compliance/events.
   *
   * @param opts - Optional filters (eventSubtype, verdict, severity, callId, cursor, limit).
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listComplianceEvents(
    opts: ListComplianceEventsOptions = {},
  ): Promise<ListComplianceEventsResponse> {
    const params = new URLSearchParams();
    if (opts.eventSubtype !== undefined) params.set("event_subtype", opts.eventSubtype);
    if (opts.verdict !== undefined) params.set("verdict", opts.verdict);
    if (opts.severity !== undefined) params.set("severity", opts.severity);
    if (opts.callId !== undefined) params.set("call_id", opts.callId);
    if (opts.cursor !== undefined) params.set("cursor", opts.cursor);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    const query = params.toString();
    return this.request<ListComplianceEventsResponse>(
      "GET",
      query ? `/v1/compliance/events?${query}` : "/v1/compliance/events",
    );
  }

  /**
   * Retrieves the full evidence event chain for a call.
   *
   * **Route fixed 2026-09-15:** was `GET
   * /v1/events/{id}/chain` (404 — no such route is registered). Now calls
   * the correct `GET /v1/chains/{id}`.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getChain(callId: string): Promise<ChainResponse> {
    return this.request<ChainResponse>(
      "GET",
      `/v1/chains/${encodeURIComponent(callId)}`,
    );
  }

  /**
   * Verifies the integrity of the event chain for a call.
   *
   * **Route + shape fixed 2026-09-15:** was `POST
   * /v1/events/verify` with a `{call_id, tenant_id}` body (404 — no such
   * route is registered). Now calls the correct `GET /v1/verify/{call_id}`
   * — the tenant is derived from the authenticated API key, so no request
   * body is sent. **Breaking:** the method now takes `callId: string`
   * instead of a `VerifyChainRequest` object.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async verifyChain(callId: string): Promise<VerifyChainResponse> {
    return this.request<VerifyChainResponse>(
      "GET",
      `/v1/verify/${encodeURIComponent(callId)}`,
    );
  }

  /**
   * Reconstructs the event chain for a call from stored evidence.
   *
   * **Route + shape fixed 2026-09-15:** was `POST
   * /v1/events/reconstruct` with a `{call_id, tenant_id}` body (404 — no
   * such route is registered). Now calls the correct `GET
   * /v1/reconstruct/{call_id}` — the tenant is derived from the
   * authenticated API key, so no request body is sent. **Breaking:** the
   * method now takes `callId: string` instead of a `ReconstructRequest`
   * object.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async reconstruct(callId: string): Promise<ReconstructResponse> {
    return this.request<ReconstructResponse>(
      "GET",
      `/v1/reconstruct/${encodeURIComponent(callId)}`,
    );
  }

  // ── Calls ─────────────────────────────────────────────────────────────────

  /**
   * Lists calls for the authenticated tenant with optional filters on date,
   * status, verdict, shadow, and country.
   *
   * @param options - Optional query filters (date_from, date_to, status,
   *                  verdict, shadow, country, cursor, limit).
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listCalls(options: ListCallsOptions = {}): Promise<GetCallsResponse> {
    const params = new URLSearchParams();
    if (options.date_from !== undefined) params.set("date_from", options.date_from);
    if (options.date_to !== undefined) params.set("date_to", options.date_to);
    if (options.status !== undefined) params.set("status", options.status);
    if (options.verdict !== undefined) params.set("verdict", options.verdict);
    if (options.shadow !== undefined) params.set("shadow", String(options.shadow));
    if (options.country !== undefined) params.set("country", options.country);
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const query = params.toString();
    return this.request<GetCallsResponse>(
      "GET",
      query ? `/v1/calls?${query}` : "/v1/calls",
    );
  }

  /**
   * Returns the full detail of a single call: direction, status,
   * never-connected classification, timestamps, duration, metadata,
   * verbatim transcript, recording pointer/availability, and (when
   * available) the finalized compliance score.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 404 if the call does not exist for this tenant.
   */
  async getCallDetail(callId: string): Promise<CallDetail> {
    return this.request<CallDetail>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}`,
    );
  }

  /**
   * Returns a short-lived (15-minute) signed URL for the captured mixed call
   * audio.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 404 when the call has no recording
   *                       (record_calls was off, or it was already deleted).
   */
  async getCallRecording(callId: string): Promise<RecordingResponse> {
    return this.request<RecordingResponse>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/recording`,
    );
  }

  /**
   * Deletes the captured mixed call audio from object storage and clears the
   * recording pointer on the call (retention/GDPR). Idempotent: deleting a
   * call with no recording still succeeds. The evidence hash chain is never
   * modified.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 404 if the call does not exist for this tenant.
   */
  async deleteCallRecording(callId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/calls/${encodeURIComponent(callId)}/recording`,
    );
  }

  /**
   * Returns a composite view of a call: aggregated evidence event counts by
   * verdict, the latest warm-handover context (when the call triggered one),
   * and the end-of-call detection context (when the call recorded a
   * CALL_END_DETECTED event). Reduces 5 chained API calls to 1.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 404 if the call does not exist for this tenant.
   */
  async getCallSummary(callId: string): Promise<CallSummary> {
    return this.request<CallSummary>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/summary`,
    );
  }

  /**
   * Lists CHECK_RESULT evidence events where verdict != ALLOW, paginated.
   *
   * @param options - Optional query filters (call_id, date_from, date_to,
   *                  verdict, cursor, limit).
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listViolations(
    options: ListViolationsOptions = {},
  ): Promise<GetViolationsResponse> {
    const params = new URLSearchParams();
    if (options.call_id !== undefined) params.set("call_id", options.call_id);
    if (options.date_from !== undefined) params.set("date_from", options.date_from);
    if (options.date_to !== undefined) params.set("date_to", options.date_to);
    if (options.verdict !== undefined) params.set("verdict", options.verdict);
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const query = params.toString();
    return this.request<GetViolationsResponse>(
      "GET",
      query ? `/v1/violations?${query}` : "/v1/violations",
    );
  }

  // ── Article 50 evidence export ──────────────────────────────────────────────

  /**
   * Assembles and signs the per-call Article 50 evidence export —
   * disclosure & delivery attestation, configuration seal, compliance
   * receipts, evidence-chain integrity, cross-tenant Merkle branch proof, and
   * RFC 3161 TSA timestamp — bundled into a single ECDSA-P256-signed
   * envelope.
   *
   * @param callId - UUID of the call.
   * @param options - `format`: "json" (default) or "pdf". When "pdf" the
   *                  raw PDF bytes are still parsed as JSON by
   *                  {@link BaseServiceClient.request} — use
   *                  {@link requestRaw}-based helpers if you need the PDF
   *                  bytes directly.
   * @throws {AudactError} 422 if the call has not completed yet (no
   *                       CALL_END event); 503 if report signing is
   *                       unavailable.
   */
  async getArticle50Report(
    callId: string,
    options: GetArticle50ReportOptions = {},
  ): Promise<Article50Report> {
    const params = new URLSearchParams();
    if (options.format !== undefined) params.set("format", options.format);
    const query = params.toString();
    const path = `/v1/calls/${encodeURIComponent(callId)}/article50-report`;
    return this.request<Article50Report>(
      "GET",
      query ? `${path}?${query}` : path,
    );
  }

  /**
   * Downloads the Article 50 evidence export via a signed, unauthenticated
   * 7-day capability link. Possession of a valid, unexpired `token` IS the
   * authorisation — no Audact API key is sent.
   *
   * @param callId - UUID of the call (must match the token's embedded call_id).
   * @param token - Evidence-link capability token (`ev1.<payload>.<sig>`).
   * @param options - `format`: overrides the token's default format.
   * @throws {AudactError} 403 if the token signature is invalid or the
   *                       call_id does not match; 410 if the token expired.
   */
  async getEvidenceExport(
    callId: string,
    token: string,
    options: GetEvidenceExportOptions = {},
  ): Promise<Article50Report> {
    const params = new URLSearchParams({ token });
    if (options.format !== undefined) params.set("format", options.format);
    return this.request<Article50Report>(
      "GET",
      `/v1/evidence-exports/${encodeURIComponent(callId)}?${params.toString()}`,
    );
  }

  // ── C2PA content credentials ────────────────────────────────────────────────

  /**
   * Loads the call's evidence chain and produces a C2PA content credential
   * signed ES256 with an X.509 chain, returning the JSON summary (assertions,
   * asset binding, manifest-store reference, signing credential). Fails closed
   * with 503 when no signing credential is provisioned — there is no HMAC or
   * ephemeral-key fallback.
   *
   * @param callId - UUID of the call.
   * @param idempotencyKey - Optional Idempotency-Key. Every successful call
   *                         stores a new manifest permanently, so pass a key
   *                         to make retries safe.
   * @throws {AudactError} 404 if the call is unknown or not the tenant's;
   *                       503 if signing or storage is unavailable.
   */
  async generateC2PAManifest(
    callId: string,
    idempotencyKey?: string,
  ): Promise<C2PAManifest> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<C2PAManifest>(
      "POST",
      `/v1/calls/${encodeURIComponent(callId)}/c2pa`,
      undefined,
      headers,
    );
  }

  /**
   * Lists the call's C2PA manifests, newest first, cursor-paginated.
   *
   * @param callId - UUID of the call.
   * @param options - Optional `limit` and `cursor`.
   * @throws {AudactError} 404 if the call is unknown or not the tenant's.
   */
  async listC2PAManifests(
    callId: string,
    options: ListC2PAManifestsOptions = {},
  ): Promise<C2PAManifestListResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    const path = `/v1/calls/${encodeURIComponent(callId)}/c2pa`;
    return this.request<C2PAManifestListResponse>(
      "GET",
      query ? `${path}?${query}` : path,
    );
  }

  /**
   * Downloads the stored sidecar manifest store (`application/c2pa`) so it can
   * be verified independently, e.g.
   * `c2patool <asset> --external-manifest <file>.c2pa`.
   *
   * @throws {AudactError} 404 if the manifest is not this tenant's.
   */
  async downloadC2PAManifestStore(
    callId: string,
    manifestId: string,
  ): Promise<ArrayBuffer> {
    const response = await this.requestRaw(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/c2pa/${encodeURIComponent(manifestId)}/manifest.c2pa`,
    );
    return response.arrayBuffer();
  }

  /**
   * Downloads the asset the manifest is hard-bound to. Evidence exports are
   * served directly; recordings answer 302 to a presigned URL, which `fetch`
   * follows (the Authorization header is not forwarded cross-origin).
   *
   * @throws {AudactError} 404 if the manifest is not this tenant's or the
   *                       recording was deleted.
   */
  async downloadC2PAAsset(
    callId: string,
    manifestId: string,
  ): Promise<ArrayBuffer> {
    const response = await this.requestRaw(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/c2pa/${encodeURIComponent(manifestId)}/asset`,
    );
    return response.arrayBuffer();
  }

  /**
   * Fetches the PEM trust anchor (top certificate of the current signing
   * chain) for `c2patool --trust_anchors`. Public endpoint.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getC2PATrustAnchor(): Promise<string> {
    const response = await this.requestRaw("GET", "/v1/c2pa/trust-anchor");
    return response.text();
  }

  // ── Compliance receipts ─────────────────────────────────────────────────────

  /**
   * Retrieves a stored compliance receipt and verifies its HMAC-SHA256
   * signature server-side.
   *
   * The response's `verifiability` field distinguishes a receipt that
   * predates RECEIPT_HMAC_KEY provisioning (`hmac_valid` false but not
   * tampering) from a genuinely invalid signature.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 404 if no receipt is stored for this call.
   */
  async getReceipt(callId: string): Promise<GetReceiptResponse> {
    return this.request<GetReceiptResponse>(
      "GET",
      `/v1/receipts/${encodeURIComponent(callId)}`,
    );
  }

  // ── Delivery attestation ─────────────────────────────────────────────────────

  /**
   * Returns the per-turn delivery confirmation status array for a call. May
   * be empty when no confirmations have been processed yet.
   *
   * @param callId - UUID of the call.
   * @throws {AudactError} 403 if the call does not belong to the
   *                       authenticated tenant.
   */
  async getDeliveryStatus(callId: string): Promise<TurnDeliveryStatus[]> {
    return this.request<TurnDeliveryStatus[]>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/delivery`,
    );
  }

  /**
   * Submits a delivery confirmation signal, writing a DELIVERY_ATTESTATION
   * evidence event.
   *
   * @param req - Delivery confirmation payload.
   * @param idempotencyKey - Optional idempotency key; cached 2xx responses
   *                         are replayed for 24h.
   * @throws {AudactError} 409 if the validation event is not yet available
   *                       (retry after a short delay).
   */
  async confirmDelivery(
    req: ConfirmDeliveryRequest,
    idempotencyKey?: string,
  ): Promise<ConfirmDeliveryResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<ConfirmDeliveryResponse>(
      "POST",
      "/v1/delivery-confirmation",
      req,
      headers,
    );
  }

  // ── Transcript reconciliation ────────────────────────────────────────────────

  /**
   * Compares a post-call transcript segment-by-segment against validated
   * output events.
   *
   * @param req - Transcript reconciliation request (call_id, segments[], source).
   * @param idempotencyKey - Optional idempotency key; cached 2xx responses
   *                         are replayed for 24h.
   * @throws {AudactError} 403 if the call does not belong to the
   *                       authenticated tenant.
   */
  async reconcileTranscript(
    req: ReconcileTranscriptRequest,
    idempotencyKey?: string,
  ): Promise<ReconcileTranscriptResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<ReconcileTranscriptResponse>(
      "POST",
      "/v1/transcript-reconciliation",
      req,
      headers,
    );
  }

  // ── Verification (public, unauthenticated) ───────────────────────────────────

  /**
   * Fetches the ECDSA-P256 public key (PEM SubjectPublicKeyInfo) whose
   * key_id matches `kid`, so a third party can verify a signed Article 50
   * export offline.
   *
   * Unauthenticated: the public key is not a secret. Only the current
   * signing key is served; any other key_id returns 404. Sent as
   * `application/x-pem-file`, not JSON — the raw PEM text is returned
   * verbatim (not parsed as JSON) by reading the response body directly.
   *
   * @param kid - Key ID from the report's `signature.key_id`.
   * @throws {AudactError} 404 for an unknown key_id; 503 if no report-signing
   *                       key is provisioned.
   */
  async getArticle50PublicKey(kid: string): Promise<string> {
    const response = await this.requestRaw(
      "GET",
      `/v1/keys/${encodeURIComponent(kid)}`,
    );
    return response.text();
  }

  /**
   * Returns the health status of the Evidence Layer service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── Proxy options types ──────────────────────────────────────────────────────

/**
 * Options for {@link LLMProxyClient.proxyComplete}.
 *
 * Targets the OpenAI-compatible `/v1/proxy/openai` endpoint.
 * Pass `configurationId` to route the request through a specific tenant
 * configuration (appended as `?configuration_id=<uuid>`).
 */
export interface ProxyCompleteOptions {
  /** Target model identifier, e.g. `"gpt-4o"`. */
  model: string;
  /** Conversation messages to send to the upstream LLM. */
  messages: ChatMessage[];
  /** UUID of the tenant configuration to apply. When omitted the server uses the tenant default. */
  configurationId?: string;
  /** Optional system prompt prepended to the messages array. */
  systemPrompt?: string;
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** Sampling temperature (0–2). */
  temperature?: number;
}

/**
 * Options for {@link LLMProxyClient.proxyStream}.
 *
 * Targets the OpenAI-compatible `/v1/proxy/openai/stream` endpoint.
 * Pass `configurationId` to route the request through a specific tenant
 * configuration (appended as `?configuration_id=<uuid>`).
 */
export interface ProxyStreamOptions {
  /** Target model identifier, e.g. `"gpt-4o"`. */
  model: string;
  /** Conversation messages to send to the upstream LLM. */
  messages: ChatMessage[];
  /** UUID of the tenant configuration to apply. When omitted the server uses the tenant default. */
  configurationId?: string;
  /** Optional system prompt prepended to the messages array. */
  systemPrompt?: string;
  /** Maximum number of tokens to generate. */
  maxTokens?: number;
  /** Sampling temperature (0–2). */
  temperature?: number;
}

// ─── LLMProxyClient ───────────────────────────────────────────────────────────

/**
 * Client for the Audact LLM Proxy service (port 8084).
 *
 * The LLM Proxy forwards requests to upstream language model APIs, triggers
 * the compliance validation pipeline, and writes evidence events. It supports
 * both synchronous ({@link LLMProxyClient.proxyComplete}) and streaming
 * ({@link LLMProxyClient.proxyStream}) responses via the OpenAI-compatible
 * `/v1/proxy/openai`(`/stream`) routes.
 *
 * **Removed 2026-09-15:** `chat()`/`streamChat()` posted to
 * `/v1/proxy/chat`, a route that has never been registered by the LLM Proxy
 * router (a live 404). They duplicated {@link proxyComplete}/
 * {@link proxyStream}, which already call the correct route — use those
 * instead.
 */
export class LLMProxyClient extends BaseServiceClient {
  /**
   * Sends a non-streaming chat completion request to the OpenAI-compatible
   * `/v1/proxy/openai` endpoint and returns the fully-buffered response.
   *
   * When `options.configurationId` is provided it is appended as the
   * `configuration_id` query parameter so the server applies the specified
   * tenant configuration.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const response = await client.llmProxy.proxyComplete({
   *   model: "gpt-4o",
   *   messages: [{ role: "user", content: "Hello!" }],
   *   configurationId: "33333333-3333-3333-3333-333333333333",
   * });
   * ```
   */
  async proxyComplete(options: ProxyCompleteOptions): Promise<ProxyChatResponse> {
    const url = new URL(`${this.baseUrl}/v1/proxy/openai`);
    if (options.configurationId) {
      url.searchParams.set("configuration_id", options.configurationId);
    }
    const path = url.pathname + url.search;

    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
    };
    if (options.systemPrompt !== undefined) {
      body["system_prompt"] = options.systemPrompt;
    }
    if (options.maxTokens !== undefined) {
      body["max_tokens"] = options.maxTokens;
    }
    if (options.temperature !== undefined) {
      body["temperature"] = options.temperature;
    }

    return this.request<ProxyChatResponse>("POST", path, body);
  }

  /**
   * Sends a streaming chat completion request to the OpenAI-compatible
   * `/v1/proxy/openai/stream` endpoint and yields content chunks as they
   * arrive via server-sent events (SSE).
   *
   * When `options.configurationId` is provided it is appended as the
   * `configuration_id` query parameter so the server applies the specified
   * tenant configuration.
   *
   * The async generator yields raw string chunks. The final SSE event
   * `[DONE]` is consumed internally and not yielded.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors before streaming
   *                       begins.
   *
   * @example
   * ```ts
   * for await (const chunk of client.llmProxy.proxyStream({
   *   model: "gpt-4o",
   *   messages: [{ role: "user", content: "Hello!" }],
   *   configurationId: "33333333-3333-3333-3333-333333333333",
   * })) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  async *proxyStream(
    options: ProxyStreamOptions,
  ): AsyncGenerator<string, void, unknown> {
    const url = new URL(`${this.baseUrl}/v1/proxy/openai/stream`);
    if (options.configurationId) {
      url.searchParams.set("configuration_id", options.configurationId);
    }
    const path = url.pathname + url.search;

    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
    };
    if (options.systemPrompt !== undefined) {
      body["system_prompt"] = options.systemPrompt;
    }
    if (options.maxTokens !== undefined) {
      body["max_tokens"] = options.maxTokens;
    }
    if (options.temperature !== undefined) {
      body["temperature"] = options.temperature;
    }

    const response = await this.requestStream("POST", path, body);

    const streamBody = response.body;
    if (!streamBody) {
      return;
    }

    const reader = streamBody.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              return;
            }
            if (data) {
              try {
                const parsed = JSON.parse(data) as Record<string, unknown>;
                const content =
                  typeof parsed["content"] === "string"
                    ? parsed["content"]
                    : data;
                yield content;
              } catch {
                yield data;
              }
            }
          }
        }
      }

      const remaining = decoder.decode();
      if (remaining.trim()) {
        const trimmed = remaining.trim();
        if (trimmed.startsWith("data:")) {
          const data = trimmed.slice(5).trim();
          if (data && data !== "[DONE]") {
            yield data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Returns the health status of the LLM Proxy service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── TenantClient ─────────────────────────────────────────────────────────────

/**
 * Client for the Audact Tenant Management service (port 8085).
 *
 * Manages tenants, API keys, and tenant configurations.
 */
export class TenantClient extends BaseServiceClient {
  // ── Tenants ────────────────────────────────────────────────────────────────

  /**
   * Creates a new tenant and atomically provisions its first API key.
   *
   * The full API key is returned exactly once in the response (`api_key.key`).
   * Store it securely immediately — it cannot be retrieved again.
   *
   * Does NOT require authentication (bootstrap endpoint).
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const { tenant_id, api_key } = await client.tenants.create({
   *   name: "Acme Corp",
   *   plan: "professional",
   * });
   * console.log("Save this key now:", api_key.key);
   * ```
   */
  async create(req: CreateTenantRequest): Promise<CreateTenantResponse> {
    return this.request<CreateTenantResponse>("POST", "/v1/tenants", req);
  }

  /**
   * Retrieves a tenant by ID.
   *
   * @param tenantId - UUID of the tenant to retrieve.
   * @throws {AudactError} 401 if unauthenticated, 403 if wrong tenant, 404 if not found.
   */
  async get(tenantId: string): Promise<Tenant> {
    return this.request<Tenant>("GET", `/v1/tenants/${tenantId}`);
  }

  /**
   * Updates a tenant's name and/or plan.
   *
   * **Verb fixed 2026-09-15:** the router only registers
   * `PUT /v1/tenants/{tenant_id}` — `PATCH` returned 405.
   *
   * @param tenantId - UUID of the tenant to update.
   * @param req - Fields to update (name and/or plan).
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async update(tenantId: string, req: UpdateTenantRequest): Promise<Tenant> {
    return this.request<Tenant>("PUT", `/v1/tenants/${tenantId}`, req);
  }

  /**
   * Returns aggregated usage statistics for the tenant's current or a
   * specified billing period (call counts, evidence events, fail-opens, and
   * LLM token consumption).
   *
   * @param tenantId - UUID of the tenant.
   * @param options - Optional `period_start`/`period_end` (RFC3339) to
   *                  narrow the aggregation window.
   * @returns An all-zero {@link UsageRecord} (tenant_id/period populated)
   *          when no usage row exists yet for the requested period.
   * @throws {AudactError} 401/403 as appropriate.
   */
  async getTenantUsage(
    tenantId: string,
    options: GetTenantUsageOptions = {},
  ): Promise<UsageRecord> {
    const params = new URLSearchParams();
    if (options.period_start !== undefined) {
      params.set("period_start", options.period_start);
    }
    if (options.period_end !== undefined) {
      params.set("period_end", options.period_end);
    }
    const query = params.toString();
    const path = `/v1/tenants/${encodeURIComponent(tenantId)}/usage`;
    return this.request<UsageRecord>("GET", query ? `${path}?${query}` : path);
  }

  // ── API Keys ───────────────────────────────────────────────────────────────

  /**
   * Generates a new API key for the specified tenant.
   *
   * The full API key is returned exactly once in the response (`key`).
   * Store it securely immediately — it cannot be retrieved again.
   *
   * @param tenantId - UUID of the owning tenant.
   * @param req - Key label and optional role.
   * @throws {AudactError} 401 if unauthenticated, 403 if wrong tenant, 404 if not found.
   *
   * @example
   * ```ts
   * const newKey = await client.tenants.generateKey(tenantId, {
   *   name: "CI pipeline key",
   *   role: "developer",
   * });
   * console.log("Save this key now:", newKey.key);
   * ```
   */
  async generateKey(
    tenantId: string,
    req: GenerateKeyRequest,
  ): Promise<GenerateKeyResponse> {
    return this.request<GenerateKeyResponse>(
      "POST",
      `/v1/tenants/${tenantId}/keys`,
      req,
    );
  }

  /**
   * Lists all active API keys for the specified tenant.
   *
   * Raw key values are never returned; only the display prefix is included.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async listKeys(tenantId: string): Promise<ListKeysResponse> {
    return this.request<ListKeysResponse>(
      "GET",
      `/v1/tenants/${tenantId}/keys`,
    );
  }

  /**
   * Revokes an API key. Revoked keys cannot be used for authentication.
   *
   * @param tenantId - UUID of the owning tenant.
   * @param keyId - UUID of the key to revoke.
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async revokeKey(tenantId: string, keyId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/tenants/${tenantId}/keys/${keyId}`,
    );
  }

  // ── Configurations ─────────────────────────────────────────────────────────

  /**
   * Creates a new tenant configuration (blocklist, countries, etc.).
   *
   * Blocklist patterns with severity "modify" but no replacement_text are
   * automatically escalated to "block" by the server.
   *
   * @throws {AudactError} 400 on validation failure, 401/403 on auth failure.
   *
   * @example
   * ```ts
   * const config = await client.tenants.createConfiguration({
   *   tenant_id: tenantId,
   *   name: "Production v1",
   *   countries: ["NL", "DE"],
   *   blocklist_patterns: [
   *     {
   *       id: "price-claim",
   *       terms: ["guaranteed return", "risk-free"],
   *       severity: "block",
   *     },
   *   ],
   * });
   * console.log("config_id:", config.config_id);
   * ```
   */
  async createConfiguration(
    req: CreateConfigurationRequest,
  ): Promise<TenantConfiguration> {
    return this.request<TenantConfiguration>(
      "POST",
      "/v1/configurations",
      req,
    );
  }

  /**
   * Lists all configurations for the specified tenant.
   *
   * **Route fixed 2026-09-15:** was `GET
   * /v1/configurations?tenant_id={id}` (404 — the query-param form is not
   * registered). Now calls the correct `GET
   * /v1/tenants/{tenant_id}/configurations`. Note the path
   * `tenant_id` is ignored server-side — tenant identity is derived from the
   * authenticated API key — but is still required to build the URL.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async listConfigurations(
    tenantId: string,
  ): Promise<ListConfigurationsResponse> {
    return this.request<ListConfigurationsResponse>(
      "GET",
      `/v1/tenants/${encodeURIComponent(tenantId)}/configurations`,
    );
  }

  /**
   * Retrieves a single configuration by ID.
   *
   * @param configId - UUID of the configuration.
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async getConfiguration(configId: string): Promise<TenantConfiguration> {
    return this.request<TenantConfiguration>(
      "GET",
      `/v1/configurations/${configId}`,
    );
  }

  /**
   * Retrieves one immutable earlier version of a configuration —
   * the exact settings calls pinned to that version ran with, even after the
   * configuration has been edited. `version` is a receipt's `config_version`
   * or a `version` from `reconstruct()`'s `config_versions`. Same shape and
   * redaction as {@link getConfiguration}; `updated_at` equals `created_at`.
   *
   * @param configId - UUID of the configuration.
   * @param version - Configuration version (>= 1).
   * @throws {AudactError} 400/401/404 as appropriate (another tenant's
   *   configuration is 404).
   */
  async getConfigurationVersion(
    configId: string,
    version: number,
  ): Promise<TenantConfiguration> {
    return this.request<TenantConfiguration>(
      "GET",
      `/v1/configurations/${configId}/versions/${version}`,
    );
  }

  /**
   * Updates an existing configuration (name, countries, and/or blocklist patterns).
   *
   * **Verb fixed 2026-09-15:** the router only registers
   * `PUT /v1/configurations/{config_id}` — `PATCH` returned
   * 405.
   *
   * @param configId - UUID of the configuration to update.
   * @param req - Fields to update.
   * @throws {AudactError} 400/401/403/404 as appropriate.
   */
  async updateConfiguration(
    configId: string,
    req: UpdateConfigurationRequest,
  ): Promise<TenantConfiguration> {
    return this.request<TenantConfiguration>(
      "PUT",
      `/v1/configurations/${configId}`,
      req,
    );
  }

  /**
   * Deletes a tenant configuration.
   *
   * @param configId - UUID of the configuration to delete.
   * @throws {AudactError} 401/403/404 as appropriate.
   */
  async deleteConfiguration(configId: string): Promise<void> {
    return this.request<void>("DELETE", `/v1/configurations/${configId}`);
  }

  /**
   * Returns the health status of the Tenant Management service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── NumbersClient ────────────────────────────────────────────────────────────

/** Options accepted by {@link NumbersClient.uploadKycDocument}. */
export interface UploadKycDocumentOptions {
  /** Filename recorded for the upload. Passed through to the multipart part. */
  filename?: string;
  /** Optional idempotency key — same key returns the original document on replay. */
  idempotencyKey?: string;
}

/** Options accepted by {@link NumbersClient.replaceKycDocument}. */
export interface ReplaceKycDocumentOptions {
  /** Filename recorded for the replacement upload. */
  filename?: string;
  /** Optional idempotency key — same key returns 200 on replay. */
  idempotencyKey?: string;
}

/**
 * Client for the Audact Voice Gateway's number-provisioning API (port 8088):
 * KYC document upload/management, KYC document sets (Telnyx regulatory
 * requirement groups), and number orders.
 *
 * No method takes a `tenant_id` argument (SEC-027) — the tenant is always
 * resolved from the authenticated API key.
 *
 * `uploadKycDocument` and `replaceKycDocument` send `multipart/form-data`
 * bodies via the browser/Node `FormData` object — see {@link BaseServiceClient}'s
 * `request`, which omits `Content-Type` for a `FormData` body so `fetch` can
 * set the correct `multipart/form-data; boundary=...` value itself.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * // Upload a KYC document, then build a document set answering every
 * // Telnyx regulatory requirement for NL mobile numbers.
 * const doc = await client.numbers.uploadKycDocument(fileBlob, "passport");
 * const { requirements } = await client.numbers.getKycRequirements("NL", "mobile");
 * const set = await client.numbers.createKycDocumentSet({
 *   name: "NL mobile KYC",
 *   country_code: "NL",
 *   number_type: "mobile",
 *   items: requirements.map((r) => ({ requirement_id: r.id, document_id: doc.id })),
 * });
 *
 * // Once the set is approved, place a number order against it.
 * const order = await client.numbers.createNumberOrder({
 *   country_code: "NL",
 *   number_type: "mobile",
 *   set_id: set.id,
 * });
 * ```
 */
export class NumbersClient extends BaseServiceClient {
  // ── KYC documents ─────────────────────────────────────────────────────────

  /**
   * Lists metadata for every KYC document uploaded by the authenticated
   * tenant. Document bytes are never returned.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listKycDocuments(): Promise<ListKYCDocumentsResponse> {
    return this.request<ListKYCDocumentsResponse>("GET", "/v1/kyc/documents");
  }

  /**
   * Retrieves a single KYC document's metadata by ID.
   *
   * @param id - UUID of the KYC document.
   * @throws {AudactError} 404 if the document does not exist for this tenant.
   */
  async getKycDocument(id: string): Promise<KYCDocument> {
    return this.request<KYCDocument>(
      "GET",
      `/v1/kyc/documents/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Uploads a regulatory/KYC document file (multipart/form-data). Bytes are
   * encrypted at rest and are never returned by any endpoint — only metadata.
   *
   * @param file - The document file contents.
   * @param docType - Document category, e.g. "passport", "proof_of_address".
   * @param options - `filename` recorded for the upload; `idempotencyKey`
   *                  deduplicates retried requests (same key returns the
   *                  original document on replay).
   * @throws {AudactError} 400 on missing/invalid doc_type or oversized file.
   */
  async uploadKycDocument(
    file: Blob,
    docType: string,
    options: UploadKycDocumentOptions = {},
  ): Promise<KYCDocument> {
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file, options.filename);

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    return this.request<KYCDocument>(
      "POST",
      "/v1/kyc/documents",
      form,
      headers,
    );
  }

  /**
   * Replaces ("resends") an existing KYC document's file, keeping the same
   * document id. Re-triggers Telnyx re-verification for any submitted/
   * approved document set already referencing the document.
   *
   * @param id - UUID of the KYC document to replace.
   * @param file - The replacement document file contents.
   * @param options - `filename` recorded for the replacement; `idempotencyKey`
   *                  deduplicates retried requests.
   * @throws {AudactError} 404 if not found, 409 if the document backs an
   *                       in-flight number order.
   */
  async replaceKycDocument(
    id: string,
    file: Blob,
    options: ReplaceKycDocumentOptions = {},
  ): Promise<KYCDocument> {
    const form = new FormData();
    form.append("file", file, options.filename);

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    return this.request<KYCDocument>(
      "PUT",
      `/v1/kyc/documents/${encodeURIComponent(id)}`,
      form,
      headers,
    );
  }

  /**
   * Permanently deletes a KYC document, releasing the corresponding Telnyx
   * document if it was pushed.
   *
   * @param id - UUID of the KYC document to delete.
   * @throws {AudactError} 404 if not found, 409 if the document backs an
   *                       in-flight number order or a referencing document set.
   */
  async deleteKycDocument(id: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/kyc/documents/${encodeURIComponent(id)}`,
    );
  }

  // ── KYC requirements ──────────────────────────────────────────────────────

  /**
   * Proxies Telnyx's live regulatory requirements for a (country,
   * number_type) pair, so a caller knows what to collect before building a
   * KYC document set.
   *
   * @param country - ISO 3166-1 alpha-2 country code, e.g. "NL".
   * @param numberType - Telnyx phone_number_type, e.g. "mobile".
   * @throws {AudactError} 400 for an unsupported number_type; 502 if the
   *                       Telnyx fetch fails (fail-closed — never zero
   *                       requirements).
   */
  async getKycRequirements(
    country: string,
    numberType: string,
  ): Promise<ListKYCRequirementsResponse> {
    const query = new URLSearchParams({
      country,
      number_type: numberType,
    }).toString();
    return this.request<ListKYCRequirementsResponse>(
      "GET",
      `/v1/kyc/requirements?${query}`,
    );
  }

  // ── KYC document sets ─────────────────────────────────────────────────────

  /**
   * Lists every KYC document set owned by the authenticated tenant. Item
   * detail is omitted; use the set returned by {@link createKycDocumentSet}
   * for the full requirement-slot detail.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listKycDocumentSets(): Promise<ListKYCDocumentSetsResponse> {
    return this.request<ListKYCDocumentSetsResponse>(
      "GET",
      "/v1/kyc/document-sets",
    );
  }

  /**
   * Creates a KYC document set, validates Telnyx regulatory coverage, and
   * submits it to Telnyx as a requirement group for asynchronous approval.
   *
   * @param req - Set name, (country_code, number_type), and one item per
   *              Telnyx regulatory requirement.
   * @throws {AudactError} 422 if coverage is incomplete
   *                       (`error.details.missing` lists unsatisfied
   *                       requirement_ids); 404 if a referenced document_id
   *                       does not exist for this tenant.
   */
  async createKycDocumentSet(
    req: CreateKYCDocumentSetRequest,
  ): Promise<KYCDocumentSet> {
    return this.request<KYCDocumentSet>(
      "POST",
      "/v1/kyc/document-sets",
      req,
    );
  }

  /**
   * Permanently deletes a KYC document set and releases the corresponding
   * Telnyx requirement group, if any.
   *
   * @param id - UUID of the KYC document set to delete.
   * @throws {AudactError} 404 if not found, 409 if an in-flight number order
   *                       references the set.
   */
  async deleteKycDocumentSet(id: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/kyc/document-sets/${encodeURIComponent(id)}`,
    );
  }

  // ── DEK rotation ───────────────────────────────────────────────────────────

  /**
   * Rotates the tenant's Document Encryption Key (DEK). Existing documents
   * remain readable (decrypted using the key_ref version recorded at seal
   * time); only newly uploaded/replaced documents are sealed under the fresh
   * current version.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async rotateKycDek(): Promise<RotateKycDekResponse> {
    return this.request<RotateKycDekResponse>("POST", "/v1/kyc/dek/rotate");
  }

  // ── Number provisioning ───────────────────────────────────────────────────

  /**
   * Searches Telnyx's live inventory for numbers matching the requested
   * country and number_type.
   *
   * @param country - ISO 3166-1 alpha-2 country code, e.g. "NL".
   * @param numberType - Telnyx phone_number_type, e.g. "local".
   * @returns An explicit empty list (never an error) when Telnyx has no
   *          matching inventory.
   * @throws {AudactError} 400 for an unsupported number_type; 502 if the
   *                       Telnyx search fails (fail-closed).
   */
  async listAvailableNumbers(
    country: string,
    numberType: string,
  ): Promise<ListAvailableNumbersResponse> {
    const query = new URLSearchParams({
      country,
      number_type: numberType,
    }).toString();
    return this.request<ListAvailableNumbersResponse>(
      "GET",
      `/v1/numbers/available?${query}`,
    );
  }

  /**
   * Places an order for a new phone number against an already-`approved` KYC
   * document set. When `phone_number` is omitted, the first available
   * Telnyx number for the requested country/number_type (optionally narrowed
   * by `area_code`) is auto-selected. The order starts in "pending" status.
   *
   * @param req - Order request payload.
   * @throws {AudactError} 404 if the set does not exist for this tenant; 422
   *                       if the set is not approved, scope-mismatched,
   *                       coverage-incomplete, or no numbers are available;
   *                       502 if the Telnyx order placement fails.
   */
  async createNumberOrder(req: CreateNumberOrderRequest): Promise<NumberOrder> {
    return this.request<NumberOrder>("POST", "/v1/numbers/orders", req);
  }

  /**
   * Lists all Telnyx number orders placed by the authenticated tenant, most
   * recent first.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listNumberOrders(): Promise<ListNumberOrdersResponse> {
    return this.request<ListNumberOrdersResponse>("GET", "/v1/numbers/orders");
  }

  /**
   * Retrieves a single Telnyx number order for the authenticated tenant.
   *
   * @param id - UUID of the number order.
   * @throws {AudactError} 404 if not found for this tenant.
   */
  async getNumberOrder(id: string): Promise<NumberOrder> {
    return this.request<NumberOrder>(
      "GET",
      `/v1/numbers/orders/${encodeURIComponent(id)}`,
    );
  }

  // ── DID phone number lifecycle ────────────────────────────────────────────

  /**
   * Lists DID phone numbers in the pool for the authenticated tenant,
   * paginated (default page size 50, max 200).
   *
   * @param options - Optional `country`/`status` filters and
   *                  `cursor`/`limit` pagination.
   * @throws {AudactError} 400 on a malformed `limit`/`cursor`.
   */
  async listNumbers(
    options: ListNumbersOptions = {},
  ): Promise<ListNumbersResponse> {
    const params = new URLSearchParams();
    if (options.country !== undefined) params.set("country", options.country);
    if (options.status !== undefined) params.set("status", options.status);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListNumbersResponse>(
      "GET",
      query ? `/v1/numbers?${query}` : "/v1/numbers",
    );
  }

  /**
   * Provisions a new DID phone number into the pool for the authenticated
   * tenant. The DID must be E.164-formatted and globally unique.
   *
   * Origin-aware (§3C FR9): pass `origin: "byo"` with either `byo_connection_id`
   * (an existing connection) or an inline `connection` description (created
   * or reused in the same call) to attach a tenant-owned SIP trunk DID
   * instead of an Audact-provisioned one. See {@link createByoConnection}.
   *
   * @param req - DID, country code, and either Audact trunk provider or BYO
   *              origin/connection fields.
   * @param idempotencyKey - Optional idempotency key; a replay with the same
   *                         key returns 200 with an empty body rather than
   *                         the created number — see {@link assignNumber}.
   * @throws {AudactError} 400 on an invalid DID/missing country_code, 409 if
   *                       the DID already exists, 422
   *                       (`missing_connection_material`/
   *                       `inbound_allowlist_too_broad`) for an under-specified
   *                       inline BYO connection.
   */
  async createNumber(
    req: CreateNumberRequest,
    idempotencyKey?: string,
  ): Promise<PhoneNumber> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<PhoneNumber>("POST", "/v1/numbers", req, headers);
  }

  /**
   * Looks up the phone number record matching an E.164 DID for the
   * authenticated tenant — useful when only the DID (not its UUID) is known.
   *
   * @param did - E.164 phone number to look up, e.g. "+31201234567".
   * @throws {AudactError} 404 if the DID is not found for this tenant
   *                       (cross-tenant DIDs are never revealed).
   */
  async lookupNumber(did: string): Promise<PhoneNumber> {
    const query = new URLSearchParams({ did }).toString();
    return this.request<PhoneNumber>("GET", `/v1/numbers/lookup?${query}`);
  }

  /**
   * Permanently deletes a phone number from the pool. For a Telnyx-owned
   * number this also releases it at the carrier — irreversible, stops
   * billing. Only numbers in "available" status may be deleted; release an
   * assigned number first via {@link releaseNumber}.
   *
   * @param id - UUID of the phone number.
   * @throws {AudactError} 404 if not found, 409 if still assigned, 502 on a
   *                       carrier-teardown failure (safe to retry — the
   *                       number is left unchanged).
   */
  async deleteNumber(id: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/numbers/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Assigns an "available" DID to an agent.
   *
   * Neither success response (200 idempotent replay, 204 fresh assignment)
   * carries a response body, so this method always resolves to `void` —
   * uses {@link BaseServiceClient.requestRaw} instead of
   * {@link BaseServiceClient.request} because `request` requires a JSON body
   * on any non-204 2xx response.
   *
   * @param id - UUID of the phone number.
   * @param req - The agent to assign the DID to.
   * @param idempotencyKey - Optional idempotency key; the same key + body
   *                         combination replays as 200 rather than 204.
   * @throws {AudactError} 400 on an invalid id/missing agent_id, 404 if not
   *                       found, 409 if already assigned.
   */
  async assignNumber(
    id: string,
    req: AssignNumberRequest,
    idempotencyKey?: string,
  ): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    await this.requestRaw(
      "POST",
      `/v1/numbers/${encodeURIComponent(id)}/assign`,
      JSON.stringify(req),
      headers,
    );
  }

  /**
   * Pauses inbound routing for an assigned DID (A9 "held but not routed"
   * PAUSE state) — the SIP dispatch rule is removed but tenant ownership and
   * `assigned_agent_id` are preserved. Use {@link resumeNumber} to restore
   * routing.
   *
   * As with {@link assignNumber}, neither success response carries a body,
   * so this always resolves to `void` via `requestRaw`.
   *
   * @param id - UUID of the phone number.
   * @param idempotencyKey - Optional idempotency key; same key replays as 200.
   * @throws {AudactError} 404 if not found, 409 if not currently assigned,
   *                       502 on a routing-teardown failure (safe to retry).
   */
  async suspendNumber(id: string, idempotencyKey?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    await this.requestRaw(
      "POST",
      `/v1/numbers/${encodeURIComponent(id)}/suspend`,
      undefined,
      headers,
    );
  }

  /**
   * Restores inbound routing for a previously suspended DID, re-creating the
   * SIP dispatch rule for its preserved `assigned_agent_id`.
   *
   * As with {@link assignNumber}, neither success response carries a body,
   * so this always resolves to `void` via `requestRaw`.
   *
   * @param id - UUID of the phone number.
   * @param idempotencyKey - Optional idempotency key; same key replays as 200.
   * @throws {AudactError} 404 if not found, 409 if not currently suspended.
   */
  async resumeNumber(id: string, idempotencyKey?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    await this.requestRaw(
      "POST",
      `/v1/numbers/${encodeURIComponent(id)}/resume`,
      undefined,
      headers,
    );
  }

  /**
   * Releases an assigned DID back to the available pool, clearing
   * `assigned_agent_id`.
   *
   * As with {@link assignNumber}, neither success response carries a body,
   * so this always resolves to `void` via `requestRaw`.
   *
   * @param id - UUID of the phone number.
   * @param idempotencyKey - Optional idempotency key; same key replays as 200.
   * @throws {AudactError} 404 if not found, 502 on a routing-teardown
   *                       failure (safe to retry — the number is left
   *                       unchanged, still assigned).
   */
  async releaseNumber(id: string, idempotencyKey?: string): Promise<void> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    await this.requestRaw(
      "DELETE",
      `/v1/numbers/${encodeURIComponent(id)}/release`,
      undefined,
      headers,
    );
  }

  /**
   * Sets (or, with an empty `trunk_id`, clears) a number's outbound SIP
   * trunk link — e.g. so the agent can warm-transfer on its own number.
   *
   * @param id - UUID of the phone number.
   * @param req - `trunk_id`: the `sip_trunk_id` of an outbound trunk from
   *              `GET /v1/sip/trunks`.
   * @throws {AudactError} 400 on an invalid request, 404 if not found.
   */
  async setNumberTrunk(
    id: string,
    req: SetNumberTrunkRequest,
  ): Promise<PhoneNumber> {
    return this.request<PhoneNumber>(
      "PUT",
      `/v1/numbers/${encodeURIComponent(id)}/trunk`,
      req,
    );
  }

  /**
   * Retrieves a single KYC document set's detail, including each
   * requirement slot's mapped document filename/doc_type (never the bytes).
   *
   * @param id - UUID of the KYC document set.
   * @throws {AudactError} 404 (not 403) for a set belonging to another
   *                       tenant, to prevent enumeration.
   */
  async getKycDocumentSet(id: string): Promise<KYCDocumentSet> {
    return this.request<KYCDocumentSet>(
      "GET",
      `/v1/kyc/document-sets/${encodeURIComponent(id)}`,
    );
  }

  // ── Bring-Your-Own-Telephony (BYO) connections ────────────────────────────

  /**
   * Lists bring-your-own SIP trunk connections for the authenticated tenant,
   * paginated (default page size 50, max 200).
   *
   * @param options - Optional `cursor`/`limit` pagination.
   * @throws {AudactError} 400 on a malformed `limit`/`cursor`.
   */
  async listByoConnections(
    options: ListByoConnectionsOptions = {},
  ): Promise<ListByoConnectionsResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListByoConnectionsResponse>(
      "GET",
      query ? `/v1/byo/connections?${query}` : "/v1/byo/connections",
    );
  }

  /**
   * Retrieves a single BYO connection by ID for the authenticated tenant.
   *
   * @param id - UUID of the BYO connection.
   * @throws {AudactError} 404 if not found for this tenant.
   */
  async getByoConnection(id: string): Promise<BYOConnection> {
    return this.request<BYOConnection>(
      "GET",
      `/v1/byo/connections/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Registers a new customer-owned SIP trunk (Twilio, Telnyx, or any generic
   * SIP provider) so its numbers can be attached via {@link createNumber}.
   * Requires EITHER SIP credentials (`sip_username` + `sip_password`) OR an
   * inbound IP allowlist (`inbound_allowed_ips`) — at least one is mandatory.
   * Runs a connect-time health probe before returning; check
   * `connection_health` in the response (advisory — never fails solely
   * because the probe found the connection unreachable).
   *
   * @param req - Connection creation payload.
   * @param idempotencyKey - Optional idempotency key; same key returns 200
   *                         on replay.
   * @throws {AudactError} 400 on an invalid provider/transport or missing
   *                       `name`, 409 if a connection with this name already
   *                       exists, 422 (`missing_connection_material` or
   *                       `inbound_allowlist_too_broad`) when neither auth
   *                       mechanism is adequately supplied.
   */
  async createByoConnection(
    req: CreateBYOConnectionRequest,
    idempotencyKey?: string,
  ): Promise<BYOConnection> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<BYOConnection>(
      "POST",
      "/v1/byo/connections",
      req,
      headers,
    );
  }

  /**
   * Applies a partial update to an existing BYO connection. Fields omitted
   * from the request body are left unchanged. Supplying both `sip_username`
   * and `sip_password` rotates the stored SIP credential. Re-registers the
   * outbound trunk and re-runs the connect-time health probe
   * unconditionally; check `connection_health` in the response.
   *
   * @param id - UUID of the BYO connection.
   * @param req - Partial update payload.
   * @param idempotencyKey - Optional idempotency key; same key returns 200
   *                         on replay.
   * @throws {AudactError} 400 on an invalid provider/transport, 404 if not
   *                       found, 409 if the new name is already taken, 422
   *                       (`missing_connection_material` or
   *                       `inbound_allowlist_too_broad`) after applying this
   *                       update.
   */
  async updateByoConnection(
    id: string,
    req: UpdateBYOConnectionRequest,
    idempotencyKey?: string,
  ): Promise<BYOConnection> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<BYOConnection>(
      "PUT",
      `/v1/byo/connections/${encodeURIComponent(id)}`,
      req,
      headers,
    );
  }

  /**
   * Re-registers the connection's outbound SIP trunk from its currently
   * stored host/transport/credentials and reports the resulting
   * `connection_health` (healthy or unreachable). Advisory: never throws
   * solely because the probe found the connection unreachable — check
   * `connection_health`/`health_detail` in the response instead.
   *
   * @param id - UUID of the BYO connection.
   * @throws {AudactError} 400 on an invalid connection ID, 404 if not found.
   */
  async verifyByoConnection(id: string): Promise<BYOConnection> {
    return this.request<BYOConnection>(
      "POST",
      `/v1/byo/connections/${encodeURIComponent(id)}/verify`,
    );
  }

  /**
   * Permanently deletes a BYO connection: its inbound/outbound SIP trunks
   * and stored credentials are torn down (best-effort), then the row is
   * removed. NEVER contacts the carrier — this is the customer's own
   * number/trunk, not an Audact-provisioned one.
   *
   * @param id - UUID of the BYO connection.
   * @throws {AudactError} 404 if not found, 409 if one or more phone numbers
   *                       are still attached — detach or delete those
   *                       numbers first.
   */
  async deleteByoConnection(id: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/byo/connections/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Returns this deployment's SIP ingress host and signaling source IPs —
   * the values a tenant configures on their own SIP trunk's origination
   * URI / allowed-callers list to route calls to Audact. Fetch this before
   * creating any BYO connection; values are deployment-wide, not
   * tenant-specific.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getByoConfig(): Promise<ByoConfig> {
    return this.request<ByoConfig>("GET", "/v1/byo/config");
  }
}

// ─── CallsClient ──────────────────────────────────────────────────────────────

/**
 * Client for the Audact Voice Gateway's SIP call lifecycle API (port 8088):
 * outbound/inbound/browser call initiation, hangup, status polling, warm
 * handovers, transfers, SIP trunk/dispatch-rule management, the pre-connect
 * admission hook URL, and WebSocket authentication tickets.
 *
 * Part 1 covers the `sip` tag's call/handover/transfer surface.
 * Part 2 adds trunks/routes (`sip`), the admission URL (`voice`),
 * and `create_ws_ticket` (`websocket`). The two receive-side webhooks
 * (`POST /telnyx/webhook`, `POST /webhooks/livekit`) are intentionally
 * omitted — provider ingress, not client calls.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const call = await client.calls.initiateOutboundCall({
 *   agent_id: "550e8400-e29b-41d4-a716-446655440000",
 *   from_number: "+31201234567",
 *   destination_number: "+49301234567",
 * });
 * const status = await client.calls.getCallStatus(call.call_id);
 * ```
 */
export class CallsClient extends BaseServiceClient {
  // ── SIP calls ─────────────────────────────────────────────────────────────

  /**
   * Initiates an outbound SIP call from a DID owned by the authenticated
   * tenant. Creates a LiveKit room, dials the destination via the
   * registered outbound SIP trunk, and returns the room details for the
   * agent worker to join.
   *
   * @param req - Outbound call initiation payload.
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the original call_id (200) on replay.
   * @throws {AudactError} 400 INVALID_REQUEST on a missing/invalid field —
   *                       including a from_number/destination_number that is
   *                       not strict E.164 (digits only after the '+', no
   *                       spaces, dashes, dots or parentheses; numbers are not
   *                       normalised, e.g. "+44 20 7946 0958" is rejected) or a
   *                       from_number that is not one of your own numbers —
   *                       or 403 CALL_BLOCKED_BY_POLICY if a pre-dial policy
   *                       check blocks the call.
   */
  async initiateOutboundCall(
    req: OutboundCallRequest,
    idempotencyKey?: string,
  ): Promise<OutboundCallResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<OutboundCallResponse>(
      "POST",
      "/v1/sip/calls/outbound",
      req,
      headers,
    );
  }

  /**
   * Processes an inbound SIP INVITE notification sent by the telephony
   * provider (e.g. a Telnyx webhook). Creates a LiveKit room, looks up the
   * routing rule for the called DID, and returns the room name for the
   * agent worker to join.
   *
   * @param req - Inbound call notification payload.
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the original call_id (200) on replay.
   * @throws {AudactError} 400 on a missing/invalid field, 403
   *                       CALL_REJECTED_BY_ADMISSION, 404 if no routing
   *                       rule is found for the called DID.
   */
  async initiateInboundCall(
    req: InboundCallRequest,
    idempotencyKey?: string,
  ): Promise<InboundCallResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<InboundCallResponse>(
      "POST",
      "/v1/sip/calls/inbound",
      req,
      headers,
    );
  }

  /**
   * Creates a LiveKit room and returns a signed participant token for the
   * browser to join via WebRTC. The agent is automatically dispatched.
   *
   * @param req - Browser call request.
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the original call_id (200) on replay.
   * @throws {AudactError} 400 on an invalid request.
   */
  async createBrowserCall(
    req: BrowserCallRequest,
    idempotencyKey?: string,
  ): Promise<BrowserCallResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<BrowserCallResponse>(
      "POST",
      "/v1/sip/calls/browser",
      req,
      headers,
    );
  }

  /**
   * Terminates an active call by deleting the associated LiveKit room,
   * which disconnects all participants and triggers a SIP BYE.
   *
   * @param callId - UUID of the call to terminate.
   * @throws {AudactError} 404 if the call does not exist for this tenant
   *                       (calls owned by a different tenant also return
   *                       404, not 403, to avoid information leakage); 409
   *                       if the call is already terminated.
   */
  async hangupCall(callId: string): Promise<HangupResponse> {
    return this.request<HangupResponse>(
      "POST",
      `/v1/sip/calls/${encodeURIComponent(callId)}/hangup`,
    );
  }

  /**
   * Returns the current lifecycle status of a call — the polling
   * alternative to the `GET /v1/ws/calls` WebSocket stream.
   *
   * @param callId - UUID of the call to look up.
   * @throws {AudactError} 404 if the call does not exist for this tenant.
   */
  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.request<CallStatusResponse>(
      "GET",
      `/v1/sip/calls/${encodeURIComponent(callId)}/status`,
    );
  }

  // ── Warm handover ─────────────────────────────────────────────────────────

  /**
   * Starts a warm handover for the active call: the human supervisor is
   * dialed into a private supervisor room and briefed (whisper) before
   * being bridged into the caller's room. The caller is kept on hold and is
   * never disconnected. The destination phone number is immediately
   * hashed; the raw number is never stored or logged.
   *
   * @param callId - UUID of the active call to hand over.
   * @param req - Handover request payload.
   * @throws {AudactError} 400 on a missing/invalid field, 404 if the call
   *                       is not found.
   */
  async initiateHandover(
    callId: string,
    req: HandoverRequest,
  ): Promise<HandoverResponse> {
    return this.request<HandoverResponse>(
      "POST",
      `/v1/sip/calls/${encodeURIComponent(callId)}/handover`,
      req,
    );
  }

  /**
   * Returns the current state of a warm handover session, including its
   * lifecycle state, summary_source, and delivery_status. The destination
   * phone number is never returned; only its SHA-256 hash.
   *
   * @param handoverId - UUID of the handover session.
   * @throws {AudactError} 404 if the handover is not found.
   */
  async getHandover(handoverId: string): Promise<HandoverStateResponse> {
    return this.request<HandoverStateResponse>(
      "GET",
      `/v1/sip/handovers/${encodeURIComponent(handoverId)}`,
    );
  }

  // ── Transfers ──────────────────────────────────────────────────────────────

  /**
   * Initiates a SIP REFER to transfer an active call to a new destination.
   * Returns a transfer_id used to report subsequent lifecycle transitions
   * (bridge/cancel/end) via the transfer state endpoints. The destination
   * phone number is immediately hashed; the raw number is never stored or
   * logged.
   *
   * @param callId - UUID of the active call to transfer.
   * @param req - Transfer request payload.
   * @param idempotencyKey - Optional idempotency key; retrying with the
   *                         same key replays the original response instead
   *                         of initiating a second transfer.
   * @throws {AudactError} 400 on a missing/invalid field, 404 if the call
   *                       is not found.
   */
  async initiateTransfer(
    callId: string,
    req: TransferRequest,
    idempotencyKey?: string,
  ): Promise<TransferResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<TransferResponse>(
      "POST",
      `/v1/sip/calls/${encodeURIComponent(callId)}/transfer`,
      req,
      headers,
    );
  }

  /**
   * Returns the current state of a SIP transfer session, including its
   * lifecycle status (started/bridged/cancelled/ended). The destination
   * phone number is never returned; only its SHA-256 hash.
   *
   * @param transferId - UUID of the transfer session.
   * @throws {AudactError} 404 if the transfer is not found.
   */
  async getTransferState(transferId: string): Promise<TransferSessionResponse> {
    return this.request<TransferSessionResponse>(
      "GET",
      `/v1/sip/transfers/${encodeURIComponent(transferId)}`,
    );
  }

  /**
   * Records that the transfer target has answered and both parties are
   * connected. Emits a `transfer_bridged` webhook event.
   *
   * @param transferId - UUID of the transfer session.
   * @throws {AudactError} 404 if the transfer is not found.
   */
  async bridgeTransfer(transferId: string): Promise<TransferStateResponse> {
    return this.request<TransferStateResponse>(
      "POST",
      `/v1/sip/transfers/${encodeURIComponent(transferId)}/bridge`,
    );
  }

  /**
   * Records that the SIP REFER failed or the transfer was aborted. Emits a
   * `transfer_cancelled` webhook event.
   *
   * @param transferId - UUID of the transfer session.
   * @throws {AudactError} 404 if the transfer is not found.
   */
  async cancelTransfer(transferId: string): Promise<TransferStateResponse> {
    return this.request<TransferStateResponse>(
      "POST",
      `/v1/sip/transfers/${encodeURIComponent(transferId)}/cancel`,
    );
  }

  /**
   * Records that the transfer leg has disconnected after a successful
   * bridge. Emits a `transfer_ended` webhook event.
   *
   * @param transferId - UUID of the transfer session.
   * @throws {AudactError} 404 if the transfer is not found.
   */
  async endTransfer(transferId: string): Promise<TransferStateResponse> {
    return this.request<TransferStateResponse>(
      "POST",
      `/v1/sip/transfers/${encodeURIComponent(transferId)}/end`,
    );
  }

  // ── SIP trunks ─────────────────────────────────────────────────────────────

  /**
   * Lists inbound and outbound SIP trunks registered for the authenticated
   * tenant. Use this to discover which trunks are available before
   * registering routes ({@link createDispatchRule}) or initiating calls
   * ({@link initiateOutboundCall}). `inbound_trunks` is paginated;
   * `outbound_trunks` is always returned in full (at most one per tenant).
   *
   * @param options - Optional `limit`/`cursor` pagination for inbound trunks.
   * @throws {AudactError} 400 on an invalid limit/cursor.
   */
  async listTrunks(
    options: ListTrunksOptions = {},
  ): Promise<ListTrunksResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListTrunksResponse>(
      "GET",
      query ? `/v1/sip/trunks?${query}` : "/v1/sip/trunks",
    );
  }

  /**
   * Registers an inbound SIP trunk for the authenticated tenant, mapping a
   * set of DID phone numbers to the tenant's account and configuring SIP
   * authentication credentials stored in AWS Secrets Manager.
   *
   * @param req - Inbound trunk registration payload.
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the cached response (200) on replay.
   * @throws {AudactError} 400 on a missing/invalid field, 409 if the
   *                       idempotency key was already used with a different
   *                       body.
   */
  async createInboundTrunk(
    req: CreateInboundTrunkRequest,
    idempotencyKey?: string,
  ): Promise<CreateInboundTrunkResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<CreateInboundTrunkResponse>(
      "POST",
      "/v1/sip/trunks/inbound",
      req,
      headers,
    );
  }

  /**
   * Registers an outbound SIP trunk for the authenticated tenant, configuring
   * a SIP proxy host and authentication credentials used when initiating
   * outbound calls via {@link initiateOutboundCall}.
   *
   * @param req - Outbound trunk registration payload.
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the cached response (200) on replay.
   * @throws {AudactError} 400 on a missing/invalid field, 409 if the
   *                       idempotency key was already used with a different
   *                       body.
   */
  async createOutboundTrunk(
    req: CreateOutboundTrunkRequest,
    idempotencyKey?: string,
  ): Promise<CreateOutboundTrunkResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<CreateOutboundTrunkResponse>(
      "POST",
      "/v1/sip/trunks/outbound",
      req,
      headers,
    );
  }

  // ── SIP dispatch rules (routes) ───────────────────────────────────────────

  /**
   * Lists SIP dispatch rules (routes) registered for the authenticated
   * tenant. Each route maps an inbound DID to an agent.
   *
   * @param options - Optional `limit`/`cursor` pagination.
   * @throws {AudactError} 400 on an invalid limit/cursor.
   */
  async listDispatchRules(
    options: ListDispatchRulesOptions = {},
  ): Promise<ListDispatchRulesResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListDispatchRulesResponse>(
      "GET",
      query ? `/v1/sip/routes?${query}` : "/v1/sip/routes",
    );
  }

  /**
   * Creates a routing rule that dispatches inbound calls arriving on a
   * specific DID to a given agent. The DID must already be registered via
   * {@link createInboundTrunk}.
   *
   * @param req - Route mapping payload (did, agent_id).
   * @param idempotencyKey - Optional idempotency key; same key + body
   *                         returns the cached response (200) on replay.
   * @throws {AudactError} 400 on a missing/invalid field (did or agent_id),
   *                       409 if the idempotency key was already used with a
   *                       different body.
   */
  async createDispatchRule(
    req: CreateDispatchRuleRequest,
    idempotencyKey?: string,
  ): Promise<CreateDispatchRuleResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<CreateDispatchRuleResponse>(
      "POST",
      "/v1/sip/routes",
      req,
      headers,
    );
  }

  // ── Admission URL (pre-connect inbound-call hook) ─────────────────────────

  /**
   * Returns the tenant's configured `admission_url` (pre-connect inbound-call
   * hook), or an empty string when the hook is disabled.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getAdmissionUrl(): Promise<AdmissionUrlResponse> {
    return this.request<AdmissionUrlResponse>("GET", "/v1/sip/admission-url");
  }

  /**
   * Sets the tenant's `admission_url` — the http(s) endpoint Audact POSTs
   * `{call_id, caller_number, called_did, agent_id, trunk_id}` to before
   * connecting each inbound call, honouring `{action, dynamic_variables,
   * metadata}` in the response (500ms bounded, fails open). Pass an empty
   * `admission_url` to disable the hook.
   *
   * @param req - Admission URL payload.
   * @throws {AudactError} 400 if the URL is invalid or targets a blocked
   *                       host, 404 if the tenant has no configuration to
   *                       attach it to.
   */
  async setAdmissionUrl(
    req: SetAdmissionUrlRequest,
  ): Promise<AdmissionUrlResponse> {
    return this.request<AdmissionUrlResponse>(
      "PUT",
      "/v1/sip/admission-url",
      req,
    );
  }

  // ── WebSocket ticket ───────────────────────────────────────────────────────

  /**
   * Issues a single-use ticket valid for 30 seconds. Pass it as the
   * `?ticket=` query parameter when connecting to `GET /v1/ws/calls` to
   * authenticate the WebSocket upgrade; the ticket is consumed on first use
   * and cannot be replayed.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async createWsTicket(): Promise<CreateWsTicketResponse> {
    return this.request<CreateWsTicketResponse>("POST", "/v1/ws/ticket");
  }
}

// ─── WebhooksClient ───────────────────────────────────────────────────────────

/**
 * Client for the Audact webhook management API (Tenant Management service,
 * port 8085), which serves every `/v1/webhooks*` route
 * alongside `/v1/tenants` and `/v1/configurations`.
 *
 * Covers webhook endpoint CRUD, a synthetic test-ping, delivery-attempt
 * history + dead-letter resend, event-type/schema discovery, and per-tenant
 * HMAC signing-secret status/rotation.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const created = await client.webhooks.createWebhook({
 *   url: "https://example.com/webhooks",
 *   events: ["call_ended", "compliance.violation_detected"],
 *   scope: "account",
 * });
 * // signing_secret is present only the first time a tenant creates a
 * // webhook — store it immediately, it is never returned again.
 * console.log(created.signing_secret);
 * ```
 */
export class WebhooksClient extends BaseServiceClient {
  // ── CRUD ───────────────────────────────────────────────────────────────────

  /**
   * Lists webhook endpoints for the authenticated tenant, paginated.
   *
   * @param options - Optional `limit`/`cursor` pagination.
   * @throws {AudactError} 400 on an invalid limit/cursor.
   */
  async listWebhooks(
    options: ListWebhooksOptions = {},
  ): Promise<ListWebhooksResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListWebhooksResponse>(
      "GET",
      query ? `/v1/webhooks?${query}` : "/v1/webhooks",
    );
  }

  /**
   * Creates a new webhook endpoint. `url` must be HTTPS; `events` must be a
   * non-empty list of known event types (see {@link listWebhookEventTypes});
   * `agent_id` is required when `scope` is "agent".
   *
   * When this is the tenant's first webhook endpoint, the response also
   * provisions the per-tenant HMAC signing secret and includes it once as
   * `signing_secret` — store it securely, as no later call (including
   * subsequent creations or {@link getWebhookSecretStatus}) will ever return
   * it again.
   *
   * @param req - Webhook endpoint creation payload.
   * @param idempotencyKey - Optional idempotency key; a retried request with
   *                         the same key returns the original endpoint (200)
   *                         for 24 hours.
   * @throws {AudactError} 400 on an invalid url/events/scope/agent_id.
   */
  async createWebhook(
    req: CreateWebhookRequest,
    idempotencyKey?: string,
  ): Promise<CreateWebhookResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<CreateWebhookResponse>(
      "POST",
      "/v1/webhooks",
      req,
      headers,
    );
  }

  /**
   * Retrieves a single webhook endpoint by ID.
   *
   * @param id - UUID of the webhook endpoint.
   * @throws {AudactError} 404 if not found for this tenant.
   */
  async getWebhook(id: string): Promise<WebhookEndpoint> {
    return this.request<WebhookEndpoint>(
      "GET",
      `/v1/webhooks/${encodeURIComponent(id)}`,
    );
  }

  /**
   * Partially updates a webhook endpoint — only the provided fields change.
   *
   * @param id - UUID of the webhook endpoint to update.
   * @param req - Fields to update.
   * @throws {AudactError} 400/404 as appropriate.
   */
  async updateWebhook(
    id: string,
    req: UpdateWebhookRequest,
  ): Promise<WebhookEndpoint> {
    return this.request<WebhookEndpoint>(
      "PUT",
      `/v1/webhooks/${encodeURIComponent(id)}`,
      req,
    );
  }

  /**
   * Permanently deletes a webhook endpoint.
   *
   * @param id - UUID of the webhook endpoint to delete.
   * @throws {AudactError} 404 if not found for this tenant.
   */
  async deleteWebhook(id: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/webhooks/${encodeURIComponent(id)}`,
    );
  }

  // ── Test ping ──────────────────────────────────────────────────────────────

  /**
   * Dispatches a synthetic `webhook.test` event to the endpoint, signed with
   * the tenant's current signing key. Single attempt, no retries — the
   * delivery is never persisted to the delivery log.
   *
   * @param id - UUID of the webhook endpoint.
   * @throws {AudactError} 404 if not found for this tenant.
   */
  async testWebhook(id: string): Promise<TestWebhookResponse> {
    return this.request<TestWebhookResponse>(
      "POST",
      `/v1/webhooks/${encodeURIComponent(id)}/test`,
    );
  }

  // ── Deliveries ─────────────────────────────────────────────────────────────

  /**
   * Lists paginated delivery attempts for a webhook endpoint. Enforces
   * tenant ownership of the endpoint.
   *
   * @param id - UUID of the webhook endpoint.
   * @param options - Optional `limit`/`offset` pagination.
   * @throws {AudactError} 400 on an invalid limit/offset, 404 if the endpoint
   *                       is not found for this tenant.
   */
  async listWebhookDeliveries(
    id: string,
    options: ListWebhookDeliveriesOptions = {},
  ): Promise<ListWebhookDeliveriesResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.offset !== undefined) params.set("offset", String(options.offset));
    const query = params.toString();
    const path = `/v1/webhooks/${encodeURIComponent(id)}/deliveries`;
    return this.request<ListWebhookDeliveriesResponse>(
      "GET",
      query ? `${path}?${query}` : path,
    );
  }

  /**
   * Re-queues a dead-lettered delivery back onto the retry stream and resets
   * its status to pending. The delivery must belong to an endpoint owned by
   * the authenticated tenant.
   *
   * @param deliveryId - UUID of the delivery record (from
   *                     {@link listWebhookDeliveries}).
   * @throws {AudactError} 404 if not found, 409 if the delivery is not
   *                       currently in `dead_letter` status.
   */
  async resendWebhookDelivery(
    deliveryId: string,
  ): Promise<ResendWebhookDeliveryResponse> {
    return this.request<ResendWebhookDeliveryResponse>(
      "POST",
      `/v1/webhooks/deliveries/${encodeURIComponent(deliveryId)}/resend`,
    );
  }

  // ── Event type / schema discovery ─────────────────────────────────────────

  /**
   * Lists every known webhook event type with its description, category, and
   * a link to its example payload. Use this to discover valid values for
   * `events` when creating or updating a webhook endpoint.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listWebhookEventTypes(): Promise<ListWebhookEventTypesResponse> {
    return this.request<ListWebhookEventTypesResponse>(
      "GET",
      "/v1/webhooks/event-types",
    );
  }

  /**
   * Returns a fully-populated example of the JSON envelope delivered for the
   * given event type, so a caller can discover the payload shape without
   * waiting for (or triggering) a live delivery.
   *
   * @param eventType - Event type string, e.g. "call_ended" or
   *                    "compliance.violation_detected". See
   *                    {@link listWebhookEventTypes} for valid values.
   * @throws {AudactError} 404 for an unknown event type.
   */
  async getWebhookEventSchema(eventType: string): Promise<WebhookEventSchema> {
    const query = new URLSearchParams({ type: eventType }).toString();
    return this.request<WebhookEventSchema>(
      "GET",
      `/v1/webhooks/event-schemas?${query}`,
    );
  }

  // ── Signing secret ─────────────────────────────────────────────────────────

  /**
   * Returns the current rotation status of the tenant's webhook HMAC signing
   * secret: whether a 72-hour dual-signature grace period is active, when it
   * ends, and when the secret was first provisioned.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getWebhookSecretStatus(): Promise<WebhookSecretStatusResponse> {
    return this.request<WebhookSecretStatusResponse>(
      "GET",
      "/v1/webhooks/secrets/status",
    );
  }

  /**
   * Rotates the tenant's webhook HMAC signing secret. The previous key
   * remains valid for 72 hours (dual-signature grace period) so receivers
   * can verify in-flight deliveries while they deploy the new one. The new
   * plaintext secret is returned exactly once — store it securely, as no
   * later call will ever return it again.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async rotateWebhookSecret(): Promise<RotateWebhookSecretResponse> {
    return this.request<RotateWebhookSecretResponse>(
      "POST",
      "/v1/webhooks/secrets/rotate",
    );
  }
}

// ─── AgentsClient ─────────────────────────────────────────────────────────────

/**
 * Client for the Audact Agent Worker's voice agent management API (port
 * 8089): agent CRUD (full PUT and partial PATCH), duplication, TTS voice
 * catalog CRUD, and pipeline-load status.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const agent = await client.agents.createAgent({
 *   name: "Support Bot",
 *   language: "en-US",
 *   voice_id: "en_paul_neutral",
 * });
 * const copy = await client.agents.duplicateAgent(agent.agent_id);
 * ```
 */
export class AgentsClient extends BaseServiceClient {
  // ── Agent CRUD ────────────────────────────────────────────────────────────

  /**
   * Returns a page of non-deleted agents for the authenticated tenant,
   * ordered by created_at DESC. Uses cursor pagination — pass the returned
   * `next_cursor` as the `?cursor=` query parameter to fetch the next page.
   *
   * @param options - Optional `limit`/`cursor` pagination.
   * @throws {AudactError} 400 on an invalid limit/cursor.
   */
  async listAgents(
    options: ListAgentsOptions = {},
  ): Promise<ListAgentsResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListAgentsResponse>(
      "GET",
      query ? `/v1/agents?${query}` : "/v1/agents",
    );
  }

  /**
   * Creates a new voice agent for the authenticated tenant. When a config
   * provisioner is wired server-side, this also atomically provisions a
   * per-agent Configuration (`configuration_id` on the response).
   *
   * @param req - Agent creation payload.
   * @throws {AudactError} 400 on a validation error (missing name, invalid
   *                       llm_provider, unsupported jurisdiction, or
   *                       temperature outside [0.0, 2.0]); 404 if a supplied
   *                       tool_id does not exist for this tenant.
   */
  async createAgent(req: CreateAgentRequest): Promise<CreateAgentResponse> {
    return this.request<CreateAgentResponse>("POST", "/v1/agents", req);
  }

  /**
   * Returns the full agent row for `agentId`, including configuration_id,
   * assigned_phone, tool_ids, version, and jurisdiction.
   *
   * @param agentId - UUID of the agent.
   * @throws {AudactError} 404 for a missing, deleted, or cross-tenant agent
   *                       (no information leak).
   */
  async getAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>(
      "GET",
      `/v1/agents/${encodeURIComponent(agentId)}`,
    );
  }

  /**
   * Full-replacement update of the agent row. The server-managed `version`
   * counter is incremented atomically.
   *
   * @param agentId - UUID of the agent to update.
   * @param req - All mutable fields, replaced in full.
   * @throws {AudactError} 400/401/404 as appropriate.
   */
  async updateAgent(agentId: string, req: UpdateAgentRequest): Promise<Agent> {
    return this.request<Agent>(
      "PUT",
      `/v1/agents/${encodeURIComponent(agentId)}`,
      req,
    );
  }

  /**
   * Partially updates the agent row — only the supplied fields change;
   * omitted fields keep their current value.
   *
   * @param agentId - UUID of the agent to update.
   * @param req - Only the fields to change.
   * @throws {AudactError} 400/401/404 as appropriate.
   */
  async patchAgent(agentId: string, req: PatchAgentRequest): Promise<Agent> {
    return this.request<Agent>(
      "PATCH",
      `/v1/agents/${encodeURIComponent(agentId)}`,
      req,
    );
  }

  /**
   * Soft-deletes the agent, releases any assigned phone number back to
   * available, and deactivates its per-agent Configuration when one is set —
   * all within a single transaction.
   *
   * @param agentId - UUID of the agent to delete.
   * @throws {AudactError} 404 if not found (cross-tenant agents also return
   *                       404, to prevent information leakage).
   */
  async deleteAgent(agentId: string): Promise<DeleteAgentResponse> {
    return this.request<DeleteAgentResponse>(
      "DELETE",
      `/v1/agents/${encodeURIComponent(agentId)}`,
    );
  }

  /**
   * Creates a copy of the agent with a new agent_id, name suffixed with
   * " (Copy)", status "draft", and version 1. Phone number assignments are
   * not copied; a provisioned Configuration is cloned when present.
   *
   * @param agentId - UUID of the source agent.
   * @throws {AudactError} 404 if the source agent is not found.
   */
  async duplicateAgent(agentId: string): Promise<Agent> {
    return this.request<Agent>(
      "POST",
      `/v1/agents/${encodeURIComponent(agentId)}/duplicate`,
    );
  }

  // ── Voices ─────────────────────────────────────────────────────────────────

  /**
   * Returns the catalog of available TTS voices grouped by provider:
   * built-in presets, platform-admin cloned voices and every voice in the
   * platform ElevenLabs account. Each voice lists the `languages` it speaks;
   * each provider lists its `models` and their languages. Pass
   * `{ language: "de-DE" }` to keep only voices that speak it (native first)
   * and/or `{ provider: "elevenlabs" }`. Use the `voice_id` values when
   * creating or updating agents.
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listVoices(params: ListVoicesParams = {}): Promise<ListVoicesResponse> {
    const query = new URLSearchParams();
    if (params.language) query.set("language", params.language);
    if (params.provider) query.set("provider", params.provider);
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return this.request<ListVoicesResponse>("GET", qs ? `/v1/voices?${qs}` : "/v1/voices");
  }

  /**
   * Uploads a ~10s reference clip and clones it into a new TTS voice
   * (platform admin), via `multipart/form-data` — see
   * {@link BaseServiceClient}'s `request`, which omits `Content-Type` for a
   * `FormData` body so `fetch` can set the correct
   * `multipart/form-data; boundary=...` value itself. Requires explicit
   * consent: `consentConfirmed` must be `true`.
   *
   * @param audio - Reference clip (~10s), audio/mpeg or audio/wav, max 2 MiB.
   * @param name - Display name for the new voice.
   * @param consentConfirmed - Must be `true` — confirms consent to clone the
   *                           supplied voice sample.
   * @param options - Optional `language`/`accent`/`gender`/`style`/`filename`.
   * @throws {AudactError} 400 on a missing/invalid field or unsupported audio
   *                       format; 422 if the sample is rejected by content
   *                       moderation (VOICE_REJECTED); 503 if voice cloning
   *                       is not configured for this deployment.
   */
  async createVoice(
    audio: Blob,
    name: string,
    consentConfirmed: boolean,
    options: CreateVoiceOptions = {},
  ): Promise<CreateVoiceResponse> {
    const form = new FormData();
    form.append("name", name);
    form.append("audio", audio, options.filename);
    form.append("consent_confirmed", consentConfirmed ? "true" : "false");
    if (options.language !== undefined) form.append("language", options.language);
    if (options.accent !== undefined) form.append("accent", options.accent);
    if (options.gender !== undefined) form.append("gender", options.gender);
    if (options.style !== undefined) form.append("style", options.style);
    return this.request<CreateVoiceResponse>("POST", "/v1/voices", form);
  }

  /**
   * Returns a single voice by voice_id — a built-in preset or a
   * platform-admin cloned voice.
   *
   * @param voiceId - Voice ID.
   * @throws {AudactError} 404 if the voice does not exist.
   */
  async getVoice(voiceId: string): Promise<Voice> {
    return this.request<Voice>(
      "GET",
      `/v1/voices/${encodeURIComponent(voiceId)}`,
    );
  }

  /**
   * Removes a platform-admin cloned voice: deletes it upstream and
   * soft-deletes the local row. Built-in preset voices cannot be deleted.
   *
   * @param voiceId - Voice ID.
   * @throws {AudactError} 400 if the voice is a built-in preset; 404 if not
   *                       found; 502 if the upstream cloning provider fails.
   */
  async deleteVoice(voiceId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/voices/${encodeURIComponent(voiceId)}`,
    );
  }

  // ── Pipeline status ─────────────────────────────────────────────────────────

  /**
   * Returns the current number of active voice pipeline instances running in
   * the agent-worker — each active LiveKit room with an assigned agent
   * contributes one (STT→LLM→TTS chain).
   *
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async getPipelineStatus(): Promise<PipelineStatusResponse> {
    return this.request<PipelineStatusResponse>("GET", "/v1/pipeline/status");
  }
}

// ─── ToolsClient ──────────────────────────────────────────────────────────────

/**
 * Client for the Audact Agent Worker's custom function-calling tool API
 * (port 8089): tool CRUD (full PUT and partial PATCH), a platform-tool test
 * probe, and agent-tool attachment.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const tool = await client.tools.createTool({
 *   name: "lookup_customer",
 *   description: "Look up a customer by email",
 *   method: "POST",
 *   url: "https://api.example.com/v1/lookup",
 *   execution: { speak_during: { enabled: false } },
 * });
 * await client.tools.attachToolToAgent(agentId, tool.tool_id);
 * ```
 */
export class ToolsClient extends BaseServiceClient {
  // ── Tool CRUD ──────────────────────────────────────────────────────────────

  /**
   * Returns a page of non-deleted tools for the authenticated tenant,
   * ordered by created_at DESC.
   *
   * @param options - Optional `name` exact filter and `limit`/`cursor` paging.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listTools(options: ListToolsOptions = {}): Promise<ListToolsResponse> {
    const params = new URLSearchParams();
    if (options.name !== undefined) params.set("name", options.name);
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    const query = params.toString();
    return this.request<ListToolsResponse>(
      "GET",
      query ? `/v1/tools?${query}` : "/v1/tools",
    );
  }

  /**
   * Creates a new custom function-calling tool for the authenticated tenant,
   * or (when `provider` is set) a platform-supplied tool such as Cal.com.
   *
   * @param req - Tool configuration.
   * @param idempotencyKey - Optional idempotency key; a retried request with
   *                          the same key replays the original 201 response
   *                          instead of creating a duplicate tool.
   * @throws {AudactError} 400 on a validation error; 404 if a platform
   *                       tool's `connection_id` does not exist; 409 on a
   *                       name conflict, or an inactive connection.
   */
  async createTool(
    req: CreateToolRequest,
    idempotencyKey?: string,
  ): Promise<ToolConfig> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<ToolConfig>("POST", "/v1/tools", req, headers);
  }

  /**
   * Returns the full configuration for `toolId`, scoped to the
   * authenticated tenant.
   *
   * @param toolId - UUID of the tool.
   * @throws {AudactError} 404 for a missing, deleted, or cross-tenant tool
   *                       (no information leak).
   */
  async getTool(toolId: string): Promise<ToolConfig> {
    return this.request<ToolConfig>(
      "GET",
      `/v1/tools/${encodeURIComponent(toolId)}`,
    );
  }

  /**
   * Full-replacement update of the tool. All mutable fields are atomically
   * overwritten with the request body.
   *
   * @param toolId - UUID of the tool to replace.
   * @param req - Full tool configuration.
   * @throws {AudactError} 400/404/409 as appropriate — see {@link createTool}.
   */
  async replaceTool(toolId: string, req: CreateToolRequest): Promise<ToolConfig> {
    return this.request<ToolConfig>(
      "PUT",
      `/v1/tools/${encodeURIComponent(toolId)}`,
      req,
    );
  }

  /**
   * Partially updates the tool — only the supplied fields change; omitted
   * fields keep their current value. The merged configuration is validated
   * server-side before any write occurs.
   *
   * @param toolId - UUID of the tool to update.
   * @param req - Only the fields to change.
   * @throws {AudactError} 400/404/409 as appropriate — see {@link createTool}.
   */
  async updateTool(toolId: string, req: UpdateToolRequest): Promise<ToolConfig> {
    return this.request<ToolConfig>(
      "PATCH",
      `/v1/tools/${encodeURIComponent(toolId)}`,
      req,
    );
  }

  /**
   * Soft-deletes the tool. Returns 409 if the tool is still attached to any
   * agents, unless `force` is set to cascade-detach it first.
   *
   * @param toolId - UUID of the tool to delete.
   * @param force - Cascade-detach from all agents before deleting.
   * @throws {AudactError} 404 if not found; 409 if attached and `force` is
   *                       not set.
   */
  async deleteTool(toolId: string, force = false): Promise<DeleteToolResponse> {
    const query = force ? "?force=true" : "";
    return this.request<DeleteToolResponse>(
      "DELETE",
      `/v1/tools/${encodeURIComponent(toolId)}${query}`,
    );
  }

  /**
   * Validates a platform-supplied tool (e.g. Cal.com) end-to-end without
   * ever creating a real booking: confirms the connection is active, the
   * configured event type resolves, and runs a kind-specific probe.
   *
   * @param toolId - UUID of the tool to test.
   * @throws {AudactError} 400 if the tool is not a platform tool or the
   *                       provider is unsupported; 404 if the tool or its
   *                       connection is not found; 409 if the connection is
   *                       not active; 500 if the test probe is not
   *                       configured server-side.
   */
  async testTool(toolId: string): Promise<TestToolResponse> {
    return this.request<TestToolResponse>(
      "POST",
      `/v1/tools/${encodeURIComponent(toolId)}/test`,
    );
  }

  // ── Agent-tool attachment ───────────────────────────────────────────────────

  /**
   * Returns tools currently attached to `agentId`, ordered by attachment
   * time (oldest first), as a paginated `{items, has_more, next_cursor}`
   * envelope.
   *
   * @param agentId - UUID of the agent.
   * @param options - Optional `limit`/`cursor` paging.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listAgentTools(
    agentId: string,
    options: ListAgentToolsOptions = {},
  ): Promise<ListAgentToolsResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListAgentToolsResponse>(
      "GET",
      query
        ? `/v1/agents/${encodeURIComponent(agentId)}/tools?${query}`
        : `/v1/agents/${encodeURIComponent(agentId)}/tools`,
    );
  }

  /**
   * Attaches an existing tool to an agent. Both must belong to the
   * authenticated tenant. Idempotent: attaching an already-attached pair is
   * silently accepted.
   *
   * @param agentId - UUID of the agent.
   * @param toolId - UUID of the tool to attach.
   * @throws {AudactError} 400 on an invalid tool_id; 404 if the agent or
   *                       tool is not found.
   */
  async attachToolToAgent(
    agentId: string,
    toolId: string,
  ): Promise<AttachToolResponse> {
    const req: AttachToolRequest = { tool_id: toolId };
    return this.request<AttachToolResponse>(
      "POST",
      `/v1/agents/${encodeURIComponent(agentId)}/tools`,
      req,
    );
  }

  /**
   * Removes the agent-tool attachment. No-op if the tool is not currently
   * attached to the agent.
   *
   * @param agentId - UUID of the agent.
   * @param toolId - UUID of the tool to detach.
   * @throws {AudactError} 400 on an invalid UUID.
   */
  async detachToolFromAgent(
    agentId: string,
    toolId: string,
  ): Promise<DetachToolResponse> {
    return this.request<DetachToolResponse>(
      "DELETE",
      `/v1/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolId)}`,
    );
  }
}

// ─── KnowledgeBasesClient ─────────────────────────────────────────────────────

/**
 * Client for the Audact knowledge-base (RAG) API on the Tenant Management
 * service (port 8085): KB CRUD, source ingestion, agent links
 * with retrieval tuning, crawl exclusions, and the retrieval test harness.
 *
 * Method names are the spec operationIds. All calls are tenant-scoped by the
 * API key; a KB, source or link belonging to another tenant is a 404.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const kb = await client.knowledgeBases.createKnowledgeBase({ name: "Product FAQ" });
 * await client.knowledgeBases.addKBSource(kb.kb_id, {
 *   type: "url",
 *   url: "https://docs.example.com",
 * });
 * await client.knowledgeBases.putKBAgentLink(kb.kb_id, agentId, { top_k: 5 });
 *
 * const { hits, empty } = await client.knowledgeBases.testKBRetrieval(kb.kb_id, {
 *   question: "What is the refund policy?",
 * });
 * ```
 */
export class KnowledgeBasesClient extends BaseServiceClient {
  // ── Knowledge base CRUD ────────────────────────────────────────────────────

  /**
   * Returns a cursor-paginated page of knowledge bases for the authenticated
   * tenant, ordered by kb_id ascending.
   *
   * @param options - Optional `limit` (default 20, max 100) and `cursor`.
   * @throws {AudactError} 400 on an invalid limit/cursor.
   */
  async listKnowledgeBases(
    options: ListKnowledgeBasesOptions = {},
  ): Promise<ListKnowledgeBasesResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ListKnowledgeBasesResponse>(
      "GET",
      query ? `/v1/knowledge-bases?${query}` : "/v1/knowledge-bases",
    );
  }

  /**
   * Creates a knowledge base. The kb_id is server-generated.
   *
   * @param req - Name (required), auto_refresh and robots_policy.
   * @throws {AudactError} 400 on a validation error.
   */
  async createKnowledgeBase(
    req: CreateKnowledgeBaseRequest,
  ): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>("POST", "/v1/knowledge-bases", req);
  }

  /**
   * Returns a single knowledge base.
   *
   * @param kbId - UUID of the knowledge base.
   * @throws {AudactError} 404 if missing or owned by another tenant.
   */
  async getKnowledgeBase(kbId: string): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>(
      "GET",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}`,
    );
  }

  /**
   * Renames the knowledge base and/or toggles auto_refresh. Omitted fields
   * are left unchanged.
   *
   * @param kbId - UUID of the knowledge base.
   * @param req - Only the fields to change.
   * @throws {AudactError} 400 on a validation error; 404 if not found.
   */
  async patchKnowledgeBase(
    kbId: string,
    req: PatchKnowledgeBaseRequest,
  ): Promise<KnowledgeBase> {
    return this.request<KnowledgeBase>(
      "PATCH",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}`,
      req,
    );
  }

  /**
   * Irreversibly deletes the knowledge base with all its sources, chunks and
   * agent links (204 No Content). Requires the owner role.
   *
   * @param kbId - UUID of the knowledge base.
   * @throws {AudactError} 404 if not found.
   */
  async deleteKnowledgeBase(kbId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}`,
    );
  }

  // ── Sources ────────────────────────────────────────────────────────────────

  /**
   * Returns every source of the knowledge base, ordered by created_at
   * ascending, with status and ingest_version.
   *
   * @param kbId - UUID of the knowledge base.
   * @throws {AudactError} 404 if the knowledge base is not found.
   */
  async listKBSources(kbId: string): Promise<ListKBSourcesResponse> {
    return this.request<ListKBSourcesResponse>(
      "GET",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources`,
    );
  }

  /**
   * Adds a url or text source (JSON) and enqueues ingestion. The server
   * answers 202 immediately; poll {@link getKBSource} for `status`. Upload
   * file sources with {@link uploadKBSourceFile} instead.
   *
   * @param kbId - UUID of the knowledge base.
   * @param req - `{type: "url", url}` or `{type: "text", content}`.
   * @throws {AudactError} 400 on a validation error or exceeded per-KB limit;
   *                       404 if the knowledge base is not found.
   */
  async addKBSource(kbId: string, req: AddKBSourceRequest): Promise<KBSource> {
    return this.request<KBSource>(
      "POST",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources`,
      req,
    );
  }

  /**
   * Uploads a file source (the multipart form of the `addKBSource`
   * operation, field `file`) and enqueues ingestion (202). The body is
   * `FormData`, so `fetch` sets the `multipart/form-data; boundary=...`
   * Content-Type itself.
   *
   * @param kbId - UUID of the knowledge base.
   * @param file - File contents, max 50 MiB.
   * @param options - Optional display `filename` and per-source `config`.
   * @throws {AudactError} 400 on an oversized file or exceeded per-KB limit;
   *                       404 if the knowledge base is not found; 503 if file
   *                       uploads are not configured for the deployment.
   */
  async uploadKBSourceFile(
    kbId: string,
    file: Blob,
    options: UploadKBSourceFileOptions = {},
  ): Promise<KBSource> {
    const form = new FormData();
    form.append("file", file, options.filename);
    if (options.filename !== undefined) form.append("filename", options.filename);
    if (options.config !== undefined) {
      form.append("config", JSON.stringify(options.config));
    }
    return this.request<KBSource>(
      "POST",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources`,
      form,
    );
  }

  /**
   * Returns a single source, including status, ingest_version, title and
   * content_preview.
   *
   * @param kbId - UUID of the knowledge base.
   * @param sourceId - UUID of the source.
   * @throws {AudactError} 404 if not found in this tenant and KB.
   */
  async getKBSource(kbId: string, sourceId: string): Promise<KBSource> {
    return this.request<KBSource>(
      "GET",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources/${encodeURIComponent(sourceId)}`,
    );
  }

  /**
   * Updates a source's title and/or (text sources only) its content. Editing
   * content re-chunks and re-embeds under a new ingest_version.
   *
   * @param kbId - UUID of the knowledge base.
   * @param sourceId - UUID of the source.
   * @param req - At least one of `title`/`content`.
   * @throws {AudactError} 400 when no field is given, a value is too long, or
   *                       content is sent for a url/file source; 404 if not found.
   */
  async patchKBSource(
    kbId: string,
    sourceId: string,
    req: PatchKBSourceRequest,
  ): Promise<KBSource> {
    return this.request<KBSource>(
      "PATCH",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources/${encodeURIComponent(sourceId)}`,
      req,
    );
  }

  /**
   * Re-ingests a source: bumps ingest_version, resets status to pending and
   * enqueues a new job (202 with the updated source).
   *
   * @param kbId - UUID of the knowledge base.
   * @param sourceId - UUID of the source.
   * @throws {AudactError} 404 if not found.
   */
  async reingestKBSource(kbId: string, sourceId: string): Promise<KBSource> {
    return this.request<KBSource>(
      "POST",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources/${encodeURIComponent(sourceId)}/reingest`,
    );
  }

  /**
   * Removes a source and all its ingested chunks (204 No Content).
   *
   * @param kbId - UUID of the knowledge base.
   * @param sourceId - UUID of the source.
   * @throws {AudactError} 404 if not found.
   */
  async deleteKBSource(kbId: string, sourceId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/sources/${encodeURIComponent(sourceId)}`,
    );
  }

  // ── Agent links ────────────────────────────────────────────────────────────

  /**
   * Returns every agent linked to the knowledge base, ordered by created_at.
   *
   * @param kbId - UUID of the knowledge base.
   * @throws {AudactError} 404 if the knowledge base is not found.
   */
  async listKBAgentLinks(kbId: string): Promise<ListKBAgentLinksResponse> {
    return this.request<ListKBAgentLinksResponse>(
      "GET",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/agents`,
    );
  }

  /**
   * Returns every knowledge-base link of one agent, ordered by created_at
   * (`GET /v1/knowledge-bases/agent-links?agent_id=`).
   *
   * @param agentId - UUID of the agent (required).
   * @throws {AudactError} 400 on a missing/invalid agent_id.
   */
  async listKBLinksByAgent(agentId: string): Promise<ListKBAgentLinksResponse> {
    const params = new URLSearchParams({ agent_id: agentId });
    return this.request<ListKBAgentLinksResponse>(
      "GET",
      `/v1/knowledge-bases/agent-links?${params.toString()}`,
    );
  }

  /**
   * Creates or replaces the link between a knowledge base and an agent of the
   * same tenant. Omitted tuning fields take the defaults (top_k=3,
   * similarity_threshold=0.6, retrieval_instruction=""); with no `req` the
   * request carries no body. The retrieval cache is invalidated immediately.
   *
   * @param kbId - UUID of the knowledge base.
   * @param agentId - UUID of the agent.
   * @param req - Optional retrieval tuning.
   * @throws {AudactError} 400 on out-of-range tuning; 404 if the KB or agent
   *                       is not found in this tenant.
   */
  async putKBAgentLink(
    kbId: string,
    agentId: string,
    req?: PutKBAgentLinkRequest,
  ): Promise<KBAgentLink> {
    return this.request<KBAgentLink>(
      "PUT",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/agents/${encodeURIComponent(agentId)}`,
      req,
    );
  }

  /**
   * Partially updates an existing link's retrieval tuning; absent fields keep
   * their current values.
   *
   * @param kbId - UUID of the knowledge base.
   * @param agentId - UUID of the agent.
   * @param req - Only the fields to change.
   * @throws {AudactError} 400 on out-of-range tuning; 404 if the link does not exist.
   */
  async patchKBAgentLink(
    kbId: string,
    agentId: string,
    req: PatchKBAgentLinkRequest,
  ): Promise<KBAgentLink> {
    return this.request<KBAgentLink>(
      "PATCH",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/agents/${encodeURIComponent(agentId)}`,
      req,
    );
  }

  /**
   * Removes the link between a knowledge base and an agent (204 No Content).
   *
   * @param kbId - UUID of the knowledge base.
   * @param agentId - UUID of the agent.
   * @throws {AudactError} 404 if the link does not exist.
   */
  async deleteKBAgentLink(kbId: string, agentId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/agents/${encodeURIComponent(agentId)}`,
    );
  }

  // ── Crawl exclusions ───────────────────────────────────────────────────────

  /**
   * Returns every crawl exclusion rule of the knowledge base, ordered by
   * created_at ascending.
   *
   * @param kbId - UUID of the knowledge base.
   * @throws {AudactError} 404 if the knowledge base is not found.
   */
  async listExclusions(kbId: string): Promise<ListKBExclusionsResponse> {
    return this.request<ListKBExclusionsResponse>(
      "GET",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/exclusions`,
    );
  }

  /**
   * Adds a crawl exclusion rule — exactly one of `crawl_path` or `url`.
   *
   * @param kbId - UUID of the knowledge base.
   * @param req - The rule.
   * @throws {AudactError} 400 when both/neither are given, an entry exceeds
   *                       200 characters, or the KB has 500 rules; 404 if the
   *                       knowledge base is not found.
   */
  async addExclusion(
    kbId: string,
    req: AddKBExclusionRequest,
  ): Promise<KBCrawlExclusion> {
    return this.request<KBCrawlExclusion>(
      "POST",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/exclusions`,
      req,
    );
  }

  /**
   * Removes a crawl exclusion rule, reinstating the path/URL for future
   * crawls (204 No Content).
   *
   * @param kbId - UUID of the knowledge base.
   * @param exclusionId - UUID of the exclusion rule.
   * @throws {AudactError} 404 if the KB or rule is not found.
   */
  async deleteExclusion(kbId: string, exclusionId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/exclusions/${encodeURIComponent(exclusionId)}`,
    );
  }

  // ── Retrieval test harness ─────────────────────────────────────────────────

  /**
   * Runs an ad-hoc retrieval against the knowledge base and returns the
   * condensed query and ranked hits. No hits is HTTP 200 with
   * `empty: true`, not an error.
   *
   * @param kbId - UUID of the knowledge base.
   * @param req - `question` or `turns`, plus optional `top_k`/`threshold`.
   * @throws {AudactError} 400 on an invalid request; 404 if the knowledge
   *                       base is not found.
   */
  async testKBRetrieval(
    kbId: string,
    req: KBTestRetrievalRequest,
  ): Promise<KBTestRetrievalResponse> {
    return this.request<KBTestRetrievalResponse>(
      "POST",
      `/v1/knowledge-bases/${encodeURIComponent(kbId)}/test-retrieval`,
      req,
    );
  }
}

// ─── IntegrationsClient ───────────────────────────────────────────────────────

/**
 * Client for the Audact Agent Worker's integration connection API (port
 * 8089): Cal.com bring-your-own-account (API-key) and OAuth connection
 * lifecycle, a live health-check probe, and event-type discovery for
 * configuring platform tools.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * // Bring-your-own-account: paste an existing Cal.com API key.
 * const conn = await client.integrations.createConnection({
 *   name: "My Cal.com Account",
 *   api_key: "cal_live_...",
 * });
 *
 * // Or start the OAuth flow and redirect the user's browser to the URL.
 * const { authorize_url } = await client.integrations.calcomOauthStart({
 *   name: "My Cal.com Account",
 * });
 *
 * const { event_types } = await client.integrations.listConnectionEventTypes(
 *   conn.connection_id,
 * );
 * ```
 */
export class IntegrationsClient extends BaseServiceClient {
  // ── Connection CRUD ────────────────────────────────────────────────────────

  /**
   * Lists all non-deleted connections for the authenticated tenant.
   * Credentials are always masked — the response only ever includes
   * `has_api_key`/`has_oauth_token` booleans, never an ARN or token.
   *
   * @param options - Optional `provider` filter (e.g. "cal_com").
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async listConnections(
    options: ListConnectionsOptions = {},
  ): Promise<ListConnectionsResponse> {
    const params = new URLSearchParams();
    if (options.provider !== undefined) params.set("provider", options.provider);
    const query = params.toString();
    return this.request<ListConnectionsResponse>(
      "GET",
      query ? `/v1/integrations?${query}` : "/v1/integrations",
    );
  }

  /**
   * Creates a bring-your-own-account Cal.com connection using a pasted API
   * key (Settings → Developer → API Keys in the user's own Cal.com account).
   * The raw key is written to AWS Secrets Manager; only its ARN is stored.
   * Use {@link calcomOauthStart} for OAuth connections instead.
   *
   * @param req - Connection configuration.
   * @throws {AudactError} 400 on an invalid request, 409 on a name conflict.
   */
  async createConnection(req: CreateConnectionRequest): Promise<Connection> {
    return this.request<Connection>("POST", "/v1/integrations", req);
  }

  /**
   * Retrieves the connection identified by `connectionId`, scoped to the
   * authenticated tenant. Credentials are always masked.
   *
   * @param connectionId - UUID of the connection.
   * @throws {AudactError} 404 if not found for this tenant (cross-tenant
   *                       lookups also return 404, to prevent information
   *                       leakage).
   */
  async getConnection(connectionId: string): Promise<Connection> {
    return this.request<Connection>(
      "GET",
      `/v1/integrations/${encodeURIComponent(connectionId)}`,
    );
  }

  /**
   * Soft-deletes (revokes) the connection. Without `force`, returns 409 if
   * any platform tool still references it. With `force: true`, dependent
   * tools are cascade-soft-deleted first, then the connection, then (for
   * api_key connections) the Secrets Manager secret is scheduled for
   * deletion. No silent fallback to another connection.
   *
   * @param connectionId - UUID of the connection to delete.
   * @param options - `force`: cascade-deletes dependent tools first.
   * @throws {AudactError} 404 if not found, 409 if dependent tools exist and
   *                       `force` is not set.
   */
  async deleteConnection(
    connectionId: string,
    options: DeleteConnectionOptions = {},
  ): Promise<DeleteConnectionResponse> {
    const params = new URLSearchParams();
    if (options.force !== undefined) params.set("force", String(options.force));
    const query = params.toString();
    const path = `/v1/integrations/${encodeURIComponent(connectionId)}`;
    return this.request<DeleteConnectionResponse>(
      "DELETE",
      query ? `${path}?${query}` : path,
    );
  }

  /**
   * Performs a live Cal.com health check: resolves current credentials
   * (transparently refreshing an expiring OAuth token) and calls `GET
   * /v2/event-types`. Updates `health`/`last_checked_at`/`last_error` and
   * always returns 200 with a distinguishable healthy/health/error outcome —
   * never a raw credential or Cal.com error message.
   *
   * @param connectionId - UUID of the connection to test.
   * @throws {AudactError} 404 if not found, 500 if connection testing is not
   *                       configured server-side.
   */
  async testConnection(connectionId: string): Promise<TestConnectionResponse> {
    return this.request<TestConnectionResponse>(
      "POST",
      `/v1/integrations/${encodeURIComponent(connectionId)}/test`,
    );
  }

  // ── Event types ────────────────────────────────────────────────────────────

  /**
   * Resolves the connection's current credentials and returns the tenant's
   * own Cal.com event types (`GET /v2/event-types`), for use when configuring
   * a platform tool's `event_type_id`/`event_type_slug`.
   *
   * @param connectionId - UUID of the connection.
   * @throws {AudactError} 404 if not found, 409 if the connection is revoked
   *                       or needs re-authorization, 429 if Cal.com
   *                       rate-limits the request, 502 if Cal.com is
   *                       currently unavailable.
   */
  async listConnectionEventTypes(
    connectionId: string,
  ): Promise<ListConnectionEventTypesResponse> {
    return this.request<ListConnectionEventTypesResponse>(
      "GET",
      `/v1/integrations/${encodeURIComponent(connectionId)}/event-types`,
    );
  }

  // ── Cal.com OAuth ──────────────────────────────────────────────────────────

  /**
   * Mints a single-use state token bound to the authenticated tenant
   * (10-minute TTL) and returns the Cal.com authorize URL to redirect the
   * user's browser to. The callback ({@link calcomOauthCallback}) is
   * unauthenticated by design — it recovers the tenant from this state
   * token, never from a request parameter.
   *
   * @param options - Optional `name` (defaults server-side) and
   *                  `cal_username` (disambiguates event types by slug).
   * @throws {AudactError} 500 if OAuth is not configured or the state store
   *                       fails.
   */
  async calcomOauthStart(
    options: CalcomOauthStartOptions = {},
  ): Promise<CalcomOauthStartResponse> {
    const params = new URLSearchParams();
    if (options.name !== undefined) params.set("name", options.name);
    if (options.cal_username !== undefined) {
      params.set("cal_username", options.cal_username);
    }
    const query = params.toString();
    const path = "/v1/integrations/cal_com/oauth/start";
    return this.request<CalcomOauthStartResponse>(
      "GET",
      query ? `${path}?${query}` : path,
    );
  }

  /**
   * Handles Cal.com's OAuth redirect. Authenticated ONLY by the single-use
   * `state` token — Cal.com redirects the user's browser here directly,
   * which cannot carry a Bearer header, so (unlike every other method on
   * this client) this sends no `Authorization` header at all. In normal
   * operation this URL is never fetched by SDK code, only navigated to by
   * the browser; this method exists for server-side integration testing.
   *
   * Success is an HTTP redirect (302 to the dashboard), not a 2xx JSON
   * body, so this bypasses {@link BaseServiceClient.request}/
   * {@link BaseServiceClient.requestRaw} (which treat any non-2xx status,
   * including 3xx, as an error) and returns the raw {@link Response}
   * directly for 2xx/3xx responses; only 4xx/5xx are parsed and thrown as
   * {@link AudactError}.
   *
   * @param state - Single-use state token minted by {@link calcomOauthStart}.
   * @param options - `code`: the authorization code (absent when `error` is
   *                  set); `error`: Cal.com's error code when the user
   *                  declined consent.
   * @throws {AudactError} 400 for an unknown/expired state or missing code,
   *                       500 if OAuth is not configured, 502 if the Cal.com
   *                       token exchange fails.
   */
  async calcomOauthCallback(
    state: string,
    options: CalcomOauthCallbackOptions = {},
  ): Promise<Response> {
    const params = new URLSearchParams({ state });
    if (options.code !== undefined) params.set("code", options.code);
    if (options.error !== undefined) params.set("error", options.error);
    const url = `${this.baseUrl}/v1/integrations/cal_com/oauth/callback?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, { method: "GET" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network request failed";
      throw new AudactError(msg, 0, null);
    }

    if (response.status >= 400) {
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
      } catch {
        // Ignore parse errors on error responses.
      }
      const requestId = response.headers.get("X-Request-ID") ?? undefined;
      const message =
        typeof errorBody === "object" &&
        errorBody !== null &&
        "message" in errorBody
          ? String((errorBody as Record<string, unknown>).message)
          : `HTTP ${response.status}`;
      throw new AudactError(message, response.status, errorBody, requestId);
    }

    return response;
  }
}

// ─── OrgClient ────────────────────────────────────────────────────────────────

/**
 * Client for the Audact Org Management service's self-service surface (port
 * 8092): org signup/login/session lifecycle and org profile/KYC management.
 *
 * Unlike every other sub-client, this one does **not** authenticate with the
 * tenant API key — it uses `OrgBearer`, a per-organization JWT obtained via
 * {@link signup}/{@link login} (or supplied up front via
 * `AudactClientOptions.orgToken`). {@link signup}, {@link login}, and
 * {@link refresh} all store the returned access token on this client
 * instance (via `setAuthToken`, inherited from `BaseServiceClient`) so that
 * subsequent `client.org.*` calls carry it automatically; {@link logout}
 * clears it. Token storage is in-memory only — nothing is written to disk.
 *
 * The org-tenant lifecycle (`client.org.tenants` equivalent, still
 * OrgBearer) and the platform-admin org surface (`client.platform.orgs`,
 * PlatformBearer) are separate sub-clients added in later tasks.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "unused-for-org-routes" });
 *
 * await client.org.login({ email: "admin@acme.example", password: "hunter222222" });
 * // client.org.* now sends `Authorization: Bearer <jwt>` automatically.
 * const { org, admin } = await client.org.getProfile();
 * ```
 */
export class OrgClient extends BaseServiceClient {
  // ── Auth / session lifecycle ────────────────────────────────────────────────

  /**
   * Creates a brand-new organization (`verification_status: "unverified"`),
   * its first org_admin, and its initial KYC record, all atomically. Public —
   * no bearer required. Stores the returned access token on this client so
   * subsequent `client.org.*` calls are authenticated immediately.
   *
   * @param req - Signup payload. `entity_type` must be exactly `"individual"`
   *              or `"company"`; `country` must be an ISO 3166-1 alpha-2 code.
   * @throws {AudactError} 400 on a malformed body/invalid `entity_type`,
   *                       `country`, or email, or a too-short password;
   *                       409 if the email is already taken; 422 if `kyc` is
   *                       provided but malformed; 429 if the per-IP signup
   *                       rate limit is exceeded (`Retry-After` header set).
   */
  async signup(req: OrgSignupRequest): Promise<OrgSignupResponse> {
    const res = await this.request<OrgSignupResponse>(
      "POST",
      "/v1/org/signup",
      req,
    );
    this.setAuthToken(res.token);
    return res;
  }

  /**
   * Authenticates an org_admin by email/password. Public — no bearer
   * required. Always returns the identical 401 for both an unknown email and
   * a wrong password (no user-enumeration timing oracle). Stores the
   * returned access token on this client so subsequent `client.org.*` calls
   * are authenticated immediately.
   *
   * @param req - Login payload.
   * @throws {AudactError} 401 `invalid_credentials`; 429
   *                       `rate_limit_exceeded` after 10 attempts per
   *                       15-minute window per email (`Retry-After` header
   *                       set).
   */
  async login(req: OrgLoginRequest): Promise<OrgLoginResponse> {
    const res = await this.request<OrgLoginResponse>(
      "POST",
      "/v1/org/login",
      req,
    );
    this.setAuthToken(res.token);
    return res;
  }

  /**
   * Rotates the org refresh token (server-side, via an httpOnly cookie — not
   * a parameter of this method) and mints a fresh access token, which
   * replaces the token stored on this client. Browser-first: non-browser/
   * MCP clients that cannot participate in a `Set-Cookie` round trip should
   * re-authenticate via {@link login} instead when the access token expires.
   *
   * @throws {AudactError} 401 if the refresh token is missing, unknown, or
   *                       expired.
   */
  async refresh(): Promise<OrgRefreshResponse> {
    const res = await this.request<OrgRefreshResponse>(
      "POST",
      "/v1/org/refresh",
    );
    this.setAuthToken(res.token);
    return res;
  }

  /**
   * Revokes the current refresh-token session and clears the access token
   * stored on this client. Idempotent — the server always returns 204, even
   * without an active refresh session.
   *
   * @throws {AudactError} 401 if no valid access token is set.
   */
  async logout(): Promise<void> {
    await this.request<void>("POST", "/v1/org/logout");
    this.setAuthToken(undefined);
  }

  // ── Profile ──────────────────────────────────────────────────────────────────

  /**
   * Returns the calling organization and admin account. Scoped to the
   * org/admin identified by the OrgBearer session — never by a request
   * parameter.
   *
   * @throws {AudactError} 401 if not authenticated, 404 if the org/admin no
   *                       longer exists.
   */
  async getProfile(): Promise<OrgProfileResponse> {
    return this.request<OrgProfileResponse>("GET", "/v1/org/profile");
  }

  /**
   * Updates the organization display name and/or the calling admin's
   * display name. Absent/empty fields are left unchanged.
   *
   * @param req - Fields to update.
   * @throws {AudactError} 400 on a malformed body, 401 if not authenticated.
   */
  async updateProfile(
    req: OrgUpdateProfileRequest,
  ): Promise<OrgProfileResponse> {
    return this.request<OrgProfileResponse>(
      "PATCH",
      "/v1/org/profile",
      req,
    );
  }

  // ── KYC ────────────────────────────────────────────────────────────────────

  /**
   * Returns the calling organization's KYC record. Scoped to the org
   * identified by the OrgBearer session.
   *
   * @throws {AudactError} 401 if not authenticated, 404 if no KYC record
   *                       exists yet.
   */
  async getKYC(): Promise<OrgKYCResponse> {
    return this.request<OrgKYCResponse>("GET", "/v1/org/kyc");
  }

  /**
   * Merges the provided KYC fields onto the organization's existing KYC
   * record. Absent fields are left unchanged.
   *
   * @param req - Subset of KYC fields to update.
   * @throws {AudactError} 400 on a malformed body, 401 if not authenticated,
   *                       422 `kyc_invalid` if a provided field fails
   *                       validation.
   */
  async updateKYC(req: OrgKYCPatchRequest): Promise<OrgKYCResponse> {
    return this.request<OrgKYCResponse>("PATCH", "/v1/org/kyc", req);
  }

  // ── Org-tenant lifecycle ─────────────────────────────────────────────────────

  /**
   * Lists tenants owned by the caller's organization, newest first, using
   * cursor pagination — pass the returned `next_cursor` as `options.cursor`
   * to fetch the next page. Soft-deleted tenants are excluded unless
   * `include_deleted` is true.
   *
   * @param options - Optional `include_deleted`, `limit` (default 50, max
   *                  200), and `cursor`.
   * @throws {AudactError} 400 on an invalid `limit`/`cursor`, 401 if not
   *                       authenticated.
   */
  async listTenants(
    options: OrgListTenantsOptions = {},
  ): Promise<OrgListTenantsResponse> {
    const params = new URLSearchParams();
    if (options.include_deleted !== undefined) {
      params.set("include_deleted", String(options.include_deleted));
    }
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<OrgListTenantsResponse>(
      "GET",
      query ? `/v1/org/tenants?${query}` : "/v1/org/tenants",
    );
  }

  /**
   * Provisions a new tenant owned by the caller's organization, WITHOUT an
   * API key or default configuration — those are deferred to
   * {@link initializeTenant}. Requires a verified organization.
   *
   * @param req - Tenant creation payload.
   * @throws {AudactError} 400 on a malformed body, 401 if not authenticated,
   *                       403 `org_not_verified`/`org_rejected`.
   */
  async createTenant(
    req: OrgCreateTenantRequest,
  ): Promise<OrgCreateTenantResponse> {
    return this.request<OrgCreateTenantResponse>(
      "POST",
      "/v1/org/tenants",
      req,
    );
  }

  /**
   * Returns a single tenant owned by the caller's organization. A
   * `tenantId` that belongs to another organization is indistinguishable
   * from one that does not exist — both return 404 `tenant_not_found`.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 404 `tenant_not_found`.
   */
  async getTenant(tenantId: string): Promise<OrgGetTenantResponse> {
    return this.request<OrgGetTenantResponse>(
      "GET",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}`,
    );
  }

  /**
   * Sets `deleted_at=NOW()` on an org-owned tenant (logical delete only —
   * the tenant's KMS HMAC key is retained, never deprovisioned) and marks
   * it disabled. Requires a verified organization.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404
   *                       `tenant_not_found`.
   */
  async softDeleteTenant(tenantId: string): Promise<OrgTenantActionResponse> {
    return this.request<OrgTenantActionResponse>(
      "DELETE",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}`,
    );
  }

  /**
   * Transitions the tenant to `status=active`, restoring its API keys.
   * Requires a verified organization.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404
   *                       `tenant_not_found`.
   */
  async enableTenant(tenantId: string): Promise<OrgTenantActionResponse> {
    return this.request<OrgTenantActionResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/enable`,
    );
  }

  /**
   * Transitions the tenant to `status=disabled`, rejecting its API keys on
   * the hot path. Requires a verified organization.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404
   *                       `tenant_not_found`.
   */
  async disableTenant(tenantId: string): Promise<OrgTenantActionResponse> {
    return this.request<OrgTenantActionResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/disable`,
    );
  }

  /**
   * Clears `deleted_at` on a currently soft-deleted tenant (the original
   * `hmac_key_arn` is reused as-is — no KMS re-provision, no new
   * configuration or key is created). Requires a verified organization.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404
   *                       `tenant_not_found`, 409 `not_deleted`.
   */
  async restoreTenant(tenantId: string): Promise<OrgTenantActionResponse> {
    return this.request<OrgTenantActionResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/restore`,
    );
  }

  /**
   * Seeds the tenant's first sealed default configuration and reveals its
   * first owner API key. Idempotent: calling it again on an
   * already-initialized tenant returns 409 `already_initialized` without
   * duplicating the configuration or re-revealing a key.
   *
   * @param tenantId - UUID of the tenant.
   * @param idempotencyKey - Optional idempotency key; a retried request
   *                         with the same key replays the original 201
   *                         response verbatim.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404 if not
   *                       found, 409 if the tenant is not active or already
   *                       initialized.
   */
  async initializeTenant(
    tenantId: string,
    idempotencyKey?: string,
  ): Promise<OrgInitializeTenantResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<OrgInitializeTenantResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/initialize`,
      undefined,
      headers,
    );
  }

  /**
   * Mints a new "owner" API key for a tenant already owned by the caller's
   * organization. Unlike {@link initializeTenant}, this does not require
   * the tenant to be initialized and does not touch configuration. The
   * full key is returned exactly once.
   *
   * @param tenantId - UUID of the tenant.
   * @param req - Optional key label (defaults to `"owner"`).
   * @param idempotencyKey - Optional idempotency key; a retried request
   *                         with the same key replays the original 201
   *                         response instead of minting a second key.
   * @throws {AudactError} 400 on a malformed body, 401 if not
   *                       authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404
   *                       `tenant_not_found`.
   */
  async issueTenantKey(
    tenantId: string,
    req: OrgIssueTenantKeyRequest = {},
    idempotencyKey?: string,
  ): Promise<OrgIssueTenantKeyResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }
    return this.request<OrgIssueTenantKeyResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/keys`,
      req,
      headers,
    );
  }

  /**
   * Mints a short-lived tenant JWT (~20 minutes) that lets the caller act
   * as the tenant's owner against tenant-facing services. Requires the
   * tenant to belong to the caller's organization and be active (not
   * disabled or soft-deleted). There is no password/confirmation step —
   * the short token lifetime is the safety mechanism.
   *
   * @param tenantId - UUID of the tenant.
   * @throws {AudactError} 401 if not authenticated, 403
   *                       `org_not_verified`/`org_rejected`, 404 if not
   *                       found, 409 `tenant_inactive`.
   */
  async impersonateTenant(
    tenantId: string,
  ): Promise<OrgImpersonateTenantResponse> {
    return this.request<OrgImpersonateTenantResponse>(
      "POST",
      `/v1/org/tenants/${encodeURIComponent(tenantId)}/impersonate`,
    );
  }
}

// ─── AggregationClient ────────────────────────────────────────────────────────

/**
 * Client for the Audact Aggregator service (port 8087): per-tenant Merkle
 * aggregation proofs, the public cross-tenant meta-chain, offline inclusion
 * verification, and the owner-only manual-aggregation trigger.
 *
 * {@link getMetachain} and {@link verifyInclusion} are public endpoints — no
 * `Authorization` header is required, though the base client still sends one
 * if an API key was configured. {@link listProofs}/{@link getProof} require
 * the tenant API key; {@link triggerAggregation} additionally requires the
 * owner role server-side.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const { proofs } = await client.aggregation.listProofs({ limit: 10 });
 * const proof = await client.aggregation.getProof(proofs[0].window_id);
 * const { valid } = await client.aggregation.verifyInclusion({
 *   leaf_hash: proof.branch_proof.leaf_hash,
 *   root: proof.merkle_root,
 *   steps: proof.branch_proof.steps,
 * });
 * ```
 */
export class AggregationClient extends BaseServiceClient {
  /**
   * Lists aggregation windows in which the authenticated tenant participated,
   * newest first, using cursor pagination.
   *
   * @param options - Optional `limit` (default 50, max 200) and `cursor`.
   * @throws {AudactError} 400 on an invalid `limit`/`cursor`, 401 if
   *                       unauthenticated.
   */
  async listProofs(options: ListProofsOptions = {}): Promise<ProofListResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<ProofListResponse>(
      "GET",
      query ? `/v1/proofs?${query}` : "/v1/proofs",
    );
  }

  /**
   * Returns the per-tenant Merkle branch proof, RFC 3161 timestamp token, and
   * aggregation metadata for a specific window.
   *
   * @param windowId - Aggregation window ID (RFC 3339 timestamp).
   * @throws {AudactError} 400 for an invalid `windowId`, 401 if
   *                       unauthenticated, 404 if the proof does not exist or
   *                       the tenant did not participate in that window.
   */
  async getProof(windowId: string): Promise<ProofResponse> {
    return this.request<ProofResponse>(
      "GET",
      `/v1/proofs/${encodeURIComponent(windowId)}`,
    );
  }

  /**
   * Returns a page of the public meta-chain (chain-of-chains) of Merkle
   * roots, in ascending sequence order. Public endpoint — no authentication
   * required.
   *
   * @param options - Optional `limit` (default 50, max 200) and `cursor`.
   * @throws {AudactError} 400 on an invalid `limit`/`cursor`.
   */
  async getMetachain(
    options: GetMetachainOptions = {},
  ): Promise<MetaChainResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<MetaChainResponse>(
      "GET",
      query ? `/v1/metachain?${query}` : "/v1/metachain",
    );
  }

  /**
   * Cryptographically verifies that a leaf hash is included in a Merkle root
   * via the supplied branch proof. Public endpoint — no authentication or
   * database access required.
   *
   * @param req - Leaf hash, Merkle root, and authentication path to verify.
   * @throws {AudactError} 400 on a malformed request body or missing fields.
   */
  async verifyInclusion(
    req: VerifyInclusionRequest,
  ): Promise<VerifyInclusionResponse> {
    return this.request<VerifyInclusionResponse>(
      "POST",
      "/v1/verify-inclusion",
      req,
    );
  }

  /**
   * Triggers the Merkle aggregation pipeline for a specified or
   * server-computed time window. Admin-only: requires the owner role.
   *
   * @param req - Optional explicit window boundaries; when omitted the
   *              server computes the window.
   * @throws {AudactError} 400 on invalid window parameters, 401 if
   *                       unauthenticated, 403 if the caller is not an
   *                       owner.
   */
  async triggerAggregation(
    req: AdminAggregateRequest = {},
  ): Promise<AdminAggregateResponse> {
    return this.request<AdminAggregateResponse>(
      "POST",
      "/v1/admin/aggregate",
      req,
    );
  }

  /**
   * Returns the health status of the Aggregator service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── PolicyClient ─────────────────────────────────────────────────────────────

/**
 * Client for the Audact Policy Engine service (port 8081): tenant-agnostic
 * jurisdiction compliance policy evaluation, full policy documents, and a
 * task-oriented calling-hours pre-check.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const { allowed, next_permitted_at } = await client.policy.checkCallingHours({
 *   country: "NL",
 * });
 * if (!allowed) {
 *   console.log("Next permitted at:", next_permitted_at);
 * }
 * ```
 */
export class PolicyClient extends BaseServiceClient {
  /**
   * Evaluates tenant-specific compliance policies with jurisdiction
   * cascading and returns an allow/deny verdict.
   *
   * When `req.language` (BCP-47, e.g. `"de-DE"`) is supplied, the response
   * also includes `require_disclosure`/`disclosure_text` — the exact text
   * the voice pipeline must synthesise via TTS at call start — and
   * `disclosure_language`, the BCP-47 key that text was actually resolved
   * under. Caller language wins: the caller's requested language is
   * resolved against the language-indexed catalog first, falling back to
   * the jurisdiction's own templates (and finally en-US) only when the
   * caller's language has no catalog entry at all.
   *
   * @throws {AudactError} 400 on an invalid request or unsupported country.
   */
  async evaluatePolicy(
    req: EvaluatePolicyRequest,
  ): Promise<EvaluatePolicyResponse> {
    return this.request<EvaluatePolicyResponse>("POST", "/v1/evaluate", req);
  }

  /**
   * Retrieves the complete policy document for a country, including use
   * cases and quiet hours.
   *
   * @param country - ISO 3166-1 alpha-2 country code (e.g. `"NL"`, `"DE"`, `"FR"`).
   * @throws {AudactError} 404 if the country policy does not exist.
   */
  async getPolicy(country: string): Promise<GetPolicyResponse> {
    return this.request<GetPolicyResponse>(
      "GET",
      `/v1/policies/${encodeURIComponent(country)}`,
    );
  }

  /**
   * Task-oriented convenience check: returns whether an outbound call is
   * currently permitted for a jurisdiction under its quiet-hours/holiday
   * rules, and the next permitted time when it is not. Lets MCP/LLM callers
   * "check then act" instead of attempting a call and parsing a 403.
   *
   * Only reflects quiet-hours/holiday timing — it does NOT evaluate
   * consent, DNC, or other per-call conditions. Use {@link evaluatePolicy}
   * for the full compliance verdict.
   *
   * @throws {AudactError} 400 if `country` is missing or unsupported.
   */
  async checkCallingHours(
    options: CheckCallingHoursOptions,
  ): Promise<CallingHoursCheckResponse> {
    const params = new URLSearchParams({ country: options.country });
    if (options.call_time !== undefined) {
      params.set("call_time", options.call_time);
    }
    return this.request<CallingHoursCheckResponse>(
      "GET",
      `/v1/calling-hours/check?${params.toString()}`,
    );
  }

  /**
   * Returns the health status of the Policy Engine service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── AudioClient ──────────────────────────────────────────────────────────────

/**
 * Client for the Audact Audio Validator service (port 8086): per-turn audio
 * compliance validation and post-call audio-to-transcript reconciliation.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 *
 * const result = await client.audio.validateAudio({
 *   call_id: "a1b2c3d4-...",
 *   turn_number: 1,
 *   audio_data: base64PcmBytes,
 *   audio_format: "pcm_s16le_16000",
 * });
 * if (result.verdict === "BLOCK") {
 *   // use the substituted/blocked routing action from result.segments
 * }
 * ```
 */
export class AudioClient extends BaseServiceClient {
  /**
   * Receives base64-encoded PCM audio, performs ASR transcription and
   * compliance validation. Returns per-segment verdicts (ALLOW/BLOCK/
   * MODIFY), an audio routing action (forward/substitute/block), and a
   * compliance receipt carrying an HMAC integrity tag, with dual
   * `audio_hash` + `text_hash`.
   *
   * @throws {AudactError} 400 on a malformed request, 401/403 on auth failure.
   */
  async validateAudio(
    req: ValidateAudioRequest,
  ): Promise<ValidateAudioResponse> {
    return this.request<ValidateAudioResponse>(
      "POST",
      "/v1/validate-audio",
      req,
    );
  }

  /**
   * Accepts a full call recording, transcribes it via ASR, and reconciles
   * the transcription segment-by-segment against the validated output
   * events in the evidence chain.
   *
   * This is a SYNCHRONOUS endpoint — the call blocks until transcription
   * and reconciliation are complete; for long recordings this may take
   * several seconds. Supports PCM (`pcm_s16le_16000`), WAV, and MP3 audio
   * formats.
   *
   * When `req.configuration_id` is supplied, the per-agent ASR credentials
   * from that configuration are used; omit it to fall back to the tenant's
   * first active configuration, or to the global ASR client when none is
   * configured.
   *
   * @param options - `limit`/`after_sequence` page through `segment_results`;
   *                  `idempotencyKey` replays the original response for
   *                  retried requests with the same key.
   * @throws {AudactError} 400 on invalid request (missing fields, bad audio
   *                       format); 403 if the call does not belong to the
   *                       authenticated tenant.
   */
  async reconcileAudio(
    req: AudioReconciliationRequest,
    options: ReconcileAudioOptions = {},
  ): Promise<AudioReconciliationResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) {
      params.set("limit", String(options.limit));
    }
    if (options.after_sequence !== undefined) {
      params.set("after_sequence", String(options.after_sequence));
    }
    const query = params.toString();
    const path = query
      ? `/v1/audio-reconciliation?${query}`
      : "/v1/audio-reconciliation";

    const headers: Record<string, string> = {};
    if (options.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    return this.request<AudioReconciliationResponse>(
      "POST",
      path,
      req,
      headers,
    );
  }

  /**
   * Returns the health status of the Audio Validator service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}

// ─── AuthClient ───────────────────────────────────────────────────────────────

/**
 * Client for the Tenant Management service's API-key ↔ JWT session bridge
 * (port 8085, `/v1/auth/*`): built for dashboard-style UIs that want a
 * short-lived JWT instead of sending the raw tenant API key on every
 * request.
 *
 * `exchangeKey()` requires the tenant API key (sent automatically as
 * `Authorization: Bearer <apiKey>` by {@link BaseServiceClient}) and returns
 * a 15-minute access token; the server also sets a 7-day refresh token as an
 * httpOnly, `SameSite=Strict` cookie scoped to `/v1/auth`. `refreshToken()`
 * reads that cookie (never present in either JSON body) to rotate both
 * tokens — the caller's `fetch` runtime must retain and resend cookies
 * (e.g. a browser, or Node with an explicit cookie jar) for this to work.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_..." });
 * const { access_token, expires_in } = await client.auth.exchangeKey();
 * // ... later, once the access token nears expiry:
 * const rotated = await client.auth.refreshToken();
 * ```
 */
export class AuthClient extends BaseServiceClient {
  /**
   * Validates the Bearer API key and issues a short-lived access token
   * (15 min, in the response body) plus a long-lived refresh token (7 days,
   * as an httpOnly cookie).
   *
   * @throws {AudactError} 401 if the API key is invalid.
   */
  async exchangeKey(): Promise<ExchangeKeyResponse> {
    return this.request<ExchangeKeyResponse>("POST", "/v1/auth/exchange-key");
  }

  /**
   * Validates the refresh-token cookie set by {@link exchangeKey} (or a
   * previous `refreshToken()` call) and issues a new access token plus a
   * rotated refresh token (single-use rotation).
   *
   * @throws {AudactError} 401 if the refresh token is missing, invalid, or expired.
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>("POST", "/v1/auth/refresh");
  }

  /**
   * Returns the health status of the Tenant Management service.
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("GET", "/v1/health");
  }
}
