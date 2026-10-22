/**
 * Audact TypeScript SDK — PlatformClient
 *
 * Client for the platform-admin cross-tenant provisioning surface (Tenant
 * Management service, port 8085):
 *
 *   GET  /v1/platform/export/tenants/{tenant_id}
 *   GET  /v1/platform/export/agents/{agent_id}
 *   POST /v1/platform/import/tenants/{target_tenant_id}
 *
 * Every route is gated by a platform admin token (never a tenant API key) —
 * such a token is minted by the platform administration tooling. This SDK never mints tokens itself; the caller supplies
 * one via `AudactClient`'s `apiKey` option, sent as
 * `Authorization: Bearer <token>` on every request (matching every other
 * sub-client's auth handling in client.ts).
 *
 * Bundles are exchanged as raw HTTP bodies (YAML by default, JSON on
 * request) rather than eagerly parsed into a single fixed shape, so a large
 * bundle can be streamed straight to/from a file without buffering it
 * through an intermediate parsed object — see {@link BaseServiceClient}'s
 * `requestRaw`.
 */

import { BaseServiceClient } from "./base.js";
import type {
  AddAdminKeyRequest,
  AdminKeyResponse,
  ListAdminKeysResponse,
  PlatformBundleFormat,
  PlatformChangeOrgAdminEmailRequest,
  PlatformExportAgentOptions,
  PlatformExportOptions,
  PlatformFindOrgAdminsOptions,
  PlatformFindOrgAdminsResponse,
  PlatformImportOptions,
  PlatformImportResponse,
  PlatformListOrganizationsOptions,
  PlatformListOrganizationsResponse,
  PlatformOrgAdminResponse,
  PlatformOrganizationResponse,
  PlatformRejectOrganizationRequest,
  PlatformResetOrgAdminPasswordRequest,
  PlatformResetOrgAdminPasswordResponse,
} from "./types.js";

/** Maps a {@link PlatformBundleFormat} to its `Accept` header value. */
function acceptHeaderFor(format?: PlatformBundleFormat): string {
  return format === "json" ? "application/json" : "application/yaml";
}

/**
 * Builds the import request path with its `dryRun`/`mode`/`setSecret` query
 * parameters (docs/yaml-export-import.md §6.1). Exported for unit testing.
 */
