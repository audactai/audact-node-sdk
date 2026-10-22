/**
 * Audact TypeScript SDK — WebhooksClient test suite
 *
 * Covers webhook endpoint CRUD, test-ping, delivery history + dead-letter
 * resend, event-type/schema discovery, and HMAC signing-secret status/
 * rotation, served by Tenant Management (port 8085).
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / calls.test.ts.
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

import { AudactError, WebhooksClient } from "../client.js";

import type {
  CreateWebhookResponse,
  ListWebhookDeliveriesResponse,
  ListWebhookEventTypesResponse,
  ListWebhooksResponse,
  ResendWebhookDeliveryResponse,
  RotateWebhookSecretResponse,
  TestWebhookResponse,
  WebhookEndpoint,
  WebhookEventSchema,
  WebhookSecretStatusResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const ENDPOINT_ID = "550e8400-e29b-41d4-a716-446655440000";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";
const DELIVERY_ID = "550e8400-e29b-41d4-a716-446655440002";

const ENDPOINT: WebhookEndpoint = {
  id: ENDPOINT_ID,
  tenant_id: TENANT_ID,
  url: "https://example.com/webhooks",
  events: ["call_ended"],
  scope: "account",
  is_active: true,
};

const CREATE_WEBHOOK_RESPONSE: CreateWebhookResponse = {
  ...ENDPOINT,
  signing_secret:
    "5f8b3c1e9a7d2b4f6e0c1a8d3b5f7e9c2a4d6f8b0e1c3a5d7f9b2e4c6a8d0f1b",
};

const LIST_WEBHOOKS_RESPONSE: ListWebhooksResponse = {
  items: [ENDPOINT],
  has_more: false,
};

const TEST_WEBHOOK_RESPONSE: TestWebhookResponse = {
  success: true,
  status_code: 200,
  latency_ms: 142.5,
};

const LIST_DELIVERIES_RESPONSE: ListWebhookDeliveriesResponse = {
  deliveries: [
    {
      id: DELIVERY_ID,
      endpoint_id: ENDPOINT_ID,
      event_id: "evt_abc123",
      event_type: "call_ended",
      status: "dead_letter",
      attempt_count: 4,
      created_at: "2026-09-15T09:00:00Z",
    },
  ],
  total: 1,
};

const RESEND_RESPONSE: ResendWebhookDeliveryResponse = {
  requeued: true,
  delivery_id: DELIVERY_ID,
};

const LIST_EVENT_TYPES_RESPONSE: ListWebhookEventTypesResponse = {
  event_types: [
    {
      name: "call_ended",
      description: "Fired when a call ends.",
      category: "voice",
      schema_url: "/v1/webhooks/event-schemas?type=call_ended",
    },
  ],
};

const EVENT_SCHEMA_RESPONSE: WebhookEventSchema = {
  event_type: "call_ended",
  category: "voice",
  description: "Fired when a call ends.",
  schema_version: "1.0.0",
  example_payload: { event_type: "call_ended" },
};

const SECRET_STATUS_RESPONSE: WebhookSecretStatusResponse = {
  in_rotation: false,
  created_at: "2026-03-18T15:17:00Z",
};

const ROTATE_SECRET_RESPONSE: RotateWebhookSecretResponse = {
  rotated: true,
  signing_secret:
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b",
  grace_period_ends: "2026-09-18T09:00:00Z",
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

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("WebhooksClient", () => {
  let client: WebhooksClient;

  beforeEach(() => {
    client = new WebhooksClient("http://localhost:8085", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── CRUD ───────────────────────────────────────────────────────────────────

  describe("listWebhooks()", () => {
    it("calls GET /v1/webhooks", async () => {
      const spy = mockFetchOk(LIST_WEBHOOKS_RESPONSE);

      const result = await client.listWebhooks();

      expect(result.items).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/webhooks");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("appends limit/cursor query params", async () => {
      const spy = mockFetchOk(LIST_WEBHOOKS_RESPONSE);

      await client.listWebhooks({ limit: 10, cursor: "abc" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8085/v1/webhooks?limit=10&cursor=abc",
      );
    });

    it("throws AudactError on HTTP 400 for an invalid limit", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "limit must be positive" },
        400,
      );
      await expect(client.listWebhooks({ limit: -1 })).rejects.toMatchObject({
        status: 400,
      });
      await expect(
        client.listWebhooks({ limit: -1 }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("createWebhook()", () => {
    it("calls POST /v1/webhooks", async () => {
      const spy = mockFetchOk(CREATE_WEBHOOK_RESPONSE, 201);

      const result = await client.createWebhook({
        url: "https://example.com/webhooks",
        events: ["call_ended"],
        scope: "account",
      });

      expect(result.signing_secret).toBe(CREATE_WEBHOOK_RESPONSE.signing_secret);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/webhooks");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        url: "https://example.com/webhooks",
        events: ["call_ended"],
        scope: "account",
      });
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(CREATE_WEBHOOK_RESPONSE, 200);

      await client.createWebhook(
        {
          url: "https://example.com/webhooks",
          events: ["call_ended"],
          scope: "account",
        },
        "idem-key-1",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-1");
    });

    it("throws AudactError on HTTP 400 for a non-https url", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "url must use https scheme" },
        400,
      );
      await expect(
        client.createWebhook({
          url: "http://example.com/webhooks",
          events: ["call_ended"],
          scope: "account",
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("getWebhook()", () => {
    it("calls GET /v1/webhooks/:id", async () => {
      const spy = mockFetchOk(ENDPOINT);

      const result = await client.getWebhook(ENDPOINT_ID);

      expect(result.id).toBe(ENDPOINT_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/webhooks/${ENDPOINT_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getWebhook(ENDPOINT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("updateWebhook()", () => {
    it("calls PUT /v1/webhooks/:id", async () => {
      const spy = mockFetchOk({ ...ENDPOINT, is_active: false });

      const result = await client.updateWebhook(ENDPOINT_ID, {
        is_active: false,
      });

      expect(result.is_active).toBe(false);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/webhooks/${ENDPOINT_ID}`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual({ is_active: false });
    });

    it("throws AudactError on HTTP 400 for empty events", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "events must not be empty" },
        400,
      );
      await expect(
        client.updateWebhook(ENDPOINT_ID, { events: [] }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteWebhook()", () => {
    it("calls DELETE /v1/webhooks/:id", async () => {
      const spy = mockFetchNoContent();

      const result = await client.deleteWebhook(ENDPOINT_ID);

      expect(result).toBeUndefined();
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/webhooks/${ENDPOINT_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.deleteWebhook(ENDPOINT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── Test ping ──────────────────────────────────────────────────────────────

  describe("testWebhook()", () => {
    it("calls POST /v1/webhooks/:id/test", async () => {
      const spy = mockFetchOk(TEST_WEBHOOK_RESPONSE);

      const result = await client.testWebhook(ENDPOINT_ID);

      expect(result.success).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/webhooks/${ENDPOINT_ID}/test`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.testWebhook(ENDPOINT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── Deliveries ─────────────────────────────────────────────────────────────

  describe("listWebhookDeliveries()", () => {
    it("calls GET /v1/webhooks/:id/deliveries", async () => {
      const spy = mockFetchOk(LIST_DELIVERIES_RESPONSE);

      const result = await client.listWebhookDeliveries(ENDPOINT_ID);

      expect(result.total).toBe(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/webhooks/${ENDPOINT_ID}/deliveries`,
      );
      expect(init.method).toBe("GET");
    });

    it("appends limit/offset query params", async () => {
      const spy = mockFetchOk(LIST_DELIVERIES_RESPONSE);

      await client.listWebhookDeliveries(ENDPOINT_ID, {
        limit: 20,
        offset: 40,
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/webhooks/${ENDPOINT_ID}/deliveries?limit=20&offset=40`,
      );
    });

    it("throws AudactError on HTTP 404 for an unowned endpoint", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(
        client.listWebhookDeliveries(ENDPOINT_ID),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("resendWebhookDelivery()", () => {
    it("calls POST /v1/webhooks/deliveries/:id/resend", async () => {
      const spy = mockFetchOk(RESEND_RESPONSE);

      const result = await client.resendWebhookDelivery(DELIVERY_ID);

      expect(result.requeued).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/webhooks/deliveries/${DELIVERY_ID}/resend`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 409 when not dead_letter", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "delivery is in \"success\" status" },
        409,
      );
      await expect(
        client.resendWebhookDelivery(DELIVERY_ID),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ── Event type / schema discovery ─────────────────────────────────────────

  describe("listWebhookEventTypes()", () => {
    it("calls GET /v1/webhooks/event-types", async () => {
      const spy = mockFetchOk(LIST_EVENT_TYPES_RESPONSE);

      const result = await client.listWebhookEventTypes();

      expect(result.event_types[0]?.name).toBe("call_ended");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/webhooks/event-types");
      expect(init.method).toBe("GET");
    });
  });

  describe("getWebhookEventSchema()", () => {
    it("calls GET /v1/webhooks/event-schemas?type=", async () => {
      const spy = mockFetchOk(EVENT_SCHEMA_RESPONSE);

      const result = await client.getWebhookEventSchema("call_ended");

      expect(result.event_type).toBe("call_ended");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8085/v1/webhooks/event-schemas?type=call_ended",
      );
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 for an unknown event type", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "unknown type" }, 404);
      await expect(
        client.getWebhookEventSchema("nonexistent_event"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Signing secret ─────────────────────────────────────────────────────────

  describe("getWebhookSecretStatus()", () => {
    it("calls GET /v1/webhooks/secrets/status", async () => {
      const spy = mockFetchOk(SECRET_STATUS_RESPONSE);

      const result = await client.getWebhookSecretStatus();

      expect(result.in_rotation).toBe(false);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/webhooks/secrets/status");
      expect(init.method).toBe("GET");
    });
  });

  describe("rotateWebhookSecret()", () => {
    it("calls POST /v1/webhooks/secrets/rotate", async () => {
      const spy = mockFetchOk(ROTATE_SECRET_RESPONSE);

      const result = await client.rotateWebhookSecret();

      expect(result.rotated).toBe(true);
      expect(result.signing_secret).toBe(ROTATE_SECRET_RESPONSE.signing_secret);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/webhooks/secrets/rotate");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "missing bearer token" },
        401,
      );
      await expect(client.rotateWebhookSecret()).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
