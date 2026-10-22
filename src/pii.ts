/**
 * Audact TypeScript SDK — PII vault
 *
 * Provides:
 *  - {@link normalizeIdentifier} / {@link clientHash}: the public identifier
 *    hashing contract, byte-identical to the server-side client hash (proved by
 *    the shared `testdata/pii_normalize_vectors.json`).
 *  - {@link PIIClient}: every PII route.
 *
 * Plaintext identifiers never leave the caller's process: hash them here with
 * {@link clientHash} and send only the hash.
 */

import { AudactError, BaseServiceClient } from "./base.js";
import { GO_LOWER_RUNS } from "./goLowerTable.js";
import type { PIIErasedKeysetsResponse } from "./types.js";

// ─── Identifier hashing ──────────────────────────────────────────────

/** Identifier types a tenant may hash and supply. (`call` is internal.) */
export type PIIIdentifierType = "name" | "email" | "phone";

/** A tenant-supplied identifier hash, as sent on call create. */
export interface PIIIdentifier {
  /** Identifier type. */
  type: PIIIdentifierType;
  /** `clientHash(type, value)`: lowercase hex SHA-256 of the normalised value. */
  hash: string;
}

const E164 = /^\+[1-9][0-9]{6,14}$/;
const PHONE_SEPARATORS = /[ \-.()]/g;
// Go's unicode.IsSpace set.
const GO_SPACE = /[\t\n\v\f\r \u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;
const GO_SPACE_G = new RegExp(GO_SPACE.source, "g");
const GO_TRIM = new RegExp(`^${GO_SPACE.source}|${GO_SPACE.source}$`, "g");

// Code point -> lowercase code point, exactly Go's unicode.ToLower.
const GO_LOWER: ReadonlyMap<number, number> = (() => {
  const m = new Map<number, number>();
  for (const [lo, hi, stride, delta] of GO_LOWER_RUNS) {
    for (let cp = lo; cp <= hi; cp += stride) m.set(cp, cp + delta);
  }
  return m;
})();

/**
 * Lowercases per code point exactly like Go's `strings.ToLower`. Not
 * `toLowerCase`: that applies SpecialCasing (`İ` → `i` + U+0307) and the JS
 * engine's Unicode version, either of which changes the bytes and the hash.
 */
function goLower(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    const lower = GO_LOWER.get(cp);
    out += lower === undefined ? ch : String.fromCodePoint(lower);
  }
  return out;
}

/**
 * Canonicalises an identifier. Throws on an unsupported type, an empty
 * value, or a phone that is not E.164 once separators are stripped. No country
 * code is ever guessed; names are NOT diacritic-stripped.
 */
