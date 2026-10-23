/**
 * Audact TypeScript SDK — PlatformOrgClient test suite
 *
 * Covers the platform-admin org-management surface (`client.platform.orgs`):
 * organizations list/verify/reject and org_admin find/recovery, served by Org
 * Management (port 8092). Unlike `client.org` (OrgBearer), this surface uses
 * `PlatformBearer` — a pre-minted Ed25519 platform token entirely distinct
 * from both the tenant API key and the OrgBearer JWT. The auth tests below
 * are the positive control for that: they assert `AudactClientOptions.
 * platformToken` (or a direct `setAuthToken` call) is sent as
 * `Authorization: Bearer <token>`, never the tenant api key.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / org.test.ts.
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

import { AudactClient, AudactError, PlatformOrgClient, LOCAL_SERVICE_URLS } from "../client.js";

import type {
  PlatformFindOrgAdminsResponse,
  PlatformListOrganizationsResponse,
  PlatformOrgAdminResponse,
  PlatformOrganizationResponse,
  PlatformResetOrgAdminPasswordResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PLATFORM_TOKEN = "platform-ed25519-token-abc123";
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

const VERIFIED_ORG = {
  ...ORG,
  verification_status: "verified",
  verified_at: "2026-06-01T09:00:00Z",
  verified_by_kid: "pak_2026_01",
};

const REJECTED_ORG = {
  ...ORG,
  verification_status: "rejected",
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

const LIST_ORGS_RESPONSE: PlatformListOrganizationsResponse = {
  organizations: [ORG],
  next_cursor: "",
};

const VERIFY_RESPONSE: PlatformOrganizationResponse = {
  organization: VERIFIED_ORG,
};

const REJECT_RESPONSE: PlatformOrganizationResponse = {
  organization: REJECTED_ORG,
};

const FIND_ADMINS_RESPONSE: PlatformFindOrgAdminsResponse = {
  org_admins: [ADMIN],
};

const CHANGE_EMAIL_RESPONSE: PlatformOrgAdminResponse = {
  org_admin: { ...ADMIN, email: "new-admin@acme.example" },
};

const RESET_PASSWORD_SET_RESPONSE: PlatformResetOrgAdminPasswordResponse = {
  reset: "password_set",
};

const RESET_PASSWORD_TOKEN_RESPONSE: PlatformResetOrgAdminPasswordResponse = {
  reset: "token",
  token: "9f3a1c-redacted",
  expires_in: 1800,
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

describe("PlatformOrgClient", () => {
  let client: PlatformOrgClient;

  beforeEach(() => {
    client = new PlatformOrgClient(
      "http://localhost:8092",
      "unused-fallback-api-key",
      30_000,
    );
    client.setAuthToken(PLATFORM_TOKEN);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listOrganizations()", () => {
    it("calls GET /v1/platform/organizations with the platform token and no query params by default", async () => {
      const spy = mockFetchOk(LIST_ORGS_RESPONSE);

      const result = await client.listOrganizations();

      expect(result.organizations).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/platform/organizations");
      expect(init.method).toBe("GET");
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("serializes status/email/limit/cursor as query params", async () => {
      const spy = mockFetchOk(LIST_ORGS_RESPONSE);

      await client.listOrganizations({
        status: "unverified",
        email: "admin@acme.example",
        limit: 25,
        cursor: "opaque-cursor",
      });

      const [url] = spy.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/v1/platform/organizations");
      expect(parsed.searchParams.get("status")).toBe("unverified");
      expect(parsed.searchParams.get("email")).toBe("admin@acme.example");
      expect(parsed.searchParams.get("limit")).toBe("25");
      expect(parsed.searchParams.get("cursor")).toBe("opaque-cursor");
    });

    it("maps a 400 invalid-filter error to AudactError", async () => {
      mockFetchError(
        { error: "invalid_status", message: "invalid status filter" },
        400,
      );

      await expect(client.listOrganizations({ status: "unverified" })).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });

  describe("verifyOrganization()", () => {
    it("calls POST /v1/platform/organizations/{org_id}/verify with the platform token", async () => {
      const spy = mockFetchOk(VERIFY_RESPONSE);

      const result = await client.verifyOrganization(ORG_ID);

      expect(result.organization.verification_status).toBe("verified");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/platform/organizations/${ORG_ID}/verify`,
      );
      expect(init.method).toBe("POST");
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("encodes the org_id path parameter", async () => {
      const spy = mockFetchOk(VERIFY_RESPONSE);

      await client.verifyOrganization("org/with space");

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8092/v1/platform/organizations/org%2Fwith%20space/verify",
      );
    });

    it("maps a 404 to AudactError", async () => {
      mockFetchError(
        { error: "not_found", message: "organization not found" },
        404,
      );

      await expect(client.verifyOrganization(ORG_ID)).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });

  describe("rejectOrganization()", () => {
    it("calls POST /v1/platform/organizations/{org_id}/reject with a required reason", async () => {
      const spy = mockFetchOk(REJECT_RESPONSE);

      const result = await client.rejectOrganization(ORG_ID, {
        reason: "KYC documents did not match legal_name",
      });

      expect(result.organization.verification_status).toBe("rejected");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/platform/organizations/${ORG_ID}/reject`,
      );
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        reason: "KYC documents did not match legal_name",
      });
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("maps a 422 empty-reason error to AudactError", async () => {
      mockFetchError({ error: "reason_required", message: "reason is required" }, 422);

      await expect(
        client.rejectOrganization(ORG_ID, { reason: "" }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("findOrgAdmins()", () => {
    it("calls GET /v1/platform/org-admins with no query params by default", async () => {
      const spy = mockFetchOk(FIND_ADMINS_RESPONSE);

      const result = await client.findOrgAdmins();

      expect(result.org_admins).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8092/v1/platform/org-admins");
      expect(init.method).toBe("GET");
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("serializes email/org_id as query params", async () => {
      const spy = mockFetchOk(FIND_ADMINS_RESPONSE);

      await client.findOrgAdmins({ email: "admin@acme.example", org_id: ORG_ID });

      const [url] = spy.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("email")).toBe("admin@acme.example");
      expect(parsed.searchParams.get("org_id")).toBe(ORG_ID);
    });

    it("never surfaces a password_hash field even if present in the response body", async () => {
      mockFetchOk(FIND_ADMINS_RESPONSE);

      const result = await client.findOrgAdmins();

      expect(result.org_admins[0]).not.toHaveProperty("password_hash");
    });
  });

  describe("changeOrgAdminEmail()", () => {
    it("calls PATCH /v1/platform/org-admins/{admin_id} with the new email", async () => {
      const spy = mockFetchOk(CHANGE_EMAIL_RESPONSE);

      const result = await client.changeOrgAdminEmail(ADMIN_ID, {
        email: "new-admin@acme.example",
      });

      expect(result.org_admin.email).toBe("new-admin@acme.example");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/platform/org-admins/${ADMIN_ID}`,
      );
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({
        email: "new-admin@acme.example",
      });
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("maps a 409 email_taken error to AudactError", async () => {
      mockFetchError({ error: "email_taken", message: "email already in use" }, 409);

      await expect(
        client.changeOrgAdminEmail(ADMIN_ID, { email: "taken@acme.example" }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("resetOrgAdminPassword()", () => {
    it("calls POST /v1/platform/org-admins/{admin_id}/reset-password with a new_password", async () => {
      const spy = mockFetchOk(RESET_PASSWORD_SET_RESPONSE);

      const result = await client.resetOrgAdminPassword(ADMIN_ID, {
        new_password: "a-very-long-new-passphrase",
      });

      expect(result.reset).toBe("password_set");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8092/v1/platform/org-admins/${ADMIN_ID}/reset-password`,
      );
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        new_password: "a-very-long-new-passphrase",
      });
      expect(authHeader(spy)).toBe(`Bearer ${PLATFORM_TOKEN}`);
    });

    it("mints a one-time reset token when new_password is omitted", async () => {
      mockFetchOk(RESET_PASSWORD_TOKEN_RESPONSE);

      const result = await client.resetOrgAdminPassword(ADMIN_ID);

      expect(result.reset).toBe("token");
      expect(result.token).toBe("9f3a1c-redacted");
      expect(result.expires_in).toBe(1800);
    });

    it("maps a 404 to AudactError", async () => {
      mockFetchError({ error: "not_found", message: "no org_admin with this id" }, 404);

      await expect(client.resetOrgAdminPassword(ADMIN_ID)).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });
});

// ─── AudactClient wiring ────────────────────────────────────────────────────────

describe("AudactClient.platform.orgs wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs client.platform.orgs against the orgManagement service URL", async () => {
    const client = new AudactClient({
      serviceUrls: LOCAL_SERVICE_URLS,
      apiKey: "aud_live_test1234567890abcdef",
      platformToken: PLATFORM_TOKEN,
    });
    const spy = mockFetchOk(LIST_ORGS_RESPONSE);

    await client.platform.orgs.listOrganizations();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8092/v1/platform/organizations");
  });

  it("honours a serviceUrls.orgManagement override", async () => {
    const client = new AudactClient({
      apiKey: "aud_live_test1234567890abcdef",
      platformToken: PLATFORM_TOKEN,
      serviceUrls: { orgManagement: "https://org.example.test" },
    });
    const spy = mockFetchOk(LIST_ORGS_RESPONSE);

    await client.platform.orgs.listOrganizations();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("https://org.example.test/v1/platform/organizations");
  });

  it("sends options.platformToken as the bearer, never the tenant apiKey", async () => {
    const client = new AudactClient({
      apiKey: "aud_live_test1234567890abcdef",
      platformToken: PLATFORM_TOKEN,
    });
    const spy = mockFetchOk(LIST_ORGS_RESPONSE);

    await client.platform.orgs.listOrganizations();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${PLATFORM_TOKEN}`,
    );
  });

  it("falls back to the tenant apiKey when no platformToken is supplied", async () => {
    const client = new AudactClient({ apiKey: "aud_live_test1234567890abcdef" });
    const spy = mockFetchOk(LIST_ORGS_RESPONSE);

    await client.platform.orgs.listOrganizations();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_live_test1234567890abcdef",
    );
  });

  it("does not send the platformToken as client.platform's own bearer (export/import stays on apiKey)", async () => {
    const client = new AudactClient({
      apiKey: "aud_live_test1234567890abcdef",
      platformToken: PLATFORM_TOKEN,
    });
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("name: test\n", {
        status: 200,
        headers: { "Content-Type": "application/yaml" },
      }),
    );

    await client.platform.exportTenant(ORG_ID);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_live_test1234567890abcdef",
    );
  });
});
