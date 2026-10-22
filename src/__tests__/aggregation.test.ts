/**
 * Audact TypeScript SDK — AggregationClient test suite
 *
 * Covers per-tenant Merkle aggregation proofs, the public cross-tenant
 * meta-chain, offline inclusion verification, and the owner-only manual
 * aggregation trigger, served by the Aggregator (port 8087).
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

import { AggregationClient, AudactClient, AudactError } from "../client.js";

import type {
  AdminAggregateResponse,
  MetaChainResponse,
  ProofListResponse,
  ProofResponse,
  VerifyInclusionResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const WINDOW_ID = "2026-09-15T09:00:00Z";

const PROOF_SUMMARY = {
  aggregation_id: "550e8400-e29b-41d4-a716-446655440000",
  batch_number: 42,
  created_at: "2026-09-15T09:05:00Z",
  merkle_root:
    "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  status: "complete",
  tenant_aggregate_hash:
    "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  timestamp_time: "2026-09-15T09:05:01Z",
  tsa_url: "https://tsa.example.com",
  window_end: "2026-09-15T09:00:00Z",
  window_id: WINDOW_ID,
  window_start: "2026-09-15T08:55:00Z",
};

const LIST_PROOFS_RESPONSE: ProofListResponse = {
  proofs: [PROOF_SUMMARY],
  count: 1,
  has_more: false,
};

const PROOF_STEP = { hash: "deadbeef", position: "left" };

const PROOF_RESPONSE: ProofResponse = {
  aggregation_id: PROOF_SUMMARY.aggregation_id,
  batch_number: PROOF_SUMMARY.batch_number,
  branch_proof: {
    leaf_count: 16,
    leaf_hash: PROOF_SUMMARY.tenant_aggregate_hash,
    leaf_index: 3,
    pad_count: 5,
    root: PROOF_SUMMARY.merkle_root,
    steps: [PROOF_STEP],
    tree_depth: 4,
  },
  merkle_root: PROOF_SUMMARY.merkle_root,
  tenant_aggregate_hash: PROOF_SUMMARY.tenant_aggregate_hash,
  timestamp_time: "2026-09-15T09:05:01Z",
  timestamp_token: "base64token==",
  tsa_url: "https://tsa.example.com",
  window_id: WINDOW_ID,
};

const METACHAIN_RESPONSE: MetaChainResponse = {
  count: 1,
  entries: [
    {
      aggregation_id: PROOF_SUMMARY.aggregation_id,
      chain_hash: "c3d4e5f6",
      merkle_root: PROOF_SUMMARY.merkle_root,
      meta_id: "550e8400-e29b-41d4-a716-446655440001",
      previous_hash: "b2c3d4e5",
      sequence: 7,
    },
  ],
  has_more: false,
};

const VERIFY_INCLUSION_RESPONSE: VerifyInclusionResponse = {
  valid: true,
};

const ADMIN_AGGREGATE_RESPONSE: AdminAggregateResponse = {
  aggregation_id: PROOF_SUMMARY.aggregation_id,
  batch_number: 43,
  leaf_count: 16,
  merkle_root: PROOF_SUMMARY.merkle_root,
  tenant_count: 8,
  ts_timestamp: "2026-09-15T09:10:01Z",
  tsa_name: "Example TSA",
  window_end: "2026-09-15T09:10:00Z",
  window_start: "2026-09-15T09:05:00Z",
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

describe("AggregationClient", () => {
  let client: AggregationClient;

  beforeEach(() => {
    client = new AggregationClient("http://localhost:8087", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listProofs()", () => {
    it("calls GET /v1/proofs", async () => {
      const spy = mockFetchOk(LIST_PROOFS_RESPONSE);

      const result = await client.listProofs();

      expect(result.count).toBe(1);
      expect(result.proofs[0]?.window_id).toBe(WINDOW_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8087/v1/proofs");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("appends limit/cursor query params", async () => {
      const spy = mockFetchOk(LIST_PROOFS_RESPONSE);

      await client.listProofs({ limit: 10, cursor: "abc" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8087/v1/proofs?limit=10&cursor=abc",
      );
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "missing bearer token" },
        401,
      );
      await expect(client.listProofs()).rejects.toMatchObject({
        status: 401,
      });
      await expect(client.listProofs()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("getProof()", () => {
    it("calls GET /v1/proofs/:window_id", async () => {
      const spy = mockFetchOk(PROOF_RESPONSE);

      const result = await client.getProof(WINDOW_ID);

      expect(result.merkle_root).toBe(PROOF_SUMMARY.merkle_root);
      expect(result.branch_proof.steps).toEqual([PROOF_STEP]);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8087/v1/proofs/${encodeURIComponent(WINDOW_ID)}`,
      );
      expect(init.method).toBe("GET");
    });

    it("encodes the window_id path parameter", async () => {
      const spy = mockFetchOk(PROOF_RESPONSE);

      await client.getProof("2026-09-15T09:00:00+02:00");

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8087/v1/proofs/${encodeURIComponent("2026-09-15T09:00:00+02:00")}`,
      );
    });

    it("throws AudactError on HTTP 404 when the tenant did not participate", async () => {
      mockFetchError(
        { error: "NOT_FOUND", message: "proof not found" },
        404,
      );
      await expect(client.getProof(WINDOW_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("getMetachain()", () => {
    it("calls GET /v1/metachain", async () => {
      const spy = mockFetchOk(METACHAIN_RESPONSE);

      const result = await client.getMetachain();

      expect(result.entries).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8087/v1/metachain");
      expect(init.method).toBe("GET");
    });

    it("appends limit/cursor query params", async () => {
      const spy = mockFetchOk(METACHAIN_RESPONSE);

      await client.getMetachain({ limit: 100, cursor: "xyz" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8087/v1/metachain?limit=100&cursor=xyz",
      );
    });

    it("throws AudactError on HTTP 400 for an invalid cursor", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "invalid cursor" },
        400,
      );
      await expect(
        client.getMetachain({ cursor: "not-valid" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("verifyInclusion()", () => {
    it("calls POST /v1/verify-inclusion", async () => {
      const spy = mockFetchOk(VERIFY_INCLUSION_RESPONSE);

      const result = await client.verifyInclusion({
        leaf_hash: PROOF_SUMMARY.tenant_aggregate_hash,
        root: PROOF_SUMMARY.merkle_root,
        steps: [PROOF_STEP],
      });

      expect(result.valid).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8087/v1/verify-inclusion");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        leaf_hash: PROOF_SUMMARY.tenant_aggregate_hash,
        root: PROOF_SUMMARY.merkle_root,
        steps: [PROOF_STEP],
      });
    });

    it("throws AudactError on HTTP 400 for a malformed body", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "missing leaf_hash" },
        400,
      );
      await expect(
        client.verifyInclusion({
          leaf_hash: "",
          root: PROOF_SUMMARY.merkle_root,
          steps: [],
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("triggerAggregation()", () => {
    it("calls POST /v1/admin/aggregate", async () => {
      const spy = mockFetchOk(ADMIN_AGGREGATE_RESPONSE);

      const result = await client.triggerAggregation();

      expect(result.tenant_count).toBe(8);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8087/v1/admin/aggregate");
      expect(init.method).toBe("POST");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("sends explicit window boundaries when provided", async () => {
      const spy = mockFetchOk(ADMIN_AGGREGATE_RESPONSE);

      await client.triggerAggregation({
        window_start: "2026-09-15T09:00:00Z",
        window_end: "2026-09-15T09:05:00Z",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        window_start: "2026-09-15T09:00:00Z",
        window_end: "2026-09-15T09:05:00Z",
      });
    });

    it("throws AudactError on HTTP 403 when the caller is not an owner", async () => {
      mockFetchError(
        { error: "FORBIDDEN", message: "owner role required" },
        403,
      );
      await expect(client.triggerAggregation()).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  describe("health()", () => {
    it("calls GET /v1/health", async () => {
      const spy = mockFetchOk({ status: "ok" });

      await client.health();

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8087/v1/health");
      expect(init.method).toBe("GET");
    });
  });
});

// ─── AudactClient wiring ────────────────────────────────────────────────────────

describe("AudactClient aggregation wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes client.aggregation as an AggregationClient instance", () => {
    const client = new AudactClient({ apiKey: API_KEY });
    expect(client.aggregation).toBeInstanceOf(AggregationClient);
  });

  it("defaults client.aggregation to the aggregator base URL (port 8087)", async () => {
    const client = new AudactClient({ apiKey: API_KEY });
    const spy = mockFetchOk(METACHAIN_RESPONSE);

    await client.aggregation.getMetachain();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8087/v1/metachain");
  });

  it("honors a serviceUrls.aggregator override", async () => {
    const client = new AudactClient({
      apiKey: API_KEY,
      serviceUrls: { aggregator: "https://aggregator.example.com" },
    });
    const spy = mockFetchOk(METACHAIN_RESPONSE);

    await client.aggregation.getMetachain();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("https://aggregator.example.com/v1/metachain");
  });

  it("sends the Bearer token on client.aggregation requests", async () => {
    const client = new AudactClient({ apiKey: API_KEY });
    const spy = mockFetchOk(LIST_PROOFS_RESPONSE);

    await client.aggregation.listProofs();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${API_KEY}`,
    );
  });
});
