/**
 * Audact TypeScript SDK — PlatformClient test suite
 *
 * Uses vitest with a fetch mock so the tests run without a real server.
 * Mirrors the fixture/mock conventions established in client.test.ts.
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

import { AudactError } from "../base.js";
import {
  buildImportPath,
  buildSetSecretHeaders,
  PlatformClient,
} from "../platform.js";
import type { PlatformImportResponse } from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "11111111-1111-1111-1111-111111111111";
const TARGET_TENANT_ID = "66666666-6666-6666-6666-666666666666";
const AGENT_ID = "77777777-7777-7777-7777-777777777777";
const API_KEY = "aud_admin_test1234567890abcdef";

const BUNDLE_YAML = [
  "apiVersion: audact.ai/v1",
  "kind: TenantBundle",
  "metadata:",
  "  name: Acme Corp",
  "spec:",
  "  agents: []",
  "",
].join("\n");

const IMPORT_RESPONSE: PlatformImportResponse = {
  dry_run: false,
  mode: "create-only",
  bundle_sha256:
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85",
  counts: { configuration: 1, tool: 0, agent: 1 },
  entities: [
    {
      ref: "configuration/prod",
      kind: "configuration",
      name: "Production v1",
      status: "created",
      new_id: "88888888-8888-8888-8888-888888888888",
      needs_secret: false,
    },
    {
      ref: "agent/sales-bot",
      kind: "agent",
      name: "Sales Bot",
      status: "created",
      new_id: "99999999-9999-9999-9999-999999999999",
      needs_secret: true,
    },
  ],
  warnings: [
    'agent "agent/sales-bot" imported disconnected: supply --set-secret agent/sales-bot.<field>=<value> to attach the required secret',
  ],
};

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

type FetchMock = MockInstance<typeof fetch>;

function mockFetchOkText(body: string, status = 200): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(body, {
      status,
      headers: { "Content-Type": "application/yaml" },
    }),
  );
}

function mockFetchOkJson(body: unknown, status = 200): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function mockFetchError(body: unknown, status: number): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Request-ID": "req-test-789",
      },
    }),
  );
}

// ─── buildImportPath ─────────────────────────────────────────────────────────

describe("buildImportPath()", () => {
  it("builds a bare path with no options", () => {
    expect(buildImportPath(TARGET_TENANT_ID)).toBe(
      `/v1/platform/import/tenants/${TARGET_TENANT_ID}`,
    );
  });

  it("adds dryRun=true only when dryRun is true", () => {
    expect(buildImportPath(TARGET_TENANT_ID, { dryRun: true })).toBe(
      `/v1/platform/import/tenants/${TARGET_TENANT_ID}?dryRun=true`,
    );
    expect(buildImportPath(TARGET_TENANT_ID, { dryRun: false })).toBe(
      `/v1/platform/import/tenants/${TARGET_TENANT_ID}`,
    );
  });

  it("adds mode when supplied", () => {
    expect(buildImportPath(TARGET_TENANT_ID, { mode: "upsert" })).toBe(
      `/v1/platform/import/tenants/${TARGET_TENANT_ID}?mode=upsert`,
    );
  });

  it("NEVER puts setSecret in the URL (it is a header — plaintext secret leak)", () => {
    const path = buildImportPath(TARGET_TENANT_ID, {
      setSecret: ["tool/send-email.apiKey=sk-1", "tool/crm.token=tok-2"],
    });
    expect(path).not.toContain("setSecret");
    expect(path).not.toContain("sk-1");
  });

  it("combines dryRun and mode without leaking setSecret to the URL", () => {
    const path = buildImportPath(TARGET_TENANT_ID, {
      dryRun: true,
      mode: "create-only",
      setSecret: ["a.b=c"],
    });
    const url = new URL(`http://x${path}`);
    expect(url.searchParams.get("dryRun")).toBe("true");
    expect(url.searchParams.get("mode")).toBe("create-only");
    expect(url.searchParams.has("setSecret")).toBe(false);
  });
});

// ─── buildSetSecretHeaders ────────────────────────────────────────────────────

describe("buildSetSecretHeaders()", () => {
  it("emits one X-Audact-Set-Secret tuple per assignment (repeated header lines)", () => {
    expect(
      buildSetSecretHeaders({
        setSecret: ["tool/send-email.apiKey=sk-1", "tool/crm.token=tok-2"],
      }),
    ).toEqual([
      ["X-Audact-Set-Secret", "tool/send-email.apiKey=sk-1"],
      ["X-Audact-Set-Secret", "tool/crm.token=tok-2"],
    ]);
  });

  it("returns no headers when setSecret is absent", () => {
    expect(buildSetSecretHeaders({})).toEqual([]);
  });
});

describe("buildImportPath() — path encoding", () => {
  it("URL-encodes the target tenant id path segment", () => {
    expect(buildImportPath("weird id/needs encoding")).toBe(
      "/v1/platform/import/tenants/weird%20id%2Fneeds%20encoding",
    );
  });
});

// ─── PlatformClient ───────────────────────────────────────────────────────────

describe("PlatformClient", () => {
  let client: PlatformClient;

  beforeEach(() => {
    client = new PlatformClient("http://localhost:8085", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("exportTenant()", () => {
    it("calls GET /v1/platform/export/tenants/{tenant_id} with Accept: application/yaml by default", async () => {
      const spy = mockFetchOkText(BUNDLE_YAML);

      const response = await client.exportTenant(TENANT_ID);

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe(BUNDLE_YAML);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/platform/export/tenants/${TENANT_ID}`,
      );
      expect(init.method).toBe("GET");
      const headers = init.headers as Record<string, string>;
      expect(headers["Accept"]).toBe("application/yaml");
      expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
    });

    it("sets Accept: application/json when format is 'json'", async () => {
      const spy = mockFetchOkJson({
        apiVersion: "audact.ai/v1",
        kind: "TenantBundle",
        metadata: { name: "Acme Corp" },
        spec: {},
      });

      await client.exportTenant(TENANT_ID, { format: "json" });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Accept"]).toBe(
        "application/json",
      );
    });

    it("throws AudactError on HTTP 403", async () => {
      mockFetchError(
        { error: "FORBIDDEN", message: "token does not authorize this tenant" },
        403,
      );

      await expect(client.exportTenant(TENANT_ID)).rejects.toMatchObject({
        status: 403,
      });
      await expect(client.exportTenant(TENANT_ID)).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });

  describe("exportAgent()", () => {
    it("calls GET /v1/platform/export/agents/{agent_id}?tenant_id=... ", async () => {
      const spy = mockFetchOkText(BUNDLE_YAML);

      await client.exportAgent(AGENT_ID, { tenantId: TENANT_ID });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/platform/export/agents/${AGENT_ID}?tenant_id=${TENANT_ID}`,
      );
      expect(init.method).toBe("GET");
    });

    it("forwards format: 'json' as Accept header", async () => {
      const spy = mockFetchOkJson({
        apiVersion: "audact.ai/v1",
        kind: "AgentBundle",
        metadata: { name: "Sales Bot" },
        spec: {},
      });

      await client.exportAgent(AGENT_ID, {
        tenantId: TENANT_ID,
        format: "json",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>)["Accept"]).toBe(
        "application/json",
      );
    });
  });

  describe("importTenant()", () => {
    it("calls POST /v1/platform/import/tenants/{target} with Content-Type: application/yaml and the raw bundle body", async () => {
      const spy = mockFetchOkJson(IMPORT_RESPONSE);

      const result = await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8085/v1/platform/import/tenants/${TARGET_TENANT_ID}`,
      );
      expect(init.method).toBe("POST");
      expect(init.body).toBe(BUNDLE_YAML);
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/yaml");
      expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);

      expect(result.dry_run).toBe(false);
      expect(result.mode).toBe("create-only");
      expect(result.entities).toHaveLength(2);
    });

    it("forwards dryRun as a query parameter", async () => {
      const spy = mockFetchOkJson({ ...IMPORT_RESPONSE, dry_run: true });

      await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML, {
        dryRun: true,
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("?dryRun=true");
    });

    it("forwards mode as a query parameter", async () => {
      const spy = mockFetchOkJson(IMPORT_RESPONSE);

      await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML, {
        mode: "upsert",
      });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("mode=upsert");
    });

    it("sends setSecret as repeated X-Audact-Set-Secret headers, never in the URL", async () => {
      const spy = mockFetchOkJson(IMPORT_RESPONSE);

      await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML, {
        setSecret: ["tool/send-email.apiKey=sk-live-abc", "tool/crm.token=tok-xyz"],
      });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      // SECURITY: the plaintext secret must NOT appear in the URL (proxies log
      // it).
      expect(url).not.toContain("setSecret");
      expect(url).not.toContain("sk-live-abc");
      // It travels as repeated header lines the server reads via Header.Values.
      const headerTuples = init.headers as Array<[string, string]>;
      const setSecretValues = headerTuples
        .filter(([name]) => name === "X-Audact-Set-Secret")
        .map(([, value]) => value);
      expect(setSecretValues).toEqual([
        "tool/send-email.apiKey=sk-live-abc",
        "tool/crm.token=tok-xyz",
      ]);
    });

    it("combines dryRun and mode in the URL and setSecret in a header", async () => {
      const spy = mockFetchOkJson({ ...IMPORT_RESPONSE, dry_run: true, mode: "create-only" });

      await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML, {
        dryRun: true,
        mode: "create-only",
        setSecret: ["a.b=c"],
      });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("dryRun")).toBe("true");
      expect(parsed.searchParams.get("mode")).toBe("create-only");
      expect(parsed.searchParams.has("setSecret")).toBe(false);
      const headerTuples = init.headers as Array<[string, string]>;
      expect(
        headerTuples.filter(([name]) => name === "X-Audact-Set-Secret"),
      ).toEqual([["X-Audact-Set-Secret", "a.b=c"]]);
    });

    it("round-trips against a stubbed server and parses the per-entity manifest", async () => {
      mockFetchOkJson(IMPORT_RESPONSE);

      const result = await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML);

      expect(result.bundle_sha256).toBe(IMPORT_RESPONSE.bundle_sha256);
      expect(result.counts).toEqual({ configuration: 1, tool: 0, agent: 1 });
      expect(result.entities[0]).toMatchObject({
        ref: "configuration/prod",
        kind: "configuration",
        status: "created",
        needs_secret: false,
      });
      expect(result.entities[1]).toMatchObject({
        ref: "agent/sales-bot",
        kind: "agent",
        needs_secret: true,
      });
      expect(result.warnings).toHaveLength(1);
    });

    it("throws AudactError on HTTP 501 (mode=upsert not implemented)", async () => {
      mockFetchError(
        {
          error: "NOT_IMPLEMENTED",
          message: "mode=upsert is not yet supported",
        },
        501,
      );

      await expect(
        client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML, { mode: "upsert" }),
      ).rejects.toMatchObject({ status: 501 });
    });

    it("throws AudactError on HTTP 400 for an invalid bundle", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "bundle: unmarshal YAML: ..." },
        400,
      );

      await expect(
        client.importTenant(TARGET_TENANT_ID, "not: [valid"),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("accepts a Uint8Array bundle body for streaming uploads", async () => {
      const spy = mockFetchOkJson(IMPORT_RESPONSE);
      const bytes = new TextEncoder().encode(BUNDLE_YAML);

      await client.importTenant(TARGET_TENANT_ID, bytes);

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(init.body).toBe(bytes);
    });
  });
});

// ─── Authorization header ─────────────────────────────────────────────────────

describe("PlatformClient Authorization header", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Bearer token on export requests", async () => {
    const client = new PlatformClient(
      "http://localhost:8085",
      "aud_admin_testkey",
      30_000,
    );
    const spy = mockFetchOkText(BUNDLE_YAML);

    await client.exportTenant(TENANT_ID);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_admin_testkey",
    );
  });

  it("sends Bearer token on import requests", async () => {
    const client = new PlatformClient(
      "http://localhost:8085",
      "aud_admin_testkey",
      30_000,
    );
    const spy = mockFetchOkJson(IMPORT_RESPONSE);

    await client.importTenant(TARGET_TENANT_ID, BUNDLE_YAML);

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_admin_testkey",
    );
  });
});

describe("PlatformClient admin keys", () => {
  const ORG_URL = "http://localhost:8092";
  const KEY = {
    active: true,
    added_at: "2026-10-01T00:00:00Z",
    kid: "k/1",
    operator: "alice",
  };
  let client: PlatformClient;

  beforeEach(() => {
    client = new PlatformClient(
      "http://localhost:8085",
      "aud_admin_testkey",
      30_000,
      ORG_URL,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function call(spy: FetchMock): [string, RequestInit] {
    return spy.mock.calls[0] as [string, RequestInit];
  }

  it("listAdminKeys GETs /v1/platform/admin-keys with the platform token", async () => {
    const spy = mockFetchOkJson({ admin_keys: [KEY] });
    const res = await client.listAdminKeys();
    const [url, init] = call(spy);
    expect(url).toBe(`${ORG_URL}/v1/platform/admin-keys`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_admin_testkey",
    );
    expect(res.admin_keys).toEqual([KEY]);
  });

  it("addAdminKey POSTs the body and decodes 201", async () => {
    const spy = mockFetchOkJson({ admin_key: KEY }, 201);
    const req = { kid: "k/1", public_key_pem: "PEM", operator: "alice" };
    const res = await client.addAdminKey(req);
    const [url, init] = call(spy);
    expect(url).toBe(`${ORG_URL}/v1/platform/admin-keys`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(req);
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer aud_admin_testkey",
    );
    expect(res.admin_key.kid).toBe("k/1");
  });

  it("addAdminKey surfaces 409 as AudactError", async () => {
    mockFetchError({ error: { code: "conflict", message: "dup" } }, 409);
    await expect(
      client.addAdminKey({ kid: "k", public_key_pem: "P" }),
    ).rejects.toMatchObject({ name: "AudactError", status: 409 });
  });

  it("disableAdminKey POSTs to the escaped kid path", async () => {
    const spy = mockFetchOkJson({ admin_key: { ...KEY, active: false } });
    const res = await client.disableAdminKey("k/1");
    const [url, init] = call(spy);
    expect(url).toBe(`${ORG_URL}/v1/platform/admin-keys/k%2F1/disable`);
    expect(init.method).toBe("POST");
    expect(res.admin_key.active).toBe(false);
  });

  it("disableAdminKey surfaces 404 (unknown kid) as AudactError", async () => {
    mockFetchError({ error: { code: "not_found", message: "admin key not found" } }, 404);
    const err = await client.disableAdminKey("k").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AudactError);
    expect((err as AudactError).status).toBe(404);
  });

  it("disableAdminKey surfaces 409 (last active key) as AudactError", async () => {
    mockFetchError(
      { error: { code: "conflict", message: "cannot disable the last active admin key" } },
      409,
    );
    const err = await client.disableAdminKey("k").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AudactError);
    expect((err as AudactError).status).toBe(409);
  });

  it("disableAdminKey on an already-disabled key succeeds", async () => {
    mockFetchOkJson({ admin_key: { ...KEY, active: false } });
    const res = await client.disableAdminKey("k");
    expect(res.admin_key.active).toBe(false);
  });
});
