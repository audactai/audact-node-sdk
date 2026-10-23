/**
 * Audact TypeScript SDK — OrgClient test suite
 *
 * Covers the org self-service surface (signup/login/refresh/logout, profile,
 * KYC), served by Org Management (port 8092). Unlike every other sub-client,
 * `OrgClient` uses
 * `OrgBearer` — a per-organization JWT obtained via `signup()`/`login()` —
 * instead of the tenant API key. The auth-flow tests below are the positive
 * control for that: they assert the token returned by signup/login/refresh
 * is stored and sent as `Authorization: Bearer <jwt>` on subsequent calls,
 * and that logout clears it (falling back to the API key).
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / webhooks.test.ts.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import { AudactClient, AudactError, OrgClient, LOCAL_SERVICE_URLS } from "../client.js";

import type {
  OrgCreateTenantResponse,
  OrgGetTenantResponse,
  OrgImpersonateTenantResponse,
  OrgInitializeTenantResponse,
  OrgIssueTenantKeyResponse,
  OrgKYCResponse,
  OrgListTenantsResponse,
  OrgLoginResponse,
  OrgProfileResponse,
  OrgRefreshResponse,
  OrgSignupResponse,
  OrgTenantActionResponse,
  OrgTenantSummary,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const ORG_ID = "550e8400-e29b-41d4-a716-446655440000";
const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440001";

const ORG = {
  org_id: ORG_ID,
  name: "Acme Agency",
  legal_name: "Acme Agency Ltd",
  entity_type: "company",
  country: "GB",
  verification_status: "unverified",
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const ADMIN = {
  admin_id: ADMIN_ID,
  org_id: ORG_ID,
  email: "admin@acme.example",
  name: "Jane Doe",
  role: "org_admin",
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const SIGNUP_RESPONSE: OrgSignupResponse = {
  token: "org-jwt-signup-abc123",
  expires_in: 3600,
  org: ORG,
  admin: ADMIN,
};

const LOGIN_RESPONSE: OrgLoginResponse = {
  token: "org-jwt-login-def456",
  expires_in: 3600,
  ver: false,
};

const REFRESH_RESPONSE: OrgRefreshResponse = {
  token: "org-jwt-refresh-ghi789",
  expires_in: 3600,
};

const PROFILE_RESPONSE: OrgProfileResponse = {
  org: ORG,
  admin: ADMIN,
};

const KYC_RESPONSE: OrgKYCResponse = {
  kyc: {
    org_id: ORG_ID,
    created_at: "2026-03-18T15:17:00Z",
    updated_at: "2026-03-18T15:17:00Z",
    legal_name: "Acme Agency Ltd",
    contact_email: "billing@acme.example",
  },
};

const TENANT_ID = "660e8400-e29b-41d4-a716-446655440099";

const TENANT_SUMMARY: OrgTenantSummary = {
  tenant_id: TENANT_ID,
  name: "Acme Client Co",
  status: "active",
  created_at: "2026-06-01T09:00:00Z",
};

const LIST_TENANTS_RESPONSE: OrgListTenantsResponse = {
  tenants: [TENANT_SUMMARY],
  next_cursor: "opaque-cursor-abc",
};

const CREATE_TENANT_RESPONSE: OrgCreateTenantResponse = {
  tenant: TENANT_SUMMARY,
};

const GET_TENANT_RESPONSE: OrgGetTenantResponse = {
  tenant: TENANT_SUMMARY,
};

const TENANT_ACTION_RESPONSE: OrgTenantActionResponse = {
  tenant: { ...TENANT_SUMMARY, status: "disabled" },
};

const INITIALIZE_TENANT_RESPONSE: OrgInitializeTenantResponse = {
  tenant: { ...TENANT_SUMMARY, initialized_at: "2026-06-01T09:05:00Z" },
  api_key: {
    api_key_id: "770e8400-e29b-41d4-a716-446655440000",
    key: "aud_live_EXAMPLEKEY0000000000000000001",
    key_prefix: "a1b2c3d4",
    role: "owner",
  },
};

const ISSUE_TENANT_KEY_RESPONSE: OrgIssueTenantKeyResponse = {
  api_key: {
    api_key_id: "770e8400-e29b-41d4-a716-446655440001",
    key: "aud_live_EXAMPLEKEY0000000000000000002",
    key_prefix: "ffeeddcc",
    role: "owner",
  },
};

const IMPERSONATE_TENANT_RESPONSE: OrgImpersonateTenantResponse = {
  tenant_token: "tenant-jwt-impersonate-xyz",
  expires_in: 1200,
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

type FetchMock = MockInstance<typeof fetch>;

function mockFetchOk(body: unknown, status = 200): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "req-test-123",
      },
    }),
  );
}

function mockFetchNoContent(): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, {
      status: 204,
      headers: { "X-Request-ID": "req-test-124" },
    }),
  );
}

function mockFetchError(body: unknown, status: number): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "req-test-456",
      },
    }),
  );
}

function authHeader(spy: FetchMock, callIndex = 0): string | undefined {
  const call = spy.mock.calls[callIndex];
  const init = call?.[1] as RequestInit | undefined;
  const headers = init?.headers as Record<string, string> | undefined;
  return headers?.["Authorization"];
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("OrgClient", () => {
  let client: OrgClient;

  beforeEach(() => {
    client = new OrgClient("http://localhost:8092", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Auth / session lifecycle ────────────────────────────────────────────────

  describe("signup()", () => {
    it("calls POST /v1/org/signup with the api key (public route) and stores the returned token", async () => {
      const spy = mockFetchOk(SIGNUP_RESPONSE, 201);

      const result = await client.signup({
        org_name: "Acme Agency",
        email: "admin@acme.example",
        password: "hunter2222222",
        entity_type: "company",
        legal_name: "Acme Agency Ltd",
        country: "GB",
      });

      expect(result.token).toBe(SIGNUP_RESPONSE.token);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/signup");
      expect(init.method).toBe("POST");
      expect(authHeader(spy)).toBe(`Bearer ${API_KEY}`);
      expect(JSON.parse(init.body as string)).toMatchObject({
        org_name: "Acme Agency",
        entity_type: "company",
      });

      // Subsequent calls now carry the signup-issued OrgBearer token.
      const profileSpy = mockFetchOk(PROFILE_RESPONSE);
      await client.getProfile();
      expect(authHeader(profileSpy)).toBe(`Bearer ${SIGNUP_RESPONSE.token}`);
    });

    it("throws AudactError on HTTP 409 email_taken", async () => {
      mockFetchError({ code: "email_taken", message: "email already registered" }, 409);
      await expect(
        client.signup({
          org_name: "Acme Agency",
          email: "admin@acme.example",
          password: "hunter2222222",
          entity_type: "company",
          legal_name: "Acme Agency Ltd",
          country: "GB",
        }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("login()", () => {
    it("calls POST /v1/org/login and stores the returned token, sent on the next call", async () => {
      const spy = mockFetchOk(LOGIN_RESPONSE);

      const result = await client.login({
        email: "admin@acme.example",
        password: "hunter2222222",
      });

      expect(result.token).toBe(LOGIN_RESPONSE.token);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/login");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        email: "admin@acme.example",
        password: "hunter2222222",
      });

      const profileSpy = mockFetchOk(PROFILE_RESPONSE);
      await client.getProfile();
      const [profileUrl, profileInit] = profileSpy.mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(profileUrl).toBe("http://localhost:8092/v1/org/profile");
      expect((profileInit.headers as Record<string, string>)["Authorization"]).toBe(
        `Bearer ${LOGIN_RESPONSE.token}`,
      );
    });

    it("throws AudactError on HTTP 401 invalid_credentials", async () => {
      mockFetchError({ code: "invalid_credentials", message: "invalid email or password" }, 401);
      await expect(
        client.login({ email: "admin@acme.example", password: "wrong" }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("throws AudactError on HTTP 429 rate_limit_exceeded", async () => {
      mockFetchError({ code: "rate_limit_exceeded", message: "too many attempts" }, 429);
      await expect(
        client.login({ email: "admin@acme.example", password: "wrong" }),
      ).rejects.toMatchObject({ status: 429 });
    });
  });

  describe("refresh()", () => {
    it("calls POST /v1/org/refresh, sending the prior token, and rotates the stored token", async () => {
      client.setAuthToken("stale-org-jwt");
      const spy = mockFetchOk(REFRESH_RESPONSE);

      const result = await client.refresh();

      expect(result.token).toBe(REFRESH_RESPONSE.token);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/refresh");
      expect(init.method).toBe("POST");
      expect(authHeader(spy)).toBe("Bearer stale-org-jwt");

      const profileSpy = mockFetchOk(PROFILE_RESPONSE);
      await client.getProfile();
      expect(authHeader(profileSpy)).toBe(`Bearer ${REFRESH_RESPONSE.token}`);
    });

    it("throws AudactError on HTTP 401 for a missing/expired refresh token", async () => {
      mockFetchError({ code: "unauthorized", message: "no refresh token" }, 401);
      await expect(client.refresh()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("logout()", () => {
    it("calls POST /v1/org/logout with the org token, then clears it (falls back to api key)", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchNoContent();

      await client.logout();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/logout");
      expect(init.method).toBe("POST");
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");

      const nextSpy = mockFetchOk(PROFILE_RESPONSE);
      await client.getProfile();
      expect(authHeader(nextSpy)).toBe(`Bearer ${API_KEY}`);
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ code: "unauthorized", message: "not authenticated" }, 401);
      await expect(client.logout()).rejects.toBeInstanceOf(AudactError);
    });
  });

  // ── Profile ──────────────────────────────────────────────────────────────────

  describe("getProfile()", () => {
    it("calls GET /v1/org/profile", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(PROFILE_RESPONSE);

      const result = await client.getProfile();

      expect(result.org.org_id).toBe(ORG_ID);
      expect(result.admin.admin_id).toBe(ADMIN_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/profile");
      expect(init.method).toBe("GET");
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ code: "unauthorized", message: "not authenticated" }, 401);
      await expect(client.getProfile()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("updateProfile()", () => {
    it("calls PATCH /v1/org/profile with the changed fields", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(PROFILE_RESPONSE);

      await client.updateProfile({ org_name: "Acme Agency Renamed" });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/profile");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({
        org_name: "Acme Agency Renamed",
      });
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("throws AudactError on HTTP 400 for a malformed body", async () => {
      mockFetchError({ code: "bad_request", message: "invalid field" }, 400);
      await expect(
        client.updateProfile({ org_name: "" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // ── KYC ────────────────────────────────────────────────────────────────────

  describe("getKYC()", () => {
    it("calls GET /v1/org/kyc", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(KYC_RESPONSE);

      const result = await client.getKYC();

      expect(result.kyc.org_id).toBe(ORG_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/kyc");
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 when no KYC record exists", async () => {
      mockFetchError({ code: "not_found", message: "no kyc record" }, 404);
      await expect(client.getKYC()).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("updateKYC()", () => {
    it("calls PATCH /v1/org/kyc with the provided fields", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(KYC_RESPONSE);

      await client.updateKYC({
        contact_email: "billing@acme.example",
        address_country: "GB",
      });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/kyc");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({
        contact_email: "billing@acme.example",
        address_country: "GB",
      });
    });

    it("throws AudactError on HTTP 422 kyc_invalid", async () => {
      mockFetchError({ code: "kyc_invalid", message: "invalid vat_id" }, 422);
      await expect(
        client.updateKYC({ vat_id: "not-a-vat-id" }),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  // ── Org-tenant lifecycle ─────────────────────────────────────────────────────

  describe("listTenants()", () => {
    it("calls GET /v1/org/tenants with no query params by default", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(LIST_TENANTS_RESPONSE);

      const result = await client.listTenants();

      expect(result.tenants).toHaveLength(1);
      expect(result.next_cursor).toBe("opaque-cursor-abc");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/tenants");
      expect(init.method).toBe("GET");
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("serializes include_deleted/limit/cursor as query params", async () => {
      const spy = mockFetchOk(LIST_TENANTS_RESPONSE);

      await client.listTenants({
        include_deleted: true,
        limit: 25,
        cursor: "opaque-cursor-abc",
      });

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8092/v1/org/tenants?include_deleted=true&limit=25&cursor=opaque-cursor-abc",
      );
    });

    it("throws AudactError on HTTP 400 for an invalid cursor", async () => {
      mockFetchError({ code: "bad_request", message: "invalid cursor" }, 400);
      await expect(
        client.listTenants({ cursor: "not-valid" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("createTenant()", () => {
    it("calls POST /v1/org/tenants with the tenant name", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(CREATE_TENANT_RESPONSE, 201);

      const result = await client.createTenant({ name: "Acme Client Co" });

      expect(result.tenant.tenant_id).toBe(TENANT_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/org/tenants");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "Acme Client Co",
      });
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("throws AudactError on HTTP 403 org_not_verified", async () => {
      mockFetchError({ code: "org_not_verified", message: "org not verified" }, 403);
      await expect(
        client.createTenant({ name: "Acme Client Co" }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("getTenant()", () => {
    it("calls GET /v1/org/tenants/{id}", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(GET_TENANT_RESPONSE);

      const result = await client.getTenant(TENANT_ID);

      expect(result.tenant.tenant_id).toBe(TENANT_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8092/v1/org/tenants/${TENANT_ID}`);
      expect(init.method).toBe("GET");
    });

    it("encodeURIComponent's the tenant id path segment", async () => {
      const spy = mockFetchOk(GET_TENANT_RESPONSE);
      await client.getTenant("weird/id with space");
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8092/v1/org/tenants/weird%2Fid%20with%20space",
      );
    });

    it("throws AudactError on HTTP 404 tenant_not_found", async () => {
      mockFetchError({ code: "tenant_not_found", message: "not found" }, 404);
      await expect(client.getTenant(TENANT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("softDeleteTenant()", () => {
    it("calls DELETE /v1/org/tenants/{id}", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(TENANT_ACTION_RESPONSE);

      await client.softDeleteTenant(TENANT_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8092/v1/org/tenants/${TENANT_ID}`);
      expect(init.method).toBe("DELETE");
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("throws AudactError on HTTP 404 tenant_not_found", async () => {
      mockFetchError({ code: "tenant_not_found", message: "not found" }, 404);
      await expect(client.softDeleteTenant(TENANT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("enableTenant()", () => {
    it("calls POST /v1/org/tenants/{id}/enable", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(TENANT_ACTION_RESPONSE);

      await client.enableTenant(TENANT_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/org/tenants/${TENANT_ID}/enable`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 403 org_not_verified", async () => {
      mockFetchError({ code: "org_not_verified", message: "org not verified" }, 403);
      await expect(client.enableTenant(TENANT_ID)).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe("disableTenant()", () => {
    it("calls POST /v1/org/tenants/{id}/disable", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(TENANT_ACTION_RESPONSE);

      const result = await client.disableTenant(TENANT_ID);

      expect(result.tenant.status).toBe("disabled");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/org/tenants/${TENANT_ID}/disable`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404 tenant_not_found", async () => {
      mockFetchError({ code: "tenant_not_found", message: "not found" }, 404);
      await expect(client.disableTenant(TENANT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("restoreTenant()", () => {
    it("calls POST /v1/org/tenants/{id}/restore", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(TENANT_ACTION_RESPONSE);

      await client.restoreTenant(TENANT_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/org/tenants/${TENANT_ID}/restore`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 409 not_deleted", async () => {
      mockFetchError({ code: "not_deleted", message: "tenant is not deleted" }, 409);
      await expect(client.restoreTenant(TENANT_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("initializeTenant()", () => {
    it("calls POST /v1/org/tenants/{id}/initialize with no body", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(INITIALIZE_TENANT_RESPONSE, 201);

      const result = await client.initializeTenant(TENANT_ID);

      expect(result.api_key.key).toBe(INITIALIZE_TENANT_RESPONSE.api_key.key);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/org/tenants/${TENANT_ID}/initialize`,
      );
      expect(init.method).toBe("POST");
      expect(init.body).toBeUndefined();
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBeUndefined();
    });

    it("sends an Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(INITIALIZE_TENANT_RESPONSE, 201);

      await client.initializeTenant(TENANT_ID, "idem-init-1");

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-init-1",
      );
    });

    it("throws AudactError on HTTP 409 already_initialized", async () => {
      mockFetchError(
        { code: "already_initialized", message: "already initialized" },
        409,
      );
      await expect(client.initializeTenant(TENANT_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("issueTenantKey()", () => {
    it("calls POST /v1/org/tenants/{id}/keys with an optional name", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(ISSUE_TENANT_KEY_RESPONSE, 201);

      const result = await client.issueTenantKey(TENANT_ID, {
        name: "CI pipeline key",
      });

      expect(result.api_key.key).toBe(ISSUE_TENANT_KEY_RESPONSE.api_key.key);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8092/v1/org/tenants/${TENANT_ID}/keys`);
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "CI pipeline key",
      });
    });

    it("sends an Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(ISSUE_TENANT_KEY_RESPONSE, 201);

      await client.issueTenantKey(TENANT_ID, {}, "idem-key-1");

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-key-1",
      );
    });

    it("throws AudactError on HTTP 404 tenant_not_found", async () => {
      mockFetchError({ code: "tenant_not_found", message: "not found" }, 404);
      await expect(client.issueTenantKey(TENANT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("impersonateTenant()", () => {
    it("calls POST /v1/org/tenants/{id}/impersonate", async () => {
      client.setAuthToken("active-org-jwt");
      const spy = mockFetchOk(IMPERSONATE_TENANT_RESPONSE);

      const result = await client.impersonateTenant(TENANT_ID);

      expect(result.tenant_token).toBe(IMPERSONATE_TENANT_RESPONSE.tenant_token);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/org/tenants/${TENANT_ID}/impersonate`,
      );
      expect(init.method).toBe("POST");
      expect(authHeader(spy)).toBe("Bearer active-org-jwt");
    });

    it("throws AudactError on HTTP 409 tenant_inactive", async () => {
      mockFetchError({ code: "tenant_inactive", message: "tenant inactive" }, 409);
      await expect(client.impersonateTenant(TENANT_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });
});

// ─── AudactClient wiring ────────────────────────────────────────────────────────

describe("AudactClient.org wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs client.org against the orgManagement service URL", async () => {
    const client = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });
    const spy = mockFetchOk(PROFILE_RESPONSE);

    await client.org.getProfile();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8092/v1/org/profile");
  });

  it("honours a serviceUrls.orgManagement override", async () => {
    const client = new AudactClient({
      apiKey: API_KEY,
      serviceUrls: { orgManagement: "https://org.example.test" },
    });
    const spy = mockFetchOk(PROFILE_RESPONSE);

    await client.org.getProfile();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("https://org.example.test/v1/org/profile");
  });

  it("pre-authenticates client.org when options.orgToken is supplied", async () => {
    const client = new AudactClient({ apiKey: API_KEY, orgToken: "preset-org-jwt" });
    const spy = mockFetchOk(PROFILE_RESPONSE);

    await client.org.getProfile();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer preset-org-jwt",
    );
  });

  it("exposes the org-tenant lifecycle on client.org", async () => {
    const client = new AudactClient({
      serviceUrls: LOCAL_SERVICE_URLS,
      apiKey: API_KEY,
      orgToken: "preset-org-jwt",
    });
    const spy = mockFetchOk(LIST_TENANTS_RESPONSE);

    const result = await client.org.listTenants();

    expect(result.tenants).toHaveLength(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8092/v1/org/tenants");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer preset-org-jwt",
    );
  });
});
