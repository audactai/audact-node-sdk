/**
 * PII vault: clientHash/normalize vectors, routes, identifiers.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { AudactClient, AudactError } from "../client.js";
import { clientHash, normalizeIdentifier } from "../pii.js";
import type { BrowserCallRequest, OutboundCallRequest } from "../types.js";

interface Vector {
  type: string;
  input: string;
  normalized?: string;
  client_hash?: string;
  error?: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const vectors: Vector[] = JSON.parse(
  readFileSync(resolve(here, "../../testdata/pii_normalize_vectors.json"), "utf8"),
);

async function check(v: Vector): Promise<void> {
  if (v.error) {
    expect(() => normalizeIdentifier(v.type, v.input)).toThrow();
    await expect(clientHash(v.type, v.input)).rejects.toThrow();
    return;
  }
  expect(normalizeIdentifier(v.type, v.input)).toBe(v.normalized);
  expect(await clientHash(v.type, v.input)).toBe(v.client_hash);
}

describe("shared normalize vectors", () => {
  it("file is non-empty", () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors.map((v, i) => [i, v.type, JSON.stringify(v.input), v] as const))(
    "vector %i %s %s",
    async (_i, _t, _in, v) => {
      await check(v);
    },
  );

  it("positive control: a mutated vector fails", async () => {
    const good = vectors.find((v) => !v.error)!;
    const mutatedHash = { ...good, client_hash: "0" + good.client_hash!.slice(1) };
    await expect(check(mutatedHash)).rejects.toThrow();
    const mutatedNorm = { ...good, normalized: good.normalized + "x" };
    await expect(check(mutatedNorm)).rejects.toThrow();
    const bad = vectors.find((v) => v.error)!;
    await expect(check({ ...bad, error: false, normalized: "x", client_hash: "y" })).rejects.toThrow();
  });
});

describe("normalizeIdentifier edge cases", () => {
  it.each([
    ["name", "ΟΔΥΣΣΕΥΣ", "οδυσσευσ"], // no final-sigma context, as in Go
    ["name", "İstanbul", "istanbul"],
    ["name", "é", "é"], // NFC
    ["email", "A@B.C", "a@b.c"],
    ["email", "İlker@Example.com.tr", "ilker@example.com.tr"],
    // Unicode 16 letter, absent from Go 1.25's Unicode 15 tables: unchanged.
    ["name", "\u{10D50}", "\u{10D50}"],
  ])("%s %j", (type, input, want) => {
    expect(normalizeIdentifier(type, input)).toBe(want);
  });

  it("rejects unsupported type", () => {
    expect(() => normalizeIdentifier("call", "x")).toThrow(/unsupported/);
    expect(() => normalizeIdentifier("email", "  ")).toThrow(/empty/);
  });
});

describe("PIIClient routes", () => {
  let spy: MockInstance;
  beforeEach(() => {
    spy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({}), { status: 200 }),
    );
  });
  afterEach(() => spy.mockRestore());

  const CALL = "11111111-1111-1111-1111-111111111111";
  const H = "a".repeat(64);
  const client = new AudactClient({
    apiKey: "k",
    serviceUrls: { evidence: "http://ev", tenantManagement: "http://tm" },
  });

  const cases: [string, () => Promise<unknown>, string, string, unknown?][] = [
    ["shred", () => client.pii.shred({ identifier_type: "phone", identifier_hash: H }, "idem"), "POST", "http://ev/v1/pii/shred", { identifier_type: "phone", identifier_hash: H }],
    ["listCallIdentities", () => client.pii.listCallIdentities(CALL), "GET", `http://ev/v1/calls/${CALL}/pii/identities`],
    ["linkCallIdentity", () => client.pii.linkCallIdentity(CALL, { identifier_type: "email", identifier_hash: H }), "POST", `http://ev/v1/calls/${CALL}/pii/identities`, { identifier_type: "email", identifier_hash: H }],
    ["shredCall", () => client.pii.shredCall(CALL, { identity_ids: ["i1"] }), "POST", `http://ev/v1/calls/${CALL}/pii/shred`, { identity_ids: ["i1"] }],
    ["shredCall all", () => client.pii.shredCall(CALL), "POST", `http://ev/v1/calls/${CALL}/pii/shred`, {}],
    ["decrypt", () => client.pii.decrypt(CALL, { texts: ["a"] }), "POST", `http://ev/v1/calls/${CALL}/pii/decrypt`, { texts: ["a"] }],
    ["listShreds", () => client.pii.listShreds({ cursor: "c", limit: 5 }), "GET", "http://ev/v1/pii/shreds?cursor=c&limit=5"],
    ["listShreds bare", () => client.pii.listShreds(), "GET", "http://ev/v1/pii/shreds"],
    ["settings.get", () => client.pii.settings.get(), "GET", "http://tm/v1/pii/settings"],
    ["settings.update", () => client.pii.settings.update(true, "k1"), "PUT", "http://tm/v1/pii/settings", { encryption_enabled: true }],
    ["listExemptions", () => client.pii.listExemptions(), "GET", "http://ev/v1/pii/exemptions"],
    ["addExemption", () => client.pii.addExemption({ exempt_type: "phone", identifier_hash: H }), "POST", "http://ev/v1/pii/exemptions", { exempt_type: "phone", identifier_hash: H }],
    ["deleteExemption", () => client.pii.deleteExemption({ exempt_type: "phone", identifier_hash: H }), "DELETE", `http://ev/v1/pii/exemptions/phone/${H}`],
  ];

  it.each(cases)("%s", async (_n, call, method, url, body) => {
    await call();
    const [gotUrl, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(gotUrl).toBe(url);
    expect(init.method).toBe(method);
    if (body === undefined) expect(init.body).toBeUndefined();
    else expect(JSON.parse(init.body as string)).toEqual(body);
  });

  const idemKey = (i: number): string | undefined =>
    ((spy.mock.calls[i]![1] as RequestInit).headers as Record<string, string>)["Idempotency-Key"];

  it("sends Idempotency-Key", async () => {
    await client.pii.shred({ identifier_type: "name", identifier_hash: H }, "idem-1");
    expect(idemKey(0)).toBe("idem-1");
  });

  it("sends Idempotency-Key on shredCall and settings.update, only when given", async () => {
    await client.pii.shredCall(CALL, {}, "idem-call-1");
    await client.pii.shredCall(CALL);
    await client.pii.settings.update(false, "idem-put-1");
    await client.pii.settings.update(false);
    await client.pii.shred({ identifier_type: "name", identifier_hash: H });
    expect(idemKey(0)).toBe("idem-call-1");
    expect(idemKey(1)).toBeUndefined();
    expect(idemKey(2)).toBe("idem-put-1");
    expect(idemKey(3)).toBeUndefined();
    expect(idemKey(4)).toBeUndefined();
  });

  it("never sends Idempotency-Key on decrypt", async () => {
    await client.pii.decrypt(CALL, { text: "x" });
    expect(idemKey(0)).toBeUndefined();
  });
});

describe("identifiers on call create types", () => {
  it("compiles on outbound and browser requests", async () => {
    const hash = await clientHash("phone", "+31612345678");
    const ids = [{ type: "phone" as const, hash }];
    const out: OutboundCallRequest = { destination_number: "+31", from_number: "+31", identifiers: ids };
    const br: BrowserCallRequest = { agent_id: "a", identifiers: ids };
    expect(out.identifiers).toHaveLength(1);
    expect(br.identifiers?.[0]?.hash).toBe(hash);
  });
});

describe("PIIClient.listErasedKeysets", () => {
  let spy: MockInstance;
  beforeEach(() => {
    spy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ erased_keyset_ids: ["a"] }), { status: 200 }),
    );
  });
  afterEach(() => spy.mockRestore());

  const client = new AudactClient({
    apiKey: "k_api",
    serviceUrls: { evidence: "http://ev" },
  });
  const CALL = "11111111-1111-1111-1111-111111111111";

  it("repeats keyset_id, uses API key auth and decodes", async () => {
    const res = await client.pii.listErasedKeysets(CALL, ["a", "b"]);
    expect(res).toEqual({ erased_keyset_ids: ["a"] });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`http://ev/v1/calls/${CALL}/pii/erased-keysets?keyset_id=a&keyset_id=b`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer k_api");
  });

  it("encodes ids containing a slash", async () => {
    await client.pii.listErasedKeysets(CALL, ["x/y"]);
    expect((spy.mock.calls[0] as [string])[0]).toContain("keyset_id=x%2Fy");
  });

  it("throws AudactError(status 0) on empty list without fetching", async () => {
    await expect(client.pii.listErasedKeysets(CALL, [])).rejects.toMatchObject({
      status: 0,
    });
    await expect(client.pii.listErasedKeysets(CALL, [])).rejects.toBeInstanceOf(AudactError);
    expect(spy).not.toHaveBeenCalled();
  });
});