export function buildImportPath(
  targetTenantId: string,
  options: PlatformImportOptions = {},
): string {
  const params = new URLSearchParams();
  if (options.dryRun) {
    params.set("dryRun", "true");
  }
  if (options.mode) {
    params.set("mode", options.mode);
  }
  // NOTE: setSecret is intentionally NOT a query parameter — it carries the
  // operator's plaintext BYOK secret and must travel as a request header
  // (see buildSetSecretHeaders / importTenant).

  const path = `/v1/platform/import/tenants/${encodeURIComponent(targetTenantId)}`;
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Header name carrying each `<ref>.<field>=<value>` secret assignment. */
export const SET_SECRET_HEADER = "X-Audact-Set-Secret";

/**
 * Builds the repeatable X-Audact-Set-Secret headers from setSecret assignments.
 * The server reads each header line as one assignment (r.Header.Values), so
 * each is emitted as its own [name, value] tuple. Exported for unit testing.
 */
export function buildSetSecretHeaders(
  options: PlatformImportOptions = {},
): Array<[string, string]> {
  return (options.setSecret ?? []).map((assignment) => [
    SET_SECRET_HEADER,
    assignment,
  ]);
}

/**
 * Client for the platform-admin org-management surface (org-management
 * service, port 8092): list/find, verify, and reject organizations, plus
 * find/recover org_admins (`GET`/`POST`/`PATCH /v1/platform/organizations*`
 * and `/v1/platform/org-admins*`).
 *
 * Exposed as `client.platform.orgs` (see {@link PlatformClient.orgs}) rather
 * than folded into `client.org` because it authenticates with
 * `PlatformBearer` — a pre-minted Ed25519 platform token distinct from both
 * the tenant API key and the `OrgBearer` JWT `client.org` uses.
 * The SDK never mints this token; the caller supplies it via
 * `AudactClientOptions.platformToken`, or by calling
 * `client.platform.orgs.setAuthToken(token)` directly.
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: "aud_live_...", platformToken });
 *
 * const { organizations } = await client.platform.orgs.listOrganizations({
 *   status: "unverified",
 * });
 * await client.platform.orgs.verifyOrganization(organizations[0].org_id);
 * ```
 */
export class PlatformOrgClient extends BaseServiceClient {
  /**
   * Lists platform admin signing keys (active and disabled).
   * Calls GET /v1/platform/admin-keys (org-management service). Requires a
   * single-use platform token minted for the `admin_keys` action.
   *
   * @throws {AudactError} 401/403 without a valid platform token.
   */
  async listAdminKeys(): Promise<ListAdminKeysResponse> {
    return this.request<ListAdminKeysResponse>("GET", "/v1/platform/admin-keys");
  }

  /**
   * Registers a new platform admin signing key.
   * Calls POST /v1/platform/admin-keys (org-management service). Requires a
   * single-use platform token minted for the `admin_keys` action.
   *
   * @throws {AudactError} 409 if `kid` already exists, 400 on an invalid body.
   */
  async addAdminKey(req: AddAdminKeyRequest): Promise<AdminKeyResponse> {
    return this.request<AdminKeyResponse>("POST", "/v1/platform/admin-keys", req);
  }

  /**
   * Disables a platform admin signing key. Disabling an already-disabled key
   * succeeds. Calls POST /v1/platform/admin-keys/{kid}/disable
   * (org-management service). Requires a single-use platform token minted for
   * the `admin_keys` action.
   *
   * @throws {AudactError} 404 if `kid` is unknown; 409 if it is the last
   *                       active admin key (allowlist another key first).
   */
  async disableAdminKey(kid: string): Promise<AdminKeyResponse> {
    return this.request<AdminKeyResponse>(
      "POST",
      `/v1/platform/admin-keys/${encodeURIComponent(kid)}/disable`,
    );
  }

  /**
   * Lists organizations for the verification queue or support lookup,
   * newest first, using cursor pagination — pass the returned `next_cursor`
   * as `options.cursor` to fetch the next page. Read-only: writes no audit
   * row.
   *
   * @param options - Optional `status` (`"unverified"`|`"verified"`|
   *                  `"rejected"`), `email` (exact org_admin email match),
   *                  `limit` (default 50, max 200), and `cursor`.
   * @throws {AudactError} 400 on an invalid `status`/`limit`/`cursor`, 401
   *                       if not authenticated with a valid platform token.
   */
  async listOrganizations(
    options: PlatformListOrganizationsOptions = {},
  ): Promise<PlatformListOrganizationsResponse> {
    const params = new URLSearchParams();
    if (options.status !== undefined) params.set("status", options.status);
    if (options.email !== undefined) params.set("email", options.email);
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.cursor !== undefined) params.set("cursor", options.cursor);
    const query = params.toString();
    return this.request<PlatformListOrganizationsResponse>(
      "GET",
      query
        ? `/v1/platform/organizations?${query}`
        : "/v1/platform/organizations",
    );
  }

  /**
   * Sets `verification_status=verified`, unblocking the organization's
   * tenant lifecycle. Idempotent-friendly: verifying an already-verified
   * organization succeeds without error. Writes one org_audit_log row.
   *
   * @param orgId - UUID of the organization.
   * @throws {AudactError} 400 if `orgId` is not a valid UUID, 401 if not
   *                       authenticated, 404 if the organization does not
   *                       exist.
   */
  async verifyOrganization(orgId: string): Promise<PlatformOrganizationResponse> {
    return this.request<PlatformOrganizationResponse>(
      "POST",
      `/v1/platform/organizations/${encodeURIComponent(orgId)}/verify`,
    );
  }

  /**
   * Sets `verification_status=rejected`. `reason` is persisted only in the
   * org_audit_log `"org.reject"` row's metadata — never on the organization
   * record itself.
   *
   * @param orgId - UUID of the organization.
   * @param req - Rejection reason (required).
   * @throws {AudactError} 400 if `orgId` is not a valid UUID or the body is
   *                       malformed, 401 if not authenticated, 404 if the
   *                       organization does not exist, 422 if `reason` is
   *                       empty.
   */
  async rejectOrganization(
    orgId: string,
    req: PlatformRejectOrganizationRequest,
  ): Promise<PlatformOrganizationResponse> {
    return this.request<PlatformOrganizationResponse>(
      "POST",
      `/v1/platform/organizations/${encodeURIComponent(orgId)}/reject`,
      req,
    );
  }

  /**
   * Looks up org_admins by exact (case-insensitive) email and/or `org_id` —
   * the lookup step before a reset-password or change-email recovery
   * action. Never returns a password hash. Read-only: writes no audit row.
   *
   * @param options - Optional `email` and/or `org_id` filters.
   * @throws {AudactError} 400 if `org_id` is not a valid UUID, 401 if not
   *                       authenticated.
   */
  async findOrgAdmins(
    options: PlatformFindOrgAdminsOptions = {},
  ): Promise<PlatformFindOrgAdminsResponse> {
    const params = new URLSearchParams();
    if (options.email !== undefined) params.set("email", options.email);
    if (options.org_id !== undefined) params.set("org_id", options.org_id);
    const query = params.toString();
    return this.request<PlatformFindOrgAdminsResponse>(
      "GET",
      query ? `/v1/platform/org-admins?${query}` : "/v1/platform/org-admins",
    );
  }

  /**
   * Updates a locked-out org_admin's login email. Audits
   * `"org_admin.email_changed"` (metadata only — old/new email are never
   * logged).
   *
   * @param adminId - UUID of the org_admin.
   * @param req - New login email.
   * @throws {AudactError} 400 if `adminId` is not a valid UUID or `email`
   *                       is missing/malformed, 401 if not authenticated,
   *                       404 if no org_admin has this id, 409
   *                       `email_taken` if another org_admin already uses
   *                       it.
   */
  async changeOrgAdminEmail(
    adminId: string,
    req: PlatformChangeOrgAdminEmailRequest,
  ): Promise<PlatformOrgAdminResponse> {
    return this.request<PlatformOrgAdminResponse>(
      "PATCH",
      `/v1/platform/org-admins/${encodeURIComponent(adminId)}`,
      req,
    );
  }

  /**
   * Resets a locked-out org_admin's password: sets a new bcrypt-hashed
   * password directly (`new_password` supplied, >= 12 chars) OR mints a
   * single-use, short-TTL reset token (`new_password` omitted) for the
   * operator to hand to the admin out of band. Either way, every existing
   * refresh session for the admin is revoked, forcing re-authentication.
   * Never echoes the password or hash.
   *
   * @param adminId - UUID of the org_admin.
   * @param req - Optional `new_password`; omit to mint a reset token
   *              instead.
   * @throws {AudactError} 400 if `adminId` is not a valid UUID or
   *                       `new_password` is too short, 401 if not
   *                       authenticated, 404 if no org_admin has this id.
   */
  async resetOrgAdminPassword(
    adminId: string,
    req: PlatformResetOrgAdminPasswordRequest = {},
  ): Promise<PlatformResetOrgAdminPasswordResponse> {
    return this.request<PlatformResetOrgAdminPasswordResponse>(
      "POST",
      `/v1/platform/org-admins/${encodeURIComponent(adminId)}/reset-password`,
      req,
    );
  }
}

