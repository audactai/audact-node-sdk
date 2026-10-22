/**
 * Audact TypeScript SDK — Type definitions test suite (M4-021)
 *
 * Validates that all exported type definitions are structurally correct,
 * that discriminated unions narrow as expected, and that every interface
 * can be constructed with valid data without TypeScript errors.
 *
 * These tests act as compile-time guardrails (type-level assertions via
 * assignment) as well as runtime structural checks.
 */

import { describe, expect, it } from "vitest";

import {
  deserializeConfigurationResponse,
  serializeConfigurationRequest,
} from "../types.js";

import type {
  ACVFContext,
  ACVFRequest,
  ACVFResponse,
  ACVFTurn,
  APIErrorBody,
  APIKey,
  AudactClientOptions,
  BlocklistPattern,
  CallState,
  ChainEvent,
  ChainResponse,
  ChatMessage,
  CheckResult,
  PromptConfidentialityConfig,
  CheckScoreEntry,
  ComplianceScore,
  ConfigurationRequest,
  ConfigurationResponse,
  CreateConfigurationRequest,
  CreateTenantAPIKeyInfo,
  CreateTenantRequest,
  CreateTenantResponse,
  FailOpenMeta,
  GenerateKeyRequest,
  GenerateKeyResponse,
  HealthResponse,
  ListConfigurationsResponse,
  ListKeysResponse,
  LLMMessage,
  PostEventRequest,
  PostEventResponse,
  ProxyChatRequest,
  ProxyChatResponse,
  Receipt,
  ReconstructRequest,
  ReconstructResponse,
  ServiceURLs,
  Tenant,
  TenantConfiguration,
  UpdateConfigurationRequest,
  UpdateTenantRequest,
  Verdict,
  VerifyChainRequest,
  VerifyChainResponse,
} from "../types.js";

// ─── Shared test UUIDs ────────────────────────────────────────────────────────

const TENANT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CALL_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const CONFIG_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const KEY_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const EVENT_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const TIMESTAMP = "2026-03-13T10:00:00Z";

// ─── Verdict ──────────────────────────────────────────────────────────────────

describe("Verdict", () => {
  it("accepts ALLOW, BLOCK, and MODIFY as valid values", () => {
    const verdicts: Verdict[] = ["ALLOW", "BLOCK", "MODIFY"];
    expect(verdicts).toHaveLength(3);
    for (const v of verdicts) {
      expect(["ALLOW", "BLOCK", "MODIFY"]).toContain(v);
    }
  });

  it("narrows correctly in a switch statement", () => {
    function describe_verdict(v: Verdict): string {
      switch (v) {
        case "ALLOW":
          return "allowed";
        case "BLOCK":
          return "blocked";
        case "MODIFY":
          return "modified";
      }
    }
    expect(describe_verdict("ALLOW")).toBe("allowed");
    expect(describe_verdict("BLOCK")).toBe("blocked");
    expect(describe_verdict("MODIFY")).toBe("modified");
  });
});

// ─── ACVFTurn ─────────────────────────────────────────────────────────────────

describe("ACVFTurn", () => {
  it("constructs a minimal valid turn", () => {
    const turn: ACVFTurn = {
      turn: 1,
      content: "Hello",
      verdict: "ALLOW",
    };
    expect(turn.turn).toBe(1);
    expect(turn.verdict).toBe("ALLOW");
  });

  it("supports all verdict values", () => {
    const turns: ACVFTurn[] = [
      { turn: 1, content: "a", verdict: "ALLOW" },
      { turn: 2, content: "b", verdict: "BLOCK" },
      { turn: 3, content: "c", verdict: "MODIFY" },
    ];
    expect(turns[0]?.verdict).toBe("ALLOW");
    expect(turns[1]?.verdict).toBe("BLOCK");
    expect(turns[2]?.verdict).toBe("MODIFY");
  });
});

// ─── CallState ────────────────────────────────────────────────────────────────

describe("CallState", () => {
  it("constructs with disclosure_delivered false", () => {
    const state: CallState = { disclosure_delivered: false };
    expect(state.disclosure_delivered).toBe(false);
  });

  it("constructs with disclosure_delivered true", () => {
    const state: CallState = { disclosure_delivered: true };
    expect(state.disclosure_delivered).toBe(true);
  });
});

// ─── ACVFContext ──────────────────────────────────────────────────────────────

