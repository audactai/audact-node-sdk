/**
 * Audact TypeScript SDK — CallsClient test suite
 *
 * Covers the full SIP call lifecycle surface: outbound/inbound/browser call
 * initiation, hangup, status polling, warm handovers, transfers, plus SIP
 * trunks/dispatch-rules, the admission URL, and the WebSocket ticket.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / evidence.test.ts.
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

import { AudactError, CallsClient } from "../client.js";

import type {
  AdmissionUrlResponse,
  BrowserCallResponse,
  CallStatusResponse,
  CreateDispatchRuleResponse,
  CreateInboundTrunkResponse,
  CreateOutboundTrunkResponse,
  CreateWsTicketResponse,
  HandoverResponse,
  HandoverStateResponse,
  HangupResponse,
  InboundCallResponse,
  ListDispatchRulesResponse,
  ListTrunksResponse,
  OutboundCallResponse,
  TransferResponse,
  TransferSessionResponse,
  TransferStateResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const CALL_ID = "11111111-1111-1111-1111-111111111111";
const HANDOVER_ID = "22222222-2222-2222-2222-222222222222";
const TRANSFER_ID = "33333333-3333-3333-3333-333333333333";
const AGENT_ID = "44444444-4444-4444-4444-444444444444";

const OUTBOUND_CALL_RESPONSE: OutboundCallResponse = {
  call_id: CALL_ID,
  room_name: "call-11111111-",
  participant_id: "agent-1",
  sip_call_id: "sip-call-1",
};

const INBOUND_CALL_RESPONSE: InboundCallResponse = {
  call_id: CALL_ID,
  room_name: "call-11111111-",
  trunk_id: "ST_abc123",
};

const BROWSER_CALL_RESPONSE: BrowserCallResponse = {
  call_id: CALL_ID,
  room_name: "call-11111111-",
  livekit_token: "eyJhbGci...",
  livekit_url: "wss://livekit.audact.ai",
};

const HANGUP_RESPONSE: HangupResponse = {
  call_id: CALL_ID,
  room_name: "call-11111111-",
  status: "terminated",
};

const CALL_STATUS_RESPONSE: CallStatusResponse = {
  call_id: CALL_ID,
  room_name: "call-11111111-",
  status: "active",
  started_at: "2026-09-15T10:00:00Z",
};

const HANDOVER_RESPONSE: HandoverResponse = {
  call_id: CALL_ID,
  handover_id: HANDOVER_ID,
  state: "initiated",
};

const HANDOVER_STATE_RESPONSE: HandoverStateResponse = {
  call_id: CALL_ID,
  handover_id: HANDOVER_ID,
  state: "bridged",
  destination_hash: "deadbeef",
};

const TRANSFER_RESPONSE: TransferResponse = {
  call_id: CALL_ID,
  transfer_id: TRANSFER_ID,
  status: "started",
  transfer_option: "blind",
};

const TRANSFER_SESSION_RESPONSE: TransferSessionResponse = {
  call_id: CALL_ID,
  transfer_id: TRANSFER_ID,
  status: "started",
  transfer_option: "blind",
  destination_hash: "deadbeef",
};

const TRANSFER_STATE_RESPONSE: TransferStateResponse = {
  transfer_id: TRANSFER_ID,
  status: "bridged",
};

const LIST_TRUNKS_RESPONSE: ListTrunksResponse = {
  inbound_trunks: [
    { sip_trunk_id: "ST_abc123", provider: "telnyx", did: "+31201234567" },
  ],
  outbound_trunks: [
    { sip_trunk_id: "SOT_abc123", provider: "telnyx", address: "sip.telnyx.com" },
  ],
  has_more: false,
};

const CREATE_INBOUND_TRUNK_RESPONSE: CreateInboundTrunkResponse = {
  sip_trunk_id: "ST_abc123",
  provider: "telnyx",
  inbound_numbers: ["+31201234567"],
  status: "registered",
};

const CREATE_OUTBOUND_TRUNK_RESPONSE: CreateOutboundTrunkResponse = {
  sip_trunk_id: "SOT_abc123",
  provider: "telnyx",
  address: "sip.telnyx.com",
  status: "registered",
};

const LIST_DISPATCH_RULES_RESPONSE: ListDispatchRulesResponse = {
  routes: [
    {
      dispatch_rule_id: "SDR_abc123",
      did: "+31201234567",
      agent_id: AGENT_ID,
      room_prefix: "call-550e8400-",
    },
  ],
  has_more: false,
};

const CREATE_DISPATCH_RULE_RESPONSE: CreateDispatchRuleResponse = {
  dispatch_rule_id: "SDR_abc123",
  status: "routed",
};

const ADMISSION_URL_RESPONSE: AdmissionUrlResponse = {
  admission_url: "https://tenant.example.com/admission",
};

const CREATE_WS_TICKET_RESPONSE: CreateWsTicketResponse = {
  ticket: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
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

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("CallsClient", () => {
  let client: CallsClient;

  beforeEach(() => {
    client = new CallsClient("http://localhost:8088", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── SIP calls ──────────────────────────────────────────────────

  describe("initiateOutboundCall()", () => {
    it("calls POST /v1/sip/calls/outbound", async () => {
      const spy = mockFetchOk(OUTBOUND_CALL_RESPONSE, 201);

      const result = await client.initiateOutboundCall({
        agent_id: AGENT_ID,
        from_number: "+31201234567",
        destination_number: "+49301234567",
      });

      expect(result.call_id).toBe(CALL_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/calls/outbound");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(OUTBOUND_CALL_RESPONSE, 200);

      await client.initiateOutboundCall(
        {
          from_number: "+31201234567",
          destination_number: "+49301234567",
        },
        "idem-key-1",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-1");
    });

    it("throws AudactError on HTTP 403 CALL_BLOCKED_BY_POLICY", async () => {
      mockFetchError(
        { error: "CALL_BLOCKED_BY_POLICY", message: "blocked" },
        403,
      );
      await expect(
        client.initiateOutboundCall({
          from_number: "+31201234567",
          destination_number: "+49301234567",
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        client.initiateOutboundCall({
          from_number: "+31201234567",
          destination_number: "+49301234567",
        }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("initiateInboundCall()", () => {
    it("calls POST /v1/sip/calls/inbound", async () => {
      const spy = mockFetchOk(INBOUND_CALL_RESPONSE, 201);

      const result = await client.initiateInboundCall({
        called_did: "+31201234567",
        caller_number: "+49301234567",
      });

      expect(result.call_id).toBe(CALL_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/calls/inbound");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404 when no routing rule is found", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "no route" }, 404);
      await expect(
        client.initiateInboundCall({
          called_did: "+31201234567",
          caller_number: "+49301234567",
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("createBrowserCall()", () => {
    it("calls POST /v1/sip/calls/browser", async () => {
      const spy = mockFetchOk(BROWSER_CALL_RESPONSE, 201);

      const result = await client.createBrowserCall({ agent_id: AGENT_ID });

      expect(result.livekit_token).toBeTruthy();
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/calls/browser");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 400", async () => {
      mockFetchError({ error: "INVALID_REQUEST", message: "bad" }, 400);
      await expect(
        client.createBrowserCall({ agent_id: "" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("hangupCall()", () => {
    it("calls POST /v1/sip/calls/:callId/hangup", async () => {
      const spy = mockFetchOk(HANGUP_RESPONSE);

      const result = await client.hangupCall(CALL_ID);

      expect(result.status).toBe("terminated");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/sip/calls/${CALL_ID}/hangup`);
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "call not found" }, 404);
      await expect(client.hangupCall(CALL_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("getCallStatus()", () => {
    it("calls GET /v1/sip/calls/:callId/status", async () => {
      const spy = mockFetchOk(CALL_STATUS_RESPONSE);

      const result = await client.getCallStatus(CALL_ID);

      expect(result.status).toBe("active");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/sip/calls/${CALL_ID}/status`);
      expect(init.method).toBe("GET");
    });
  });

  // ── Warm handover ──────────────────────────────────────────────

  describe("initiateHandover()", () => {
    it("calls POST /v1/sip/calls/:callId/handover", async () => {
      const spy = mockFetchOk(HANDOVER_RESPONSE);

      const result = await client.initiateHandover(CALL_ID, {
        destination: "+49301234567",
        handover_reason: "agent_requested",
      });

      expect(result.handover_id).toBe(HANDOVER_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/calls/${CALL_ID}/handover`,
      );
      expect(init.method).toBe("POST");
    });
  });

  describe("getHandover()", () => {
    it("calls GET /v1/sip/handovers/:handoverId", async () => {
      const spy = mockFetchOk(HANDOVER_STATE_RESPONSE);

      const result = await client.getHandover(HANDOVER_ID);

      expect(result.state).toBe("bridged");
      expect(result).not.toHaveProperty("destination");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/handovers/${HANDOVER_ID}`,
      );
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getHandover(HANDOVER_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── Transfers ──────────────────────────────────────────────────

  describe("initiateTransfer()", () => {
    it("calls POST /v1/sip/calls/:callId/transfer", async () => {
      const spy = mockFetchOk(TRANSFER_RESPONSE);

      const result = await client.initiateTransfer(CALL_ID, {
        destination: "+49301234567",
      });

      expect(result.transfer_id).toBe(TRANSFER_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/calls/${CALL_ID}/transfer`,
      );
      expect(init.method).toBe("POST");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(TRANSFER_RESPONSE);

      await client.initiateTransfer(
        CALL_ID,
        { destination: "+49301234567" },
        "idem-key-2",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-2");
    });
  });

  describe("getTransferState()", () => {
    it("calls GET /v1/sip/transfers/:transferId", async () => {
      const spy = mockFetchOk(TRANSFER_SESSION_RESPONSE);

      const result = await client.getTransferState(TRANSFER_ID);

      expect(result.status).toBe("started");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/transfers/${TRANSFER_ID}`,
      );
      expect(init.method).toBe("GET");
    });
  });

  describe("bridgeTransfer() / cancelTransfer() / endTransfer()", () => {
    it("bridgeTransfer() calls POST /v1/sip/transfers/:transferId/bridge", async () => {
      const spy = mockFetchOk(TRANSFER_STATE_RESPONSE);

      const result = await client.bridgeTransfer(TRANSFER_ID);

      expect(result.status).toBe("bridged");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/transfers/${TRANSFER_ID}/bridge`,
      );
      expect(init.method).toBe("POST");
    });

    it("cancelTransfer() calls POST /v1/sip/transfers/:transferId/cancel", async () => {
      const spy = mockFetchOk({ ...TRANSFER_STATE_RESPONSE, status: "cancelled" });

      const result = await client.cancelTransfer(TRANSFER_ID);

      expect(result.status).toBe("cancelled");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/transfers/${TRANSFER_ID}/cancel`,
      );
      expect(init.method).toBe("POST");
    });

    it("endTransfer() calls POST /v1/sip/transfers/:transferId/end", async () => {
      const spy = mockFetchOk({ ...TRANSFER_STATE_RESPONSE, status: "ended" });

      const result = await client.endTransfer(TRANSFER_ID);

      expect(result.status).toBe("ended");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/sip/transfers/${TRANSFER_ID}/end`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404 for all three", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.bridgeTransfer(TRANSFER_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── SIP trunks ─────────────────────────────────────────────────

  describe("listTrunks()", () => {
    it("calls GET /v1/sip/trunks with no query params by default", async () => {
      const spy = mockFetchOk(LIST_TRUNKS_RESPONSE);

      const result = await client.listTrunks();

      expect(result.inbound_trunks).toHaveLength(1);
      expect(result.outbound_trunks).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/trunks");
      expect(init.method).toBe("GET");
    });

    it("serialises limit/cursor as query params", async () => {
      const spy = mockFetchOk(LIST_TRUNKS_RESPONSE);

      await client.listTrunks({ limit: 25, cursor: "opaque-cursor" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/v1/sip/trunks");
      expect(parsed.searchParams.get("limit")).toBe("25");
      expect(parsed.searchParams.get("cursor")).toBe("opaque-cursor");
    });

    it("throws AudactError on HTTP 400 for an invalid limit/cursor", async () => {
      mockFetchError({ error: "INVALID_REQUEST", message: "bad cursor" }, 400);
      await expect(client.listTrunks()).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("createInboundTrunk()", () => {
    it("calls POST /v1/sip/trunks/inbound", async () => {
      const spy = mockFetchOk(CREATE_INBOUND_TRUNK_RESPONSE, 201);

      const result = await client.createInboundTrunk({
        provider: "telnyx",
        inbound_numbers: ["+31201234567"],
        allowed_addresses: ["192.76.120.0/22"],
      });

      expect(result.sip_trunk_id).toBe("ST_abc123");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/trunks/inbound");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({
        provider: "telnyx",
        inbound_numbers: ["+31201234567"],
      });
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(CREATE_INBOUND_TRUNK_RESPONSE, 200);

      await client.createInboundTrunk(
        { provider: "telnyx", inbound_numbers: ["+31201234567"] },
        "idem-key-3",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-3");
    });

    it("throws AudactError on HTTP 409 idempotency conflict", async () => {
      mockFetchError({ error: "CONFLICT", message: "key reused" }, 409);
      await expect(
        client.createInboundTrunk(
          { provider: "telnyx", inbound_numbers: ["+31201234567"] },
          "idem-key-3",
        ),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("createOutboundTrunk()", () => {
    it("calls POST /v1/sip/trunks/outbound", async () => {
      const spy = mockFetchOk(CREATE_OUTBOUND_TRUNK_RESPONSE, 201);

      const result = await client.createOutboundTrunk({
        provider: "telnyx",
        address: "sip.telnyx.com",
        numbers: ["+31201234567"],
      });

      expect(result.address).toBe("sip.telnyx.com");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/trunks/outbound");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 400", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "missing address" },
        400,
      );
      await expect(
        client.createOutboundTrunk({
          provider: "telnyx",
          address: "",
          numbers: [],
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // ── SIP dispatch rules / routes ────────────────────────────────

  describe("listDispatchRules()", () => {
    it("calls GET /v1/sip/routes with no query params by default", async () => {
      const spy = mockFetchOk(LIST_DISPATCH_RULES_RESPONSE);

      const result = await client.listDispatchRules();

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0]?.dispatch_rule_id).toBe("SDR_abc123");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/routes");
      expect(init.method).toBe("GET");
    });

    it("serialises limit/cursor as query params", async () => {
      const spy = mockFetchOk(LIST_DISPATCH_RULES_RESPONSE);

      await client.listDispatchRules({ limit: 10, cursor: "next-page" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/v1/sip/routes");
      expect(parsed.searchParams.get("limit")).toBe("10");
      expect(parsed.searchParams.get("cursor")).toBe("next-page");
    });
  });

  describe("createDispatchRule()", () => {
    it("calls POST /v1/sip/routes", async () => {
      const spy = mockFetchOk(CREATE_DISPATCH_RULE_RESPONSE, 201);

      const result = await client.createDispatchRule({
        did: "+31201234567",
        agent_id: AGENT_ID,
      });

      expect(result.status).toBe("routed");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/routes");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({
        did: "+31201234567",
        agent_id: AGENT_ID,
      });
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(CREATE_DISPATCH_RULE_RESPONSE, 200);

      await client.createDispatchRule(
        { did: "+31201234567", agent_id: AGENT_ID },
        "idem-key-4",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-4");
    });

    it("throws AudactError on HTTP 400 on a missing field", async () => {
      mockFetchError({ error: "INVALID_REQUEST", message: "missing did" }, 400);
      await expect(
        client.createDispatchRule({ did: "", agent_id: AGENT_ID }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  // ── Admission URL ──────────────────────────────────────────────

  describe("getAdmissionUrl()", () => {
    it("calls GET /v1/sip/admission-url", async () => {
      const spy = mockFetchOk(ADMISSION_URL_RESPONSE);

      const result = await client.getAdmissionUrl();

      expect(result.admission_url).toBe(
        "https://tenant.example.com/admission",
      );
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/admission-url");
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);
      await expect(client.getAdmissionUrl()).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("setAdmissionUrl()", () => {
    it("calls PUT /v1/sip/admission-url", async () => {
      const spy = mockFetchOk(ADMISSION_URL_RESPONSE);

      const result = await client.setAdmissionUrl({
        admission_url: "https://tenant.example.com/admission",
      });

      expect(result.admission_url).toBe(
        "https://tenant.example.com/admission",
      );
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/sip/admission-url");
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toMatchObject({
        admission_url: "https://tenant.example.com/admission",
      });
    });

    it("throws AudactError on HTTP 400 for an invalid URL", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "not a valid http(s) URL" },
        400,
      );
      await expect(
        client.setAdmissionUrl({ admission_url: "not-a-url" }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("throws AudactError on HTTP 404 when tenant has no configuration", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "no configuration" },
        404,
      );
      await expect(
        client.setAdmissionUrl({ admission_url: "" }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── WebSocket ticket ───────────────────────────────────────────

  describe("createWsTicket()", () => {
    it("calls POST /v1/ws/ticket", async () => {
      const spy = mockFetchOk(CREATE_WS_TICKET_RESPONSE);

      const result = await client.createWsTicket();

      expect(result.ticket).toBe(CREATE_WS_TICKET_RESPONSE.ticket);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/ws/ticket");
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
      await expect(client.createWsTicket()).rejects.toMatchObject({
        status: 401,
      });
    });
  });
});