/**
 * Client for the Audact platform-admin export/import API (port 8085), plus
 * the platform-admin org-management surface (port 8092, exposed as
 * {@link orgs}).
 *
 * @example
 * ```ts
 * const client = new AudactClient({ apiKey: platformToken });
 *
 * // Export a tenant's copyable configuration.
 * const exportResponse = await client.platform.exportTenant(tenantId);
 * const bundleYaml = await exportResponse.text();
 *
 * // Dry-run an import to preview the plan.
 * const plan = await client.platform.importTenant(targetTenantId, bundleYaml, {
 *   dryRun: true,
 * });
 * console.log(plan.counts, plan.warnings);
 *
 * // Apply it for real.
 * const result = await client.platform.importTenant(targetTenantId, bundleYaml);
 * ```
 */
export class PlatformClient extends BaseServiceClient {
  /**
   * Platform-admin org-management surface (organizations verify/reject/
   * list, org_admin recovery) — org-management service, port 8092,
   * `PlatformBearer`. See {@link PlatformOrgClient}.
   */
  public readonly orgs: PlatformOrgClient;

  constructor(
    baseUrl: string,
    apiKey: string,
    timeoutMs: number,
    // Optional, defaulted (rather than required) so direct `new
    // PlatformClient(baseUrl, apiKey, timeoutMs)` construction — as used by
    // existing tests and any external caller predating this option — keeps
    // working unchanged. AudactClient always passes `this.urls.orgManagement`
    // explicitly.
    orgManagementUrl = "http://localhost:8092",
  ) {
    super(baseUrl, apiKey, timeoutMs);
    this.orgs = new PlatformOrgClient(orgManagementUrl, apiKey, timeoutMs);
  }

  /**
   * Lists platform admin signing keys. Calls GET /v1/platform/admin-keys
   * (served by the org-management service; platform token minted for the
   * `admin_keys` action).
   */
  async listAdminKeys(): Promise<ListAdminKeysResponse> {
    return this.orgs.listAdminKeys();
  }