describe("ACVFContext", () => {
  it("constructs with empty previous_turns", () => {
    const ctx: ACVFContext = {
      previous_turns: [],
      call_state: { disclosure_delivered: false },
    };
    expect(ctx.previous_turns).toHaveLength(0);
  });

  it("constructs with multiple previous turns", () => {
    const ctx: ACVFContext = {
      previous_turns: [
        { turn: 1, content: "Hi", verdict: "ALLOW" },
        { turn: 2, content: "...", verdict: "BLOCK" },
      ],
      call_state: { disclosure_delivered: true },
    };
    expect(ctx.previous_turns).toHaveLength(2);
    expect(ctx.call_state.disclosure_delivered).toBe(true);
  });
});

// ─── ACVFRequest ──────────────────────────────────────────────────────────────

describe("ACVFRequest", () => {
  it("constructs a minimal valid request", () => {
    const req: ACVFRequest = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      config_id: CONFIG_ID,
      turn: 1,
      content: "I am an AI assistant.",
      context: {
        previous_turns: [],
        call_state: { disclosure_delivered: false },
      },
    };
    expect(req.call_id).toBe(CALL_ID);
    expect(req.turn).toBe(1);
  });
});

// ─── FailOpenMeta ─────────────────────────────────────────────────────────────

describe("FailOpenMeta", () => {
  it("constructs a valid FailOpenMeta", () => {
    const meta: FailOpenMeta = {
      reason: "deadline_exceeded",
      deadline_ms: 40,
      elapsed_ms: 41.5,
      checks_completed: 2,
    };
    expect(meta.reason).toBe("deadline_exceeded");
    expect(meta.checks_completed).toBe(2);
  });
});

// ─── CheckResult ─────────────────────────────────────────────────────────────

describe("CheckResult", () => {
  it("constructs a minimal CheckResult (ALLOW)", () => {
    const result: CheckResult = {
      check_id: "disclosure_gate",
      verdict: "ALLOW",
      duration_ms: 0.5,
    };
    expect(result.check_id).toBe("disclosure_gate");
    expect(result.reason).toBeUndefined();
    expect(result.modified_content).toBeUndefined();
  });

  it("includes optional reason and modified_content", () => {
    const result: CheckResult = {
      check_id: "pricing_band",
      verdict: "MODIFY",
      reason: "price claim detected",
      modified_content: "The product is competitively priced.",
      duration_ms: 1.2,
    };
    expect(result.reason).toBe("price claim detected");
    expect(result.modified_content).toBe("The product is competitively priced.");
  });
});

// ─── CheckScoreEntry ─────────────────────────────────────────────────────────

describe("CheckScoreEntry", () => {
  it("constructs a valid CheckScoreEntry", () => {
    const entry: CheckScoreEntry = {
      check_id: "disclosure_gate",
      verdict: "ALLOW",
      weight: 1.0,
      score: 1.0,
    };
    expect(entry.score).toBe(1.0);
    expect(entry.weight).toBe(1.0);
  });
});

// ─── ComplianceScore ─────────────────────────────────────────────────────────

describe("ComplianceScore", () => {
  it("constructs a valid ComplianceScore", () => {
    const score: ComplianceScore = {
      composite: 0.85,
      check_scores: [
        { check_id: "disclosure_gate", verdict: "ALLOW", weight: 1.0, score: 1.0 },
        { check_id: "blocklist_scan", verdict: "ALLOW", weight: 0.7, score: 0.7 },
      ],
      total_weight: 1.7,
    };
    expect(score.composite).toBe(0.85);
    expect(score.check_scores).toHaveLength(2);
  });
});

// ─── Receipt ─────────────────────────────────────────────────────────────────

describe("Receipt", () => {
  it("constructs a valid Receipt", () => {
    const receipt: Receipt = {
      receipt_format_version: "1.0",
      call_id: CALL_ID,
      timestamp: TIMESTAMP,
      input_hash: "a".repeat(64),
      output_hash: "b".repeat(64),
      verdict: "ALLOW",
      config_version: 1,
      config_seal_hash: "c".repeat(64),
      policy_version: "nl_v1.1.0",
      evidence_hash: "d".repeat(64),
      auth_mechanism: "hmac-sha256",
      signature: "sig123",
    };
    expect(receipt.verdict).toBe("ALLOW");
    expect(receipt.auth_mechanism).toBe("hmac-sha256");
  });
});

// ─── ACVFResponse ─────────────────────────────────────────────────────────────

