/**
 * Audact TypeScript SDK — EvidenceClient completion test suite
 *
 * Covers the calls/recording/summary/violations/article50/c2pa/receipts/
 * delivery/reconciliation/keys surface added on top of the postEvent/
 * getChain/verifyChain/reconstruct methods already covered in
 * client.test.ts.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts.
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

import { AudactError, EvidenceClient } from "../client.js";

import type {
  Article50Report,
  C2PAManifest,
  CallDetail,
  CallSummary,
  ConfirmDeliveryResponse,
  GetCallsResponse,
  GetReceiptResponse,
  GetViolationsResponse,
  ReconcileTranscriptResponse,
  RecordingResponse,
  TurnDeliveryStatus,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const CALL_ID = "22222222-2222-2222-2222-222222222222";
const EVENT_ID = "55555555-5555-5555-5555-555555555555";

const CALL_RECORD_RESPONSE: GetCallsResponse = {
  calls: [
    {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      direction: "inbound",
      status: "completed",
      metadata: '{"country":"DE"}',
      started_at: "2026-06-03T12:00:00Z",
      ended_at: "2026-06-03T12:05:32Z",
      created_at: "2026-06-03T12:00:00Z",
    },
  ],
  has_more: false,
};

const CALL_DETAIL: CallDetail = {
  call_id: CALL_ID,
  tenant_id: TENANT_ID,
  direction: "inbound",
  status: "completed",
  connected: true,
  metadata: '{"country":"DE"}',
  started_at: "2026-06-03T12:00:00Z",
  ended_at: "2026-06-03T12:05:32Z",
  duration_ms: 332000,
  recording_available: false,
  transcript: [{ role: "agent", content: "Hello, how can I help you today?" }],
};

const RECORDING_RESPONSE: RecordingResponse = {
  call_id: CALL_ID,
  url: "https://recordings.example.test/signed",
  expires_at: "2026-08-13T12:15:00Z",
};

const CALL_SUMMARY: CallSummary = {
  call_id: CALL_ID,
  tenant_id: TENANT_ID,
  status: "completed",
  started_at: "2026-06-03T12:00:00Z",
  ended_at: "2026-06-03T12:05:32Z",
  event_count: 12,
  allow_count: 9,
  block_count: 1,
  modify_count: 2,
};

const VIOLATIONS_RESPONSE: GetViolationsResponse = {
  violations: [
    {
      event_id: EVENT_ID,
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CHECK_RESULT",
      sequence: 3,
      hash: "3b0c4429",
      timestamp: "2026-06-03T12:00:00Z",
      data: '{"result":"BLOCK","rule_id":"profanity_v2"}',
    },
  ],
  has_more: false,
};

const ARTICLE50_REPORT: Article50Report = {
  report_type: "article_50_evidence_export",
  report_format_version: "2.1.0",
  call_id: CALL_ID,
  tenant_id: TENANT_ID,
  generated_at: "2026-06-03T12:06:00Z",
  configuration_seal: {
    call_config_seal_hash: "deadbeef",
    config_version: 1,
    policy_version: "nl_v1.1.0",
    seal_algorithm: "sha256-rfc8785",
  },
  disclosure: {
    status: "delivered",
    jurisdiction: "NL",
    delivered: true,
    config_seal_hash: "deadbeef",
  },
  evidence_chain: {
    chain_status: "valid",
    event_count: 12,
    genesis_hash: "0".repeat(64),
    head_hash: "abc123",
    events: [],
  },
  receipts: [],
  merkle_proof: {
    status: "pending",
  },
  tsa_timestamp: {
    status: "pending",
  },
  signature: {
    auth_mechanism: "ecdsa-p256",
    key_id: "key-1",
    public_key_url: "https://api.audact.ai/v1/keys/key-1",
    scope: "audact-article50-report:2.1.0",
    value: "3045...",
  },
};

const MANIFEST_ID = "66666666-6666-6666-6666-666666666666";

const C2PA_MANIFEST: C2PAManifest = {
  manifest_id: MANIFEST_ID,
  call_id: CALL_ID,
  asset: {
    kind: "evidence_export",
    media_type: "application/json",
    sha256: "a".repeat(64),
    url: `/v1/calls/${CALL_ID}/c2pa/${MANIFEST_ID}/asset`,
  },
  manifest_store: {
    media_type: "application/c2pa",
    sha256: "b".repeat(64),
    url: `/v1/calls/${CALL_ID}/c2pa/${MANIFEST_ID}/manifest.c2pa`,
  },
  signing_credential: {
    subject: "CN=Audact C2PA Claim Signer (staging),O=Audact,C=NL",
    issuer: "CN=Audact C2PA Root CA (staging),O=Audact,C=NL",
    serial: "01",
    not_before: "2026-01-01T00:00:00Z",
    not_after: "2027-01-01T00:00:00Z",
    fingerprint_sha256: "c".repeat(64),
    trust: "self_signed",
  },
  claim: {
    claim_generator: "audact/1.0",
    claim_generator_info: [{ name: "audact", version: "1.0" }],
    "dc:format": "application/json",
    "dc:title": "Audact compliance manifest",
  },
  assertions: [
    {
      label: "com.audact.compliance",
      data: {
        call_id: CALL_ID,
        tenant_id: TENANT_ID,
        overall_compliance: "compliant",
        segments_validated: 12,
        segments_compliant: 12,
        segments_modified: 0,
        evidence_chain_verified: true,
        delivery_attestation_status: "attested",
        receipt_references: [],
      },
    },
    {
      label: "c2pa.hash.data",
      data: { alg: "sha256", hash: "a".repeat(64), name: "evidence-export.json" },
    },
  ],
  generated_at: "2026-06-03T12:06:00Z",
  signature_algorithm: "ES256",
};

const GET_RECEIPT_RESPONSE: GetReceiptResponse = {
  receipt: {
    receipt_format_version: "1.2.0",
    call_id: CALL_ID,
    timestamp: "2026-06-03T12:00:00Z",
    input_hash: "in-hash",
    output_hash: "out-hash",
    verdict: "ALLOW",
    config_version: 1,
    config_seal_hash: "seal-hash",
    policy_version: "nl_v1.1.0",
    evidence_hash: "evidence-hash",
    auth_mechanism: "hmac-sha256",
    signature: "sig-value",
  },
  hmac_valid: true,
  verifiability: "verifiable",
};

const DELIVERY_STATUS: TurnDeliveryStatus[] = [
  {
    turn_number: 1,
    status: "confirmed",
    mechanism: "webhook",
    content_match: true,
    linking_hash: "link-hash",
    confirmed_at: "2026-06-03T12:01:00Z",
  },
];

const CONFIRM_DELIVERY_RESPONSE: ConfirmDeliveryResponse = {
  attestation_event_id: EVENT_ID,
  confirmation_grade: "independent",
  content_match: true,
  linking_hash: "link-hash",
};

const RECONCILE_RESPONSE: ReconcileTranscriptResponse = {
  call_id: CALL_ID,
  total_segments: 2,
  matched_segments: 2,
  mismatched_segments: 0,
  unvalidated_segments: 0,
  segment_results: [
    { turn_number: 1, matched: true },
    { turn_number: 2, matched: true },
  ],
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

function mockFetchText(body: string, status = 200): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(body, {
      status,
      headers: { "Content-Type": "application/x-pem-file" },
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

describe("EvidenceClient completion", () => {
  let client: EvidenceClient;

  beforeEach(() => {
    client = new EvidenceClient("http://localhost:8083", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── listCalls ──────────────────────────────────────────────────────────────

  describe("listCalls()", () => {
    it("calls GET /v1/calls with no query params by default", async () => {
      const spy = mockFetchOk(CALL_RECORD_RESPONSE);

      const result = await client.listCalls();

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0]?.call_id).toBe(CALL_ID);
      expect(result.has_more).toBe(false);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/calls");
      expect(init.method).toBe("GET");
    });

    it("serialises filters as query params", async () => {
      const spy = mockFetchOk(CALL_RECORD_RESPONSE);

      await client.listCalls({
        date_from: "2026-06-01",
        date_to: "2026-06-30",
        status: "completed",
        verdict: "BLOCK",
        shadow: true,
        country: "DE",
        cursor: "opaque-cursor",
        limit: 25,
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe("/v1/calls");
      expect(parsed.searchParams.get("date_from")).toBe("2026-06-01");
      expect(parsed.searchParams.get("date_to")).toBe("2026-06-30");
      expect(parsed.searchParams.get("status")).toBe("completed");
      expect(parsed.searchParams.get("verdict")).toBe("BLOCK");
      expect(parsed.searchParams.get("shadow")).toBe("true");
      expect(parsed.searchParams.get("country")).toBe("DE");
      expect(parsed.searchParams.get("cursor")).toBe("opaque-cursor");
      expect(parsed.searchParams.get("limit")).toBe("25");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);
      await expect(client.listCalls()).rejects.toMatchObject({ status: 401 });
    });
  });

  // ── getCallDetail ──────────────────────────────────────────────────────────

  describe("getCallDetail()", () => {
    it("calls GET /v1/calls/:callId and returns CallDetail", async () => {
      const spy = mockFetchOk(CALL_DETAIL);

      const result = await client.getCallDetail(CALL_ID);

      expect(result.call_id).toBe(CALL_ID);
      expect(result.transcript).toHaveLength(1);
      expect(result.transcript[0]?.role).toBe("agent");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "call not found" }, 404);
      await expect(client.getCallDetail(CALL_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── getCallRecording / deleteCallRecording ────────────────────────────────

  describe("getCallRecording()", () => {
    it("calls GET /v1/calls/:callId/recording", async () => {
      const spy = mockFetchOk(RECORDING_RESPONSE);

      const result = await client.getCallRecording(CALL_ID);

      expect(result.url).toContain("signed");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}/recording`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 when no recording exists", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "recording not found" },
        404,
      );
      await expect(client.getCallRecording(CALL_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("deleteCallRecording()", () => {
    it("calls DELETE /v1/calls/:callId/recording and resolves on 204", async () => {
      const spy = mockFetchNoContent(204);

      await expect(client.deleteCallRecording(CALL_ID)).resolves.toBeUndefined();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}/recording`);
      expect(init.method).toBe("DELETE");
    });

    it("is idempotent: 204 even with no recording", async () => {
      mockFetchNoContent(204);
      await expect(
        client.deleteCallRecording(CALL_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ── getCallSummary ─────────────────────────────────────────────────────────

  describe("getCallSummary()", () => {
    it("calls GET /v1/calls/:callId/summary", async () => {
      const spy = mockFetchOk(CALL_SUMMARY);

      const result = await client.getCallSummary(CALL_ID);

      expect(result.event_count).toBe(12);
      expect(result.allow_count).toBe(9);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}/summary`);
      expect(init.method).toBe("GET");
    });
  });

  // ── listViolations ─────────────────────────────────────────────────────────

  describe("listViolations()", () => {
    it("calls GET /v1/violations with no query params by default", async () => {
      const spy = mockFetchOk(VIOLATIONS_RESPONSE);

      const result = await client.listViolations();

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.event_type).toBe("CHECK_RESULT");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/violations");
      expect(init.method).toBe("GET");
    });

    it("serialises filters as query params", async () => {
      const spy = mockFetchOk(VIOLATIONS_RESPONSE);

      await client.listViolations({
        call_id: CALL_ID,
        date_from: "2026-06-01",
        date_to: "2026-06-30",
        verdict: "BLOCK",
        cursor: "opaque-cursor",
        limit: 10,
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("call_id")).toBe(CALL_ID);
      expect(parsed.searchParams.get("verdict")).toBe("BLOCK");
      expect(parsed.searchParams.get("limit")).toBe("10");
    });
  });

  // ── getArticle50Report ─────────────────────────────────────────────────────

  describe("getArticle50Report()", () => {
    it("calls GET /v1/calls/:callId/article50-report", async () => {
      const spy = mockFetchOk(ARTICLE50_REPORT);

      const result = await client.getArticle50Report(CALL_ID);

      expect(result.report_type).toBe("article_50_evidence_export");
      expect(result.signature.auth_mechanism).toBe("ecdsa-p256");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8083/v1/calls/${CALL_ID}/article50-report`,
      );
      expect(init.method).toBe("GET");
    });

    it("appends format=pdf as a query param", async () => {
      const spy = mockFetchOk(ARTICLE50_REPORT);

      await client.getArticle50Report(CALL_ID, { format: "pdf" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8083/v1/calls/${CALL_ID}/article50-report?format=pdf`,
      );
    });

    it("throws AudactError on HTTP 422 when the call has not completed", async () => {
      mockFetchError(
        { error: "INCOMPLETE", message: "call has not completed yet" },
        422,
      );
      await expect(client.getArticle50Report(CALL_ID)).rejects.toMatchObject({
        status: 422,
      });
    });
  });

  // ── getEvidenceExport ──────────────────────────────────────────────────────

  describe("getEvidenceExport()", () => {
    it("calls GET /v1/evidence-exports/:callId with the token as a query param", async () => {
      const spy = mockFetchOk(ARTICLE50_REPORT);

      const result = await client.getEvidenceExport(
        CALL_ID,
        "ev1.payload.sig",
      );

      expect(result.call_id).toBe(CALL_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.pathname).toBe(`/v1/evidence-exports/${CALL_ID}`);
      expect(parsed.searchParams.get("token")).toBe("ev1.payload.sig");
      expect(init.method).toBe("GET");
    });

    it("appends a format override query param", async () => {
      const spy = mockFetchOk(ARTICLE50_REPORT);

      await client.getEvidenceExport(CALL_ID, "ev1.payload.sig", {
        format: "pdf",
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("format")).toBe("pdf");
    });

    it("throws AudactError on HTTP 410 when the token expired", async () => {
      mockFetchError({ error: "EXPIRED", message: "token has expired" }, 410);
      await expect(
        client.getEvidenceExport(CALL_ID, "ev1.expired.sig"),
      ).rejects.toMatchObject({ status: 410 });
    });
  });

  // ── generateC2PAManifest ───────────────────────────────────────────────────

  describe("generateC2PAManifest()", () => {
    it("calls POST /v1/calls/:callId/c2pa", async () => {
      const spy = mockFetchOk(C2PA_MANIFEST);

      const result = await client.generateC2PAManifest(CALL_ID);

      expect(result.assertions[0]?.label).toBe("com.audact.compliance");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}/c2pa`);
      expect(init.method).toBe("POST");
    });

    it("sends Idempotency-Key when one is given", async () => {
      const spy = mockFetchOk(C2PA_MANIFEST);

      await client.generateC2PAManifest(CALL_ID, "c2pa-idem-1");

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "c2pa-idem-1",
      );
    });

    it("omits Idempotency-Key when none is given", async () => {
      const spy = mockFetchOk(C2PA_MANIFEST);

      await client.generateC2PAManifest(CALL_ID);

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(
        (init.headers as Record<string, string>)["Idempotency-Key"],
      ).toBeUndefined();
    });

    it("generateC2PAManifest returns the ES256 summary", async () => {
      mockFetchOk(C2PA_MANIFEST);

      const result = await client.generateC2PAManifest(CALL_ID);

      expect(result.signature_algorithm).toBe("ES256");
      expect(result).not.toHaveProperty("signature");
      expect(result.manifest_id).toBe(MANIFEST_ID);
      expect(result.asset.sha256).toHaveLength(64);
      expect(result.manifest_store.media_type).toBe("application/c2pa");
      expect(result.signing_credential.trust).toBe("self_signed");
      const hashData = result.assertions.find(
        (a) => a.label === "c2pa.hash.data",
      );
      expect(hashData?.label).toBe("c2pa.hash.data");
    });

    it("throws AudactError on HTTP 503 when signing is unavailable", async () => {
      mockFetchError(
        { error: "UNAVAILABLE", message: "manifest signing unavailable" },
        503,
      );
      await expect(
        client.generateC2PAManifest(CALL_ID),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  // ── C2PA list / download / trust anchor ────────────────────────────────────

  describe("C2PA downloads", () => {
    it("listC2PAManifests calls GET with pagination params", async () => {
      const spy = mockFetchOk({ manifests: [], next_cursor: "abc" });

      const result = await client.listC2PAManifests(CALL_ID, {
        limit: 10,
        cursor: "c1",
      });

      expect(result.next_cursor).toBe("abc");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8083/v1/calls/${CALL_ID}/c2pa?limit=10&cursor=c1`,
      );
      expect(init.method).toBe("GET");
    });

    it("downloadC2PAManifestStore returns bytes", async () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x6a, 0x75, 0x6d, 0x62]);
      const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(bytes, {
          status: 200,
          headers: { "Content-Type": "application/c2pa" },
        }),
      );

      const result = await client.downloadC2PAManifestStore(CALL_ID, MANIFEST_ID);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(Array.from(new Uint8Array(result))).toEqual(Array.from(bytes));
      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8083/v1/calls/${CALL_ID}/c2pa/${MANIFEST_ID}/manifest.c2pa`,
      );
    });

    it("downloadC2PAAsset follows the redirect", async () => {
      const presigned = "https://bucket.s3.example.com/rec.wav?X-Amz-Signature=x";
      const bytes = new Uint8Array([1, 2, 3, 4]);
      // Emulate fetch's redirect following: assert the SDK does not opt out
      // of it (redirect: "manual"/"error"), then serve the final bytes.
      const spy = vi
        .spyOn(globalThis, "fetch")
        .mockImplementationOnce(async (_input, init) => {
          expect(init?.redirect ?? "follow").toBe("follow");
          const res = new Response(bytes, { status: 200 });
          Object.defineProperty(res, "redirected", { value: true });
          Object.defineProperty(res, "url", { value: presigned });
          return res;
        });

      const result = await client.downloadC2PAAsset(CALL_ID, MANIFEST_ID);

      expect(Array.from(new Uint8Array(result))).toEqual([1, 2, 3, 4]);
      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8083/v1/calls/${CALL_ID}/c2pa/${MANIFEST_ID}/asset`,
      );
    });

    it("downloadC2PAAsset throws AudactError on 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(
        client.downloadC2PAAsset(CALL_ID, MANIFEST_ID),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("getC2PATrustAnchor returns PEM", async () => {
      const pem = "-----BEGIN CERTIFICATE-----\nMIIB...\n-----END CERTIFICATE-----\n";
      const spy = mockFetchText(pem);

      const result = await client.getC2PATrustAnchor();

      expect(result).toBe(pem);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/c2pa/trust-anchor");
      expect(init.method).toBe("GET");
    });
  });

  // ── getReceipt ─────────────────────────────────────────────────────────────

  describe("getReceipt()", () => {
    it("calls GET /v1/receipts/:callId", async () => {
      const spy = mockFetchOk(GET_RECEIPT_RESPONSE);

      const result = await client.getReceipt(CALL_ID);

      expect(result.hmac_valid).toBe(true);
      expect(result.verifiability).toBe("verifiable");
      expect(result.receipt.call_id).toBe(CALL_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/receipts/${CALL_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 when no receipt is stored", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "receipt not found" }, 404);
      await expect(client.getReceipt(CALL_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── getDeliveryStatus / confirmDelivery ────────────────────────────────────

  describe("getDeliveryStatus()", () => {
    it("calls GET /v1/calls/:callId/delivery and returns an array", async () => {
      const spy = mockFetchOk(DELIVERY_STATUS);

      const result = await client.getDeliveryStatus(CALL_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.status).toBe("confirmed");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8083/v1/calls/${CALL_ID}/delivery`);
      expect(init.method).toBe("GET");
    });

    it("returns an empty array when no confirmations exist", async () => {
      mockFetchOk([]);
      const result = await client.getDeliveryStatus(CALL_ID);
      expect(result).toEqual([]);
    });
  });

  describe("confirmDelivery()", () => {
    it("calls POST /v1/delivery-confirmation", async () => {
      const spy = mockFetchOk(CONFIRM_DELIVERY_RESPONSE, 201);

      const result = await client.confirmDelivery({
        call_id: CALL_ID,
        turn_number: 1,
        mechanism: "webhook",
      });

      expect(result.attestation_event_id).toBe(EVENT_ID);
      expect(result.confirmation_grade).toBe("independent");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/delivery-confirmation");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toMatchObject({
        call_id: CALL_ID,
        turn_number: 1,
        mechanism: "webhook",
      });
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(CONFIRM_DELIVERY_RESPONSE, 201);

      await client.confirmDelivery(
        { call_id: CALL_ID, turn_number: 1, mechanism: "webhook" },
        "idem-key-delivery",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-key-delivery",
      );
    });

    it("throws AudactError on HTTP 409 when the validation event is not yet available", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "validation event not yet available" },
        409,
      );
      await expect(
        client.confirmDelivery({
          call_id: CALL_ID,
          turn_number: 1,
          mechanism: "webhook",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  // ── reconcileTranscript ────────────────────────────────────────────────────

  describe("reconcileTranscript()", () => {
    it("calls POST /v1/transcript-reconciliation", async () => {
      const spy = mockFetchOk(RECONCILE_RESPONSE);

      const result = await client.reconcileTranscript({
        call_id: CALL_ID,
        segments: [
          { turn_number: 1, text: "Hello" },
          { turn_number: 2, text: "How can I help?" },
        ],
        source: "post_call_asr",
      });

      expect(result.total_segments).toBe(2);
      expect(result.matched_segments).toBe(2);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/transcript-reconciliation");
      expect(init.method).toBe("POST");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(RECONCILE_RESPONSE);

      await client.reconcileTranscript(
        {
          call_id: CALL_ID,
          segments: [{ turn_number: 1, text: "Hello" }],
          source: "post_call_asr",
        },
        "idem-key-reconcile",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
        "idem-key-reconcile",
      );
    });

    it("throws AudactError on HTTP 403", async () => {
      mockFetchError(
        { error: "FORBIDDEN", message: "cross-tenant call" },
        403,
      );
      await expect(
        client.reconcileTranscript({
          call_id: CALL_ID,
          segments: [],
          source: "post_call_asr",
        }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  // ── getArticle50PublicKey ──────────────────────────────────────────────────

  describe("getArticle50PublicKey()", () => {
    it("calls GET /v1/keys/:kid and returns the raw PEM text", async () => {
      const pem =
        "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYI...\n-----END PUBLIC KEY-----\n";
      const spy = mockFetchText(pem);

      const result = await client.getArticle50PublicKey("key-1");

      expect(result).toBe(pem);
      expect(result).toContain("BEGIN PUBLIC KEY");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/keys/key-1");
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 for an unknown key_id", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "unknown key_id" }, 404);
      await expect(
        client.getArticle50PublicKey("nonexistent-kid"),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        client.getArticle50PublicKey("nonexistent-kid"),
      ).rejects.toBeInstanceOf(AudactError);
    });

    it("throws AudactError on HTTP 503 when the signing key is not provisioned", async () => {
      mockFetchError(
        { error: "UNAVAILABLE", message: "report signing key not provisioned" },
        503,
      );
      await expect(
        client.getArticle50PublicKey("key-1"),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  describe("listComplianceEvents", () => {
    const RESP = { events: [], has_more: false, total: 0 };

    it("GETs /v1/compliance/events with no query when no options, API key auth", async () => {
      const spy = mockFetchOk(RESP);
      const result = await client.listComplianceEvents();
      expect(result).toEqual(RESP);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8083/v1/compliance/events");
      expect(init.method).toBe("GET");
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Bearer ${API_KEY}`,
      );
    });

    it("maps every option to its snake_case query name", async () => {
      const spy = mockFetchOk(RESP);
      await client.listComplianceEvents({
        eventSubtype: "fail_open",
        verdict: "BLOCK",
        severity: "high",
        callId: CALL_ID,
        cursor: "cur",
        limit: 25,
      });
      const [url] = spy.mock.calls[0] as [string];
      const q = new URL(url).searchParams;
      expect(Object.fromEntries(q.entries())).toEqual({
        event_subtype: "fail_open",
        verdict: "BLOCK",
        severity: "high",
        call_id: CALL_ID,
        cursor: "cur",
        limit: "25",
      });
    });

    it("decodes an ALLOW event with the omitempty fields absent", async () => {
      // As the server serialises it: no check_id, severity, detail or compliance_score.
      const allow = {
        agent_id: "",
        call_id: CALL_ID,
        event_subtype: "validation_completed",
        timestamp: "2026-10-01T10:00:01Z",
        turn_sequence: 2,
        verdict: "ALLOW",
      };
      mockFetchOk({ events: [allow], has_more: false, total: 1 });
      const result = await client.listComplianceEvents();
      const ev = result.events[0]!;
      expect(ev.verdict).toBe("ALLOW");
      expect(ev.severity?.toUpperCase()).toBeUndefined();
      expect(ev.compliance_score?.toFixed(2)).toBeUndefined();
      expect(ev.check_id ?? "none").toBe("none");
    });

    it("omits unset options from the URL", async () => {
      const spy = mockFetchOk(RESP);
      await client.listComplianceEvents({ limit: 5 });
      expect((spy.mock.calls[0] as [string])[0]).toBe(
        "http://localhost:8083/v1/compliance/events?limit=5",
      );
    });
  });
});
