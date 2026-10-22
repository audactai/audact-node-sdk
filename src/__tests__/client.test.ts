/**
 * Audact TypeScript SDK — AudactClient test suite (M4-023)
 *
 * Uses vitest with a fetch mock so the tests run without a real server.
 * All tests are self-contained and deterministic.
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

import {
  AudactClient,
  AudactError,
  BaseServiceClient,
  EvidenceClient,
  LLMProxyClient,
  TenantClient,
  ValidatorClient,
} from "../client.js";

import type { ProxyCompleteOptions, ProxyStreamOptions } from "../client.js";

import type {
  ACVFResponse,
  ChainResponse,
  CreateTenantResponse,
  FinalizeScoreResponse,
  GenerateKeyResponse,
  HealthResponse,
  ListKeysResponse,
  PostEventResponse,
  TenantConfiguration,
  UsageRecord,
  VerifyChainResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const CALL_ID = "22222222-2222-2222-2222-222222222222";
const CONFIG_ID = "33333333-3333-3333-3333-333333333333";
const API_KEY = "aud_live_test1234567890abcdef";
const KEY_ID = "44444444-4444-4444-4444-444444444444";
const EVENT_ID = "55555555-5555-5555-5555-555555555555";

const ACVF_RESPONSE: ACVFResponse = {
  call_id: CALL_ID,
  turn: 1,
  verdict: "ALLOW",
  content: "Hello, I am an AI assistant.",
  fail_open: false,
  checks: [
    {
      check_id: "disclosure_gate",
      verdict: "ALLOW",
      reason: "disclosure delivered",
      duration_ms: 0.5,
    },
  ],
  compliance_score: {
    composite: 1.0,
    check_scores: [
      {
        check_id: "disclosure_gate",
        verdict: "ALLOW",
        weight: 1.0,
        score: 1.0,
      },
    ],
    total_weight: 1.0,
  },
};

const HEALTH_RESPONSE: HealthResponse = {
  status: "ok",
  checks: { redis: { status: "ok" }, postgres: { status: "ok" } },
};

const POST_EVENT_RESPONSE: PostEventResponse = {
  event_id: EVENT_ID,
  call_id: CALL_ID,
  tenant_id: TENANT_ID,
  sequence: 1,
  hash: "abc123",
  previous_hash: "0000000000000000000000000000000000000000000000000000000000000000",
  timestamp: "2026-03-13T10:00:00Z",
};

const CHAIN_RESPONSE: ChainResponse = {
  call_id: CALL_ID,
  tenant_id: TENANT_ID,
  events: [
    {
      event_id: EVENT_ID,
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_START",
      sequence: 1,
      hash: "abc123",
      previous_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      timestamp: "2026-03-13T10:00:00Z",
    },
  ],
  total: 1,
};

const CREATE_TENANT_RESPONSE: CreateTenantResponse = {
  tenant_id: TENANT_ID,
  name: "Acme Corp",
  plan: "starter",
  hmac_key_arn: "arn:aws:kms:eu-west-1:123456789012:key/stub",
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
  api_key: {
    key_id: KEY_ID,
    key: API_KEY,
    key_prefix: "aud_live",
    name: "default",
    role: "owner",
  },
};

const GENERATE_KEY_RESPONSE: GenerateKeyResponse = {
  api_key_id: KEY_ID,
  tenant_id: TENANT_ID,
  name: "CI key",
  key_prefix: "aud_live",
  role: "developer",
  created_at: "2026-03-13T10:00:00Z",
  key: API_KEY,
};

const LIST_KEYS_RESPONSE: ListKeysResponse = {
  keys: [
    {
      api_key_id: KEY_ID,
      tenant_id: TENANT_ID,
      name: "default",
      key_prefix: "aud_live",
      role: "owner",
      created_at: "2026-03-13T10:00:00Z",
    },
  ],
  total: 1,
};

const TENANT_CONFIG: TenantConfiguration = {
  config_id: CONFIG_ID,
  tenant_id: TENANT_ID,
  name: "Production v1",
  countries: ["NL", "DE"],
  blocklist_patterns: [],
  config_seal_hash: "deadbeef",
  version: 1,
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
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

function mockFetchNetworkError(message = "Network error"): FetchMock {
  return vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValueOnce(new Error(message));
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("AudactClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("applies default service URLs", () => {
      const client = new AudactClient({ apiKey: API_KEY });
      expect(client.validator).toBeInstanceOf(ValidatorClient);
      expect(client.evidence).toBeInstanceOf(EvidenceClient);
      expect(client.llmProxy).toBeInstanceOf(LLMProxyClient);
      expect(client.tenants).toBeInstanceOf(TenantClient);
    });

    it("accepts custom service URL overrides", () => {
      const client = new AudactClient({
        apiKey: API_KEY,
        serviceUrls: {
          validator: "https://validator.example.com",
        },
      });
      // Sub-clients are created; no error thrown.
      expect(client.validator).toBeInstanceOf(ValidatorClient);
    });

    it("exposes all four sub-clients", () => {
      const client = new AudactClient({ apiKey: API_KEY });
      expect(client.validator).toBeDefined();
      expect(client.evidence).toBeDefined();
      expect(client.llmProxy).toBeDefined();
      expect(client.tenants).toBeDefined();
    });
  });
});

// ─── AudactError ─────────────────────────────────────────────────────────────

describe("AudactError", () => {
  it("carries status, body, and requestId", () => {
    const err = new AudactError("not found", 404, { error: "NOT_FOUND" }, "req-1");
    expect(err.name).toBe("AudactError");
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ error: "NOT_FOUND" });
    expect(err.requestId).toBe("req-1");
    expect(err.message).toBe("not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AudactError);
  });

  it("defaults body to null and requestId to undefined", () => {
    const err = new AudactError("oops", 500);
    expect(err.body).toBeNull();
    expect(err.requestId).toBeUndefined();
  });
});

// ─── BaseServiceClient ────────────────────────────────────────────────────────

describe("BaseServiceClient", () => {
  it("strips trailing slash from baseUrl", () => {
    const client = new BaseServiceClient(
      "http://localhost:8082/",
      API_KEY,
      30_000,
    );
    // Access via protected property — cast to any for testing.
    expect((client as unknown as { baseUrl: string }).baseUrl).toBe(
      "http://localhost:8082",
    );
  });
});

// ─── ValidatorClient ─────────────────────────────────────────────────────────

describe("ValidatorClient", () => {
  let client: ValidatorClient;

  beforeEach(() => {
    client = new ValidatorClient("http://localhost:8082", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validate()", () => {
    it("calls POST /v1/validate and returns ACVFResponse", async () => {
      const spy = mockFetchOk(ACVF_RESPONSE);

      const result = await client.validate({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        config_id: CONFIG_ID,
        turn: 1,
        content: "Hello, I am an AI assistant.",
        context: {
          previous_turns: [],
          call_state: { disclosure_delivered: false },
        },
      });

      expect(result.verdict).toBe("ALLOW");
      expect(result.call_id).toBe(CALL_ID);
      expect(result.checks).toHaveLength(1);
      expect(spy).toHaveBeenCalledOnce();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8082/v1/validate");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("includes compliance_score when present", async () => {
      mockFetchOk(ACVF_RESPONSE);
      const result = await client.validate({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        config_id: CONFIG_ID,
        turn: 1,
        content: "test",
        context: { previous_turns: [], call_state: { disclosure_delivered: true } },
      });
      expect(result.compliance_score?.composite).toBe(1.0);
    });

    it("handles BLOCK verdict", async () => {
      const blockResponse: ACVFResponse = {
        ...ACVF_RESPONSE,
        verdict: "BLOCK",
        checks: [
          {
            check_id: "disclosure_gate",
            verdict: "BLOCK",
            reason: "disclosure not delivered",
            duration_ms: 0.3,
          },
        ],
      };
      mockFetchOk(blockResponse);

      const result = await client.validate({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        config_id: CONFIG_ID,
        turn: 1,
        content: "Price is guaranteed!",
        context: { previous_turns: [], call_state: { disclosure_delivered: false } },
      });

      expect(result.verdict).toBe("BLOCK");
      expect(result.checks[0]?.check_id).toBe("disclosure_gate");
    });

    it("handles MODIFY verdict", async () => {
      const modifyResponse: ACVFResponse = {
        ...ACVF_RESPONSE,
        verdict: "MODIFY",
        content: "The product has a competitive price.",
        checks: [
          {
            check_id: "pricing_band",
            verdict: "MODIFY",
            modified_content: "The product has a competitive price.",
            duration_ms: 1.2,
          },
        ],
      };
      mockFetchOk(modifyResponse);

      const result = await client.validate({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        config_id: CONFIG_ID,
        turn: 2,
        content: "This is the cheapest product at €49.99!",
        context: {
          previous_turns: [
            {
              turn: 1,
              content: "Hello",
              verdict: "ALLOW",
            },
          ],
          call_state: { disclosure_delivered: true },
        },
      });

      expect(result.verdict).toBe("MODIFY");
      expect(result.content).toBe("The product has a competitive price.");
    });

    it("handles fail_open response", async () => {
      const failOpenResponse: ACVFResponse = {
        call_id: CALL_ID,
        turn: 1,
        verdict: "ALLOW",
        content: "test",
        fail_open: true,
        fail_open_meta: {
          reason: "deadline_exceeded",
          deadline_ms: 40.0,
          elapsed_ms: 41.5,
          checks_completed: 2,
        },
        checks: [],
      };
      mockFetchOk(failOpenResponse);

      const result = await client.validate({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        config_id: CONFIG_ID,
        turn: 1,
        content: "test",
        context: { previous_turns: [], call_state: { disclosure_delivered: false } },
      });

      expect(result.fail_open).toBe(true);
      expect(result.fail_open_meta?.reason).toBe("deadline_exceeded");
      expect(result.fail_open_meta?.checks_completed).toBe(2);
    });

    it("throws AudactError on HTTP 400", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "call_id is required" },
        400,
      );

      await expect(
        client.validate({
          call_id: "",
          tenant_id: TENANT_ID,
          config_id: CONFIG_ID,
          turn: 1,
          content: "test",
          context: { previous_turns: [], call_state: { disclosure_delivered: false } },
        }),
      ).rejects.toMatchObject({
        status: 400,
        message: "call_id is required",
      });
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "Authorization required" },
        401,
      );

      await expect(
        client.validate({
          call_id: CALL_ID,
          tenant_id: TENANT_ID,
          config_id: CONFIG_ID,
          turn: 1,
          content: "test",
          context: { previous_turns: [], call_state: { disclosure_delivered: false } },
        }),
      ).rejects.toMatchObject({ status: 401 });
    });

    it("throws AudactError on network error", async () => {
      mockFetchNetworkError("fetch failed");

      await expect(
        client.validate({
          call_id: CALL_ID,
          tenant_id: TENANT_ID,
          config_id: CONFIG_ID,
          turn: 1,
          content: "test",
          context: { previous_turns: [], call_state: { disclosure_delivered: false } },
        }),
      ).rejects.toMatchObject({ status: 0, message: "fetch failed" });
    });

    it("populates requestId from X-Request-ID header on error", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);

      let err: AudactError | null = null;
      try {
        await client.validate({
          call_id: CALL_ID,
          tenant_id: TENANT_ID,
          config_id: CONFIG_ID,
          turn: 1,
          content: "test",
          context: { previous_turns: [], call_state: { disclosure_delivered: false } },
        });
      } catch (e) {
        err = e as AudactError;
      }

      expect(err).not.toBeNull();
      expect(err?.requestId).toBe("req-test-456");
    });
  });

  describe("finalizeCallScore()", () => {
    it("calls POST /v1/calls/:callId/finalize-score and returns FinalizeScoreResponse", async () => {
      const financeResponse: FinalizeScoreResponse = {
        status: "finalized",
        composite_score: 0.92,
        total_turns: 5,
        turns_with_violations: 1,
        fail_open_count: 0,
      };
      const spy = mockFetchOk(financeResponse);

      const result = await client.finalizeCallScore(CALL_ID, {
        agent_id: "agent-1",
      });

      expect(result.status).toBe("finalized");
      expect(result.composite_score).toBe(0.92);
      expect(result.total_turns).toBe(5);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8082/v1/calls/${CALL_ID}/finalize-score`,
      );
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ agent_id: "agent-1" });
    });

    it("returns skipped status with null composite_score", async () => {
      const skippedResponse: FinalizeScoreResponse = {
        status: "skipped",
        composite_score: null,
      };
      mockFetchOk(skippedResponse);

      const result = await client.finalizeCallScore(CALL_ID);

      expect(result.status).toBe("skipped");
      expect(result.composite_score).toBeNull();
    });

    it("throws AudactError on HTTP 400", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "call_id is required" },
        400,
      );

      await expect(client.finalizeCallScore(CALL_ID)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      mockFetchOk(HEALTH_RESPONSE);
      const result = await client.health();
      expect(result.status).toBe("ok");
    });
  });
});

// ─── EvidenceClient ───────────────────────────────────────────────────────────

describe("EvidenceClient", () => {
  let client: EvidenceClient;

  beforeEach(() => {
    client = new EvidenceClient("http://localhost:8083", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("postEvent()", () => {
    it("calls POST /v1/events and returns PostEventResponse", async () => {
      const spy = mockFetchOk(POST_EVENT_RESPONSE, 201);

      const result = await client.postEvent({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        event_type: "CALL_START",
      });

      expect(result.event_id).toBe(EVENT_ID);
      expect(result.sequence).toBe(1);
      expect(result.hash).toBe("abc123");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/events");
      expect(init.method).toBe("POST");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(POST_EVENT_RESPONSE, 201);

      await client.postEvent(
        { call_id: CALL_ID, tenant_id: TENANT_ID, event_type: "CALL_START" },
        "idem-key-abc",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-key-abc",
      );
    });

    it("does not add Idempotency-Key header when not provided", async () => {
      const spy = mockFetchOk(POST_EVENT_RESPONSE, 201);

      await client.postEvent({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        event_type: "CALL_END",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(
        (init.headers as Record<string, string>)["Idempotency-Key"],
      ).toBeUndefined();
    });

    it("throws AudactError on HTTP 403", async () => {
      mockFetchError(
        { error: "FORBIDDEN", message: "cross-tenant write attempt" },
        403,
      );

      await expect(
        client.postEvent({
          call_id: CALL_ID,
          tenant_id: TENANT_ID,
          event_type: "CALL_START",
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("getChain()", () => {
    it("calls GET /v1/chains/:callId (drift fix)", async () => {
      const spy = mockFetchOk(CHAIN_RESPONSE);

      const result = await client.getChain(CALL_ID);

      expect(result.call_id).toBe(CALL_ID);
      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(1);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old `/v1/events/{id}/chain`
      // route and passes against the corrected `/v1/chains/{id}` route.
      expect(url).toBe(`http://localhost:8083/v1/chains/${CALL_ID}`);
      expect(url).not.toContain("/v1/events");
      expect(init.method).toBe("GET");
    });
  });

  describe("verifyChain()", () => {
    it("calls GET /v1/verify/:callId with no body (drift fix)", async () => {
      const verifyResponse: VerifyChainResponse = {
        call_id: CALL_ID,
        valid: true,
        event_count: 1,
      };
      const spy = mockFetchOk(verifyResponse);

      const result = await client.verifyChain(CALL_ID);

      expect(result.valid).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old `POST /v1/events/verify`
      // route and passes against the corrected `GET /v1/verify/{id}` route.
      expect(url).toBe(`http://localhost:8083/v1/verify/${CALL_ID}`);
      expect(url).not.toContain("/v1/events/verify");
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
    });
  });

  describe("reconstruct()", () => {
    it("calls GET /v1/reconstruct/:callId with no body (drift fix)", async () => {
      const spy = mockFetchOk({
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        events: CHAIN_RESPONSE.events,
      });

      const result = await client.reconstruct(CALL_ID);

      expect(result.call_id).toBe(CALL_ID);
      expect(result.events).toHaveLength(1);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old `POST /v1/events/reconstruct`
      // route and passes against the corrected `GET /v1/reconstruct/{id}` route.
      expect(url).toBe(`http://localhost:8083/v1/reconstruct/${CALL_ID}`);
      expect(url).not.toContain("/v1/events/reconstruct");
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      mockFetchOk(HEALTH_RESPONSE);
      const result = await client.health();
      expect(result.status).toBe("ok");
    });
  });
});

// ─── LLMProxyClient ───────────────────────────────────────────────────────────

describe("LLMProxyClient", () => {
  let client: LLMProxyClient;

  beforeEach(() => {
    client = new LLMProxyClient("http://localhost:8084", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("chat()/streamChat() removal (drift fix)", () => {
    it("no longer exposes chat()/streamChat() — /v1/proxy/chat is a dead route", () => {
      // Positive control: `/v1/proxy/chat` was never registered by the LLM
      // Proxy router (a live 404). The dead helpers duplicated
      // proxyComplete()/proxyStream(), which already call the correct
      // `/v1/proxy/openai`(`/stream`) routes — use those instead.
      expect(
        (client as unknown as Record<string, unknown>)["chat"],
      ).toBeUndefined();
      expect(
        (client as unknown as Record<string, unknown>)["streamChat"],
      ).toBeUndefined();
    });
  });

  describe("proxyComplete()", () => {
    const PROXY_COMPLETE_OPTIONS: ProxyCompleteOptions = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }],
    };

    const PROXY_COMPLETE_RESPONSE = {
      call_id: CALL_ID,
      turn: 1,
      content: "Hello! How can I help?",
      verdict: "ALLOW" as const,
    };

    it("calls POST /v1/proxy/openai without query params when configurationId is absent", async () => {
      const spy = mockFetchOk(PROXY_COMPLETE_RESPONSE);

      await client.proxyComplete(PROXY_COMPLETE_OPTIONS);

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8084/v1/proxy/openai");
      expect(url).not.toContain("configuration_id");
    });

    it("appends configuration_id query param when configurationId is provided", async () => {
      const spy = mockFetchOk(PROXY_COMPLETE_RESPONSE);

      await client.proxyComplete({
        ...PROXY_COMPLETE_OPTIONS,
        configurationId: CONFIG_ID,
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`configuration_id=${CONFIG_ID}`);
      expect(url).toBe(
        `http://localhost:8084/v1/proxy/openai?configuration_id=${CONFIG_ID}`,
      );
    });

    it("proxyComplete without configurationId omits query param", async () => {
      const spy = mockFetchOk(PROXY_COMPLETE_RESPONSE);

      await client.proxyComplete({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain("?");
      expect(url).not.toContain("configuration_id");
    });

    it("sends model and messages in the request body", async () => {
      const spy = mockFetchOk(PROXY_COMPLETE_RESPONSE);

      await client.proxyComplete({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello!" }],
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["model"]).toBe("gpt-4o");
      expect(body["messages"]).toEqual([{ role: "user", content: "Hello!" }]);
    });

    it("throws AudactError on non-2xx response", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);

      await expect(
        client.proxyComplete(PROXY_COMPLETE_OPTIONS),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("proxyStream()", () => {
    const PROXY_STREAM_OPTIONS: ProxyStreamOptions = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "Hello!" }],
    };

    it("appends configuration_id query param when configurationId is provided", async () => {
      const ssePayload = 'data: {"content":"Hello"}\n\ndata: [DONE]\n\n';
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(ssePayload, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const chunks: string[] = [];
      for await (const chunk of client.proxyStream({
        ...PROXY_STREAM_OPTIONS,
        configurationId: CONFIG_ID,
      })) {
        chunks.push(chunk);
      }

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain(`configuration_id=${CONFIG_ID}`);
      expect(url).toBe(
        `http://localhost:8084/v1/proxy/openai/stream?configuration_id=${CONFIG_ID}`,
      );
      expect(chunks).toEqual(["Hello"]);
    });

    it("calls POST /v1/proxy/openai/stream without query params when configurationId is absent", async () => {
      const ssePayload = 'data: {"content":"World"}\n\ndata: [DONE]\n\n';
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(ssePayload, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const chunks: string[] = [];
      for await (const chunk of client.proxyStream(PROXY_STREAM_OPTIONS)) {
        chunks.push(chunk);
      }

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8084/v1/proxy/openai/stream");
      expect(url).not.toContain("configuration_id");
      expect(chunks).toEqual(["World"]);
    });

    it("throws AudactError on non-2xx streaming response", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);

      await expect(async () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const _ of client.proxyStream(PROXY_STREAM_OPTIONS)) {
          // intentionally empty
        }
      }).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      mockFetchOk(HEALTH_RESPONSE);
      const result = await client.health();
      expect(result.status).toBe("ok");
    });
  });
});

// ─── TenantClient ─────────────────────────────────────────────────────────────

describe("TenantClient", () => {
  let client: TenantClient;

  beforeEach(() => {
    client = new TenantClient(
      "http://localhost:8085",
      API_KEY,
      30_000,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Tenants ────────────────────────────────────────────────────────────────

  describe("create()", () => {
    it("calls POST /v1/tenants and returns CreateTenantResponse", async () => {
      const spy = mockFetchOk(CREATE_TENANT_RESPONSE, 201);

      const result = await client.create({ name: "Acme Corp" });

      expect(result.tenant_id).toBe(TENANT_ID);
      expect(result.api_key.key).toBe(API_KEY);
      expect(result.plan).toBe("starter");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/tenants");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 400 (empty name)", async () => {
      mockFetchError(
        { error: "MISSING_FIELD", message: "name is required" },
        400,
      );

      await expect(client.create({ name: "" })).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe("get()", () => {
    it("calls GET /v1/tenants/:tenantId", async () => {
      const spy = mockFetchOk({
        tenant_id: TENANT_ID,
        name: "Acme Corp",
        plan: "starter",
        hmac_key_arn: "arn:...",
        created_at: "2026-03-13T10:00:00Z",
        updated_at: "2026-03-13T10:00:00Z",
      });

      const result = await client.get(TENANT_ID);
      expect(result.tenant_id).toBe(TENANT_ID);

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(`http://localhost:8085/v1/tenants/${TENANT_ID}`);
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "tenant not found" }, 404);
      await expect(client.get("nonexistent")).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("update()", () => {
    it("calls PUT /v1/tenants/:tenantId (drift fix)", async () => {
      const spy = mockFetchOk({
        tenant_id: TENANT_ID,
        name: "Acme Corp Renamed",
        plan: "professional",
        hmac_key_arn: "arn:...",
        created_at: "2026-03-13T10:00:00Z",
        updated_at: "2026-03-13T11:00:00Z",
      });

      const result = await client.update(TENANT_ID, {
        name: "Acme Corp Renamed",
        plan: "professional",
      });
      expect(result.name).toBe("Acme Corp Renamed");
      expect(result.plan).toBe("professional");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old `PATCH` verb (405) and
      // passes against the corrected `PUT` verb.
      expect(url).toBe(`http://localhost:8085/v1/tenants/${TENANT_ID}`);
      expect(init.method).toBe("PUT");
      expect(init.method).not.toBe("PATCH");
    });
  });

  describe("getTenantUsage()", () => {
    const USAGE_RECORD: UsageRecord = {
      usage_id: "66666666-6666-6666-6666-666666666666",
      tenant_id: TENANT_ID,
      period_start: "2026-03-01T00:00:00Z",
      period_end: "2026-04-01T00:00:00Z",
      calls_total: 1234,
      calls_inbound: 800,
      calls_outbound: 434,
      validator_checks: 5678,
      evidence_events_count: 12345,
      fail_open_count: 3,
      llm_tokens_in: 500000,
      llm_tokens_out: 200000,
      created_at: "2026-04-01T00:05:00Z",
      updated_at: "2026-04-01T00:05:00Z",
    };

    it("calls GET /v1/tenants/:tenantId/usage", async () => {
      const spy = mockFetchOk(USAGE_RECORD);

      const result = await client.getTenantUsage(TENANT_ID);

      expect(result.tenant_id).toBe(TENANT_ID);
      expect(result.calls_total).toBe(1234);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/tenants/${TENANT_ID}/usage`);
      expect(init.method).toBe("GET");
    });

    it("appends period_start/period_end as query params when provided", async () => {
      const spy = mockFetchOk(USAGE_RECORD);

      await client.getTenantUsage(TENANT_ID, {
        period_start: "2026-03-01T00:00:00Z",
        period_end: "2026-04-01T00:00:00Z",
      });

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        `http://localhost:8085/v1/tenants/${TENANT_ID}/usage?period_start=2026-03-01T00%3A00%3A00Z&period_end=2026-04-01T00%3A00%3A00Z`,
      );
    });

    it("throws AudactError on HTTP 403", async () => {
      mockFetchError({ error: "FORBIDDEN", message: "wrong tenant" }, 403);

      await expect(client.getTenantUsage(TENANT_ID)).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  // ── API Keys ───────────────────────────────────────────────────────────────

  describe("generateKey()", () => {
    it("calls POST /v1/tenants/:tenantId/keys", async () => {
      const spy = mockFetchOk(GENERATE_KEY_RESPONSE, 201);

      const result = await client.generateKey(TENANT_ID, {
        name: "CI key",
        role: "developer",
      });

      expect(result.key).toBe(API_KEY);
      expect(result.role).toBe("developer");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/tenants/${TENANT_ID}/keys`);
      expect(init.method).toBe("POST");
    });
  });

  describe("listKeys()", () => {
    it("calls GET /v1/tenants/:tenantId/keys", async () => {
      const spy = mockFetchOk(LIST_KEYS_RESPONSE);

      const result = await client.listKeys(TENANT_ID);

      expect(result.keys).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.keys[0]?.name).toBe("default");

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(`http://localhost:8085/v1/tenants/${TENANT_ID}/keys`);
    });
  });

  describe("revokeKey()", () => {
    it("calls DELETE /v1/tenants/:tenantId/keys/:keyId", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      await client.revokeKey(TENANT_ID, KEY_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/tenants/${TENANT_ID}/keys/${KEY_ID}`,
      );
      expect(init.method).toBe("DELETE");
    });
  });

  // ── Configurations ─────────────────────────────────────────────────────────

  describe("createConfiguration()", () => {
    it("calls POST /v1/configurations", async () => {
      const spy = mockFetchOk(TENANT_CONFIG, 201);

      const result = await client.createConfiguration({
        tenant_id: TENANT_ID,
        name: "Production v1",
        countries: ["NL", "DE"],
        blocklist_patterns: [
          {
            id: "no-guarantees",
            terms: ["guaranteed return"],
            severity: "block",
          },
        ],
      });

      expect(result.config_id).toBe(CONFIG_ID);
      expect(result.countries).toEqual(["NL", "DE"]);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/configurations");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 400 (invalid country code)", async () => {
      mockFetchError(
        {
          error: "INVALID_REQUEST",
          message: "country code XX is not supported",
        },
        400,
      );

      await expect(
        client.createConfiguration({
          tenant_id: TENANT_ID,
          name: "Bad config",
          countries: ["XX"],
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("listConfigurations()", () => {
    it("calls GET /v1/tenants/:tenantId/configurations (drift fix)", async () => {
      const spy = mockFetchOk({ configurations: [TENANT_CONFIG], total: 1 });

      const result = await client.listConfigurations(TENANT_ID);

      expect(result.configurations).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old query-param form (404) and
      // passes against the corrected path-based route.
      expect(url).toBe(
        `http://localhost:8085/v1/tenants/${TENANT_ID}/configurations`,
      );
      expect(url).not.toContain("?tenant_id=");
      expect(init.method).toBe("GET");
    });
  });

  describe("getConfiguration()", () => {
    it("calls GET /v1/configurations/:configId", async () => {
      const spy = mockFetchOk(TENANT_CONFIG);

      const result = await client.getConfiguration(CONFIG_ID);

      expect(result.config_id).toBe(CONFIG_ID);
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(`http://localhost:8085/v1/configurations/${CONFIG_ID}`);
    });
  });

  describe("getConfigurationVersion()", () => {
    it("calls GET /v1/configurations/:configId/versions/:version", async () => {
      const spy = mockFetchOk({ ...TENANT_CONFIG, version: 2 });

      const result = await client.getConfigurationVersion(CONFIG_ID, 2);

      expect(result.config_id).toBe(CONFIG_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/configurations/${CONFIG_ID}/versions/2`,
      );
      expect(init.method).toBe("GET");
    });
  });

  describe("updateConfiguration()", () => {
    it("calls PUT /v1/configurations/:configId (drift fix)", async () => {
      const spy = mockFetchOk({ ...TENANT_CONFIG, name: "Production v2" });

      const result = await client.updateConfiguration(CONFIG_ID, {
        name: "Production v2",
      });

      expect(result.name).toBe("Production v2");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // Positive control: fails against the old `PATCH` verb (405) and
      // passes against the corrected `PUT` verb.
      expect(url).toBe(`http://localhost:8085/v1/configurations/${CONFIG_ID}`);
      expect(init.method).toBe("PUT");
      expect(init.method).not.toBe("PATCH");
    });
  });

  describe("deleteConfiguration()", () => {
    it("calls DELETE /v1/configurations/:configId", async () => {
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      await client.deleteConfiguration(CONFIG_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8085/v1/configurations/${CONFIG_ID}`);
      expect(init.method).toBe("DELETE");
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      mockFetchOk(HEALTH_RESPONSE);
      const result = await client.health();
      expect(result.status).toBe("ok");
    });
  });
});

// ─── Integration-style: AudactClient facade delegates correctly ───────────────

describe("AudactClient facade delegation", () => {
  let audact: AudactClient;

  beforeEach(() => {
    audact = new AudactClient({
      apiKey: API_KEY,
      serviceUrls: {
        validator: "http://localhost:8082",
        evidence: "http://localhost:8083",
        llmProxy: "http://localhost:8084",
        tenantManagement: "http://localhost:8085",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validator.validate() delegates to Validator service", async () => {
    const spy = mockFetchOk(ACVF_RESPONSE);

    await audact.validator.validate({
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      config_id: CONFIG_ID,
      turn: 1,
      content: "test",
      context: { previous_turns: [], call_state: { disclosure_delivered: false } },
    });

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toContain(":8082/v1/validate");
  });

  it("evidence.postEvent() delegates to Evidence service", async () => {
    const spy = mockFetchOk(POST_EVENT_RESPONSE, 201);

    await audact.evidence.postEvent({
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_START",
    });

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toContain(":8083/v1/events");
  });

  it("tenants.create() delegates to Tenant Management service", async () => {
    const spy = mockFetchOk(CREATE_TENANT_RESPONSE, 201);

    await audact.tenants.create({ name: "Acme" });

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toContain(":8085/v1/tenants");
  });
});

// ─── Authorization header ─────────────────────────────────────────────────────

describe("Authorization header", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Bearer token on every request", async () => {
    const client = new ValidatorClient(
      "http://localhost:8082",
      "aud_live_testkey",
      30_000,
    );
    const spy = mockFetchOk(ACVF_RESPONSE);

    await client.health();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_live_testkey",
    );
  });
});

// ─── baseUrl option ───────────────────────────────────────────────

import { normalizeBaseUrl } from "../client.js";

describe("baseUrl option", () => {
  const V020_DEFAULTS = {
    validator: "http://localhost:8082",
    evidence: "http://localhost:8083",
    llmProxy: "http://localhost:8084",
    tenantManagement: "http://localhost:8085",
    platform: "http://localhost:8085",
    voiceGateway: "http://localhost:8088",
    agentWorker: "http://localhost:8089",
    orgManagement: "http://localhost:8092",
    aggregator: "http://localhost:8087",
    audioValidator: "http://localhost:8086",
    policyEngine: "http://localhost:8081",
  };
  const urlsOf = (c: AudactClient) =>
    (c as unknown as { urls: Record<string, string> }).urls;

  it("without baseUrl, defaults equal the 0.2.0 localhost values", () => {
    expect(urlsOf(new AudactClient({ apiKey: "k" }))).toEqual(V020_DEFAULTS);
  });

  it("baseUrl applies to every service", () => {
    const urls = urlsOf(
      new AudactClient({ apiKey: "k", baseUrl: "https://api.audact.ai" }),
    );
    expect(Object.keys(urls).sort()).toEqual(Object.keys(V020_DEFAULTS).sort());
    for (const v of Object.values(urls)) expect(v).toBe("https://api.audact.ai");
  });

  it("serviceUrls beats baseUrl", () => {
    const urls = urlsOf(
      new AudactClient({
        apiKey: "k",
        baseUrl: "https://h",
        serviceUrls: { evidence: "http://e:1" },
      }),
    );
    expect(urls.evidence).toBe("http://e:1");
    expect(urls.validator).toBe("https://h");
  });

  it.each([
    ["https://h", "https://h"],
    ["https://h/", "https://h"],
    ["https://h//", "https://h"],
    ["https://h/v1", "https://h"],
    ["https://h/v1/", "https://h"],
  ])("normalizes %s", (input, want) => {
    expect(normalizeBaseUrl(input)).toBe(want);
    expect(urlsOf(new AudactClient({ apiKey: "k", baseUrl: input })).agentWorker).toBe(want);
  });

  it("requests hit <host>/v1/...", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ agents: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    try {
      const c = new AudactClient({ apiKey: "k", baseUrl: "https://h/v1/" });
      await c.agents.listAgents().catch(() => undefined);
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/h\/v1\/agents/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