describe("ACVFResponse", () => {
  it("constructs a minimal valid ALLOW response", () => {
    const resp: ACVFResponse = {
      call_id: CALL_ID,
      turn: 1,
      verdict: "ALLOW",
      content: "Hello, I am an AI assistant.",
      fail_open: false,
      checks: [],
    };
    expect(resp.verdict).toBe("ALLOW");
    expect(resp.fail_open).toBe(false);
    expect(resp.fail_open_meta).toBeUndefined();
    expect(resp.receipt).toBeUndefined();
    expect(resp.compliance_score).toBeUndefined();
  });

  it("constructs a fail-open response", () => {
    const resp: ACVFResponse = {
      call_id: CALL_ID,
      turn: 1,
      verdict: "ALLOW",
      content: "test",
      fail_open: true,
      fail_open_meta: {
        reason: "deadline_exceeded",
        deadline_ms: 40,
        elapsed_ms: 42,
        checks_completed: 3,
      },
      checks: [],
    };
    expect(resp.fail_open).toBe(true);
    expect(resp.fail_open_meta?.checks_completed).toBe(3);
  });

  it("constructs a BLOCK response", () => {
    const resp: ACVFResponse = {
      call_id: CALL_ID,
      turn: 2,
      verdict: "BLOCK",
      content: "This product has guaranteed returns.",
      fail_open: false,
      checks: [
        { check_id: "blocklist_scan", verdict: "BLOCK", duration_ms: 0.9 },
      ],
    };
    expect(resp.verdict).toBe("BLOCK");
    expect(resp.checks[0]?.check_id).toBe("blocklist_scan");
  });

  it("constructs a MODIFY response", () => {
    const resp: ACVFResponse = {
      call_id: CALL_ID,
      turn: 2,
      verdict: "MODIFY",
      content: "The product is competitively priced.",
      fail_open: false,
      checks: [
        {
          check_id: "pricing_band",
          verdict: "MODIFY",
          modified_content: "The product is competitively priced.",
          duration_ms: 1.1,
        },
      ],
    };
    expect(resp.verdict).toBe("MODIFY");
    expect(resp.content).toBe("The product is competitively priced.");
  });
});

// ─── Evidence Layer ──────────────────────────────────────────────────────────

describe("PostEventRequest", () => {
  it("constructs with required fields only", () => {
    const req: PostEventRequest = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_START",
    };
    expect(req.event_type).toBe("CALL_START");
    expect(req.data).toBeUndefined();
  });

  it("constructs with optional data payload", () => {
    const req: PostEventRequest = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_DATA",
      data: { caller: "hashed_phone" },
    };
    expect(req.data).toEqual({ caller: "hashed_phone" });
  });
});

describe("PostEventResponse", () => {
  it("constructs a valid PostEventResponse", () => {
    const resp: PostEventResponse = {
      event_id: EVENT_ID,
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      sequence: 1,
      hash: "abc123",
      previous_hash: "0".repeat(64),
      timestamp: TIMESTAMP,
    };
    expect(resp.sequence).toBe(1);
    expect(resp.event_id).toBe(EVENT_ID);
  });
});

describe("ChainEvent", () => {
  it("constructs with required fields", () => {
    const event: ChainEvent = {
      event_id: EVENT_ID,
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_START",
      sequence: 1,
      hash: "abc",
      previous_hash: "def",
      timestamp: TIMESTAMP,
    };
    expect(event.data).toBeUndefined();
  });

  it("constructs with optional data", () => {
    const event: ChainEvent = {
      event_id: EVENT_ID,
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      event_type: "CALL_DATA",
      sequence: 2,
      hash: "abc",
      previous_hash: "def",
      timestamp: TIMESTAMP,
      data: { key: "value" },
    };
    expect(event.data).toEqual({ key: "value" });
  });
});

describe("ChainResponse", () => {
  it("constructs with events array", () => {
    const resp: ChainResponse = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      events: [],
      total: 0,
    };
    expect(resp.events).toHaveLength(0);
    expect(resp.total).toBe(0);
  });
});

describe("VerifyChainRequest / VerifyChainResponse", () => {
  it("constructs valid request and response", () => {
    const req: VerifyChainRequest = { call_id: CALL_ID, tenant_id: TENANT_ID };
    expect(req.call_id).toBe(CALL_ID);

    const resp: VerifyChainResponse = {
      call_id: CALL_ID,
      valid: true,
      event_count: 3,
    };
    expect(resp.valid).toBe(true);
    expect(resp.error).toBeUndefined();
  });

  it("includes error field on invalid chain", () => {
    const resp: VerifyChainResponse = {
      call_id: CALL_ID,
      valid: false,
      event_count: 3,
      error: "hash mismatch at sequence 2",
    };
    expect(resp.valid).toBe(false);
    expect(resp.error).toBe("hash mismatch at sequence 2");
  });
});

describe("ReconstructRequest / ReconstructResponse", () => {
  it("constructs valid request and response", () => {
    const req: ReconstructRequest = { call_id: CALL_ID, tenant_id: TENANT_ID };
    expect(req.tenant_id).toBe(TENANT_ID);

    const resp: ReconstructResponse = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      events: [],
    };
    expect(resp.events).toHaveLength(0);
  });
});

// ─── Tenant Management ───────────────────────────────────────────────────────