export function normalizeIdentifier(type: string, value: string): string {
  switch (type) {
    case "phone": {
      const stripped = value.replace(PHONE_SEPARATORS, "");
      if (!E164.test(stripped)) {
        throw new Error("normalize phone: not E.164");
      }
      return stripped;
    }
    case "email": {
      const out = goLower(value.replace(GO_TRIM, "")).normalize("NFC");
      if (out === "") {
        throw new Error("normalize email: empty value");
      }
      return out;
    }
    case "name": {
      const out = goLower(value.replace(GO_TRIM, "").normalize("NFC"))
        .split(GO_SPACE_G)
        .filter((p) => p !== "")
        .join(" ");
      if (out === "") {
        throw new Error("normalize name: empty value");
      }
      return out;
    }
    default:
      throw new Error(`normalize identifier: unsupported type "${type}"`);
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  let subtle: SubtleCrypto | undefined = globalThis.crypto?.subtle;
  if (!subtle) {
    // Node 18 without a global `crypto`.
    const mod = "node:crypto";
    subtle = ((await import(mod)) as { webcrypto: Crypto }).webcrypto.subtle;
  }
  const digest = new Uint8Array(await subtle.digest("SHA-256", data));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns `hex(sha256(normalizeIdentifier(type, value)))`: the `client_hash`
 * to send as `identifier_hash` / `identifiers[].hash`. Never send or log the
 * plaintext value.
 */
export async function clientHash(type: string, value: string): Promise<string> {
  let normalized: string;
  try {
    normalized = normalizeIdentifier(type, value);
  } catch (err) {
    throw new Error(`client hash: ${(err as Error).message}`);
  }
  return sha256Hex(normalized);
}

// ─── Types ──────────────────────────────────────────────────────

/** Request body of POST /v1/pii/shred. */
export interface PIIShredRequest {
  /** `name`, `email` or `phone`. */
  identifier_type: PIIIdentifierType;
  /** `clientHash(type, value)`. */
  identifier_hash: string;
}

/** 202 response of the shred routes. */
export interface PIIShredResponse {
  shred_id: string;
  identities_shredded: number;
  calls_affected: number;
  shredded_at: string;
}

/** One identity linked to a call (no hash, lookup or value is ever returned). */
export interface PIICallIdentity {
  identity_id: string;
  type: "name" | "email" | "phone" | "call";
  /** How the identity relates to the call. */
  role: "subject" | "mentioned";
  /** How the identity was linked. */
  source: "call" | "pstn" | "call_init" | "api" | "detected";
  linked_at: string;
  shredded_at?: string | null;
}

/** Response of GET /v1/calls/{call_id}/pii/identities. */
export interface PIIListIdentitiesResponse {
  identities: PIICallIdentity[];
}

/** Request body of POST /v1/calls/{call_id}/pii/identities. */
export interface PIILinkIdentityRequest {
  identifier_type: PIIIdentifierType;
  identifier_hash: string;
}

/** 201 response of POST /v1/calls/{call_id}/pii/identities. */
export interface PIILinkIdentityResponse {
  identity_id: string;
}

/** Request body of POST /v1/calls/{call_id}/pii/shred. */
export interface PIICallShredRequest {
  /** Identities to shred. Omit to shred every identity of the call. */
  identity_ids?: string[];
}

/**
 * Request body of POST /v1/calls/{call_id}/pii/decrypt. Send `text` or
 * `texts` (≤ 200 items, ≤ 1 MiB).
 */
export interface PIIDecryptRequest {
  text?: string;
  texts?: string[];
}

/** Response of POST /v1/calls/{call_id}/pii/decrypt. */
export interface PIIDecryptResponse {
  text?: string;
  texts?: string[];
  /** Number of tokens decrypted. */
  decrypted: number;
  /** Number of tokens that were erased (shredded) and stay redacted. */
  erased: number;
}

/** One row of the erasure log (PII-free). */
export interface PIIShredRecord {
  shred_id: string;
  scope?: "identity" | "call" | "tenant";
  identity_type?: "name" | "email" | "phone" | "call";
  /** Set for call-scope erasures. */
  call_id?: string;
  identities_shredded?: number;
  calls_affected?: number;
  actor_key_id?: string;
  /** The org user who acted on the tenant's behalf, if any. */
  impersonator_id?: string;
  /** That user's organisation ("<org user> via <org>"). */
  impersonator_org_id?: string;
  shredded_at: string;
  [key: string]: unknown;
}

/** Options for GET /v1/pii/shreds. */
export interface PIIListShredsOptions {
  cursor?: string;
  limit?: number;
}

/** Response of GET /v1/pii/shreds. */
export interface PIIListShredsResponse {
  shreds: PIIShredRecord[];
  next_cursor?: string | null;
}

/** One entry of the encryption-switch history. */
export interface PIISettingsHistoryEntry {
  encryption_enabled: boolean;
  actor_key_id: string;
  impersonator_id?: string;
  /** The impersonating user's organisation. */
  impersonator_org_id?: string;
  configurations_resealed: number;
  changed_at: string;
}

/** Response of GET /v1/pii/settings (tenant-management). */
export interface PIISettingsResponse {
  encryption_enabled: boolean;
  changed_at: string;
  changed_by: string;
  history: PIISettingsHistoryEntry[];
}

/** Response of PUT /v1/pii/settings. */
export interface PIISettingsUpdateResponse extends PIISettingsResponse {
  configurations_resealed: number;
}

/** Body of PUT /v1/pii/settings. */
export interface PIISettingsPutRequest {
  /** true = encrypt PII spans on NEW calls; false = redact them on NEW calls. */
  encryption_enabled: boolean;
}

/** Exemption kinds. The server rejects `name`. */
export type PIIExemptType = "phone" | "email";

/** Body of POST/DELETE /v1/pii/exemptions. */
export interface PIIExemptionRequest {
  exempt_type: PIIExemptType;
  /** `clientHash(exempt_type, value)`. */
  identifier_hash: string;
}

/** One exemption; the value itself is never stored. */
export interface PIIExemption {
  exempt_type: PIIExemptType;
  /** First 8 hex chars of the lookup. */
  lookup_prefix: string;
  created_at: string;
}

/** Response of GET /v1/pii/exemptions. */
export interface PIIListExemptionsResponse {
  exemptions: PIIExemption[];
  auto_exempt_dids: number;
}

// ─── Clients ────────────────────────────────────────────────────────────────

/** PII encryption switch (Tenant Management, port 8085). */
export class PIISettingsClient extends BaseServiceClient {
  /** GET /v1/pii/settings. Any role may read. */
  async get(): Promise<PIISettingsResponse> {
    return this.request<PIISettingsResponse>("GET", "/v1/pii/settings");
  }

  /**
   * PUT /v1/pii/settings. Owner role only. `idempotencyKey`, when given, is
   * sent as `Idempotency-Key`.
   *
   * @throws {AudactError} 503 `pii_keyring_unavailable`, 500 `pii_reseal_failed`.
   */
  async update(
    encryptionEnabled: boolean,
    idempotencyKey?: string,
  ): Promise<PIISettingsUpdateResponse> {
    return this.request<PIISettingsUpdateResponse>(
      "PUT",
      "/v1/pii/settings",
      { encryption_enabled: encryptionEnabled },
      idemHeaders(idempotencyKey),
    );
  }
}

function idemHeaders(key?: string): Record<string, string> {
  return key ? { "Idempotency-Key": key } : {};
}

/**
 * PII vault API (Evidence Layer, port 8083). The tenant always comes from the
 * credential; a call that is not yours returns 404.
 */
export class PIIClient extends BaseServiceClient {
  /** Encryption switch (Tenant Management, port 8085). */
  public readonly settings: PIISettingsClient;

  constructor(
    baseUrl: string,
    apiKey: string,
    timeoutMs: number,
    tenantManagementUrl: string,
  ) {
    super(baseUrl, apiKey, timeoutMs);
    this.settings = new PIISettingsClient(tenantManagementUrl, apiKey, timeoutMs);
  }

  /**
   * POST /v1/pii/shred: erase an identity across all calls. Irreversible:
   * pass `idempotencyKey` (sent as `Idempotency-Key`) so a retry after a
   * timeout replays the original response instead of erasing again.
   */
  async shred(
    req: PIIShredRequest,
    idempotencyKey?: string,
  ): Promise<PIIShredResponse> {
    return this.request<PIIShredResponse>(
      "POST",
      "/v1/pii/shred",
      req,
      idemHeaders(idempotencyKey),
    );
  }

  /** GET /v1/calls/{call_id}/pii/identities. */
  async listCallIdentities(callId: string): Promise<PIIListIdentitiesResponse> {
    return this.request<PIIListIdentitiesResponse>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/pii/identities`,
    );
  }

  /**
   * Lists which of the given keysets have been crypto-erased for a call.
   * Calls GET /v1/calls/{call_id}/pii/erased-keysets (`keyset_id` repeated once per id).
   *
   * @param callId - UUID of the call.
   * @param keysetIds - Keyset ids to check; must be non-empty.
   * @throws {AudactError} status 0 if `keysetIds` is empty (no request is made), or on HTTP 4xx/5xx.
   */
  async listErasedKeysets(
    callId: string,
    keysetIds: string[],
  ): Promise<PIIErasedKeysetsResponse> {
    if (keysetIds.length === 0) {
      throw new AudactError("keysetIds must contain at least one keyset id", 0, null);
    }
    const params = new URLSearchParams();
    for (const id of keysetIds) params.append("keyset_id", id);
    return this.request<PIIErasedKeysetsResponse>(
      "GET",
      `/v1/calls/${encodeURIComponent(callId)}/pii/erased-keysets?${params.toString()}`,
    );
  }

  /** POST /v1/calls/{call_id}/pii/identities: link an identity after the call. */
  async linkCallIdentity(
    callId: string,
    req: PIILinkIdentityRequest,
  ): Promise<PIILinkIdentityResponse> {
    return this.request<PIILinkIdentityResponse>(
      "POST",
      `/v1/calls/${encodeURIComponent(callId)}/pii/identities`,
      req,
    );
  }

  /**
   * POST /v1/calls/{call_id}/pii/shred: erase listed identities (omitted = all).
   * Irreversible: pass `idempotencyKey` (sent as `Idempotency-Key`) to make
   * retries safe.
   */
  async shredCall(
    callId: string,
    req: PIICallShredRequest = {},
    idempotencyKey?: string,
  ): Promise<PIIShredResponse> {
    return this.request<PIIShredResponse>(
      "POST",
      `/v1/calls/${encodeURIComponent(callId)}/pii/shred`,
      req,
      idemHeaders(idempotencyKey),
    );
  }

  /**
   * POST /v1/calls/{call_id}/pii/decrypt: decrypt tokens in `text` / `texts`.
   *
   * Deliberately takes **no** idempotency key: an idempotency cache would
   * store the decrypted plaintext response server-side. Decrypt is read-only,
   * so a plain retry is already safe.
   */
  async decrypt(
    callId: string,
    req: PIIDecryptRequest,
  ): Promise<PIIDecryptResponse> {
    return this.request<PIIDecryptResponse>(
      "POST",
      `/v1/calls/${encodeURIComponent(callId)}/pii/decrypt`,
      req,
    );
  }

  /** GET /v1/pii/shreds: PII-free erasure log. */
  async listShreds(
    opts: PIIListShredsOptions = {},
  ): Promise<PIIListShredsResponse> {
    const q = new URLSearchParams();
    if (opts.cursor) q.set("cursor", opts.cursor);
    if (opts.limit !== undefined) q.set("limit", String(opts.limit));
    const qs = q.toString();
    return this.request<PIIListShredsResponse>(
      "GET",
      `/v1/pii/shreds${qs ? `?${qs}` : ""}`,
    );
  }

  /** GET /v1/pii/exemptions. */
  async listExemptions(): Promise<PIIListExemptionsResponse> {
    return this.request<PIIListExemptionsResponse>("GET", "/v1/pii/exemptions");
  }

  /** POST /v1/pii/exemptions. */
  async addExemption(req: PIIExemptionRequest): Promise<PIIExemption> {
    return this.request<PIIExemption>("POST", "/v1/pii/exemptions", req);
  }

  /** DELETE /v1/pii/exemptions. */
  /**
   * `DELETE /v1/pii/exemptions/{exempt_type}/{identifier_hash}`: the body-less path form,
   * because many proxies and HTTP clients drop DELETE bodies. The legacy body form
   * (`DELETE /v1/pii/exemptions`) remains on the server.
   */
  async deleteExemption(req: PIIExemptionRequest): Promise<void> {
    await this.request<unknown>(
      "DELETE",
      `/v1/pii/exemptions/${encodeURIComponent(req.exempt_type)}/${encodeURIComponent(req.identifier_hash)}`,
    );
  }
}
