/**
 * Audact TypeScript SDK — BaseServiceClient auth-token test suite
 *
 * Verifies that `setAuthToken` overrides the `Authorization` header sent by
 * `request`/`requestStream`/`requestRaw`, and that clearing it falls back to
 * the API key. This is the transport-level building block for OrgBearer
 * (OrgClient.login()) and PlatformBearer (caller-supplied `platformToken`)
 * auth flows.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { AudactError, BaseServiceClient } from "../base.js";

const API_KEY = "aud_live_test1234567890abcdef";
const ORG_TOKEN = "org-jwt-abc123";

// A thin subclass exposing the protected request/requestStream/requestRaw
// methods for direct testing, mirroring how real sub-clients call them.
class TestClient extends BaseServiceClient {
  async doRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.request<T>(method, path, body);
  }

  async doRequestStream(method: string, path: string): Promise<Response> {
    return this.requestStream(method, path);
  }

  async doRequestRaw(method: string, path: string): Promise<Response> {
    return this.requestRaw(method, path);
  }
}

function mockFetchOk(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function authHeaderFrom(spy: ReturnType<typeof vi.spyOn>): string | null {
  const call = spy.mock.calls[0];
  const init = call?.[1] as RequestInit | undefined;
  const headers = init?.headers as Record<string, string> | undefined;
  return headers?.["Authorization"] ?? null;
}

describe("BaseServiceClient auth token", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("request(): sends the API key when no authToken is set", async () => {
    const spy = mockFetchOk();
    const client = new TestClient("http://localhost:8092", API_KEY, 30_000);

    await client.doRequest("GET", "/v1/profile");

    expect(authHeaderFrom(spy)).toBe(`Bearer ${API_KEY}`);
  });

  it("request(): sends the authToken instead of the API key once set", async () => {
    const spy = mockFetchOk();
    const client = new TestClient("http://localhost:8092", API_KEY, 30_000);

    client.setAuthToken(ORG_TOKEN);
    await client.doRequest("GET", "/v1/profile");

    expect(authHeaderFrom(spy)).toBe(`Bearer ${ORG_TOKEN}`);
  });

  it("request(): falls back to the API key after the authToken is cleared", async () => {
    const spy = mockFetchOk();
    const client = new TestClient("http://localhost:8092", API_KEY, 30_000);

    client.setAuthToken(ORG_TOKEN);
    client.setAuthToken(undefined);
    await client.doRequest("GET", "/v1/profile");

    expect(authHeaderFrom(spy)).toBe(`Bearer ${API_KEY}`);
  });

  it("requestStream(): sends the authToken instead of the API key once set", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("data: [DONE]\n\n", {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    const client = new TestClient("http://localhost:8092", API_KEY, 30_000);

    client.setAuthToken(ORG_TOKEN);
    await client.doRequestStream("POST", "/v1/stream");

    expect(authHeaderFrom(spy)).toBe(`Bearer ${ORG_TOKEN}`);
  });

  it("requestRaw(): sends the authToken instead of the API key once set", async () => {
    const spy = mockFetchOk();
    const client = new TestClient("http://localhost:8092", API_KEY, 30_000);

    client.setAuthToken(ORG_TOKEN);
    await client.doRequestRaw("GET", "/v1/raw");

    expect(authHeaderFrom(spy)).toBe(`Bearer ${ORG_TOKEN}`);
  });
});

// ─── Error envelope ──────────────────────────────────────────────

function mockError(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(body, { status, headers }),
  );
}

async function caught(fn: () => Promise<unknown>): Promise<AudactError> {
  try {
    await fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AudactError);
    return e as AudactError;
  }
  throw new Error("expected AudactError");
}

describe("AudactError envelope parsing", () => {
  afterEach(() => vi.restoreAllMocks());
  const c = () => new TestClient("https://h", API_KEY, 5000);
  const paths: Array<[string, (t: TestClient) => Promise<unknown>]> = [
    ["request", (t) => t.doRequest("GET", "/v1/x")],
    ["requestStream", (t) => t.doRequestStream("GET", "/v1/x")],
    ["requestRaw", (t) => t.doRequestRaw("GET", "/v1/x")],
  ];

  it.each(paths)("%s: nested envelope populates all fields", async (_n, call) => {
    mockError(
      400,
      JSON.stringify({
        error: {
          code: "bad_request",
          message: "nope",
          hint: "fix it",
          details: { field: "x" },
          request_id: "req_body",
        },
      }),
    );
    const e = await caught(() => call(c()));
    expect(e.message).toBe("nope");
    expect(e.code).toBe("bad_request");
    expect(e.hint).toBe("fix it");
    expect(e.details).toEqual({ field: "x" });
    expect(e.requestId).toBe("req_body");
    expect(e.status).toBe(400);
    expect(e.body).toEqual({ error: expect.objectContaining({ code: "bad_request" }) });
  });

  it.each(paths)("%s: flat legacy body still works", async (_n, call) => {
    mockError(400, JSON.stringify({ message: "legacy", code: "old" }));
    const e = await caught(() => call(c()));
    expect(e.message).toBe("legacy");
    expect(e.code).toBe("old");
  });

  it.each(paths)("%s: non-JSON body gives HTTP 502", async (_n, call) => {
    mockError(502, "<html>bad gateway</html>");
    const e = await caught(() => call(c()));
    expect(e.message).toBe("HTTP 502");
    expect(e.body).toBeNull();
    expect(e.code).toBeUndefined();
  });

  it("falls back to X-Request-ID header when body has no request_id", async () => {
    mockError(404, JSON.stringify({ error: { message: "m" } }), {
      "X-Request-ID": "req_hdr",
    });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).requestId).toBe("req_hdr");
  });

  it("body request_id wins over header", async () => {
    mockError(404, JSON.stringify({ error: { message: "m", request_id: "req_body" } }), {
      "X-Request-ID": "req_hdr",
    });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).requestId).toBe("req_body");
  });

  it("429 Retry-After seconds sets retryAfter", async () => {
    mockError(429, JSON.stringify({ error: { code: "rate_limited", message: "slow" } }), {
      "Retry-After": "7",
    });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).retryAfter).toBe(7);
  });

  it("429 Retry-After HTTP-date yields non-negative seconds", async () => {
    const date = new Date(Date.now() + 30_000).toUTCString();
    mockError(429, "{}", { "Retry-After": date });
    const e = await caught(() => c().doRequest("GET", "/v1/x"));
    expect(e.retryAfter).toBeGreaterThanOrEqual(0);
    expect(e.retryAfter).toBeLessThanOrEqual(31);
  });

  it("past HTTP-date clamps to 0; garbage is undefined; non-429 ignores header", async () => {
    mockError(429, "{}", { "Retry-After": "Wed, 21 Oct 2015 07:28:00 GMT" });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).retryAfter).toBe(0);
    mockError(429, "{}", { "Retry-After": "soon" });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).retryAfter).toBeUndefined();
    mockError(503, "{}", { "Retry-After": "5" });
    expect((await caught(() => c().doRequest("GET", "/v1/x"))).retryAfter).toBeUndefined();
  });
});
