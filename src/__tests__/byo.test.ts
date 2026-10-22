/**
 * Audact TypeScript SDK — BYO (Bring-Your-Own-Telephony) test suite
 *
 * Covers NumbersClient's BYO connection CRUD/verify surface, getByoConfig,
 * and origin-aware createNumber — pure JSON, no multipart.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in numbers.test.ts / client.test.ts.
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

import { AudactClient, AudactError, NumbersClient } from "../client.js";

import type {
  BYOConnection,
  ByoConfig,
  CreateBYOConnectionRequest,
  CreateNumberRequest,
  ListByoConnectionsResponse,
  PhoneNumber,
  UpdateBYOConnectionRequest,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const CONN_ID = "11111111-1111-1111-1111-111111111111";
const NUMBER_ID = "99999999-9999-9999-9999-999999999999";

const BYO_CONNECTION: BYOConnection = {
  id: CONN_ID,
  name: "Acme HQ Twilio Trunk",
  provider: "twilio",
  sip_host: "acme.pstn.twilio.com",
  sip_transport: "auto",
  has_credentials: true,
  inbound_allowed_ips: ["203.0.113.0/24"],
  connection_health: "healthy",
  health_detail: "outbound call connected successfully",
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const BYO_CONFIG: ByoConfig = {
  sip_ingress_host: "sip.us.audact.ai",
  signaling_ips: ["203.0.113.10/32"],
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

function mockFetchNoContent(status = 204): FetchMock {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status }));
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

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("NumbersClient — BYO", () => {
  let client: NumbersClient;

  beforeEach(() => {
    client = new NumbersClient("http://localhost:8088", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── listByoConnections() ────────────────────────────────────────────────

  describe("listByoConnections()", () => {
    it("calls GET /v1/byo/connections and returns ListByoConnectionsResponse", async () => {
      const response: ListByoConnectionsResponse = {
        connections: [BYO_CONNECTION],
      };
      const spy = mockFetchOk(response);

      const result = await client.listByoConnections();

      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]?.id).toBe(CONN_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/byo/connections");
      expect(init.method).toBe("GET");
    });

    it("serializes limit/cursor query params", async () => {
      const spy = mockFetchOk({ connections: [] });

      await client.listByoConnections({ limit: 10, cursor: "abc123" });

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8088/v1/byo/connections?limit=10&cursor=abc123",
      );
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);

      await expect(client.listByoConnections()).rejects.toBeInstanceOf(
        AudactError,
      );
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);
      await expect(client.listByoConnections()).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  // ── getByoConnection() ──────────────────────────────────────────────────

  describe("getByoConnection()", () => {
    it("calls GET /v1/byo/connections/:id and returns the model", async () => {
      const spy = mockFetchOk(BYO_CONNECTION);

      const result = await client.getByoConnection(CONN_ID);

      expect(result.id).toBe(CONN_ID);
      expect(result.provider).toBe("twilio");
      expect(result.connection_health).toBe("healthy");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/byo/connections/${CONN_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "byo connection not found" },
        404,
      );

      await expect(
        client.getByoConnection("nonexistent"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── createByoConnection() ───────────────────────────────────────────────

  describe("createByoConnection()", () => {
    it("calls POST /v1/byo/connections with a JSON body (no multipart)", async () => {
      const spy = mockFetchOk(BYO_CONNECTION, 201);
      const req: CreateBYOConnectionRequest = {
        name: "Acme HQ Twilio Trunk",
        provider: "twilio",
        sip_host: "acme.pstn.twilio.com",
        sip_username: "acme-trunk-user",
        sip_password: "correct-horse-battery-staple",
      };

      const result = await client.createByoConnection(req);

      expect(result.id).toBe(CONN_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/byo/connections");
      expect(init.method).toBe("POST");
      expect(init.body).not.toBeInstanceOf(FormData);
      expect(JSON.parse(init.body as string)).toEqual(req);
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(BYO_CONNECTION, 201);

      await client.createByoConnection(
        {
          name: "Acme HQ Trunk",
          provider: "generic_sip",
          sip_host: "sip.acme.example",
          inbound_allowed_ips: ["203.0.113.0/24"],
        },
        "idem-key-abc",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-abc");
    });

    it("throws AudactError with status/body on 422 missing_connection_material", async () => {
      const errorBody = {
        error: "missing_connection_material",
        message:
          "connection has neither SIP credentials nor an inbound IP allowlist",
      };
      mockFetchError(errorBody, 422);

      await expect(
        client.createByoConnection({
          name: "No auth trunk",
          provider: "generic_sip",
          sip_host: "sip.acme.example",
        }),
      ).rejects.toMatchObject({
        status: 422,
        body: errorBody,
      });
    });

    it("throws AudactError with status/body on 409 (name already exists)", async () => {
      const errorBody = {
        error: "CONFLICT",
        message: "a connection with this name already exists for your tenant",
      };
      mockFetchError(errorBody, 409);

      await expect(
        client.createByoConnection({
          name: "Acme HQ Twilio Trunk",
          provider: "twilio",
          sip_host: "acme.pstn.twilio.com",
          sip_username: "u",
          sip_password: "p",
        }),
      ).rejects.toMatchObject({
        status: 409,
        body: errorBody,
      });

      await expect(
        client.createByoConnection({
          name: "Acme HQ Twilio Trunk",
          provider: "twilio",
          sip_host: "acme.pstn.twilio.com",
          sip_username: "u",
          sip_password: "p",
        }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  // ── updateByoConnection() ───────────────────────────────────────────────

  describe("updateByoConnection()", () => {
    it("calls PUT /v1/byo/connections/:id with a partial JSON body", async () => {
      const spy = mockFetchOk(BYO_CONNECTION);
      const req: UpdateBYOConnectionRequest = {
        sip_username: "new-user",
        sip_password: "new-correct-horse-battery-staple",
      };

      const result = await client.updateByoConnection(CONN_ID, req);

      expect(result.id).toBe(CONN_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/byo/connections/${CONN_ID}`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual(req);
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(BYO_CONNECTION);

      await client.updateByoConnection(
        CONN_ID,
        { name: "Renamed trunk" },
        "idem-key-update",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-update");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "byo connection not found" },
        404,
      );

      await expect(
        client.updateByoConnection("nonexistent", { name: "x" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("throws AudactError with status/body on 422 inbound_allowlist_too_broad", async () => {
      const errorBody = {
        error: "inbound_allowlist_too_broad",
        message: "inbound_allowed_ips entry is too broad",
      };
      mockFetchError(errorBody, 422);

      await expect(
        client.updateByoConnection(CONN_ID, { inbound_allowed_ips: ["0.0.0.0/0"] }),
      ).rejects.toMatchObject({ status: 422, body: errorBody });
    });
  });

  // ── verifyByoConnection() ───────────────────────────────────────────────

  describe("verifyByoConnection()", () => {
    it("calls POST /v1/byo/connections/:id/verify and returns the model", async () => {
      const spy = mockFetchOk(BYO_CONNECTION);

      const result = await client.verifyByoConnection(CONN_ID);

      expect(result.connection_health).toBe("healthy");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/byo/connections/${CONN_ID}/verify`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "byo connection not found" },
        404,
      );

      await expect(
        client.verifyByoConnection("nonexistent"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── deleteByoConnection() ───────────────────────────────────────────────

  describe("deleteByoConnection()", () => {
    it("calls DELETE /v1/byo/connections/:id", async () => {
      const spy = mockFetchNoContent();

      await client.deleteByoConnection(CONN_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/byo/connections/${CONN_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError with status/body on HTTP 409 (numbers still attached)", async () => {
      const errorBody = {
        error: "CONFLICT",
        message: "2 phone number(s) are still attached to this connection",
      };
      mockFetchError(errorBody, 409);

      await expect(
        client.deleteByoConnection(CONN_ID),
      ).rejects.toMatchObject({ status: 409, body: errorBody });
    });
  });

  // ── getByoConfig() ───────────────────────────────────────────────────────

  describe("getByoConfig()", () => {
    it("calls GET /v1/byo/config and returns ByoConfig", async () => {
      const spy = mockFetchOk(BYO_CONFIG);

      const result = await client.getByoConfig();

      expect(result.sip_ingress_host).toBe("sip.us.audact.ai");
      expect(result.signaling_ips).toEqual(["203.0.113.10/32"]);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/byo/config");
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);

      await expect(client.getByoConfig()).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  // ── origin-aware createNumber() ──────────────────────────────────────────

  describe("createNumber() — origin-aware (BYO)", () => {
    it("sends origin and byo_connection_id for an existing-connection attach", async () => {
      const response: PhoneNumber = {
        id: NUMBER_ID,
        did: "+14155551234",
        country_code: "US",
        status: "available",
        origin: "byo",
        provider: "twilio",
        connection_health: "healthy",
        created_at: "2026-03-18T15:17:00Z",
        updated_at: "2026-03-18T15:17:00Z",
      };
      const spy = mockFetchOk(response, 201);

      const req: CreateNumberRequest = {
        did: "+14155551234",
        country_code: "US",
        origin: "byo",
        byo_connection_id: CONN_ID,
      };

      const result = await client.createNumber(req);

      expect(result.origin).toBe("byo");
      expect(result.provider).toBe("twilio");
      expect(result.connection_health).toBe("healthy");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/numbers");
      expect(init.method).toBe("POST");
      const sentBody = JSON.parse(init.body as string) as CreateNumberRequest;
      expect(sentBody.origin).toBe("byo");
      expect(sentBody.byo_connection_id).toBe(CONN_ID);
      expect(sentBody.connection).toBeUndefined();
    });

    it("sends origin and an inline connection description (create-or-reuse)", async () => {
      const response: PhoneNumber = {
        id: NUMBER_ID,
        did: "+14155551235",
        country_code: "US",
        status: "available",
        origin: "byo",
        provider: "generic_sip",
        connection_health: "unverified",
        created_at: "2026-03-18T15:17:00Z",
        updated_at: "2026-03-18T15:17:00Z",
      };
      const spy = mockFetchOk(response, 201);

      const req: CreateNumberRequest = {
        did: "+14155551235",
        country_code: "US",
        origin: "byo",
        connection: {
          provider: "generic_sip",
          sip_host: "sip.acme.example",
          inbound_allowed_ips: ["203.0.113.0/24"],
        },
      };

      const result = await client.createNumber(req);

      expect(result.origin).toBe("byo");

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const sentBody = JSON.parse(init.body as string) as CreateNumberRequest;
      expect(sentBody.origin).toBe("byo");
      expect(sentBody.byo_connection_id).toBeUndefined();
      expect(sentBody.connection).toEqual({
        provider: "generic_sip",
        sip_host: "sip.acme.example",
        inbound_allowed_ips: ["203.0.113.0/24"],
      });
    });

    it("omits origin/connection fields for a plain Audact-provisioned number", async () => {
      const response: PhoneNumber = {
        id: NUMBER_ID,
        did: "+31201234567",
        country_code: "NL",
        status: "available",
        trunk_provider: "telnyx",
        created_at: "2026-03-18T15:17:00Z",
        updated_at: "2026-03-18T15:17:00Z",
      };
      const spy = mockFetchOk(response, 201);

      const result = await client.createNumber({
        did: "+31201234567",
        country_code: "NL",
      });

      expect(result.origin).toBeUndefined();

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const sentBody = JSON.parse(init.body as string) as CreateNumberRequest;
      expect(sentBody.origin).toBeUndefined();
      expect(sentBody.byo_connection_id).toBeUndefined();
      expect(sentBody.connection).toBeUndefined();
    });

    it("throws AudactError with status/body on 422 missing_connection_material", async () => {
      const errorBody = {
        error: "missing_connection_material",
        message:
          "connection has neither SIP credentials nor an inbound IP allowlist",
      };
      mockFetchError(errorBody, 422);

      await expect(
        client.createNumber({
          did: "+14155551236",
          country_code: "US",
          origin: "byo",
          connection: {
            provider: "generic_sip",
            sip_host: "sip.acme.example",
          },
        }),
      ).rejects.toMatchObject({ status: 422, body: errorBody });
    });

    it("throws AudactError with status/body on HTTP 409 (DID already exists)", async () => {
      const errorBody = {
        error: "CONFLICT",
        message: "phone number already exists",
      };
      mockFetchError(errorBody, 409);

      await expect(
        client.createNumber({
          did: "+14155551234",
          country_code: "US",
          origin: "byo",
          byo_connection_id: CONN_ID,
        }),
      ).rejects.toMatchObject({ status: 409, body: errorBody });
    });
  });

  // ── AudactClient wiring ──────────────────────────────────────────────────

  describe("AudactClient wiring", () => {
    it("exposes the BYO methods via client.numbers", () => {
      const audact = new AudactClient({ apiKey: API_KEY });
      expect(typeof audact.numbers.listByoConnections).toBe("function");
      expect(typeof audact.numbers.getByoConnection).toBe("function");
      expect(typeof audact.numbers.createByoConnection).toBe("function");
      expect(typeof audact.numbers.updateByoConnection).toBe("function");
      expect(typeof audact.numbers.verifyByoConnection).toBe("function");
      expect(typeof audact.numbers.deleteByoConnection).toBe("function");
      expect(typeof audact.numbers.getByoConfig).toBe("function");
      expect(typeof audact.numbers.createNumber).toBe("function");
    });
  });
});
