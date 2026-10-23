/**
 * Audact TypeScript SDK — KnowledgeBasesClient test suite
 *
 * Covers the knowledge-base (RAG) surface on the Tenant Management service:
 * KB CRUD, sources (JSON + multipart file upload), agent links, crawl
 * exclusions and the retrieval test harness. Every method asserts the exact
 * URL, HTTP method and body, so a method pointed at the wrong path fails.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in tools.test.ts.
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

import { AudactClient, AudactError, KnowledgeBasesClient, LOCAL_SERVICE_URLS } from "../client.js";

import type {
  KBAgentLink,
  KBCrawlCoverage,
  KBCrawlExclusion,
  KBRobotsPolicy,
  KBSource,
  KBTestRetrievalResponse,
  KnowledgeBase,
  ListKBAgentLinksResponse,
  ListKBExclusionsResponse,
  ListKBSourcesResponse,
  ListKnowledgeBasesResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const BASE = "http://localhost:8085";
const KB_ID = "550e8400-e29b-41d4-a716-446655440000";
const SOURCE_ID = "550e8400-e29b-41d4-a716-446655440001";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440002";
const AGENT_ID = "660e8400-e29b-41d4-a716-446655440001";
const EXCLUSION_ID = "550e8400-e29b-41d4-a716-446655440003";

/** An id that must be percent-encoded: proves every path segment is encoded. */
const UNSAFE_ID = "a/b?c#d";
const UNSAFE_ENC = "a%2Fb%3Fc%23d";

const KB: KnowledgeBase = {
  kb_id: KB_ID,
  tenant_id: TENANT_ID,
  name: "Product FAQ",
  auto_refresh: false,
  robots_policy: "honor",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const LIST_KBS: ListKnowledgeBasesResponse = {
  items: [KB],
  has_more: true,
  next_cursor: "cursor-2",
};

const SOURCE: KBSource = {
  source_id: SOURCE_ID,
  tenant_id: TENANT_ID,
  kb_id: KB_ID,
  type: "url",
  uri: "https://docs.example.com",
  status: "pending",
  ingest_version: 1,
  config: { auto_crawl: true, depth: 2 },
  created_at: "2026-06-22T12:00:00Z",
  updated_at: "2026-06-22T12:00:00Z",
};

const LIST_SOURCES: ListKBSourcesResponse = { items: [SOURCE], total: 1 };

const LINK: KBAgentLink = {
  kb_id: KB_ID,
  agent_id: AGENT_ID,
  tenant_id: TENANT_ID,
  top_k: 3,
  similarity_threshold: 0.6,
  retrieval_instruction: "",
  created_at: "2026-06-22T12:00:00Z",
};

const LIST_LINKS: ListKBAgentLinksResponse = { items: [LINK], total: 1 };

const EXCLUSION: KBCrawlExclusion = {
  id: EXCLUSION_ID,
  kb_id: KB_ID,
  tenant_id: TENANT_ID,
  crawl_path: "/admin",
  created_at: "2026-06-22T12:00:00Z",
};

const LIST_EXCLUSIONS: ListKBExclusionsResponse = { items: [EXCLUSION], total: 1 };

const RETRIEVAL: KBTestRetrievalResponse = {
  condensed_query: "refund policy return window",
  hits: [
    {
      text: "Our return window is 30 days from the purchase date.",
      source_id: SOURCE_ID,
      kb_id: KB_ID,
      similarity: 0.87,
    },
  ],
  empty: false,
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
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
}

function mockFetchError(body: unknown, status: number): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "req-test-456",
      },
    }),
  );
}

function lastCall(spy: FetchMock): [string, RequestInit] {
  return spy.mock.calls[spy.mock.calls.length - 1] as [string, RequestInit];
}

