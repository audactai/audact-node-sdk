/**
 * Audact TypeScript SDK — offline integration flow
 *
 * Mirrors the staging smoke script against an in-memory fetch router:
 * list agents → initiate outbound call → get call status (active, then
 * terminated) → call summary, all through one client built with a single
 * `baseUrl`. Also checks that a server error envelope surfaces as AudactError.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AudactClient, AudactError } from "../client.js";

const API_KEY = "aud_live_flowtest1234567890";
const HOST = "https://api.example.test/v1/";
const CALL_ID = "11111111-1111-1111-1111-111111111111";
const AGENT_ID = "22222222-2222-2222-2222-222222222222";

interface Recorded {
  method: string;
  url: string;
  path: string;
  auth: string | null;
  body: unknown;
}

type Handler = () => { status: number; body: unknown };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("offline flow via baseUrl", () => {
  let recorded: Recorded[];
  let routes: Map<string, Handler[]>;

  /** Queue responses for "METHOD /path"; the last one repeats. */
  function route(key: string, ...handlers: Handler[]): void {
    routes.set(key, handlers);
  }

  beforeEach(() => {
    recorded = [];
    routes = new Map();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        const method = init?.method ?? "GET";
        const path = new URL(url).pathname;
        const headers = new Headers(init?.headers);
        recorded.push({
          method,
          url,
          path,
          auth: headers.get("Authorization"),
          body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
        });
        const queue = routes.get(`${method} ${path}`);
        if (!queue || queue.length === 0) {
          return json(500, { error: { code: "unrouted", message: `${method} ${path}` } });
        }
        const h = queue.length > 1 ? queue.shift()! : queue[0]!;
        const r = h();
        return json(r.status, r.body);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ok = (body: unknown): Handler => () => ({ status: 200, body });

  function setupHappyPath(): void {
    route(
      "GET /v1/agents",
      ok({ agents: [{ agent_id: AGENT_ID, name: "Flow Agent" }], has_more: false }),
    );
    route(
      "POST /v1/sip/calls/outbound",
      () => ({
        status: 201,
        body: { call_id: CALL_ID, room_name: "room-1" },
      }),
    );
    route(
      `GET /v1/sip/calls/${CALL_ID}/status`,
      ok({ call_id: CALL_ID, room_name: "room-1", status: "active" }),
      ok({ call_id: CALL_ID, room_name: "room-1", status: "terminated" }),
    );
    route(
      `GET /v1/calls/${CALL_ID}/summary`,
      ok({
        call_id: CALL_ID,
        tenant_id: "t1",
        status: "completed",
        started_at: "2026-10-15T10:00:00Z",
        event_count: 3,
        allow_count: 3,
        block_count: 0,
        modify_count: 0,
      }),
    );
  }

  it("runs the full smoke flow against one host", async () => {
    setupHappyPath();
    const client = new AudactClient({ apiKey: API_KEY, baseUrl: HOST });

    const agents = await client.agents.listAgents();
    expect(agents.agents.map((a) => a.agent_id)).toContain(AGENT_ID);

    const outbound = {
      agent_id: AGENT_ID,
      from_number: "+15550000001",
      destination_number: "+15550000002",
    };
    const call = await client.calls.initiateOutboundCall(outbound);
    expect(call.call_id).toBe(CALL_ID);

    const first = await client.calls.getCallStatus(call.call_id);
    expect(first.status).toBe("active");
    const second = await client.calls.getCallStatus(call.call_id);
    expect(second.status).toBe("terminated");

    const summary = await client.evidence.getCallSummary(call.call_id);
    expect(summary.call_id).toBe(CALL_ID);
    expect(summary.event_count).toBe(3);

    expect(recorded.map((r) => `${r.method} ${r.path}`)).toEqual([
      "GET /v1/agents",
      "POST /v1/sip/calls/outbound",
      `GET /v1/sip/calls/${CALL_ID}/status`,
      `GET /v1/sip/calls/${CALL_ID}/status`,
      `GET /v1/calls/${CALL_ID}/summary`,
    ]);
    for (const r of recorded) {
      expect(r.url.startsWith("https://api.example.test/v1/")).toBe(true);
      expect(r.url).not.toContain("/v1/v1/");
      expect(r.url).not.toContain("//v1");
      expect(r.auth).toBe(`Bearer ${API_KEY}`);
    }
    expect(recorded[1]!.body).toEqual(outbound);
  });

  it("surfaces an error envelope mid-flow as AudactError", async () => {
    setupHappyPath();
    route(`GET /v1/sip/calls/${CALL_ID}/status`, () => ({
      status: 404,
      body: {
        error: {
          code: "not_found",
          message: "call not found",
          request_id: "req_123",
        },
      },
    }));
    const client = new AudactClient({ apiKey: API_KEY, baseUrl: HOST });

    await client.agents.listAgents();
    const call = await client.calls.initiateOutboundCall({
      agent_id: AGENT_ID,
      from_number: "+15550000001",
      destination_number: "+15550000002",
    });

    const err = await client.calls
      .getCallStatus(call.call_id)
      .then(() => undefined, (e: unknown) => e);
    expect(err).toBeInstanceOf(AudactError);
    const ae = err as AudactError;
    expect(ae.status).toBe(404);
    expect(ae.code).toBe("not_found");
    expect(ae.message).toBe("call not found");
    expect(ae.requestId).toBe("req_123");
    // The flow stopped: summary was never requested.
    expect(recorded.some((r) => r.path.endsWith("/summary"))).toBe(false);
  });
});
