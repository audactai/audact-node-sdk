/**
 * Audact TypeScript SDK — PolicyClient / AudioClient / AuthClient test suite
 *
 * Covers policy evaluation/documents/calling-hours-check (Policy Engine,
 * port 8081), audio validate/reconcile (Audio Validator, port 8086), and the
 * API-key ↔ JWT session bridge (Tenant Management, port 8085).
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / aggregation.test.ts.
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
  AudioClient,
  AuthClient,
  PolicyClient,
  LOCAL_SERVICE_URLS,
} from "../client.js";

import type {
  AudioReconciliationResponse,
  CallingHoursCheckResponse,
  EvaluatePolicyResponse,
  ExchangeKeyResponse,
  GetPolicyResponse,
  RefreshTokenResponse,
  ValidateAudioResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const CALL_ID = "550e8400-e29b-41d4-a716-446655440000";

const EVALUATE_RESPONSE: EvaluatePolicyResponse = {
  verdict: "BLOCK",
  applicable_rules: ["nl_dnc_check"],
  reasons: ["contact is registered on the Do-Not-Call list"],
  policy_version: "NL_v1.1.0",
};

const GET_POLICY_RESPONSE: GetPolicyResponse = {
  country: "NL",
  version: "1.1.0",
  updated_at: "2026-03-18T15:17:00Z",
  use_cases: [
    {
      id: "nl_dnc_check",
      description: "Check call against Dutch DNC registry",
      default_verdict: "ALLOW",
      block_reasons: ["dnc_registered"],
      conditions: [{ field: "dnc_registered", operator: "eq", value: "true" }],
    },
  ],
  quiet_hours: [
    {
      label: "overnight",
      start: "21:00",
      end: "08:00",
      timezone: "Europe/Amsterdam",
      days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  ],
  holidays: [{ date: "2026-12-25", name: "Christmas Day" }],
  dnc_adapters: [
    {
      id: "nl_infofilter",
      type: "api",
      description: "Dutch DNC registry API",
      required: true,
    },
  ],
  jurisdiction_cascade: [{ parent: "EU", children: ["NL", "DE"] }],
};

const CALLING_HOURS_RESPONSE: CallingHoursCheckResponse = {
  allowed: false,
  next_permitted_at: "2026-03-10T08:00:00Z",
  policy_version: "NL_v1.1.0",
  reason: "quiet_hours",
};

const VALIDATE_AUDIO_RESPONSE: ValidateAudioResponse = {
  verdict: "ALLOW",
  segments: [
    {
      segment_index: 0,
      transcribed_text: "Hello, this is an AI assistant.",
      text_hash: "a1b2c3",
      audio_hash: "d4e5f6",
      verdict: "ALLOW",
      action: "forward",
    },
  ],
  receipt: {
    verdict: "ALLOW",
    input_hash: "aaa111",
    output_hash: "aaa111",
    text_hash: "a1b2c3",
    signature: "hmac-sig",
  },
  fail_open: false,
  evidence_event_id: "660e8400-e29b-41d4-a716-446655440001",
  evidence_hash: "hash123",
  evidence_write_status: "success",
};

const AUDIO_RECONCILIATION_RESPONSE: AudioReconciliationResponse = {
  call_id: CALL_ID,
  total_segments: 12,
  matched_segments: 10,
  mismatched_segments: 1,
  unvalidated_segments: 1,
  segment_results: [
    {
      sequence_number: 1,
      status: "matched",
      transcript_hash: "hashabc",
      validated_hash: "hashabc",
    },
  ],
  has_more: false,
  asr_model_id: "deepgram:nova-2",
  asr_confidence: 0.94,
};

const EXCHANGE_KEY_RESPONSE: ExchangeKeyResponse = {
  access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZXktaWQifQ.sig",
  token_type: "Bearer",
  expires_in: 900,
};

const REFRESH_TOKEN_RESPONSE: RefreshTokenResponse = {
  access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZXktaWQifQ.sig2",
  token_type: "Bearer",
  expires_in: 900,
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

// ─── PolicyClient ─────────────────────────────────────────────────────────────

describe("PolicyClient", () => {
  let client: PolicyClient;

  beforeEach(() => {
    client = new PolicyClient("http://localhost:8081", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("evaluatePolicy()", () => {
    it("calls POST /v1/evaluate with the request body", async () => {
      const spy = mockFetchOk(EVALUATE_RESPONSE);

      const result = await client.evaluatePolicy({
        country: "NL",
        context: { direction: "outbound", dnc_registered: true },
      });

      expect(result.verdict).toBe("BLOCK");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8081/v1/evaluate");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
      expect(JSON.parse(init.body as string)).toEqual({
        country: "NL",
        context: { direction: "outbound", dnc_registered: true },
      });
    });

    it("passes language through for disclosure resolution", async () => {
      const spy = mockFetchOk({
        ...EVALUATE_RESPONSE,
        verdict: "ALLOW",
        require_disclosure: true,
        disclosure_text: "This is an AI assistant.",
        disclosure_language: "en-US",
      });

      const result = await client.evaluatePolicy({
        country: "NL",
        context: { direction: "outbound" },
        language: "de-DE",
      });

      expect(result.disclosure_language).toBe("en-US");
      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toMatchObject({
        language: "de-DE",
      });
    });

    it("throws AudactError on HTTP 400 for an unsupported country", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "unsupported country" },
        400,
      );
      await expect(
        client.evaluatePolicy({
          country: "ZZ",
          context: { direction: "outbound" },
        }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        client.evaluatePolicy({
          country: "ZZ",
          context: { direction: "outbound" },
        }),
      ).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("getPolicy()", () => {
    it("calls GET /v1/policies/:country", async () => {
      const spy = mockFetchOk(GET_POLICY_RESPONSE);

      const result = await client.getPolicy("NL");

      expect(result.country).toBe("NL");
      expect(result.use_cases).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8081/v1/policies/NL");
      expect(init.method).toBe("GET");
    });

    it("encodes the country path parameter", async () => {
      const spy = mockFetchOk(GET_POLICY_RESPONSE);

      await client.getPolicy("EU/special");

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        `http://localhost:8081/v1/policies/${encodeURIComponent("EU/special")}`,
      );
    });

    it("throws AudactError on HTTP 404 when the country is unknown", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "country policy not found" },
        404,
      );
      await expect(client.getPolicy("ZZ")).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("checkCallingHours()", () => {
    it("calls GET /v1/calling-hours/check?country=X", async () => {
      const spy = mockFetchOk(CALLING_HOURS_RESPONSE);

      const result = await client.checkCallingHours({ country: "NL" });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("quiet_hours");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8081/v1/calling-hours/check?country=NL",
      );
      expect(init.method).toBe("GET");
    });

    it("appends call_time when provided", async () => {
      const spy = mockFetchOk(CALLING_HOURS_RESPONSE);

      await client.checkCallingHours({
        country: "NL",
        call_time: "2026-03-09T22:00:00+01:00",
      });

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8081/v1/calling-hours/check?" +
          `country=NL&call_time=${encodeURIComponent("2026-03-09T22:00:00+01:00")}`,
      );
    });

    it("throws AudactError on HTTP 400 when country is missing/unsupported", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "missing country" },
        400,
      );
      await expect(
        client.checkCallingHours({ country: "" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      const spy = mockFetchOk({ status: "ok" });

      await client.health();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8081/v1/health");
      expect(init.method).toBe("GET");
    });
  });
});

// ─── AudioClient ──────────────────────────────────────────────────────────────

describe("AudioClient", () => {
  let client: AudioClient;

  beforeEach(() => {
    client = new AudioClient("http://localhost:8086", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateAudio()", () => {
    it("calls POST /v1/validate-audio with the request body", async () => {
      const spy = mockFetchOk(VALIDATE_AUDIO_RESPONSE);

      const result = await client.validateAudio({
        call_id: CALL_ID,
        turn_number: 1,
        audio_data: "base64pcmbytes",
        audio_format: "pcm_s16le_16000",
      });

      expect(result.verdict).toBe("ALLOW");
      expect(result.segments[0]?.action).toBe("forward");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8086/v1/validate-audio");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
      expect(JSON.parse(init.body as string)).toEqual({
        call_id: CALL_ID,
        turn_number: 1,
        audio_data: "base64pcmbytes",
        audio_format: "pcm_s16le_16000",
      });
    });

    it("decodes AudioSegmentResult.transcription_status", async () => {
      const base = VALIDATE_AUDIO_RESPONSE.segments[0];
      mockFetchOk({
        ...VALIDATE_AUDIO_RESPONSE,
        segments: [
          { ...base, segment_index: 0, transcription_status: "transcribed" },
          { ...base, segment_index: 1, transcription_status: "no_speech" },
        ],
      });

      const result = await client.validateAudio({
        call_id: CALL_ID,
        turn_number: 1,
        audio_data: "base64pcmbytes",
        audio_format: "pcm_s16le_16000",
      });

      expect(result.segments[0]?.transcription_status).toBe("transcribed");
      expect(result.segments[1]?.transcription_status).toBe("no_speech");
    });

    it("throws AudactError on HTTP 400 for a malformed request", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "missing audio_data" },
        400,
      );
      await expect(
        client.validateAudio({
          call_id: CALL_ID,
          turn_number: 1,
          audio_data: "",
          audio_format: "wav",
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("reconcileAudio()", () => {
    it("calls POST /v1/audio-reconciliation with the request body", async () => {
      const spy = mockFetchOk(AUDIO_RECONCILIATION_RESPONSE);

      const result = await client.reconcileAudio({
        call_id: CALL_ID,
        audio_data: "base64wavbytes",
        audio_format: "wav",
      });

      expect(result.total_segments).toBe(12);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8086/v1/audio-reconciliation");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        call_id: CALL_ID,
        audio_data: "base64wavbytes",
        audio_format: "wav",
      });
      expect(init.headers).not.toHaveProperty("Idempotency-Key");
    });

    it("appends limit/after_sequence query params", async () => {
      const spy = mockFetchOk(AUDIO_RECONCILIATION_RESPONSE);

      await client.reconcileAudio(
        { call_id: CALL_ID, audio_data: "b64", audio_format: "wav" },
        { limit: 50, after_sequence: 3 },
      );

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8086/v1/audio-reconciliation?limit=50&after_sequence=3",
      );
    });

    it("sends the Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(AUDIO_RECONCILIATION_RESPONSE);

      await client.reconcileAudio(
        { call_id: CALL_ID, audio_data: "b64", audio_format: "wav" },
        { idempotencyKey: "idem-key-abc" },
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-key-abc",
      );
    });

    it("throws AudactError on HTTP 403 when the call belongs to another tenant", async () => {
      mockFetchError(
        { error: "FORBIDDEN", message: "call does not belong to tenant" },
        403,
      );
      await expect(
        client.reconcileAudio({
          call_id: CALL_ID,
          audio_data: "b64",
          audio_format: "wav",
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      const spy = mockFetchOk({ status: "ok" });

      await client.health();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8086/v1/health");
      expect(init.method).toBe("GET");
    });
  });
});

// ─── AuthClient ───────────────────────────────────────────────────────────────

describe("AuthClient", () => {
  let client: AuthClient;

  beforeEach(() => {
    client = new AuthClient("http://localhost:8085", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("exchangeKey()", () => {
    it("calls POST /v1/auth/exchange-key with the Bearer API key", async () => {
      const spy = mockFetchOk(EXCHANGE_KEY_RESPONSE);

      const result = await client.exchangeKey();

      expect(result.access_token).toBe(EXCHANGE_KEY_RESPONSE.access_token);
      expect(result.expires_in).toBe(900);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/auth/exchange-key");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("throws AudactError on HTTP 401 for an invalid API key", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "invalid API key" },
        401,
      );
      await expect(client.exchangeKey()).rejects.toMatchObject({
        status: 401,
      });
      await expect(client.exchangeKey()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("refreshToken()", () => {
    it("calls POST /v1/auth/refresh", async () => {
      const spy = mockFetchOk(REFRESH_TOKEN_RESPONSE);

      const result = await client.refreshToken();

      expect(result.access_token).toBe(REFRESH_TOKEN_RESPONSE.access_token);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/auth/refresh");
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 401 when the refresh cookie is missing/expired", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "refresh token cookie is missing" },
        401,
      );
      await expect(client.refreshToken()).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      const spy = mockFetchOk({ status: "ok" });

      await client.health();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8085/v1/health");
      expect(init.method).toBe("GET");
    });
  });
});

// ─── AudactClient wiring ────────────────────────────────────────────────────────

describe("AudactClient policy/audio/auth wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes client.policy/client.audio/client.auth as the right client instances", () => {
    const client = new AudactClient({ apiKey: API_KEY });
    expect(client.policy).toBeInstanceOf(PolicyClient);
    expect(client.audio).toBeInstanceOf(AudioClient);
    expect(client.auth).toBeInstanceOf(AuthClient);
  });

  it("wires client.policy to the policy-engine base URL (port 8081)", async () => {
    const client = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });
    const spy = mockFetchOk(CALLING_HOURS_RESPONSE);

    await client.policy.checkCallingHours({ country: "NL" });

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe(
      "http://localhost:8081/v1/calling-hours/check?country=NL",
    );
  });

  it("wires client.audio to the audio-validator base URL (port 8086)", async () => {
    const client = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });
    const spy = mockFetchOk(VALIDATE_AUDIO_RESPONSE);

    await client.audio.validateAudio({
      call_id: CALL_ID,
      turn_number: 1,
      audio_data: "b64",
      audio_format: "wav",
    });

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8086/v1/validate-audio");
  });

  it("wires client.auth to the tenant-management base URL (port 8085)", async () => {
    const client = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });
    const spy = mockFetchOk(EXCHANGE_KEY_RESPONSE);

    await client.auth.exchangeKey();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8085/v1/auth/exchange-key");
  });

  it("honors serviceUrls overrides for policyEngine/audioValidator", async () => {
    const client = new AudactClient({
      apiKey: API_KEY,
      serviceUrls: {
        policyEngine: "https://policy.example.com",
        audioValidator: "https://audio.example.com",
      },
    });

    const policySpy = mockFetchOk(CALLING_HOURS_RESPONSE);
    await client.policy.checkCallingHours({ country: "NL" });
    const [policyUrl] = policySpy.mock.calls[0] as [string];
    expect(policyUrl).toBe(
      "https://policy.example.com/v1/calling-hours/check?country=NL",
    );

    const audioSpy = mockFetchOk(VALIDATE_AUDIO_RESPONSE);
    await client.audio.validateAudio({
      call_id: CALL_ID,
      turn_number: 1,
      audio_data: "b64",
      audio_format: "wav",
    });
    const [audioUrl] = audioSpy.mock.calls[0] as [string];
    expect(audioUrl).toBe("https://audio.example.com/v1/validate-audio");
  });

  it("sends the Bearer token on client.policy/client.audio/client.auth requests", async () => {
    const client = new AudactClient({ apiKey: API_KEY });

    const spy = mockFetchOk(GET_POLICY_RESPONSE);
    await client.policy.getPolicy("NL");
    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${API_KEY}`,
    );
  });
});