describe("CreateTenantRequest", () => {
  it("constructs with name only", () => {
    const req: CreateTenantRequest = { name: "Acme Corp" };
    expect(req.name).toBe("Acme Corp");
    expect(req.plan).toBeUndefined();
    expect(req.key_name).toBeUndefined();
  });

  it("constructs with all fields", () => {
    const req: CreateTenantRequest = {
      name: "Acme Corp",
      plan: "professional",
      key_name: "production",
    };
    expect(req.plan).toBe("professional");
    expect(req.key_name).toBe("production");
  });

  it("accepts all valid plan values", () => {
    const plans: Array<CreateTenantRequest["plan"]> = [
      "starter",
      "professional",
      "enterprise",
    ];
    expect(plans).toHaveLength(3);
  });
});

describe("CreateTenantAPIKeyInfo", () => {
  it("constructs a valid key info", () => {
    const info: CreateTenantAPIKeyInfo = {
      key_id: KEY_ID,
      key: "aud_live_abc123",
      key_prefix: "aud_live",
      name: "default",
      role: "owner",
    };
    expect(info.key).toBe("aud_live_abc123");
    expect(info.role).toBe("owner");
  });
});

describe("CreateTenantResponse", () => {
  it("constructs a valid response", () => {
    const resp: CreateTenantResponse = {
      tenant_id: TENANT_ID,
      name: "Acme Corp",
      plan: "starter",
      hmac_key_arn: "arn:aws:kms:eu-west-1:123456789:key/test",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
      api_key: {
        key_id: KEY_ID,
        key: "aud_live_abc123",
        key_prefix: "aud_live",
        name: "default",
        role: "owner",
      },
    };
    expect(resp.api_key.key).toBe("aud_live_abc123");
  });
});