function jsonBody(init: RequestInit): unknown {
  return JSON.parse(init.body as string);
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("KnowledgeBasesClient", () => {
  let client: KnowledgeBasesClient;

  beforeEach(() => {
    client = new KnowledgeBasesClient(BASE, API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is wired into AudactClient against the Tenant Management service", async () => {
    const spy = mockFetchOk(KB);
    const audact = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });

    expect(audact.knowledgeBases).toBeInstanceOf(KnowledgeBasesClient);
    await audact.knowledgeBases.getKnowledgeBase(KB_ID);

    const [url] = lastCall(spy);
    expect(url).toBe(`http://localhost:8085/v1/knowledge-bases/${KB_ID}`);
  });

  // ── Knowledge base CRUD ────────────────────────────────────────────────────

  describe("listKnowledgeBases()", () => {
    it("calls GET /v1/knowledge-bases with no query by default", async () => {
      const spy = mockFetchOk(LIST_KBS);

      const result = await client.listKnowledgeBases();

      expect(result).toEqual(LIST_KBS);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases`);
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
      expect(init.headers).toMatchObject({ Authorization: `Bearer ${API_KEY}` });
    });

    it("appends limit/cursor query params (cursor URL-encoded)", async () => {
      const spy = mockFetchOk(LIST_KBS);

      await client.listKnowledgeBases({ limit: 50, cursor: "a b&c" });

      const [url] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases?limit=50&cursor=a+b%26c`);
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: { code: "UNAUTHORIZED", message: "missing bearer token" } }, 401);
      await expect(client.listKnowledgeBases()).rejects.toMatchObject({
        status: 401,
        code: "UNAUTHORIZED",
      });
      await expect(client.listKnowledgeBases()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("createKnowledgeBase()", () => {
    it("calls POST /v1/knowledge-bases with the JSON body and decodes 201", async () => {
      const spy = mockFetchOk(KB, 201);

      const result = await client.createKnowledgeBase({
        name: "Product FAQ",
        auto_refresh: true,
        robots_policy: "override",
      });

      expect(result).toEqual(KB);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases`);
      expect(init.method).toBe("POST");
      expect(jsonBody(init)).toEqual({
        name: "Product FAQ",
        auto_refresh: true,
        robots_policy: "override",
      });
    });

    it("throws AudactError on HTTP 400", async () => {
      mockFetchError(
        { error: { code: "INVALID_REQUEST", message: "robots_policy must be 'honor' or 'override'" } },
        400,
      );
      await expect(
        client.createKnowledgeBase({ name: "x", robots_policy: "bogus" }),
      ).rejects.toMatchObject({ status: 400, code: "INVALID_REQUEST" });
    });
  });

  describe("getKnowledgeBase()", () => {
    it("calls GET /v1/knowledge-bases/:kb_id", async () => {
      const spy = mockFetchOk(KB);

      const result = await client.getKnowledgeBase(KB_ID);

      expect(result.kb_id).toBe(KB_ID);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}`);
      expect(init.method).toBe("GET");
    });

    it("decodes robots_policy as KBRobotsPolicy", async () => {
      mockFetchOk({ ...KB, robots_policy: "honor" });
      const honor: KBRobotsPolicy = (await client.getKnowledgeBase(KB_ID)).robots_policy;
      expect(honor).toBe("honor");

      mockFetchOk({ ...KB, robots_policy: "override" });
      const override: KBRobotsPolicy = (await client.getKnowledgeBase(KB_ID)).robots_policy;
      expect(override).toBe("override");
    });

    it("percent-encodes the kb_id path segment", async () => {
      const spy = mockFetchOk(KB);
      await client.getKnowledgeBase(UNSAFE_ID);
      expect(lastCall(spy)[0]).toBe(`${BASE}/v1/knowledge-bases/${UNSAFE_ENC}`);
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "knowledge base not found" } }, 404);
      await expect(client.getKnowledgeBase(KB_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("patchKnowledgeBase()", () => {
    it("calls PATCH /v1/knowledge-bases/:kb_id with only the supplied fields", async () => {
      const spy = mockFetchOk({ ...KB, name: "Renamed" });

      const result = await client.patchKnowledgeBase(KB_ID, { name: "Renamed" });

      expect(result.name).toBe("Renamed");
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}`);
      expect(init.method).toBe("PATCH");
      expect(jsonBody(init)).toEqual({ name: "Renamed" });
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "not found" } }, 404);
      await expect(
        client.patchKnowledgeBase(KB_ID, { auto_refresh: true }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("deleteKnowledgeBase()", () => {
    it("calls DELETE /v1/knowledge-bases/:kb_id and resolves undefined on 204", async () => {
      const spy = mockFetchNoContent();

      const result = await client.deleteKnowledgeBase(KB_ID);

      expect(result).toBeUndefined();
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}`);
      expect(init.method).toBe("DELETE");
      expect(init.body).toBeUndefined();
    });

    it("throws AudactError on HTTP 403 (owner role required)", async () => {
      mockFetchError({ error: { code: "FORBIDDEN", message: "insufficient role" } }, 403);
      await expect(client.deleteKnowledgeBase(KB_ID)).rejects.toMatchObject({ status: 403 });
    });
  });

  // ── Sources ────────────────────────────────────────────────────────────────

  describe("listKBSources()", () => {
    it("calls GET /v1/knowledge-bases/:kb_id/sources", async () => {
      const spy = mockFetchOk(LIST_SOURCES);

      const result = await client.listKBSources(KB_ID);

      expect(result).toEqual(LIST_SOURCES);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources`);
      expect(init.method).toBe("GET");
    });

    it("percent-encodes the kb_id path segment", async () => {
      const spy = mockFetchOk(LIST_SOURCES);
      await client.listKBSources(UNSAFE_ID);
      expect(lastCall(spy)[0]).toBe(`${BASE}/v1/knowledge-bases/${UNSAFE_ENC}/sources`);
    });
  });

  describe("addKBSource()", () => {
    it("calls POST /v1/knowledge-bases/:kb_id/sources with JSON and decodes 202", async () => {
      const spy = mockFetchOk(SOURCE, 202);

      const result = await client.addKBSource(KB_ID, {
        type: "url",
        url: "https://docs.example.com",
        title: "Docs",
        config: { auto_crawl: true, depth: 2 },
      });

      expect(result).toEqual(SOURCE);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources`);
      expect(init.method).toBe("POST");
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json",
      );
      expect(jsonBody(init)).toEqual({
        type: "url",
        url: "https://docs.example.com",
        title: "Docs",
        config: { auto_crawl: true, depth: 2 },
      });
    });

    it("sends a text source", async () => {
      const spy = mockFetchOk({ ...SOURCE, type: "text", uri: undefined }, 202);

      await client.addKBSource(KB_ID, { type: "text", content: "FAQ body" });

      expect(jsonBody(lastCall(spy)[1])).toEqual({ type: "text", content: "FAQ body" });
    });

    it("throws AudactError on HTTP 400 (per-KB limit)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "url source limit reached" } }, 400);
      await expect(
        client.addKBSource(KB_ID, { type: "url", url: "https://x.example" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("uploadKBSourceFile()", () => {
    it("POSTs multipart FormData to /v1/knowledge-bases/:kb_id/sources without a JSON Content-Type", async () => {
      const spy = mockFetchOk({ ...SOURCE, type: "file", uri: "faq.pdf" }, 202);
      const file = new Blob(["%PDF-1.4"], { type: "application/pdf" });

      const result = await client.uploadKBSourceFile(KB_ID, file, {
        filename: "faq.pdf",
        config: { auto_refresh: false },
      });

      expect(result.type).toBe("file");
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources`);
      expect(init.method).toBe("POST");
      expect(init.body).toBeInstanceOf(FormData);
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      const form = init.body as FormData;
      const part = form.get("file") as File;
      expect(part).toBeInstanceOf(Blob);
      expect(part.name).toBe("faq.pdf");
      expect(form.get("filename")).toBe("faq.pdf");
      expect(JSON.parse(form.get("config") as string)).toEqual({ auto_refresh: false });
    });

    it("omits the optional filename/config fields when not given", async () => {
      const spy = mockFetchOk({ ...SOURCE, type: "file" }, 202);

      await client.uploadKBSourceFile(KB_ID, new Blob(["x"]));

      const form = lastCall(spy)[1].body as FormData;
      expect(form.get("file")).toBeInstanceOf(Blob);
      expect(form.has("filename")).toBe(false);
      expect(form.has("config")).toBe(false);
    });

    it("throws AudactError on HTTP 503 (uploads not configured)", async () => {
      mockFetchError({ error: { code: "SERVICE_UNAVAILABLE", message: "file uploads are not configured" } }, 503);
      await expect(
        client.uploadKBSourceFile(KB_ID, new Blob(["x"])),
      ).rejects.toMatchObject({ status: 503 });
    });
  });

  describe("getKBSource()", () => {
    it("calls GET /v1/knowledge-bases/:kb_id/sources/:source_id", async () => {
      const spy = mockFetchOk(SOURCE);

      const result = await client.getKBSource(KB_ID, SOURCE_ID);

      expect(result.source_id).toBe(SOURCE_ID);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources/${SOURCE_ID}`);
      expect(init.method).toBe("GET");
    });

    it("decodes the latest ingestion outcome", async () => {
      const coverage: KBCrawlCoverage = { discovered: 12, stored: 10, excluded: 1, failed: 1 };
      mockFetchOk({
        ...SOURCE,
        status: "ready",
        chunk_count: 0,
        crawl_coverage: coverage,
        last_ingested_at: "2026-06-22T12:05:00Z",
      });

      const result = await client.getKBSource(KB_ID, SOURCE_ID);

      expect(result.chunk_count).toBe(0);
      expect(result.crawl_coverage).toEqual(coverage);
      expect(result.last_ingested_at).toBe("2026-06-22T12:05:00Z");
    });

    it("leaves the ingestion outcome absent before a first ingestion", async () => {
      mockFetchOk(SOURCE);
      const result = await client.getKBSource(KB_ID, SOURCE_ID);
      expect(result.chunk_count).toBeUndefined();
      expect(result.crawl_coverage).toBeUndefined();
      expect(result.last_ingested_at).toBeUndefined();
    });

    it("percent-encodes both path segments", async () => {
      const spy = mockFetchOk(SOURCE);
      await client.getKBSource(UNSAFE_ID, UNSAFE_ID);
      expect(lastCall(spy)[0]).toBe(
        `${BASE}/v1/knowledge-bases/${UNSAFE_ENC}/sources/${UNSAFE_ENC}`,
      );
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "source not found" } }, 404);
      await expect(client.getKBSource(KB_ID, SOURCE_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("patchKBSource()", () => {
    it("calls PATCH /v1/knowledge-bases/:kb_id/sources/:source_id", async () => {
      const spy = mockFetchOk({ ...SOURCE, title: "Renamed" });

      const result = await client.patchKBSource(KB_ID, SOURCE_ID, { title: "Renamed" });

      expect(result.title).toBe("Renamed");
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources/${SOURCE_ID}`);
      expect(init.method).toBe("PATCH");
      expect(jsonBody(init)).toEqual({ title: "Renamed" });
    });

    it("throws AudactError on HTTP 400 (content on a non-text source)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "content is only editable for text sources" } }, 400);
      await expect(
        client.patchKBSource(KB_ID, SOURCE_ID, { content: "x" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("reingestKBSource()", () => {
    it("calls POST /v1/knowledge-bases/:kb_id/sources/:source_id/reingest with no body", async () => {
      const spy = mockFetchOk({ ...SOURCE, ingest_version: 2 }, 202);

      const result = await client.reingestKBSource(KB_ID, SOURCE_ID);

      expect(result.ingest_version).toBe(2);
      const [url, init] = lastCall(spy);
      expect(url).toBe(
        `${BASE}/v1/knowledge-bases/${KB_ID}/sources/${SOURCE_ID}/reingest`,
      );
      expect(init.method).toBe("POST");
      expect(init.body).toBeUndefined();
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "source not found" } }, 404);
      await expect(client.reingestKBSource(KB_ID, SOURCE_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("deleteKBSource()", () => {
    it("calls DELETE /v1/knowledge-bases/:kb_id/sources/:source_id (204)", async () => {
      const spy = mockFetchNoContent();

      await expect(client.deleteKBSource(KB_ID, SOURCE_ID)).resolves.toBeUndefined();

      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/sources/${SOURCE_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "source not found" } }, 404);
      await expect(client.deleteKBSource(KB_ID, SOURCE_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Agent links ────────────────────────────────────────────────────────────

  describe("listKBAgentLinks()", () => {
    it("calls GET /v1/knowledge-bases/:kb_id/agents", async () => {
      const spy = mockFetchOk(LIST_LINKS);

      const result = await client.listKBAgentLinks(KB_ID);

      expect(result).toEqual(LIST_LINKS);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/agents`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "knowledge base not found" } }, 404);
      await expect(client.listKBAgentLinks(KB_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("listKBLinksByAgent()", () => {
    it("calls GET /v1/knowledge-bases/agent-links?agent_id=", async () => {
      const spy = mockFetchOk(LIST_LINKS);

      const result = await client.listKBLinksByAgent(AGENT_ID);

      expect(result.items[0]?.agent_id).toBe(AGENT_ID);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/agent-links?agent_id=${AGENT_ID}`);
      expect(init.method).toBe("GET");
    });

    it("URL-encodes the agent_id query value", async () => {
      const spy = mockFetchOk(LIST_LINKS);
      await client.listKBLinksByAgent("a&b=c");
      expect(lastCall(spy)[0]).toBe(
        `${BASE}/v1/knowledge-bases/agent-links?agent_id=a%26b%3Dc`,
      );
    });

    it("throws AudactError on HTTP 400 (invalid agent_id)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "agent_id must be a UUID" } }, 400);
      await expect(client.listKBLinksByAgent("nope")).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("putKBAgentLink()", () => {
    it("calls PUT /v1/knowledge-bases/:kb_id/agents/:agent_id with the tuning body", async () => {
      const spy = mockFetchOk({ ...LINK, top_k: 5 });

      const result = await client.putKBAgentLink(KB_ID, AGENT_ID, {
        top_k: 5,
        similarity_threshold: 0.7,
        retrieval_instruction: "Answer from the docs only.",
      });

      expect(result.top_k).toBe(5);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/agents/${AGENT_ID}`);
      expect(init.method).toBe("PUT");
      expect(jsonBody(init)).toEqual({
        top_k: 5,
        similarity_threshold: 0.7,
        retrieval_instruction: "Answer from the docs only.",
      });
    });

    it("sends no body when no tuning is supplied (server defaults apply)", async () => {
      const spy = mockFetchOk(LINK);

      const result = await client.putKBAgentLink(KB_ID, AGENT_ID);

      expect(result).toEqual(LINK);
      expect(lastCall(spy)[1].body).toBeUndefined();
    });

    it("percent-encodes both path segments", async () => {
      const spy = mockFetchOk(LINK);
      await client.putKBAgentLink(UNSAFE_ID, UNSAFE_ID);
      expect(lastCall(spy)[0]).toBe(
        `${BASE}/v1/knowledge-bases/${UNSAFE_ENC}/agents/${UNSAFE_ENC}`,
      );
    });

    it("throws AudactError on HTTP 404 (cross-tenant agent)", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "agent not found" } }, 404);
      await expect(client.putKBAgentLink(KB_ID, AGENT_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("patchKBAgentLink()", () => {
    it("calls PATCH /v1/knowledge-bases/:kb_id/agents/:agent_id", async () => {
      const spy = mockFetchOk({ ...LINK, similarity_threshold: 0.75 });

      const result = await client.patchKBAgentLink(KB_ID, AGENT_ID, {
        similarity_threshold: 0.75,
      });

      expect(result.similarity_threshold).toBe(0.75);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/agents/${AGENT_ID}`);
      expect(init.method).toBe("PATCH");
      expect(jsonBody(init)).toEqual({ similarity_threshold: 0.75 });
    });

    it("throws AudactError on HTTP 400 (top_k out of range)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "top_k must be 1-10" } }, 400);
      await expect(
        client.patchKBAgentLink(KB_ID, AGENT_ID, { top_k: 11 }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteKBAgentLink()", () => {
    it("calls DELETE /v1/knowledge-bases/:kb_id/agents/:agent_id (204)", async () => {
      const spy = mockFetchNoContent();

      await expect(client.deleteKBAgentLink(KB_ID, AGENT_ID)).resolves.toBeUndefined();

      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/agents/${AGENT_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "link not found" } }, 404);
      await expect(client.deleteKBAgentLink(KB_ID, AGENT_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Crawl exclusions ───────────────────────────────────────────────────────

  describe("listExclusions()", () => {
    it("calls GET /v1/knowledge-bases/:kb_id/exclusions", async () => {
      const spy = mockFetchOk(LIST_EXCLUSIONS);

      const result = await client.listExclusions(KB_ID);

      expect(result).toEqual(LIST_EXCLUSIONS);
      expect(result.items[0]?.url).toBeUndefined();
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/exclusions`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "knowledge base not found" } }, 404);
      await expect(client.listExclusions(KB_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("addExclusion()", () => {
    it("calls POST /v1/knowledge-bases/:kb_id/exclusions and decodes 201", async () => {
      const spy = mockFetchOk(EXCLUSION, 201);

      const result = await client.addExclusion(KB_ID, { crawl_path: "/admin" });

      expect(result).toEqual(EXCLUSION);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/exclusions`);
      expect(init.method).toBe("POST");
      expect(jsonBody(init)).toEqual({ crawl_path: "/admin" });
    });

    it("throws AudactError on HTTP 400 (both crawl_path and url)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "provide exactly one" } }, 400);
      await expect(
        client.addExclusion(KB_ID, { crawl_path: "/a", url: "https://x.example/a" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteExclusion()", () => {
    it("calls DELETE /v1/knowledge-bases/:kb_id/exclusions/:id (204)", async () => {
      const spy = mockFetchNoContent();

      await expect(client.deleteExclusion(KB_ID, EXCLUSION_ID)).resolves.toBeUndefined();

      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/exclusions/${EXCLUSION_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("percent-encodes both path segments", async () => {
      const spy = mockFetchNoContent();
      await client.deleteExclusion(UNSAFE_ID, UNSAFE_ID);
      expect(lastCall(spy)[0]).toBe(
        `${BASE}/v1/knowledge-bases/${UNSAFE_ENC}/exclusions/${UNSAFE_ENC}`,
      );
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: { code: "NOT_FOUND", message: "exclusion not found" } }, 404);
      await expect(client.deleteExclusion(KB_ID, EXCLUSION_ID)).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── Retrieval test harness ─────────────────────────────────────────────────

  describe("testKBRetrieval()", () => {
    it("calls POST /v1/knowledge-bases/:kb_id/test-retrieval and decodes hits", async () => {
      const spy = mockFetchOk(RETRIEVAL);

      const result = await client.testKBRetrieval(KB_ID, {
        turns: [
          { role: "user", content: "Hi" },
          { role: "user", content: "What is the refund policy?" },
        ],
        top_k: 5,
        threshold: 0.7,
      });

      expect(result).toEqual(RETRIEVAL);
      const [url, init] = lastCall(spy);
      expect(url).toBe(`${BASE}/v1/knowledge-bases/${KB_ID}/test-retrieval`);
      expect(init.method).toBe("POST");
      expect(jsonBody(init)).toEqual({
        turns: [
          { role: "user", content: "Hi" },
          { role: "user", content: "What is the refund policy?" },
        ],
        top_k: 5,
        threshold: 0.7,
      });
    });

    it("treats an empty result as a 200, not an error", async () => {
      mockFetchOk({ condensed_query: "q", hits: [], empty: true });

      const result = await client.testKBRetrieval(KB_ID, { question: "q" });

      expect(result.empty).toBe(true);
      expect(result.hits).toEqual([]);
    });

    it("throws AudactError on HTTP 400 (question and turns both set)", async () => {
      mockFetchError({ error: { code: "INVALID_REQUEST", message: "question and turns are mutually exclusive" } }, 400);
      await expect(
        client.testKBRetrieval(KB_ID, { question: "q", turns: [{ role: "user", content: "q" }] }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("network failures", () => {
    it("wraps a fetch rejection in AudactError with status 0", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));
      await expect(client.listKBSources(KB_ID)).rejects.toMatchObject({
        status: 0,
        message: "ECONNREFUSED",
      });
    });
  });
});
