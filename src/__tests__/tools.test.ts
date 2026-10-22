/**
 * Audact TypeScript SDK — ToolsClient test suite
 *
 * Covers the agent-worker custom function-calling tool surface: tool CRUD
 * (full PUT + partial PATCH), the platform-tool test probe, and agent-tool
 * attach/detach/list.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / agents.test.ts.
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

import { AudactError, ToolsClient } from "../client.js";

import type {
  AttachToolResponse,
  DeleteToolResponse,
  DetachToolResponse,
  ListAgentToolsResponse,
  ListToolsResponse,
  TestToolResponse,
  ToolConfig,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const TOOL_ID = "550e8400-e29b-41d4-a716-446655440000";
const AGENT_ID = "550e8400-e29b-41d4-a716-446655440001";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440002";

const TOOL: ToolConfig = {
  tool_id: TOOL_ID,
  tenant_id: TENANT_ID,
  name: "lookup_customer",
  description: "Look up a customer by email",
  method: "POST",
  url: "https://api.example.com/v1/lookup",
  args_only: false,
  execution: { speak_during: { enabled: false } },
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const LIST_TOOLS_RESPONSE: ListToolsResponse = {
  tools: [TOOL],
  has_more: false,
};

const DELETE_TOOL_RESPONSE: DeleteToolResponse = { deleted: true };

const TEST_TOOL_RESPONSE: TestToolResponse = {
  tool_id: TOOL_ID,
  healthy: true,
  checks_passed: ["connection_active", "event_type_resolved"],
};

const ATTACH_TOOL_RESPONSE: AttachToolResponse = {
  agent_id: AGENT_ID,
  tool_id: TOOL_ID,
  attached: true,
};

const DETACH_TOOL_RESPONSE: DetachToolResponse = { detached: true };

const LIST_AGENT_TOOLS_RESPONSE: ListAgentToolsResponse = {
  items: [TOOL],
  has_more: false,
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

describe("ToolsClient", () => {
  let client: ToolsClient;

  beforeEach(() => {
    client = new ToolsClient("http://localhost:8089", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Tool CRUD ──────────────────────────────────────────────────────────────

  describe("listTools()", () => {
    it("calls GET /v1/tools", async () => {
      const spy = mockFetchOk(LIST_TOOLS_RESPONSE);

      const result = await client.listTools();

      expect(result.tools).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/tools");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("appends name/limit/cursor query params", async () => {
      const spy = mockFetchOk(LIST_TOOLS_RESPONSE);

      await client.listTools({ name: "lookup_customer", limit: 10, cursor: "abc" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "http://localhost:8089/v1/tools?name=lookup_customer&cursor=abc&limit=10",
      );
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "missing bearer token" },
        401,
      );
      await expect(client.listTools()).rejects.toMatchObject({ status: 401 });
      await expect(client.listTools()).rejects.toBeInstanceOf(AudactError);
    });
  });

  describe("createTool()", () => {
    it("calls POST /v1/tools", async () => {
      const spy = mockFetchOk(TOOL, 201);

      const result = await client.createTool({
        name: "lookup_customer",
        description: "Look up a customer by email",
        method: "POST",
        url: "https://api.example.com/v1/lookup",
      });

      expect(result.tool_id).toBe(TOOL_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/tools");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "lookup_customer",
        description: "Look up a customer by email",
        method: "POST",
        url: "https://api.example.com/v1/lookup",
      });
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBeUndefined();
    });

    it("sends an Idempotency-Key header when supplied", async () => {
      const spy = mockFetchOk(TOOL, 201);

      await client.createTool(
        {
          name: "lookup_customer",
          description: "Look up a customer by email",
          method: "POST",
          url: "https://api.example.com/v1/lookup",
        },
        "idem-key-123",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-123");
    });

    it("throws AudactError on HTTP 409 for a name conflict", async () => {
      mockFetchError({ error: "CONFLICT", message: "name conflict" }, 409);
      await expect(
        client.createTool({
          name: "lookup_customer",
          description: "x",
          method: "POST",
          url: "https://api.example.com/v1/lookup",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("getTool()", () => {
    it("calls GET /v1/tools/:id", async () => {
      const spy = mockFetchOk(TOOL);

      const result = await client.getTool(TOOL_ID);

      expect(result.tool_id).toBe(TOOL_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getTool(TOOL_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("replaceTool()", () => {
    it("calls PUT /v1/tools/:id", async () => {
      const spy = mockFetchOk({ ...TOOL, description: "Updated description" });

      const result = await client.replaceTool(TOOL_ID, {
        name: "lookup_customer",
        description: "Updated description",
        method: "POST",
        url: "https://api.example.com/v1/lookup",
      });

      expect(result.description).toBe("Updated description");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "lookup_customer",
        description: "Updated description",
        method: "POST",
        url: "https://api.example.com/v1/lookup",
      });
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(
        client.replaceTool(TOOL_ID, {
          name: "lookup_customer",
          description: "x",
          method: "POST",
          url: "https://api.example.com/v1/lookup",
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("updateTool()", () => {
    it("calls PATCH /v1/tools/:id", async () => {
      const spy = mockFetchOk({ ...TOOL, description: "Patched description" });

      const result = await client.updateTool(TOOL_ID, {
        description: "Patched description",
      });

      expect(result.description).toBe("Patched description");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}`);
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({
        description: "Patched description",
      });
    });

    it("throws AudactError on HTTP 400 for an invalid patch", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "invalid method" },
        400,
      );
      await expect(
        client.updateTool(TOOL_ID, { method: "INVALID" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteTool()", () => {
    it("calls DELETE /v1/tools/:id", async () => {
      const spy = mockFetchOk(DELETE_TOOL_RESPONSE);

      const result = await client.deleteTool(TOOL_ID);

      expect(result.deleted).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("appends ?force=true when force is requested", async () => {
      const spy = mockFetchOk(DELETE_TOOL_RESPONSE);

      await client.deleteTool(TOOL_ID, true);

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}?force=true`);
    });

    it("throws AudactError on HTTP 409 when attached and not forced", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "tool has active agent attachments" },
        409,
      );
      await expect(client.deleteTool(TOOL_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("testTool()", () => {
    it("calls POST /v1/tools/:id/test", async () => {
      const spy = mockFetchOk(TEST_TOOL_RESPONSE);

      const result = await client.testTool(TOOL_ID);

      expect(result.healthy).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/tools/${TOOL_ID}/test`);
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 400 for a non-platform tool", async () => {
      mockFetchError(
        {
          error: "INVALID_REQUEST",
          message: "test is only supported for platform-supplied tools",
        },
        400,
      );
      await expect(client.testTool(TOOL_ID)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  // ── Agent-tool attachment ───────────────────────────────────────────────────

  describe("listAgentTools()", () => {
    it("calls GET /v1/agents/:agent_id/tools", async () => {
      const spy = mockFetchOk(LIST_AGENT_TOOLS_RESPONSE);

      const result = await client.listAgentTools(AGENT_ID);

      expect(result.items).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/agents/${AGENT_ID}/tools`,
      );
      expect(init.method).toBe("GET");
    });

    it("appends limit/cursor query params", async () => {
      const spy = mockFetchOk(LIST_AGENT_TOOLS_RESPONSE);

      await client.listAgentTools(AGENT_ID, { limit: 5, cursor: "xyz" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/agents/${AGENT_ID}/tools?limit=5&cursor=xyz`,
      );
    });

    it("throws AudactError on HTTP 400 for an invalid limit/cursor", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "invalid cursor" },
        400,
      );
      await expect(client.listAgentTools(AGENT_ID)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe("attachToolToAgent()", () => {
    it("calls POST /v1/agents/:agent_id/tools with a tool_id body", async () => {
      const spy = mockFetchOk(ATTACH_TOOL_RESPONSE, 201);

      const result = await client.attachToolToAgent(AGENT_ID, TOOL_ID);

      expect(result.attached).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/agents/${AGENT_ID}/tools`,
      );
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({ tool_id: TOOL_ID });
    });

    it("throws AudactError on HTTP 404 for a missing agent or tool", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(
        client.attachToolToAgent(AGENT_ID, TOOL_ID),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("detachToolFromAgent()", () => {
    it("calls DELETE /v1/agents/:agent_id/tools/:tool_id", async () => {
      const spy = mockFetchOk(DETACH_TOOL_RESPONSE);

      const result = await client.detachToolFromAgent(AGENT_ID, TOOL_ID);

      expect(result.detached).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/agents/${AGENT_ID}/tools/${TOOL_ID}`,
      );
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 400 for an invalid UUID", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "invalid tool_id" },
        400,
      );
      await expect(
        client.detachToolFromAgent(AGENT_ID, TOOL_ID),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