describe("Tenant", () => {
  it("constructs a valid Tenant record", () => {
    const tenant: Tenant = {
      tenant_id: TENANT_ID,
      name: "Acme Corp",
      plan: "enterprise",
      hmac_key_arn: "arn:aws:kms:eu-west-1:123456789:key/test",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    expect(tenant.plan).toBe("enterprise");
  });
});

describe("UpdateTenantRequest", () => {
  it("allows partial updates (name only)", () => {
    const req: UpdateTenantRequest = { name: "New Name" };
    expect(req.name).toBe("New Name");
    expect(req.plan).toBeUndefined();
  });

  it("allows partial updates (plan only)", () => {
    const req: UpdateTenantRequest = { plan: "enterprise" };
    expect(req.plan).toBe("enterprise");
    expect(req.name).toBeUndefined();
  });
});

describe("APIKey", () => {
  it("constructs an active key without revoked_at", () => {
    const key: APIKey = {
      api_key_id: KEY_ID,
      tenant_id: TENANT_ID,
      name: "default",
      key_prefix: "aud_live",
      role: "owner",
      created_at: TIMESTAMP,
    };
    expect(key.revoked_at).toBeUndefined();
  });

  it("constructs a revoked key with revoked_at", () => {
    const key: APIKey = {
      api_key_id: KEY_ID,
      tenant_id: TENANT_ID,
      name: "old key",
      key_prefix: "aud_live",
      role: "developer",
      created_at: TIMESTAMP,
      revoked_at: TIMESTAMP,
    };
    expect(key.revoked_at).toBe(TIMESTAMP);
  });
});

describe("GenerateKeyRequest", () => {
  it("constructs with name only", () => {
    const req: GenerateKeyRequest = { name: "CI pipeline" };
    expect(req.name).toBe("CI pipeline");
    expect(req.role).toBeUndefined();
  });

  it("accepts all role values", () => {
    const roles: Array<GenerateKeyRequest["role"]> = [
      "owner",
      "developer",
      "viewer",
    ];
    expect(roles).toHaveLength(3);
  });
});

describe("GenerateKeyResponse", () => {
  it("extends APIKey with the key field", () => {
    const resp: GenerateKeyResponse = {
      api_key_id: KEY_ID,
      tenant_id: TENANT_ID,
      name: "CI key",
      key_prefix: "aud_live",
      role: "developer",
      created_at: TIMESTAMP,
      key: "aud_live_secretvalue",
    };
    // Inherits APIKey fields
    expect(resp.api_key_id).toBe(KEY_ID);
    expect(resp.tenant_id).toBe(TENANT_ID);
    // GenerateKeyResponse-specific field
    expect(resp.key).toBe("aud_live_secretvalue");
  });
});

describe("ListKeysResponse", () => {
  it("constructs a valid list response", () => {
    const resp: ListKeysResponse = {
      keys: [
        {
          api_key_id: KEY_ID,
          tenant_id: TENANT_ID,
          name: "default",
          key_prefix: "aud_live",
          role: "owner",
          created_at: TIMESTAMP,
        },
      ],
      total: 1,
    };
    expect(resp.keys).toHaveLength(1);
    expect(resp.total).toBe(1);
  });
});

describe("BlocklistPattern", () => {
  it("constructs a block-severity pattern", () => {
    const pattern: BlocklistPattern = {
      id: "no-guarantees",
      terms: ["guaranteed return", "risk-free"],
      severity: "block",
    };
    expect(pattern.replacement_text).toBeUndefined();
  });

  it("constructs a modify-severity pattern with replacement text", () => {
    const pattern: BlocklistPattern = {
      id: "price-replace",
      terms: ["cheapest", "lowest price"],
      severity: "modify",
      replacement_text: "competitively priced",
    };
    expect(pattern.replacement_text).toBe("competitively priced");
  });

  it("accepts both severity values", () => {
    const severities: Array<BlocklistPattern["severity"]> = ["modify", "block"];
    expect(severities).toHaveLength(2);
  });
});

describe("CreateConfigurationRequest", () => {
  it("constructs with required fields only", () => {
    const req: CreateConfigurationRequest = {
      tenant_id: TENANT_ID,
      name: "Production v1",
      countries: ["NL", "DE"],
    };
    expect(req.countries).toEqual(["NL", "DE"]);
    expect(req.blocklist_patterns).toBeUndefined();
  });

  it("constructs with blocklist patterns", () => {
    const req: CreateConfigurationRequest = {
      tenant_id: TENANT_ID,
      name: "Production v2",
      countries: ["NL"],
      blocklist_patterns: [
        { id: "p1", terms: ["risk-free"], severity: "block" },
      ],
    };
    expect(req.blocklist_patterns).toHaveLength(1);
  });
});

describe("TenantConfiguration", () => {
  it("constructs a valid persisted configuration", () => {
    const config: TenantConfiguration = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "Production v1",
      countries: ["NL", "DE", "BE"],
      blocklist_patterns: [],
      config_seal_hash: "deadbeef",
      version: 1,
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    expect(config.version).toBe(1);
    expect(config.countries).toContain("NL");
  });
});

describe("ListConfigurationsResponse", () => {
  it("constructs a valid list response", () => {
    const resp: ListConfigurationsResponse = {
      configurations: [],
      total: 0,
    };
    expect(resp.total).toBe(0);
  });
});

describe("UpdateConfigurationRequest", () => {
  it("allows all fields to be optional", () => {
    const req: UpdateConfigurationRequest = {};
    expect(req.name).toBeUndefined();
    expect(req.countries).toBeUndefined();
    expect(req.blocklist_patterns).toBeUndefined();
  });

  it("accepts partial updates", () => {
    const req: UpdateConfigurationRequest = {
      countries: ["NL", "FR"],
    };
    expect(req.countries).toEqual(["NL", "FR"]);
  });
});

// ─── LLM Proxy ───────────────────────────────────────────────────────────────

describe("LLMMessage", () => {
  it("constructs messages with all role values", () => {
    const messages: LLMMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi there!" },
    ];
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]?.role).toBe("user");
    expect(messages[2]?.role).toBe("assistant");
  });
});

describe("ProxyChatRequest", () => {
  it("constructs a minimal valid request", () => {
    const req: ProxyChatRequest = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      config_id: CONFIG_ID,
      turn: 1,
      messages: [{ role: "user", content: "Hello!" }],
    };
    expect(req.stream).toBeUndefined();
    expect(req.model).toBeUndefined();
  });

  it("constructs a streaming request with model override", () => {
    const req: ProxyChatRequest = {
      call_id: CALL_ID,
      tenant_id: TENANT_ID,
      config_id: CONFIG_ID,
      turn: 1,
      messages: [{ role: "user", content: "Hello!" }],
      stream: true,
      model: "gpt-4o",
    };
    expect(req.stream).toBe(true);
    expect(req.model).toBe("gpt-4o");
  });
});

describe("ProxyChatResponse", () => {
  it("constructs a minimal response", () => {
    const resp: ProxyChatResponse = {
      call_id: CALL_ID,
      turn: 1,
      content: "Hello there!",
      verdict: "ALLOW",
    };
    expect(resp.receipt).toBeUndefined();
    expect(resp.compliance_score).toBeUndefined();
    expect(resp.usage).toBeUndefined();
  });

  it("constructs a response with optional fields", () => {
    const resp: ProxyChatResponse = {
      call_id: CALL_ID,
      turn: 1,
      content: "Hello there!",
      verdict: "ALLOW",
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    };
    expect(resp.usage?.total_tokens).toBe(15);
  });
});

// ─── Health ───────────────────────────────────────────────────────────────────