  /**
   * Registers a platform admin signing key. Calls POST /v1/platform/admin-keys.
   * Requires a platform token minted for the `admin_keys` action.
   * @throws {AudactError} 409 on duplicate `kid`.
   */
  async addAdminKey(req: AddAdminKeyRequest): Promise<AdminKeyResponse> {
    return this.orgs.addAdminKey(req);
  }

  /**
   * Disables a platform admin signing key (an already-disabled key succeeds).
   * Calls POST /v1/platform/admin-keys/{kid}/disable. Requires a platform
   * token minted for the `admin_keys` action.
   * @throws {AudactError} 404 unknown `kid`; 409 if it is the last active key.
   */
  async disableAdminKey(kid: string): Promise<AdminKeyResponse> {
    return this.orgs.disableAdminKey(kid);
  }

  /**
   * Exports every active Configuration, Tool, and Agent owned by `tenantId`
   * as a portable bundle.
   *
   * @param tenantId - UUID of the tenant to export. Must be one of the
   *                   platform token's authorized targets.
   * @param options - `format` selects "yaml" (default, human-diffable) or
   *                  "json".
   * @returns The raw fetch `Response`. Use `await response.text()` for the
   *          serialized bundle, `await response.json()` when
   *          `format: "json"` (parses to a {@link PlatformBundle}), or
   *          stream it via `response.body`.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const response = await client.platform.exportTenant(tenantId);
   * const yaml = await response.text();
   * ```
   */
  async exportTenant(
    tenantId: string,
    options: PlatformExportOptions = {},
  ): Promise<Response> {
    return this.requestRaw(
      "GET",
      `/v1/platform/export/tenants/${encodeURIComponent(tenantId)}`,
      undefined,
      { Accept: acceptHeaderFor(options.format) },
    );
  }

  /**
   * Exports a single agent — plus its dedicated Configuration (if any) and
   * every Tool it has attached — as a self-contained bundle
   *.
   *
   * @param agentId - UUID of the agent to export.
   * @param options - `tenantId` (required: the tenant that owns the agent,
   *                  sent as the `?tenant_id=` query parameter) and `format`
   *                  ("yaml" default or "json").
   * @returns The raw fetch `Response`, exactly as {@link exportTenant}.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   */
  async exportAgent(
    agentId: string,
    options: PlatformExportAgentOptions,
  ): Promise<Response> {
    const path =
      `/v1/platform/export/agents/${encodeURIComponent(agentId)}` +
      `?tenant_id=${encodeURIComponent(options.tenantId)}`;
    return this.requestRaw("GET", path, undefined, {
      Accept: acceptHeaderFor(options.format),
    });
  }

  /**
   * Imports a bundle (as produced by {@link exportTenant} or
   * {@link exportAgent}) into `targetTenantId`.
   *
   * The target tenant is always resolved server-side from the authenticated
   * platform token's context, never from the request body — `targetTenantId`
   * only selects the URL path segment and must be one of the token's
   * authorized targets.
   *
   * @param targetTenantId - UUID of the target tenant.
   * @param bundle - The raw bundle bytes: a `string` (YAML or JSON text), a
   *                 `Uint8Array`, or a `ReadableStream<Uint8Array>` for
   *                 streaming uploads without buffering the whole bundle in
   *                 memory.
   * @param options - `dryRun` (default false) returns the plan without
   *                  persisting anything; `mode` selects the conflict policy
   *                  ("create-only", the default, is the only mode currently
   *                  implemented server-side — "upsert" is rejected with
   *                  HTTP 501); `setSecret` supplies one or more repeatable
   *                  `<ref>.<field>=<value>` secret assignments.
   * @returns The per-entity result manifest.
   * @throws {AudactError} on HTTP 4xx/5xx or network errors.
   *
   * @example
   * ```ts
   * const result = await client.platform.importTenant(targetTenantId, bundleYaml, {
   *   dryRun: true,
   *   mode: "create-only",
   *   setSecret: ["tool/send-email.apiKey=sk-live-..."],
   * });
   * ```
   */
  async importTenant(
    targetTenantId: string,
    bundle: BodyInit,
    options: PlatformImportOptions = {},
  ): Promise<PlatformImportResponse> {
    const path = buildImportPath(targetTenantId, options);
    const response = await this.requestRaw(
      "POST",
      path,
      bundle,
      { "Content-Type": "application/yaml" },
      buildSetSecretHeaders(options),
    );
    return (await response.json()) as PlatformImportResponse;
  }
}
