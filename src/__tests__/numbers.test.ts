/**
 * Audact TypeScript SDK — NumbersClient test suite
 *
 * Covers the KYC document/set + number-provisioning surface, including the
 * `FormData` (multipart) transport branch in the base client.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts.
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

import { AudactClient, AudactError, NumbersClient, LOCAL_SERVICE_URLS } from "../client.js";

import type {
  KYCDocument,
  KYCDocumentSet,
  ListAvailableNumbersResponse,
  ListKYCDocumentSetsResponse,
  ListKYCDocumentsResponse,
  ListKYCRequirementsResponse,
  ListNumberOrdersResponse,
  ListNumbersResponse,
  NumberOrder,
  PhoneNumber,
  RotateKycDekResponse,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const DOC_ID = "66666666-6666-6666-6666-666666666666";
const SET_ID = "77777777-7777-7777-7777-777777777777";
const ORDER_ID = "88888888-8888-8888-8888-888888888888";

const KYC_DOCUMENT: KYCDocument = {
  id: DOC_ID,
  doc_type: "passport",
  filename: "passport.pdf",
  content_type: "application/pdf",
  size_bytes: 1024,
  sha256: "deadbeef".repeat(8),
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
};

const KYC_DOCUMENT_SET: KYCDocumentSet = {
  id: SET_ID,
  name: "NL mobile KYC",
  country_code: "NL",
  number_type: "mobile",
  action: "requirement_group",
  status: "draft",
  items: [
    {
      requirement_id: "req-1",
      requirement_type: "document",
      document_id: DOC_ID,
    },
  ],
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
};

const NUMBER_ID = "99999999-9999-9999-9999-999999999999";

const PHONE_NUMBER: PhoneNumber = {
  id: NUMBER_ID,
  did: "+31201234567",
  country_code: "NL",
  status: "available",
  trunk_provider: "telnyx",
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
};

const NUMBER_ORDER: NumberOrder = {
  id: ORDER_ID,
  country_code: "NL",
  number_type: "mobile",
  set_id: SET_ID,
  phone_number: "+31612345678",
  status: "pending",
  created_at: "2026-03-13T10:00:00Z",
  updated_at: "2026-03-13T10:00:00Z",
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

describe("NumbersClient", () => {
  let client: NumbersClient;

  beforeEach(() => {
    client = new NumbersClient("http://localhost:8088", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── KYC documents ────────────────────────────────────────────────────────

  describe("listKycDocuments()", () => {
    it("calls GET /v1/kyc/documents and returns ListKYCDocumentsResponse", async () => {
      const response: ListKYCDocumentsResponse = { documents: [KYC_DOCUMENT] };
      const spy = mockFetchOk(response);

      const result = await client.listKycDocuments();

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]?.id).toBe(DOC_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/kyc/documents");
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError({ error: "UNAUTHORIZED", message: "auth required" }, 401);

      await expect(client.listKycDocuments()).rejects.toMatchObject({
        status: 401,
        message: "auth required",
      });
      await expect(client.listKycDocuments()).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });

  describe("getKycDocument()", () => {
    it("calls GET /v1/kyc/documents/:id", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT);

      const result = await client.getKycDocument(DOC_ID);

      expect(result.id).toBe(DOC_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/kyc/documents/${DOC_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "document not found" }, 404);

      await expect(client.getKycDocument("nonexistent")).rejects.toMatchObject(
        { status: 404 },
      );
    });
  });

  describe("uploadKycDocument()", () => {
    it("calls POST /v1/kyc/documents with a FormData body and no Content-Type header", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT, 201);
      const file = new Blob(["%PDF-1.4 fake bytes"], {
        type: "application/pdf",
      });

      const result = await client.uploadKycDocument(file, "passport", {
        filename: "passport.pdf",
      });

      expect(result.id).toBe(DOC_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/kyc/documents");
      expect(init.method).toBe("POST");

      // Positive control: the body IS a FormData instance...
      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      expect(form.get("doc_type")).toBe("passport");
      const filePart = form.get("file");
      expect(filePart).toBeInstanceOf(Blob);

      // ...and no `Content-Type` header was set at all — critically, not
      // `application/json` — so fetch can compute its own
      // `multipart/form-data; boundary=...` value. This guards the base.ts
      // FormData branch: a regression here would corrupt every upload.
      // (`Accept: application/json` is expected and fine — only Content-Type
      // must be absent, so we check the key explicitly rather than the
      // header object's stringified form.)
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      expect(Object.keys(headers)).not.toContain("Content-Type");
      expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT, 201);
      const file = new Blob(["bytes"], { type: "application/pdf" });

      await client.uploadKycDocument(file, "passport", {
        idempotencyKey: "idem-key-abc",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-abc");
      expect(headers["Content-Type"]).toBeUndefined();
    });

    it("throws AudactError on HTTP 400 (invalid doc_type)", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "doc_type is required" },
        400,
      );
      const file = new Blob(["bytes"], { type: "application/pdf" });

      await expect(
        client.uploadKycDocument(file, "", {}),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("replaceKycDocument()", () => {
    it("calls PUT /v1/kyc/documents/:id with a FormData body and no Content-Type header", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT);
      const file = new Blob(["replacement bytes"], {
        type: "application/pdf",
      });

      const result = await client.replaceKycDocument(DOC_ID, file, {
        filename: "passport-v2.pdf",
      });

      expect(result.id).toBe(DOC_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/kyc/documents/${DOC_ID}`);
      expect(init.method).toBe("PUT");

      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      expect(form.get("file")).toBeInstanceOf(Blob);

      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      expect(Object.keys(headers)).not.toContain("Content-Type");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT);
      const file = new Blob(["bytes"], { type: "application/pdf" });

      await client.replaceKycDocument(DOC_ID, file, {
        idempotencyKey: "idem-key-xyz",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-xyz");
    });

    it("throws AudactError on HTTP 409 (in-flight order)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "document backs an in-flight order" },
        409,
      );
      const file = new Blob(["bytes"], { type: "application/pdf" });

      await expect(
        client.replaceKycDocument(DOC_ID, file),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("deleteKycDocument()", () => {
    it("calls DELETE /v1/kyc/documents/:id", async () => {
      const spy = mockFetchNoContent();

      await client.deleteKycDocument(DOC_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/kyc/documents/${DOC_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 409 (referenced by a document set)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "document referenced by a set" },
        409,
      );

      await expect(client.deleteKycDocument(DOC_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  // ── KYC requirements ─────────────────────────────────────────────────────

  describe("getKycRequirements()", () => {
    it("calls GET /v1/kyc/requirements with country and number_type query params", async () => {
      const response: ListKYCRequirementsResponse = {
        requirements: [
          {
            id: "req-1",
            requirement_type: "document",
            name: "Proof of address",
            required: true,
          },
        ],
      };
      const spy = mockFetchOk(response);

      const result = await client.getKycRequirements("NL", "mobile");

      expect(result.requirements).toHaveLength(1);
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8088/v1/kyc/requirements?country=NL&number_type=mobile",
      );
    });

    it("throws AudactError on HTTP 502 (Telnyx fetch failure)", async () => {
      mockFetchError({ error: "BAD_GATEWAY", message: "telnyx unavailable" }, 502);

      await expect(
        client.getKycRequirements("NL", "mobile"),
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  // ── KYC document sets ────────────────────────────────────────────────────

  describe("listKycDocumentSets()", () => {
    it("calls GET /v1/kyc/document-sets", async () => {
      const response: ListKYCDocumentSetsResponse = {
        document_sets: [KYC_DOCUMENT_SET],
      };
      const spy = mockFetchOk(response);

      const result = await client.listKycDocumentSets();

      expect(result.document_sets).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/kyc/document-sets");
      expect(init.method).toBe("GET");
    });
  });

  describe("createKycDocumentSet()", () => {
    it("calls POST /v1/kyc/document-sets", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT_SET, 201);

      const result = await client.createKycDocumentSet({
        name: "NL mobile KYC",
        country_code: "NL",
        number_type: "mobile",
        items: [{ requirement_id: "req-1", document_id: DOC_ID }],
      });

      expect(result.id).toBe(SET_ID);
      expect(result.status).toBe("draft");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/kyc/document-sets");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["country_code"]).toBe("NL");
    });

    it("throws AudactError on HTTP 422 (incomplete coverage)", async () => {
      mockFetchError(
        {
          error: "UNPROCESSABLE_ENTITY",
          message: "incomplete requirement coverage",
          details: { missing: ["req-2"] },
        },
        422,
      );

      await expect(
        client.createKycDocumentSet({
          name: "Incomplete",
          country_code: "NL",
          number_type: "mobile",
          items: [],
        }),
      ).rejects.toMatchObject({
        status: 422,
        body: { details: { missing: ["req-2"] } },
      });
    });
  });

  describe("deleteKycDocumentSet()", () => {
    it("calls DELETE /v1/kyc/document-sets/:id", async () => {
      const spy = mockFetchNoContent();

      await client.deleteKycDocumentSet(SET_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/kyc/document-sets/${SET_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "set not found" }, 404);

      await expect(
        client.deleteKycDocumentSet("nonexistent"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── DEK rotation ──────────────────────────────────────────────────────────

  describe("rotateKycDek()", () => {
    it("calls POST /v1/kyc/dek/rotate and returns the new version", async () => {
      const response: RotateKycDekResponse = { new_version: 2 };
      const spy = mockFetchOk(response);

      const result = await client.rotateKycDek();

      expect(result.new_version).toBe(2);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/kyc/dek/rotate");
      expect(init.method).toBe("POST");
    });
  });

  // ── Number provisioning ───────────────────────────────────────────────────

  describe("listAvailableNumbers()", () => {
    it("calls GET /v1/numbers/available with country and number_type query params", async () => {
      const response: ListAvailableNumbersResponse = {
        numbers: [
          {
            phone_number: "+31612345678",
            phone_number_type: "mobile",
            country_code: "NL",
          },
        ],
      };
      const spy = mockFetchOk(response);

      const result = await client.listAvailableNumbers("NL", "mobile");

      expect(result.numbers).toHaveLength(1);
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8088/v1/numbers/available?country=NL&number_type=mobile",
      );
    });

    it("returns an explicit empty list when Telnyx has no matching inventory", async () => {
      mockFetchOk({ numbers: [] });

      const result = await client.listAvailableNumbers("NL", "toll_free");

      expect(result.numbers).toEqual([]);
    });

    it("throws AudactError on HTTP 400 (unsupported number_type)", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "unsupported number_type" },
        400,
      );

      await expect(
        client.listAvailableNumbers("NL", "bogus"),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("createNumberOrder()", () => {
    it("calls POST /v1/numbers/orders", async () => {
      const spy = mockFetchOk(NUMBER_ORDER, 201);

      const result = await client.createNumberOrder({
        country_code: "NL",
        number_type: "mobile",
        set_id: SET_ID,
      });

      expect(result.id).toBe(ORDER_ID);
      expect(result.status).toBe("pending");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/numbers/orders");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["set_id"]).toBe(SET_ID);
    });

    it("throws AudactError on HTTP 422 (set not approved)", async () => {
      mockFetchError(
        { error: "UNPROCESSABLE_ENTITY", message: "set is not approved" },
        422,
      );

      await expect(
        client.createNumberOrder({
          country_code: "NL",
          number_type: "mobile",
          set_id: SET_ID,
        }),
      ).rejects.toMatchObject({ status: 422 });
    });

    it("throws AudactError on HTTP 502 (Telnyx order placement failure)", async () => {
      mockFetchError(
        { error: "BAD_GATEWAY", message: "telnyx order failed" },
        502,
      );

      await expect(
        client.createNumberOrder({
          country_code: "NL",
          number_type: "mobile",
          set_id: SET_ID,
        }),
      ).rejects.toMatchObject({ status: 502 });
    });
  });

  describe("listNumberOrders()", () => {
    it("calls GET /v1/numbers/orders", async () => {
      const response: ListNumberOrdersResponse = { orders: [NUMBER_ORDER] };
      const spy = mockFetchOk(response);

      const result = await client.listNumberOrders();

      expect(result.orders).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/numbers/orders");
      expect(init.method).toBe("GET");
    });
  });

  describe("getNumberOrder()", () => {
    it("calls GET /v1/numbers/orders/:id", async () => {
      const spy = mockFetchOk(NUMBER_ORDER);

      const result = await client.getNumberOrder(ORDER_ID);

      expect(result.id).toBe(ORDER_ID);
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(`http://localhost:8088/v1/numbers/orders/${ORDER_ID}`);
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "order not found" }, 404);

      await expect(client.getNumberOrder("nonexistent")).rejects.toMatchObject(
        { status: 404 },
      );
    });
  });

  // ── DID phone number lifecycle ───────────────────────────────────────────

  describe("listNumbers()", () => {
    it("calls GET /v1/numbers with no query params by default", async () => {
      const response: ListNumbersResponse = {
        numbers: [PHONE_NUMBER],
        total_count: 1,
      };
      const spy = mockFetchOk(response);

      const result = await client.listNumbers();

      expect(result.numbers).toHaveLength(1);
      expect(result.numbers[0]?.id).toBe(NUMBER_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/numbers");
      expect(init.method).toBe("GET");
    });

    it("applies country/status/cursor/limit query params", async () => {
      const spy = mockFetchOk({ numbers: [] });

      await client.listNumbers({
        country: "NL",
        status: "assigned",
        cursor: "cursor-abc",
        limit: 25,
      });

      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8088/v1/numbers?country=NL&status=assigned&limit=25&cursor=cursor-abc",
      );
    });

    it("throws AudactError on HTTP 400 (bad limit/cursor)", async () => {
      mockFetchError({ error: "INVALID_REQUEST", message: "bad limit" }, 400);

      await expect(client.listNumbers({ limit: -1 })).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe("createNumber()", () => {
    it("calls POST /v1/numbers with the DID payload", async () => {
      const spy = mockFetchOk(PHONE_NUMBER, 201);

      const result = await client.createNumber({
        did: "+31201234567",
        country_code: "NL",
      });

      expect(result.id).toBe(NUMBER_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8088/v1/numbers");
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["did"]).toBe("+31201234567");
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchOk(PHONE_NUMBER, 201);

      await client.createNumber(
        { did: "+31201234567", country_code: "NL" },
        "idem-key-numbers",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-numbers");
    });

    it("throws AudactError on HTTP 409 (DID already exists)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "phone number already exists" },
        409,
      );

      await expect(
        client.createNumber({ did: "+31201234567", country_code: "NL" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("lookupNumber()", () => {
    it("calls GET /v1/numbers/lookup with the did query param", async () => {
      const spy = mockFetchOk(PHONE_NUMBER);

      const result = await client.lookupNumber("+31201234567");

      expect(result.id).toBe(NUMBER_ID);
      const [url] = spy.mock.calls[0] as [string];
      expect(url).toBe(
        "http://localhost:8088/v1/numbers/lookup?did=%2B31201234567",
      );
    });

    it("throws AudactError on HTTP 404 (DID not found for tenant)", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "DID not found" }, 404);

      await expect(
        client.lookupNumber("+10000000000"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("deleteNumber()", () => {
    it("calls DELETE /v1/numbers/:id", async () => {
      const spy = mockFetchNoContent();

      await client.deleteNumber(NUMBER_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8088/v1/numbers/${NUMBER_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 409 (still assigned)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "still assigned" },
        409,
      );

      await expect(client.deleteNumber(NUMBER_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("assignNumber()", () => {
    it("calls POST /v1/numbers/:id/assign with the agent_id body and resolves on 204", async () => {
      const spy = mockFetchNoContent(204);

      await client.assignNumber(NUMBER_ID, { agent_id: "agent-1" });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/numbers/${NUMBER_ID}/assign`,
      );
      expect(init.method).toBe("POST");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["agent_id"]).toBe("agent-1");
    });

    it("resolves without throwing on a body-less 200 idempotent replay", async () => {
      mockFetchNoContent(200);

      await expect(
        client.assignNumber(
          NUMBER_ID,
          { agent_id: "agent-1" },
          "idem-key-assign",
        ),
      ).resolves.toBeUndefined();
    });

    it("adds Idempotency-Key header when provided", async () => {
      const spy = mockFetchNoContent(204);

      await client.assignNumber(
        NUMBER_ID,
        { agent_id: "agent-1" },
        "idem-key-assign",
      );

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Idempotency-Key"]).toBe("idem-key-assign");
    });

    it("throws AudactError on HTTP 409 (already assigned)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "already assigned" },
        409,
      );

      await expect(
        client.assignNumber(NUMBER_ID, { agent_id: "agent-1" }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("suspendNumber()", () => {
    it("calls POST /v1/numbers/:id/suspend and resolves on 204", async () => {
      const spy = mockFetchNoContent(204);

      await client.suspendNumber(NUMBER_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/numbers/${NUMBER_ID}/suspend`,
      );
      expect(init.method).toBe("POST");
    });

    it("resolves without throwing on a body-less 200 idempotent replay", async () => {
      mockFetchNoContent(200);

      await expect(
        client.suspendNumber(NUMBER_ID, "idem-key-suspend"),
      ).resolves.toBeUndefined();
    });

    it("throws AudactError on HTTP 409 (not currently assigned)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "not currently assigned" },
        409,
      );

      await expect(client.suspendNumber(NUMBER_ID)).rejects.toMatchObject({
        status: 409,
      });
    });

    it("throws AudactError on HTTP 502 (routing teardown failure)", async () => {
      mockFetchError(
        { error: "BAD_GATEWAY", message: "routing teardown failed" },
        502,
      );

      await expect(client.suspendNumber(NUMBER_ID)).rejects.toMatchObject({
        status: 502,
      });
    });
  });

  describe("resumeNumber()", () => {
    it("calls POST /v1/numbers/:id/resume and resolves on 204", async () => {
      const spy = mockFetchNoContent(204);

      await client.resumeNumber(NUMBER_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/numbers/${NUMBER_ID}/resume`,
      );
      expect(init.method).toBe("POST");
    });

    it("resolves without throwing on a body-less 200 idempotent replay", async () => {
      mockFetchNoContent(200);

      await expect(
        client.resumeNumber(NUMBER_ID, "idem-key-resume"),
      ).resolves.toBeUndefined();
    });

    it("throws AudactError on HTTP 409 (not currently suspended)", async () => {
      mockFetchError(
        { error: "CONFLICT", message: "not currently suspended" },
        409,
      );

      await expect(client.resumeNumber(NUMBER_ID)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe("releaseNumber()", () => {
    it("calls DELETE /v1/numbers/:id/release and resolves on 204", async () => {
      const spy = mockFetchNoContent(204);

      await client.releaseNumber(NUMBER_ID);

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/numbers/${NUMBER_ID}/release`,
      );
      expect(init.method).toBe("DELETE");
    });

    it("resolves without throwing on a body-less 200 idempotent replay", async () => {
      mockFetchNoContent(200);

      await expect(
        client.releaseNumber(NUMBER_ID, "idem-key-release"),
      ).resolves.toBeUndefined();
    });

    it("throws AudactError on HTTP 502 (routing teardown failure)", async () => {
      mockFetchError(
        { error: "BAD_GATEWAY", message: "routing teardown failed" },
        502,
      );

      await expect(client.releaseNumber(NUMBER_ID)).rejects.toMatchObject({
        status: 502,
      });
    });
  });

  describe("setNumberTrunk()", () => {
    it("calls PUT /v1/numbers/:id/trunk with the trunk_id body", async () => {
      const spy = mockFetchOk({ ...PHONE_NUMBER, trunk_id: "ST_abc123" });

      const result = await client.setNumberTrunk(NUMBER_ID, {
        trunk_id: "ST_abc123",
      });

      expect(result.trunk_id).toBe("ST_abc123");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/numbers/${NUMBER_ID}/trunk`,
      );
      expect(init.method).toBe("PUT");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body["trunk_id"]).toBe("ST_abc123");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "number not found" }, 404);

      await expect(
        client.setNumberTrunk(NUMBER_ID, { trunk_id: "ST_abc123" }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("getKycDocumentSet()", () => {
    it("calls GET /v1/kyc/document-sets/:id", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT_SET);

      const result = await client.getKycDocumentSet(SET_ID);

      expect(result.id).toBe(SET_ID);
      expect(result.items).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8088/v1/kyc/document-sets/${SET_ID}`,
      );
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404 (not 403, to prevent enumeration)", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "set not found" }, 404);

      await expect(
        client.getKycDocumentSet("nonexistent"),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── No tenant_id anywhere (SEC-027) ──────────────────────────────────────

  describe("SEC-027 (no tenant_id argument)", () => {
    it("never sends a tenant_id in query params or JSON bodies", async () => {
      const spy = mockFetchOk(KYC_DOCUMENT_SET, 201);

      await client.createKycDocumentSet({
        name: "NL mobile KYC",
        country_code: "NL",
        number_type: "mobile",
        items: [{ requirement_id: "req-1", document_id: DOC_ID }],
      });

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain("tenant_id");
      expect(init.body as string).not.toContain("tenant_id");
    });
  });
});

// ─── AudactClient wiring ───────────────────────────────────────────────────────

describe("AudactClient numbers wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes client.numbers as a NumbersClient instance", () => {
    const client = new AudactClient({ apiKey: API_KEY });
    expect(client.numbers).toBeInstanceOf(NumbersClient);
  });

  it("wires client.numbers to the voice-gateway base URL (port 8088)", async () => {
    const client = new AudactClient({ apiKey: API_KEY, serviceUrls: LOCAL_SERVICE_URLS });
    const spy = mockFetchOk({ documents: [] });

    await client.numbers.listKycDocuments();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("http://localhost:8088/v1/kyc/documents");
  });

  it("honors a serviceUrls.voiceGateway override", async () => {
    const client = new AudactClient({
      apiKey: API_KEY,
      serviceUrls: { voiceGateway: "https://voice-gateway.example.com" },
    });
    const spy = mockFetchOk({ documents: [] });

    await client.numbers.listKycDocuments();

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("https://voice-gateway.example.com/v1/kyc/documents");
  });

  it("sends the Bearer token on client.numbers requests", async () => {
    const client = new AudactClient({ apiKey: API_KEY });
    const spy = mockFetchOk({ documents: [] });

    await client.numbers.listKycDocuments();

    const [, init] = spy.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe(
      `Bearer ${API_KEY}`,
    );
  });
});