describe("HealthResponse", () => {
  it("constructs with status ok", () => {
    const resp: HealthResponse = {
      status: "ok",
      checks: {
        redis: { status: "ok" },
        postgres: { status: "ok" },
      },
    };
    expect(resp.status).toBe("ok");
  });

  it("constructs with degraded status and errors", () => {
    const resp: HealthResponse = {
      status: "degraded",
      checks: {
        redis: { status: "ok" },
        postgres: { status: "error", error: "connection refused" },
      },
    };
    expect(resp.status).toBe("degraded");
    expect(resp.checks["postgres"]?.error).toBe("connection refused");
  });

  it("accepts all status values", () => {
    const statuses: Array<HealthResponse["status"]> = ["ok", "degraded", "down"];
    expect(statuses).toHaveLength(3);
  });
});

// ─── API Error ────────────────────────────────────────────────────────────────

describe("APIErrorBody", () => {
  it("constructs with required fields", () => {
    const err: APIErrorBody = {
      error: "NOT_FOUND",
      message: "tenant not found",
    };
    expect(err.details).toBeUndefined();
    expect(err.request_id).toBeUndefined();
  });

  it("constructs with optional fields", () => {
    const err: APIErrorBody = {
      error: "INVALID_REQUEST",
      message: "validation failed",
      details: { field: "tenant_id", issue: "must be a valid UUID" },
      request_id: "req-abc-123",
    };
    expect(err.request_id).toBe("req-abc-123");
    expect(err.details?.["field"]).toBe("tenant_id");
  });
});

// ─── Client Configuration ────────────────────────────────────────────────────

describe("ServiceURLs", () => {
  it("all fields are optional", () => {
    const urls: ServiceURLs = {};
    expect(urls.validator).toBeUndefined();
    expect(urls.evidence).toBeUndefined();
    expect(urls.llmProxy).toBeUndefined();
    expect(urls.tenantManagement).toBeUndefined();
  });

  it("constructs with all fields set", () => {
    const urls: ServiceURLs = {
      validator: "https://v.example.com",
      evidence: "https://e.example.com",
      llmProxy: "https://l.example.com",
      tenantManagement: "https://t.example.com",
    };
    expect(urls.validator).toBe("https://v.example.com");
    expect(urls.llmProxy).toBe("https://l.example.com");
  });
});

describe("AudactClientOptions", () => {
  it("constructs with apiKey only", () => {
    const opts: AudactClientOptions = { apiKey: "aud_live_abc" };
    expect(opts.apiKey).toBe("aud_live_abc");
    expect(opts.serviceUrls).toBeUndefined();
    expect(opts.timeoutMs).toBeUndefined();
  });

  it("constructs with all options", () => {
    const opts: AudactClientOptions = {
      apiKey: "aud_live_abc",
      serviceUrls: { validator: "https://v.example.com" },
      timeoutMs: 5000,
    };
    expect(opts.timeoutMs).toBe(5000);
    expect(opts.serviceUrls?.validator).toBe("https://v.example.com");
  });
});

// ─── ConfigurationRequest / serializeConfigurationRequest ────────────────────

describe("ConfigurationRequest", () => {
  it("constructs with required fields only", () => {
    const req: ConfigurationRequest = {
      name: "Prod v1",
      countries: ["NL"],
    };
    expect(req.upstreamLlmUrl).toBeUndefined();
    expect(req.upstreamLlmSecretArn).toBeUndefined();
  });

  it("constructs with upstreamLlmUrl and upstreamLlmSecretArn", () => {
    const req: ConfigurationRequest = {
      name: "Prod v2",
      countries: ["NL", "DE"],
      upstreamLlmUrl: "https://my-llm.example.com/v1",
      upstreamLlmSecretArn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:my-key",
    };
    expect(req.upstreamLlmUrl).toBe("https://my-llm.example.com/v1");
    expect(req.upstreamLlmSecretArn).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:my-key",
    );
  });
});

