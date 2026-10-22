/**
 * Audact TypeScript SDK — IntegrationsClient test suite
 *
 * Covers the agent-worker Cal.com integration connection surface: connection
 * CRUD, the live health-check test probe, event-type discovery, and the
 * OAuth start/callback flow.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / tools.test.ts.
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

import { AudactError, IntegrationsClient } from "../client.js";

import type {
  CalcomOauthStartResponse,
  Connection,
  DeleteConnectionResponse,
  ListConnectionEventTypesResponse,
  ListConnectionsResponse,
  TestConnectionResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const CONNECTION_ID = "550e8400-e29b-41d4-a716-446655440000";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440002";

const CONNECTION: Connection = {
  connection_id: CONNECTION_ID,
  tenant_id: TENANT_ID,
  provider: "cal_com",
  name: "My Cal.com Account",
  auth_method: "api_key",
  status: "active",
  health: "connected",
  has_api_key: true,
  has_oauth_token: false,
  cal_username: "jane-doe",
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const LIST_CONNECTIONS_RESPONSE: ListConnectionsResponse = {
  connections: [CONNECTION],
};

const DELETE_CONNECTION_RESPONSE: DeleteConnectionResponse = { deleted: true };

const TEST_CONNECTION_RESPONSE: TestConnectionResponse = {
  connection_id: CONNECTION_ID,
  healthy: true,
  health: "connected",
  event_type_count: 3,
};

const LIST_EVENT_TYPES_RESPONSE: ListConnectionEventTypesResponse = {
  event_types: [
    { id: 1, title: "30 Min Meeting", slug: "30min", lengthInMinutes: 30, hidden: false },
  ],
};

const OAUTH_START_RESPONSE: CalcomOauthStartResponse = {
  authorize_url: "https://app.cal.com/auth/oauth2/authorize?client_id=abc&state=xyz",
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

function mockFetchRedirect(status = 302): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, {
      status,
      headers: { Location: "https://dashboard.example.com/settings?connected=1" },
    }),
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("IntegrationsClient", () => {
  let client: IntegrationsClient;

  beforeEach(() => {
    client = new IntegrationsClient("http://localhost:8089", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Connection CRUD ────────────────────────────────────────────────────────

  describe("listConnections()", () => {
    it("calls GET /v1/integrations", async () => {
      const spy = mockFetchOk(LIST_CONNECTIONS_RESPONSE);

      const result = await client.listConnections();

      expect(result.connections).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/integrations");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("appends a provider query param", async () => {
      const spy = mockFetchOk(LIST_CONNECTIONS_RESPONSE);

      await client.listConnections({ provider: "cal_com" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/integrations?provider=cal_com");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "missing bearer token" }, 401);
      await expect(client.listConnections()).rejects.toMatchObject({ status: 401 });
      await expect(client.listConnections()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("createConnection()", () => {
    it("calls POST /v1/integrations", async () => {
      const spy = mockFetchOk(CONNECTION, 201);

      const result = await client.createConnection({
        name: "My Cal.com Account",
        api_key: "cal_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      });

      expect(result.connection_id).toBe(CONNECTION_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/integrations");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "My Cal.com Account",
        api_key: "cal_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      });
    });

    it("throws AudactError on HTTP 409 for a name conflict", async () => {
      mockFetchError({ error: "CONFLICT", message: "name conflict" }, 409);
      await expect(
        client.createConnection({ name: "My Cal.com Account", api_key: "cal_live_x" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("getConnection()", () => {
    it("calls GET /v1/integrations/:id", async () => {
      const spy = mockFetchOk(CONNECTION);

      const result = await client.getConnection(CONNECTION_ID);

      expect(result.connection_id).toBe(CONNECTION_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/integrations/${CONNECTION_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getConnection(CONNECTION_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("deleteConnection()", () => {
    it("calls DELETE /v1/integrations/:id", async () => {
      const spy = mockFetchOk(DELETE_CONNECTION_RESPONSE);

      const result = await client.deleteConnection(CONNECTION_ID);

      expect(result.deleted).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/integrations/${CONNECTION_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("appends ?force=true when force is requested", async () => {
      const spy = mockFetchOk(DELETE_CONNECTION_RESPONSE);

      await client.deleteConnection(CONNECTION_ID, { force: true });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/integrations/${CONNECTION_ID}?force=true`,
      );
    });

    it("throws AudactError on HTTP 409 when dependent tools exist and force is not set", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "connection has dependent tools" },
        409,
      );
      await expect(client.deleteConnection(CONNECTION_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("testConnection()", () => {
    it("calls POST /v1/integrations/:id/test", async () => {
      const spy = mockFetchOk(TEST_CONNECTION_RESPONSE);

      const result = await client.testConnection(CONNECTION_ID);

      expect(result.healthy).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/integrations/${CONNECTION_ID}/test`);
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.testConnection(CONNECTION_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── Event types ────────────────────────────────────────────────────────────

  describe("listConnectionEventTypes()", () => {
    it("calls GET /v1/integrations/:id/event-types", async () => {
      const spy = mockFetchOk(LIST_EVENT_TYPES_RESPONSE);

      const result = await client.listConnectionEventTypes(CONNECTION_ID);

      expect(result.event_types).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/integrations/${CONNECTION_ID}/event-types`,
      );
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 409 when the connection needs re-authorization", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "connection revoked/needs re-authorization" },
        409,
      );
      await expect(
        client.listConnectionEventTypes(CONNECTION_ID),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("throws AudactError on HTTP 502 when Cal.com is unavailable", async () => {
      mockFetchError({ error: "BAD_GATEWAY", message: "cal.com unavailable" }, 502);
      await expect(
        client.listConnectionEventTypes(CONNECTION_ID),
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  // ── Cal.com OAuth ──────────────────────────────────────────────────────────

  describe("calcomOauthStart()", () => {
    it("calls GET /v1/integrations/cal_com/oauth/start", async () => {
      const spy = mockFetchOk(OAUTH_START_RESPONSE);

      const result = await client.calcomOauthStart();

      expect(result.authorize_url).toContain("cal.com");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/integrations/cal_com/oauth/start");
      expect(init.method).toBe("GET");
    });

    it("appends name/cal_username query params", async () => {
      const spy = mockFetchOk(OAUTH_START_RESPONSE);

      await client.calcomOauthStart({
        name: "My Cal.com Account",
        cal_username: "jane-doe",
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8089/v1/integrations/cal_com/oauth/start" +
          "?name=My+Cal.com+Account&cal_username=jane-doe",
      );
    });

    it("throws AudactError on HTTP 500 when OAuth is not configured", async () => {
      mockFetchError(
        { error: "INTERNAL", message: "oauth not configured" },
        500,
      );
      await expect(client.calcomOauthStart()).rejects.toMatchObject({ status: 500 });
    });
  });

  describe("calcomOauthCallback()", () => {
    it("calls GET /v1/integrations/cal_com/oauth/callback with state + code", async () => {
      const spy = mockFetchRedirect();

      const response = await client.calcomOauthCallback("state-token-123", {
        code: "auth-code-xyz",
      });

      expect(response.status).toBe(302);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8089/v1/integrations/cal_com/oauth/callback" +
          "?state=state-token-123&code=auth-code-xyz",
      );
      expect(init.method).toBe("GET");
    });

    it("appends an error query param instead of code when the user declined consent", async () => {
      const spy = mockFetchRedirect();

      await client.calcomOauthCallback("state-token-123", { error: "access_denied" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8089/v1/integrations/cal_com/oauth/callback" +
          "?state=state-token-123&error=access_denied",
      );
    });

    it("throws AudactError on HTTP 400 for an unknown/expired state", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "unknown or expired state" },
        400,
      );
      await expect(
        client.calcomOauthCallback("bad-state", { code: "x" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
