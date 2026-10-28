/**
 * Wire-types test: runs real-server JSON fixtures (testdata/wire) through the
 * client and asserts the runtime shapes match the declared TypeScript types.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

import { EvidenceClient, PolicyClient } from "../client.js";

const API_KEY = "aud_live_test1234567890abcdef";
const CALL_ID = "22222222-2222-4222-8222-222222222222";
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "testdata", "wire");

function fixture(name: string): string {
  return readFileSync(join(DIR, name), "utf8");
}

describe("wire fixtures through the client", () => {
  let fetchSpy: MockInstance;

  function serve(name: string): void {
    fetchSpy.mockResolvedValueOnce(
      new Response(fixture(name), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("EvidenceClient", () => {
    const client = new EvidenceClient("http://localhost:8083", API_KEY, 30_000);

    it("listCalls: metadata is an object", async () => {
      serve("calls_list.json");
      const res = await client.listCalls();
      expect(res.calls.length).toBeGreaterThan(0);
      for (const rec of res.calls) {
        expect(typeof rec.metadata).toBe("object");
      }
      const withCountry = res.calls.find((c) => c.metadata?.country === "DE");
      expect(withCountry).toBeDefined();
    });

    it("getCallDetail: metadata is an object with country DE", async () => {
      serve("call_detail.json");
      const rec = await client.getCallDetail(CALL_ID);
      expect(typeof rec.metadata).toBe("object");
      expect(rec.metadata?.country).toBe("DE");
      // @ts-expect-error metadata is an object, not a JSON string
      const _mustNotBeString: string = rec.metadata;
      void _mustNotBeString;
    });

    it("reconstruct: decodes the chain summary", async () => {
      serve("reconstruct.json");
      const res = await client.reconstruct(CALL_ID);
      expect(res.call_id).toBe(CALL_ID);
      expect(res.chain_status).toBe("VALID");
    });

    it("listViolations: data is a non-null object", async () => {
      serve("violations.json");
      const res = await client.listViolations();
      expect(res.violations.length).toBeGreaterThan(0);
      for (const v of res.violations) {
        expect(v.data).not.toBeNull();
        expect(typeof v.data).toBe("object");
      }
    });
  });

  describe("PolicyClient", () => {
    const client = new PolicyClient("http://localhost:8081", API_KEY, 30_000);

    it("getPolicy(DE): condition values cover string, boolean, number, array", async () => {
      serve("policy_de.json");
      const res = await client.getPolicy("DE");
      const values = res.use_cases.flatMap((u) => u.conditions.map((c) => c.value));
      const kinds = new Set(values.map((v) => typeof v));
      expect(kinds.has("string")).toBe(true);
      expect(kinds.has("boolean")).toBe(true);
      expect(kinds.has("number")).toBe(true);
      expect(values.some((v) => Array.isArray(v))).toBe(true);
    });
  });
});

describe("compile-time guard", () => {
  // tsconfig.json excludes src/__tests__, so `npm run typecheck` does not see
  // the @ts-expect-error above. Typecheck this file here so an unused
  // directive (metadata typed as a string again) fails the suite.
  it("this file typechecks: the @ts-expect-error directive is used", () => {
    const file = fileURLToPath(import.meta.url);
    const root = join(dirname(file), "..", "..");
    const cfg = ts.readConfigFile(join(root, "tsconfig.json"), ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
    const program = ts.createProgram([file], { ...parsed.options, noEmit: true });
    const diags = ts
      .getPreEmitDiagnostics(program)
      // node:* typings are not installed; only the SDK types matter here.
      .filter((d) => d.code !== 2307)
      .map((d) => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, "\n");
      return `${d.file?.fileName ?? ""}: ${msg}`;
    });
    expect(diags).toEqual([]);
  });
});