describe("serializeConfigurationRequest", () => {
  it("serializes upstreamLlmUrl to upstream_llm_url", () => {
    const req: ConfigurationRequest = {
      name: "Prod",
      countries: ["NL"],
      upstreamLlmUrl: "https://custom-llm.example.com",
    };
    const serialized = serializeConfigurationRequest(req);
    expect(serialized["upstream_llm_url"]).toBe(
      "https://custom-llm.example.com",
    );
    expect(Object.keys(serialized)).not.toContain("upstreamLlmUrl");
  });

  it("serializes upstreamLlmSecretArn to upstream_llm_secret_arn", () => {
    const req: ConfigurationRequest = {
      name: "Prod",
      countries: ["NL"],
      upstreamLlmSecretArn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    };
    const serialized = serializeConfigurationRequest(req);
    expect(serialized["upstream_llm_secret_arn"]).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    );
    expect(Object.keys(serialized)).not.toContain("upstreamLlmSecretArn");
  });

  it("serializes both upstreamLlmUrl and upstreamLlmSecretArn", () => {
    const req: ConfigurationRequest = {
      name: "Prod",
      countries: ["NL", "DE"],
      upstreamLlmUrl: "https://custom-llm.example.com",
      upstreamLlmSecretArn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    };
    const serialized = serializeConfigurationRequest(req);
    expect(serialized["upstream_llm_url"]).toBe(
      "https://custom-llm.example.com",
    );
    expect(serialized["upstream_llm_secret_arn"]).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    );
  });

  it("omits upstream_llm_url and upstream_llm_secret_arn when not provided", () => {
    const req: ConfigurationRequest = {
      name: "Prod",
      countries: ["NL"],
    };
    const serialized = serializeConfigurationRequest(req);
    expect(Object.keys(serialized)).not.toContain("upstream_llm_url");
    expect(Object.keys(serialized)).not.toContain("upstream_llm_secret_arn");
  });

  it("serializes required name and countries fields", () => {
    const req: ConfigurationRequest = {
      name: "My Config",
      countries: ["NL", "FR"],
    };
    const serialized = serializeConfigurationRequest(req);
    expect(serialized["name"]).toBe("My Config");
    expect(serialized["countries"]).toEqual(["NL", "FR"]);
  });

  it("serializes all optional camelCase fields to snake_case", () => {
    const req: ConfigurationRequest = {
      name: "Full Config",
      countries: ["NL"],
      validatorModes: { mode1: "strict" },
      blocklistPatterns: [{ id: "p1", terms: ["bad"], severity: "block" }],
      pricingBands: { band1: {} },
      disclosureTexts: { nl: "Disclosure text" },
      fallbackResponse: { default: "Sorry" },
    };
    const serialized = serializeConfigurationRequest(req);
    expect(serialized["validator_modes"]).toEqual({ mode1: "strict" });
    expect(serialized["blocklist_patterns"]).toHaveLength(1);
    expect(serialized["pricing_bands"]).toEqual({ band1: {} });
    expect(serialized["disclosure_texts"]).toEqual({ nl: "Disclosure text" });
    expect(serialized["fallback_response"]).toEqual({ default: "Sorry" });
  });
});

// ─── ConfigurationResponse / deserializeConfigurationResponse ────────────────

describe("ConfigurationResponse", () => {
  it("constructs with all required fields", () => {
    const resp: ConfigurationResponse = {
      configId: CONFIG_ID,
      tenantId: TENANT_ID,
      name: "Prod v1",
      version: 1,
      countries: ["NL"],
      validatorModes: {},
      blocklistPatterns: [],
      pricingBands: {},
      disclosureTexts: {},
      fallbackResponse: {},
      configSealHash: "deadbeef",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    };
    expect(resp.configId).toBe(CONFIG_ID);
    expect(resp.upstreamLlmUrl).toBeUndefined();
    expect(resp.upstreamLlmSecretArn).toBeUndefined();
  });

  it("constructs with optional upstreamLlmUrl and upstreamLlmSecretArn", () => {
    const resp: ConfigurationResponse = {
      configId: CONFIG_ID,
      tenantId: TENANT_ID,
      name: "Prod v2",
      version: 2,
      countries: ["NL"],
      validatorModes: {},
      blocklistPatterns: [],
      pricingBands: {},
      disclosureTexts: {},
      fallbackResponse: {},
      configSealHash: "deadbeef",
      upstreamLlmUrl: "https://custom-llm.example.com",
      upstreamLlmSecretArn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    };
    expect(resp.upstreamLlmUrl).toBe("https://custom-llm.example.com");
    expect(resp.upstreamLlmSecretArn).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    );
  });
});

describe("deserializeConfigurationResponse", () => {
  it("deserializes upstream_llm_url to upstreamLlmUrl", () => {
    const raw: Record<string, unknown> = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "Prod",
      version: 1,
      countries: ["NL"],
      config_seal_hash: "deadbeef",
      upstream_llm_url: "https://custom-llm.example.com",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    const resp = deserializeConfigurationResponse(raw);
    expect(resp.upstreamLlmUrl).toBe("https://custom-llm.example.com");
    expect(resp.configId).toBe(CONFIG_ID);
  });

  it("deserializes upstream_llm_secret_arn to upstreamLlmSecretArn", () => {
    const raw: Record<string, unknown> = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "Prod",
      version: 1,
      countries: ["NL"],
      config_seal_hash: "deadbeef",
      upstream_llm_secret_arn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    const resp = deserializeConfigurationResponse(raw);
    expect(resp.upstreamLlmSecretArn).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    );
  });

  it("deserializes both upstream fields when present", () => {
    const raw: Record<string, unknown> = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "Prod",
      version: 3,
      countries: ["NL", "DE"],
      config_seal_hash: "cafe1234",
      upstream_llm_url: "https://custom-llm.example.com",
      upstream_llm_secret_arn:
        "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    const resp = deserializeConfigurationResponse(raw);
    expect(resp.upstreamLlmUrl).toBe("https://custom-llm.example.com");
    expect(resp.upstreamLlmSecretArn).toBe(
      "arn:aws:secretsmanager:eu-west-1:123456789012:secret:llm-key",
    );
    expect(resp.version).toBe(3);
    expect(resp.countries).toEqual(["NL", "DE"]);
  });

  it("sets upstreamLlmUrl and upstreamLlmSecretArn to undefined when absent", () => {
    const raw: Record<string, unknown> = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "Prod",
      version: 1,
      countries: ["NL"],
      config_seal_hash: "deadbeef",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
    };
    const resp = deserializeConfigurationResponse(raw);
    expect(resp.upstreamLlmUrl).toBeUndefined();
    expect(resp.upstreamLlmSecretArn).toBeUndefined();
  });

  it("maps all snake_case fields to camelCase", () => {
    const raw: Record<string, unknown> = {
      config_id: CONFIG_ID,
      tenant_id: TENANT_ID,
      name: "My Config",
      version: 5,
      countries: ["NL"],
      validator_modes: { m: "strict" },
      blocklist_patterns: [],
      pricing_bands: {},
      disclosure_texts: { nl: "text" },
      fallback_response: { d: "sorry" },
      config_seal_hash: "abc123",
      created_at: TIMESTAMP,
      updated_at: TIMESTAMP,
      deleted_at: "2026-06-01T00:00:00Z",
    };
    const resp = deserializeConfigurationResponse(raw);
    expect(resp.configId).toBe(CONFIG_ID);
    expect(resp.tenantId).toBe(TENANT_ID);
    expect(resp.configSealHash).toBe("abc123");
    expect(resp.validatorModes).toEqual({ m: "strict" });
    expect(resp.disclosureTexts).toEqual({ nl: "text" });
    expect(resp.fallbackResponse).toEqual({ d: "sorry" });
    expect(resp.deletedAt).toBe("2026-06-01T00:00:00Z");
  });
});

// ─── ChatMessage ──────────────────────────────────────────────────────────────

describe("ChatMessage", () => {
  it("is structurally identical to LLMMessage", () => {
    const msg: ChatMessage = { role: "user", content: "Hello!" };
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello!");
  });

  it("accepts all role values", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are an assistant." },
      { role: "user", content: "Hello!" },
      { role: "assistant", content: "Hi there!" },
    ];
    expect(messages[0]?.role).toBe("system");
    expect(messages[1]?.role).toBe("user");
    expect(messages[2]?.role).toBe("assistant");
  });
});

// ─── Prompt confidentiality ──────────────────────────────────

describe("promptConfidentialityConfig mapping", () => {
  const cfg: PromptConfidentialityConfig = {
    hardening: true,
    canary: true,
    ngram: true,
    ngram_size: 6,
    ngram_min_matches: 3,
    allowlist_phrases: ["thank you for calling"],
  };

  it("round-trips through serialise and deserialise", () => {
    const wire = serializeConfigurationRequest({
      name: "cfg",
      countries: ["NL"],
      promptConfidentialityConfig: cfg,
    });
    expect(wire["prompt_confidentiality_config"]).toEqual(cfg);
    const back = deserializeConfigurationResponse({
      ...wire,
      config_id: "c1",
      tenant_id: "t1",
      version: 1,
      config_seal_hash: "h",
      created_at: "x",
      updated_at: "y",
    });
    expect(back.promptConfidentialityConfig).toEqual(cfg);
  });

  it("control: omitted when not provided", () => {
    const wire = serializeConfigurationRequest({ name: "n", countries: ["NL"] });
    expect(Object.keys(wire)).not.toContain("prompt_confidentiality_config");
    const back = deserializeConfigurationResponse({ config_id: "c" });
    expect(back.promptConfidentialityConfig).toBeUndefined();
  });

  it("CheckResult carries the new optional fields", () => {
    const r: CheckResult = {
      check_id: "prompt_confidentiality",
      verdict: "ALLOW",
      duration_ms: 1,
      prompt_fingerprint: "0123456789abcdef",
      layers: ["canary", "ngram"],
      prompt_scope: "agent",
    };
    expect(r.layers).toHaveLength(2);
  });
});
