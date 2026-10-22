import type { PIIIdentifier } from "./pii.js";

/**
 * Audact TypeScript SDK — Type Definitions
 *
 * Wire types mirroring the server schema and all
 * HTTP handler request/response structs.
 *
 * Verdict constants match the server-side ALLOW/BLOCK/MODIFY verdicts.
 */

// ─── Verdict ────────────────────────────────────────────────────────────────

export type Verdict = "ALLOW" | "BLOCK" | "MODIFY";

// ─── ACVF (Validator) ────────────────────────────────────────────────────────

/**
 * A single historical conversation turn included in an ACVFRequest context.
 */
export interface ACVFTurn {
  /** 1-based sequential turn number. */
  turn: number;
  /** Text content of this turn. */
  content: string;
  /** Validation verdict applied to this turn. */
  verdict: Verdict;
}

/**
 * Per-call state threaded through the validation pipeline.
 * Read from Redis before the pipeline starts.
 */
export interface CallState {
  /** True when the AI disclosure statement has been delivered in a prior turn. */
  disclosure_delivered: boolean;
}

/**
 * Conversation history and call state bundled with a validate request.
 */
export interface ACVFContext {
  /** Ordered history of all turns prior to the current one. */
  previous_turns: ACVFTurn[];
  /** Current mutable call state (e.g. disclosure_delivered flag). */
  call_state: CallState;
}

/**
 * Canonical inbound payload sent to the Validator for a single conversation turn.
 * All UUID fields are validated on the server; a zero UUID is rejected.
 */
export interface ACVFRequest {
  /** UUID of the call/session this turn belongs to. */
  call_id: string;
  /** UUID of the Audact tenant whose config governs validation. */
  tenant_id: string;
  /** UUID of the specific tenant configuration version to apply. */
  config_id: string;
  /** 1-based sequential turn number within this call. */
  turn: number;
  /** Text to be validated for this turn. */
  content: string;
  /** Conversation history and current call state. */
  context: ACVFContext;
  /** Optional UUID of the speaking agent, so prompt_confidentiality protects that agent's own prompt. */
  agent_id?: string;
  /** Config-identity seal of the configuration pinned at call start. */
  config_seal_hash?: string;
  /** Internal: set by the LLM proxy for streamed segments (enables cross-segment matching). */
  stream_segment?: boolean;
}

/**
 * Diagnostic metadata included when FailOpen is true.
 */
export interface FailOpenMeta {
  /** Machine-readable fail-open cause. Currently always "deadline_exceeded". */
  reason: string;
  /** Configured hard deadline in milliseconds that was exceeded. */
  deadline_ms: number;
  /** Actual elapsed time in milliseconds until the deadline context was cancelled. */
  elapsed_ms: number;
  /** Number of validation checks that finished before the deadline fired. */
  checks_completed: number;
}

/**
 * The outcome produced by a single check in the validation pipeline.
 */
export interface CheckResult {
  /** Unique, stable string identifier (e.g. "disclosure_gate", "blocklist_scan"). */
  check_id: string;
  /** The check's own decision: ALLOW, BLOCK, or MODIFY. */
  verdict: Verdict;
  /** Short, human-readable explanation of the verdict. Never contains PII. */
  reason?: string;
  /** Rewritten text when verdict == "MODIFY". Empty otherwise. */
  modified_content?: string;
  /** Wall-clock time this check consumed, in milliseconds. */
  duration_ms: number;
  /** first 16 hex chars of sha256(prompt) the check compared against. */
  prompt_fingerprint?: string;
  /** detection layers that fired ("canary", "ngram"). */
  layers?: ("canary" | "ngram")[];
  /** which prompt was checked: "agent" | "shared_union" | "skipped". */
  prompt_scope?: "agent" | "shared_union" | "skipped";
  /** Language detected for the checked text, when the check detects one. */
  detected_language?: string;
  /** Mode the check ran in (e.g. "enforce", "shadow"). */
  mode?: string;
  /** Version of the negation lexicon used, when applicable. */
  negation_lexicon_version?: string;
  /** True when the check could not evaluate the content. */
  not_evaluated?: boolean;
  /** True when the check did not run. */
  not_run?: boolean;
  /** True when a shadow-mode detection was recorded. */
  shadow_detection?: boolean;
  /** Number of shadow-mode findings. */
  shadow_findings?: number;
  /** Verdict the check would have returned in enforce mode. */
  shadow_verdict?: string;
}

/**
 * Per-check compliance score contribution.
 */
export interface CheckScoreEntry {
  /** Unique identifier of the check (e.g. "disclosure_gate"). */
  check_id: string;
  /** Outcome of this check: ALLOW, BLOCK, or MODIFY. */
  verdict: Verdict;
  /** Regulatory severity weight assigned to this check. */
  weight: number;
  /** Earned compliance points for this check (score = weight × contribution). */
  score: number;
}

/**
 * Composite compliance score included in an ACVFResponse.
 * Score range: [0.0, 1.0]. Nil on fail-open responses.
 */
export interface ComplianceScore {
  /** Weighted composite score in [0.0, 1.0]. */
  composite: number;
  /** Per-check score contribution in pipeline order. */
  check_scores: CheckScoreEntry[];
  /** Sum of the weights for all checks that ran. */
  total_weight: number;
}

/**
 * Compliance receipt for a validated turn.
 * Provides cryptographic commitments to both input and output.
 */
export interface Receipt {
  receipt_format_version: string;
  call_id: string;
  /** Server-generated UTC timestamp of receipt issuance. */
  timestamp: string;
  /** SHA-256 hex digest of the original (pre-validation) text. */
  input_hash: string;
  /** SHA-256 hex digest of the final text after any modification. */
  output_hash: string;
  verdict: Verdict;
  config_version: number;
  /** SHA-256 hex digest of the canonical JSON of the tenant configuration (RFC 8785). */
  config_seal_hash: string;
  /** Policy rule-set applied (e.g. "nl_v1.1.0"). */
  policy_version: string;
  /** SHA-256 hex digest of the associated evidence event chain. */
  evidence_hash: string;
  /** Signing algorithm used (e.g. "hmac-sha256"). */
  auth_mechanism: string;
  /** Cryptographic signature over all above fields. */
  signature: string;
  /** Total number of candidates generated (v1.1.0 multi-candidate receipts; omitted when zero). */
  candidate_count?: number;
  /** SHA-256 hex digest of the ordered concatenation of all candidate response hashes. */
  candidate_set_hash?: string;
  /** Evidence grade of the delivery confirmation: "independent" or "platform_sourced". */
  confirmation_grade?: string;
  /** Hash of the DELIVERY_ATTESTATION evidence event. Empty until delivery is attested. */
  delivery_attestation_hash?: string;
  /** Delivery state: "confirmed", "unconfirmed", or "mismatch". Empty when delivery attestation is not enabled. */
  delivery_status?: string;
  /** True when candidate evaluation was short-circuited by a perfect-score candidate. */
  early_terminated?: boolean;
  /** endpoint_id of the winning candidate. Non-empty only in v1.1.0 receipts. */
  selected_candidate_id?: string;
}

/**
 * Canonical outbound result returned by the Validator after processing an ACVFRequest.
 */
export interface ACVFResponse {
  /** Echoes ACVFRequest.call_id for correlation. */
  call_id: string;
  /** Echoes ACVFRequest.turn for correlation. */
  turn: number;
  /** Aggregated verdict across all checks that ran. */
  verdict: Verdict;
  /**
   * Final text after all checks have been applied.
   * - ALLOW:  equals the original content.
   * - MODIFY: contains the rewritten text produced by MODIFY checks.
   * - BLOCK:  contains the original content (caller uses its own fallback response).
   */
  content: string;
  /** True when the 40ms hard deadline was exceeded and the Validator returned ALLOW. */
  fail_open: boolean;
  /** Diagnostic metadata when fail_open is true. Absent otherwise. */
  fail_open_meta?: FailOpenMeta;
  /** Compliance receipt. Populated for every non-fail-open response. */
  receipt?: Receipt;
  /** Weighted composite compliance score. Nil on fail-open responses. */
  compliance_score?: ComplianceScore;
  /** Individual result from every check that completed before the deadline. */
  checks: CheckResult[];
}

/**
 * Request body for POST /v1/calls/{call_id}/finalize-score.
 */
export interface FinalizeScoreRequest {
  /** Optional agent identifier for attribution. */
  agent_id?: string;
}

/**
 * Response from POST /v1/calls/{call_id}/finalize-score.
 *
 * `status` is `"finalized"` or `"skipped"` (no turns recorded for the call —
 * in which case `composite_score` is `null` and the count fields are omitted).
 */
export interface FinalizeScoreResponse {
  /** "finalized" or "skipped". */
  status: "finalized" | "skipped";
  /** Finalized composite compliance score in [0.0, 1.0], or null when skipped. */
  composite_score: number | null;
  /** Total number of validation turns processed for the call. Omitted when skipped. */
  total_turns?: number;
  /** Number of turns that returned a non-ALLOW verdict. Omitted when skipped. */
  turns_with_violations?: number;
  /** Number of turns that fell back to fail-open (ALLOW) mode. Omitted when skipped. */
  fail_open_count?: number;
}

// ─── Evidence Layer ──────────────────────────────────────────────────────────

/**
 * Request body for POST /v1/events — writes a new evidence event.
 */
export interface PostEventRequest {
  /** UUID of the call this event belongs to. */
  call_id: string;
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** Event categorisation, e.g. "CALL_START". */
  event_type: string;
  /** Optional arbitrary JSON payload for the event. */
  data?: unknown;
}

/**
 * Response body from POST /v1/events — the hash receipt.
 */
export interface PostEventResponse {
  /** Server-generated UUID for this event. */
  event_id: string;
  call_id: string;
  tenant_id: string;
  /** 1-based position of this event in the call's chain. */
  sequence: number;
  /** SHA-256 hex digest of the event fields. */
  hash: string;
  /** Hash of the preceding event (or ZeroHash for the first event). */
  previous_hash: string;
  /** Server-generated UTC timestamp. */
  timestamp: string;
}

/**
 * A single event in a chain as returned by GET /v1/events/{call_id}/chain.
 */
export interface ChainEvent {
  event_id: string;
  call_id: string;
  tenant_id: string;
  event_type: string;
  sequence: number;
  hash: string;
  previous_hash: string;
  timestamp: string;
  data?: unknown;
  /** SHA-256 hex digest of the tenant configuration active when this event was written (reconstruct only). */
  config_seal_hash?: string;
  /** Compliance receipt for CHECK_RESULT events; null for all other types (reconstruct only). */
  compliance_receipt?: EventComplianceReceipt | null;
}

/**
 * evidence.EventComplianceReceipt — compliance receipt of one CHECK_RESULT event
 * in POST /v1/events/reconstruct.
 */
export interface EventComplianceReceipt {
  /** SHA-256 hex digest of the tenant configuration active when the check ran. */
  config_seal_hash?: string;
  /** UUID of the CHECK_RESULT event this receipt covers. */
  event_id?: string;
  /** Server-generated timestamp of the original event. */
  issued_at?: string;
  /** Compliance decision recorded in the event (e.g. "ALLOW", "BLOCK", "FAIL_OPEN"). */
  verdict?: string;
}

/**
 * Response from GET /v1/events/{call_id}/chain.
 */
export interface ChainResponse {
  call_id: string;
  /** @deprecated not sent by the server (evidence.GetChainResponse has no tenant_id); always undefined. */
  tenant_id?: string;
  events: ChainEvent[];
  /** @deprecated not sent by the server; use `has_more` / `next_cursor`. Always undefined. */
  total?: number;
  /** True when there are additional events beyond this page. */
  has_more?: boolean;
  /** Sequence number to pass as `after_sequence` to fetch the next page. */
  next_cursor?: number;
}

/**
 * Request for POST /v1/events/verify.
 */
export interface VerifyChainRequest {
  call_id: string;
  tenant_id: string;
}

/**
 * Response from POST /v1/events/verify.
 */
export interface VerifyChainResponse {
  call_id: string;
  /** "VALID" when all hash links are intact, "INVALID" when tamper is detected. */
  status?: string;
  /** -1 when `status` is "VALID", else the 1-based sequence of the first broken link. */
  broken_at_sequence?: number;
  /** @deprecated not sent by the server; use `status === "VALID"`. Always undefined. */
  valid?: boolean;
  event_count: number;
  /** @deprecated not sent by the server. Always undefined. */
  error?: string;
}

/**
 * Request for POST /v1/events/reconstruct.
 */
export interface ReconstructRequest {
  call_id: string;
  tenant_id: string;
}

/**
 * Response from POST /v1/events/reconstruct.
 */
export interface ReconstructResponse {
  call_id: string;
  /** @deprecated not sent by the server (evidence.ReconstructResponse has no tenant_id); always undefined. */
  tenant_id?: string;
  /** "VALID" when all hash links are intact, "INVALID" when tamper is detected. */
  chain_status?: string;
  /** Total number of events in the reconstructed chain. */
  event_count?: number;
  /** config_seal_hash of the most recent event in the chain. */
  policy_version?: string;
  /** Maps each config_seal_hash seen in the chain to its resolved configuration version. */
  config_versions?: Record<string, ResolvedConfigVersion>;
  events: ChainEvent[];
}

/** evidence.ResolvedConfigVersion — a configuration version resolved by reconstruct. */
export interface ResolvedConfigVersion {
  /** Sealed auto-handover-on-escalation policy in effect, e.g. `{"enabled":true,"escalation_threshold":0.6}`. */
  auto_handover_config?: Record<string, unknown>;
  /** Server-generated UUID primary key of the configuration. */
  config_id?: string;
  /** SHA-256 hex digest of the canonical JSON of this configuration. */
  config_seal_hash?: string;
  /** Server-generated creation timestamp (UTC). */
  created_at?: string;
  /** Set when the configuration has been soft-deleted. */
  deleted_at?: string;
  /** Human-readable configuration name. */
  name?: string;
  /** Sealed pii_encryption value of this configuration version. */
  pii_encryption?: boolean;
  /** UUID of the owning tenant. */
  tenant_id?: string;
  /** Last-update timestamp (UTC). */
  updated_at?: string;
  /** Monotonically increasing version number at the time of the call. */
  version?: number;
  /** ISO 3166-1 alpha-2 codes the version applied to. */
  countries?: string[];
  /** Per-check validator mode map ("enforce" | "shadow" | "off"). */
  validator_modes?: Record<string, string>;
  /** Blocklist patterns (terms, severity) in effect for this version. */
  blocklist_patterns?: BlocklistPattern[];
  /** Pricing constraints per product category. */
  pricing_bands?: Record<string, unknown>;
  /** Consent-gating rules: `{"rules":[...]}`. */
  consent_config?: Record<string, unknown>;
  /** Per-language AI disclosure texts. */
  disclosure_texts?: Record<string, unknown>;
  /** Per-language fallback response strings. */
  fallback_response?: Record<string, unknown>;
  /** Output-constraint enforcement config. */
  output_constraint?: Record<string, unknown>;
  /** Prompt-confidentiality configuration. */
  prompt_confidentiality_config?: PromptConfidentialityConfig;
  /** Agent-initiated end-of-call policy. */
  end_call?: TenantEndCallConfig;
  /** Voicemail-detection handling policy. */
  voicemail?: TenantVoicemailConfig;
  /** Static agent greeting spoken verbatim via TTS at connect. */
  begin_message?: string;
  /** Concrete LLM model this version was sealed to run under. */
  llm_model?: string;
  /** LLM provider for `llm_model`. */
  llm_provider?: string;
}

// ─── Evidence Layer — calls, summaries, violations ────────────────
//
// Wire types for GET /v1/calls, GET /v1/calls/{call_id}, GET
// /v1/calls/{call_id}/recording, GET /v1/calls/{call_id}/summary, and GET
// /v1/violations. Field names mirror the Go JSON tags verbatim
// (snake_case).

/** Call direction: "inbound" or "outbound" (evidence.CallRecord / evidence.CallDetail `direction`). */
export type CallDirection = "inbound" | "outbound";

/** One call in the paginated GET /v1/calls list (evidence.CallRecord). */
export interface CallRecord {
  call_id: string;
  tenant_id: string;
  direction: CallDirection;
  /** Media channel: "webrtc" (browser) or "pstn". Absent for historical calls recorded before the channel column existed. */
  channel?: string;
  status: string;
  /** Arbitrary per-call metadata, serialized as a JSON string. */
  metadata: string;
  started_at: string;
  /** Null while the call is still active. */
  ended_at?: string;
  created_at: string;
}

/** Response from GET /v1/calls. */
export interface GetCallsResponse {
  /** Empty array (never null) when no calls match the filters. */
  calls: CallRecord[];
  has_more: boolean;
  /** Omitted when has_more is false. */
  next_cursor?: string;
}

/** Query filters accepted by {@link EvidenceClient.listCalls}. */
export interface ListCallsOptions {
  date_from?: string;
  date_to?: string;
  status?: "active" | "completed" | "failed" | "abandoned";
  verdict?: string;
  shadow?: boolean;
  country?: string;
  cursor?: string;
  limit?: number;
}

/** A single transcript turn (evidence.TranscriptTurn) — VERBATIM, PII intact. */
export interface TranscriptTurn {
  role: "agent" | "human";
  content: string;
}

/** Finalized composite compliance score for a call (evidence.CallComplianceScore). */
export interface CallComplianceScore {
  composite: number;
  total_turns: number;
  turns_with_violations: number;
  fail_open_count: number;
}

/**
 * Full call detail returned by GET /v1/calls/{call_id} (evidence.CallDetail).
 *
 * `transcript` is empty (never null) until the call_summary event has been
 * produced, and stays empty if decryption fails. `agent_id`,
 * `compliance_score`, and `evidence_link` are not currently populated.
 */
export interface CallDetail {
  call_id: string;
  tenant_id: string;
  direction: CallDirection;
  status: string;
  connected?: boolean;
  termination_class?:
    | "answered"
    | "no_answer"
    | "busy"
    | "rejected"
    | "invalid_destination"
    | "voicemail"
    | "carrier_error";
  sip_response_code?: number;
  metadata: string;
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  recording_available: boolean;
  recording_ref?: string;
  transcript: TranscriptTurn[];
  /**
   * Why `transcript` is (or is not) populated, so an empty list is never
   * ambiguous: "ok" = decrypted (text carries PII tokens, returned as stored);
   * "none" = no transcript stored yet; "unavailable" = a transcript exists but
   * could not be decrypted; "erased" = the tenant's PII keyring was destroyed.
   */
  transcript_status?: "ok" | "none" | "unavailable" | "erased";
  /**
   * The call's PII mode fixed at call start: "encrypt" or "redact"; null when
   * not recorded (calls recorded before PII modes existed).
   */
  pii_mode?: "encrypt" | "redact" | null;
  agent_id?: string;
  compliance_score?: CallComplianceScore;
  evidence_link?: string;
}

/** Response from GET /v1/calls/{call_id}/recording (evidence.RecordingResponse). */
export interface RecordingResponse {
  call_id: string;
  /** Short-lived (15-minute) signed URL. Never proxied through the evidence-layer. */
  url: string;
  expires_at: string;
}

/** End-of-call detection context (evidence.CallEndSummary). */
export interface CallEndSummary {
  detected_at?: string;
  termination_reason?: string;
  termination_confidence?: number;
  termination_matched_phrase_key?: string;
  voicemail_detected?: boolean;
  voicemail_reason?: string;
  voicemail_confidence?: number;
  voicemail_matched_phrase_key?: string;
  disclosure_skipped_voicemail?: boolean;
  disclosure_skip_reason?: string;
}

/** Latest warm-handover context for a call (evidence.HandoverSummary). */
export interface HandoverSummary {
  handover_id: string;
  handover_reason?: string;
  whisper_mode?: boolean;
  /** SHA-256 hex digest of the destination. Never the raw destination (PII policy). */
  destination_hash?: string;
  summary_text?: string;
  summary_source?: string;
  outcome?: string;
  completed_at?: string;
}

/**
 * Composite call view returned by GET /v1/calls/{call_id}/summary
 * (evidence.CallSummary). Reduces 5 chained API calls to 1.
 */
export interface CallSummary {
  call_id: string;
  tenant_id: string;
  status: string;
  started_at: string;
  ended_at?: string;
  event_count: number;
  allow_count: number;
  block_count: number;
  modify_count: number;
  /** Nil when the call never triggered a handover. */
  handover?: HandoverSummary;
  /** Nil when the call never recorded a CALL_END_DETECTED event. */
  call_end?: CallEndSummary;
  /**
   * Whether the post-call analysis below is available: "ok" once the
   * call_summary event was produced and stored, "none" before that,
   * "unavailable" when the stored analysis could not be decrypted.
   */
  analysis_status?: "ok" | "none" | "unavailable";
  /** Post-call summary status, as delivered in the call_summary webhook. */
  summary_status?: "ok" | "degraded" | "disabled";
  /** Post-call sentiment, e.g. "positive". */
  sentiment?: string;
  /** Post-call disposition, e.g. "callback_requested". */
  disposition?: string;
  /** Key facts extracted from the call. Detected PII spans are vault tokens. */
  key_facts?: string[];
  /** `{"values": {...}, "status": "ok"|"degraded"}`, or null when post_call_extraction is not enabled for the agent. */
  extraction?: Record<string, unknown> | null;
}

/** One non-ALLOW CHECK_RESULT evidence event (evidence.ViolationRecord). */
export interface ViolationRecord {
  event_id: string;
  call_id: string;
  tenant_id: string;
  event_type: string;
  sequence: number;
  hash: string;
  timestamp: string;
  /** Canonical event payload (contains result, rule_id, etc.), serialized as a JSON string. */
  data: string;
}

/** Response from GET /v1/violations. */
export interface GetViolationsResponse {
  /** Empty array (never null) when no violations match the filters. */
  violations: ViolationRecord[];
  has_more: boolean;
  /** Omitted when has_more is false. */
  next_cursor?: string;
}

/** Query filters accepted by {@link EvidenceClient.listViolations}. */
export interface ListViolationsOptions {
  call_id?: string;
  date_from?: string;
  date_to?: string;
  verdict?: string;
  cursor?: string;
  limit?: number;
}

// ─── Evidence Layer — Article 50 evidence export ─────────────────
//
// Wire types for GET /v1/calls/{call_id}/article50-report and GET
// /v1/evidence-exports/{call_id}. Nested sub-objects are typed to match
// the server JSON verbatim (snake_case).

/** article50.ConfigurationSeal — binds the report to the CALL_START configuration. */
export interface Article50ConfigurationSeal {
  call_config_seal_hash: string;
  config_version: number;
  policy_version: string;
  seal_algorithm: string;
}

/** article50.Acknowledgement — the disclosure-delivered attestation. */
export interface Article50Acknowledgement {
  type: string;
  basis: string;
  event_id: string;
  event_hash: string;
}

/** article50.DisclosureLanguageFallback — set when the served language differs from the configured one. */
export interface Article50DisclosureLanguageFallback {
  from: string;
  to: string;
}

/** article50.Disclosure — the Article 50 disclosure + delivery attestation section. */
export interface Article50Disclosure {
  status: string;
  jurisdiction: string;
  delivered: boolean;
  played_at?: string;
  utterance?: string;
  language?: string;
  language_fallback?: Article50DisclosureLanguageFallback;
  duration_ms?: number;
  config_seal_hash: string;
  /** Nil when status == "not_required". */
  acknowledgement?: Article50Acknowledgement;
}

/** article50.EventIndexEntry — one hash-only per-event index row. */
export interface Article50EventIndexEntry {
  sequence: number;
  event_type: string;
  hash: string;
  previous_hash: string;
  timestamp: string;
}

/** article50.EvidenceChain — the full hash-chain integrity section. */
export interface Article50EvidenceChain {
  chain_status: string;
  event_count: number;
  genesis_hash: string;
  head_hash: string;
  /** Compact, hash-only per-event index. NEVER includes raw event_data/transcripts. */
  events: Article50EventIndexEntry[];
  ordering?: string;
}

/** article50.MerkleProofStep — one Merkle authentication path step. */
export interface Article50MerkleProofStep {
  hash: string;
  position: "left" | "right";
}

/** article50.BranchProof — a Merkle inclusion branch proof. */
export interface Article50BranchProof {
  leaf_hash: string;
  leaf_index: number;
  leaf_count: number;
  pad_count: number;
  tree_depth: number;
  steps: Article50MerkleProofStep[];
  root: string;
}

/** article50.AnchoredEvent — the terminal (chain-head) event a Merkle proof anchors. */
export interface Article50AnchoredEvent {
  hash: string;
  sequence: number;
}

/** article50.MerkleProof — the cross-tenant Merkle branch proof section. */
export interface Article50MerkleProof {
  status: "available" | "pending" | "unavailable";
  /** Populated only when status == "available". */
  anchored_event?: Article50AnchoredEvent;
  tenant_leaf?: string;
  merkle_root?: string;
  /** Populated only when status == "available". */
  event_inclusion_proof?: Article50BranchProof;
  /** Populated only when status == "available". */
  cross_tenant_proof?: Article50BranchProof;
  window_id?: string;
  /** Populated only when status == "pending". An estimate, not a guarantee. */
  available_after?: string;
  /** Populated only when status == "pending". */
  retrieve_via?: string;
}

/** article50.ReceiptRef — one compliance receipt reference in an Article 50 report. */
export interface Article50ReceiptRef {
  event_id: string;
  sequence: number;
  turn: number;
  verdict: Verdict | string;
  input_hash: string;
  /** Present on MODIFY events. */
  output_hash?: string;
  receipt_format_version: string;
  auth_mechanism: string;
  signature: string;
  verifiability: "verifiable" | "unverifiable_pre_horizon" | "unknown";
}

/** article50.TSATimestamp — the RFC 3161 trusted-timestamp section. */
export interface Article50TSATimestamp {
  status: "available" | "pending" | "unavailable";
  covers?: string;
  timestamp_time?: string;
  /** Base64-encoded DER RFC 3161 TimeStampToken. Populated only when status == "available". */
  timestamp_token?: string;
  tsa_url?: string;
}

/** article50.Signature — the report-level ECDSA-P256 tamper seal. */
export interface Article50Signature {
  auth_mechanism: string;
  key_id: string;
  public_key_url: string;
  scope: string;
  /** Hex-encoded ASN.1 DER ECDSA(r,s) signature. Empty until Sign is called. */
  value: string;
}

/**
 * The signed Article 50 evidence export (article50.Report) returned by
 * {@link EvidenceClient.getArticle50Report} and
 * {@link EvidenceClient.getEvidenceExport} (format=json).
 */
export interface Article50Report {
  report_type: string;
  report_format_version: string;
  call_id: string;
  tenant_id: string;
  /** "inbound" or "outbound". Omitted for calls recorded before direction was added to CALL_START. */
  direction?: "inbound" | "outbound";
  /** Call transport axis: "webrtc" for browser-originated test calls, "pstn" otherwise. */
  channel?: string;
  generated_at: string;
  configuration_seal: Article50ConfigurationSeal;
  disclosure: Article50Disclosure;
  evidence_chain: Article50EvidenceChain;
  receipts: Article50ReceiptRef[];
  merkle_proof: Article50MerkleProof;
  tsa_timestamp: Article50TSATimestamp;
  signature: Article50Signature;
}

/** Query options accepted by {@link EvidenceClient.getArticle50Report}. */
export interface GetArticle50ReportOptions {
  /** Output format: "json" (default) or "pdf". */
  format?: "json" | "pdf";
}

/** Query options accepted by {@link EvidenceClient.getEvidenceExport}. */
export interface GetEvidenceExportOptions {
  /** Output format override. Defaults to the token's format. */
  format?: "json" | "pdf";
}

// ─── Evidence Layer — C2PA content credentials ───────────────────
//
// Wire types for POST /v1/calls/{call_id}/c2pa.

/** c2pa.ClaimGeneratorInfo — one generator name/version pair. */
export interface C2PAClaimGeneratorInfo {
  name: string;
  version: string;
}

/** c2pa.C2PAClaim — describes the asset and the software that produced the manifest. */
export interface C2PAClaim {
  claim_generator: string;
  claim_generator_info: C2PAClaimGeneratorInfo[];
  "dc:format": string;
  "dc:title": string;
}

/** c2pa.MerkleProofReference — populated when an aggregation window covers the call. */
export interface C2PAMerkleProofReference {
  window_id: string;
  merkle_root: string;
  leaf_hash: string;
  /** True when the full proof steps can be retrieved from GET /v1/proofs/{window_id}. */
  proof_available: boolean;
}

/** c2pa.ReceiptReference — one compliance receipt reference in a C2PA manifest. */
export interface C2PAReceiptReference {
  event_id: string;
  /** SHA-256 hex digest of the event hash for this receipt. */
  receipt_hash: string;
  verdict: string;
}

/** c2pa.ComplianceAssertionData — the factual compliance payload of a C2PA assertion. */
export interface C2PAComplianceAssertionData {
  call_id: string;
  tenant_id: string;
  overall_compliance: "compliant" | "partial" | "non_compliant" | "unknown";
  segments_validated: number;
  segments_compliant: number;
  segments_modified: number;
  evidence_chain_verified: boolean;
  delivery_attestation_status: "attested" | "not_attested" | "failed";
  /** Nil when no aggregation window covers this call. */
  merkle_proof_reference?: C2PAMerkleProofReference;
  receipt_references: C2PAReceiptReference[];
}

/** The com.audact.compliance assertion — always assertions[0]. */
export interface C2PAComplianceAssertion {
  label: "com.audact.compliance";
  data: C2PAComplianceAssertionData;
}

/** One entry of a standard c2pa.actions assertion (C2PA 2.2 action schema). */
export interface C2PAAction {
  action: string;
  /** IPTC digital source type URI, e.g. ".../compositeSynthetic". */
  digitalSourceType: string;
  softwareAgent: C2PAClaimGeneratorInfo;
  description: string;
}

/** The standard c2pa.actions assertion declaring AI-generated content. */
export interface C2PAActionsAssertion {
  label: "c2pa.actions";
  data: { actions: C2PAAction[] };
}

/** The standard c2pa.hash.data assertion: the hard binding to the asset bytes. */
export interface C2PAHashDataAssertion {
  label: "c2pa.hash.data";
  data: {
    alg: "sha256";
    /** Hex-encoded SHA-256 of the bound asset. */
    hash: string;
    name: string;
  };
}

/** c2pa.C2PAAssertion — a factual statement about the asset. */
export type C2PAAssertion =
  | C2PAComplianceAssertion
  | C2PAActionsAssertion
  | C2PAHashDataAssertion;

/** The asset the manifest is hard-bound to. */
export interface C2PAAssetRef {
  kind: "recording" | "evidence_export";
  media_type: string;
  /** Hex-encoded SHA-256 of the asset bytes. */
  sha256: string;
  /** Relative API path of the asset download. */
  url: string;
}

/** Reference to the stored sidecar manifest store (.c2pa). */
export interface C2PAManifestStoreRef {
  /** Always `application/c2pa`. */
  media_type: string;
  sha256: string;
  /** Relative API path of the manifest-store download. */
  url: string;
}

/**
 * Public facts about the certificate that signed the claim. Never contains key
 * material.
 */
export interface C2PASigningCredential {
  subject: string;
  issuer: string;
  serial: string;
  not_before: string;
  not_after: string;
  fingerprint_sha256: string;
  /**
   * `self_signed`: top certificate is self-issued and is the Audact root (not
   * on the C2PA Trust List yet). `ca_issued` otherwise.
   */
  trust: "self_signed" | "ca_issued";
}

/**
 * The signed C2PA content credential manifest (c2pa.C2PAManifest) returned by
 * {@link EvidenceClient.generateC2PAManifest}.
 */
export interface C2PAManifest {
  manifest_id: string;
  call_id: string;
  claim: C2PAClaim;
  /** [0] the compliance assertion, [1] c2pa.actions, [2] c2pa.hash.data. */
  assertions: C2PAAssertion[];
  /** Always `"ES256"` (X.509 chain-backed COSE signature). */
  signature_algorithm: string;
  asset: C2PAAssetRef;
  manifest_store: C2PAManifestStoreRef;
  signing_credential: C2PASigningCredential;
  generated_at: string;
}

/** The stored subset of {@link C2PASigningCredential} carried by a list item. */
export type C2PAListSigner = Pick<C2PASigningCredential, "fingerprint_sha256" | "trust">;

/** One entry of {@link C2PAManifestListResponse} (stored-row summary). */
export interface C2PAManifestListItem {
  manifest_id: string;
  call_id: string;
  signature_algorithm: string;
  asset: C2PAAssetRef;
  manifest_store: C2PAManifestStoreRef;
  signing_credential: C2PAListSigner;
  generated_at: string;
}

/** Response of GET /v1/calls/{call_id}/c2pa (newest first). */
export interface C2PAManifestListResponse {
  manifests: C2PAManifestListItem[];
  /** Opaque cursor for the next page; absent at the end. */
  next_cursor?: string;
}

/** Options for {@link EvidenceClient.listC2PAManifests}. */
export interface ListC2PAManifestsOptions {
  /** Page size (server default 50, max 200). */
  limit?: number;
  /** `next_cursor` from a previous response. */
  cursor?: string;
}

// ─── Evidence Layer — compliance receipts ─────────────────────────
//
// Wire types for GET /v1/receipts/{call_id} (tag `receipts`).

/**
 * Response from GET /v1/receipts/{call_id} (validator.GetReceiptResponse).
 *
 * `verifiability` explains the `hmac_valid` result: `"unverifiable_pre_horizon"`
 * means the receipt predates RECEIPT_HMAC_KEY provisioning and does NOT
 * indicate tampering (see docs/receipt-hmac-key-provisioning.md §6).
 */
export interface GetReceiptResponse {
  receipt: Receipt;
  hmac_valid: boolean;
  verifiability: "verifiable" | "unverifiable_pre_horizon" | "unknown";
}

// ─── Evidence Layer — delivery attestation ────────────────────────
//
// Wire types for GET /v1/calls/{call_id}/delivery and POST
// /v1/delivery-confirmation.

/** One per-turn delivery confirmation slot (delivery.TurnDeliveryStatus). */
export interface TurnDeliveryStatus {
  /**
   * How many delivery confirmations exist for this turn. When more than 1,
   * the other fields describe the worst of them. Omitted while pending.
   */
  confirmation_count?: number;
  /** Evidence quality grade: "independent", "platform_sourced", or "unconfirmed". */
  confirmation_grade?: "independent" | "platform_sourced" | "unconfirmed";
  turn_number: number;
  status: "pending" | "confirmed" | "mismatch" | "unconfirmed";
  mechanism?: "webhook" | "api_query" | "tts_completion" | "audio_monitoring";
  /** Nil while delivery is still pending. */
  content_match?: boolean;
  /** Omitted when content_match is nil or true. */
  mismatch_severity?: "benign" | "material";
  /** Omitted when there is no mismatch. */
  mismatch_type?: string;
  /** SHA-256 hex digest of (validation_event_hash || confirmation_hash). Present after processing. */
  linking_hash?: string;
  /** Nil while still pending. */
  confirmed_at?: string;
}

/**
 * Request body for POST /v1/delivery-confirmation (delivery.confirmationRequest).
 *
 * SEC-031: `delivered_text`/`asr_transcription` are read-only server-side and
 * zeroed after use — the SDK never logs these fields.
 */
export interface ConfirmDeliveryRequest {
  call_id: string;
  turn_number: number;
  mechanism: string;
  delivered_text?: string;
  audio_hash?: string;
  asr_transcription?: string;
  asr_confidence?: number;
  platform_timestamp?: string;
  /** True when the delivered audio was interrupted (barge-in). */
  interrupted?: boolean;
  /** The texts the proxy streamed for this turn, one entry per stream chunk, verbatim. */
  validated_segments?: string[];
  /** How many LEADING `validated_segments` entries were fully played to the caller (0..len). */
  delivered_segments?: number;
}

/** Response from POST /v1/delivery-confirmation (delivery.ProcessConfirmationResult). */
export interface ConfirmDeliveryResponse {
  /** UUID of the DELIVERY_ATTESTATION evidence event written to the chain. */
  attestation_event_id: string;
  confirmation_grade: "independent" | "platform_sourced";
  content_match: boolean;
  /** Empty when content_match is true. */
  mismatch_severity?: "benign" | "material";
  /** Omitted when content_match is true. */
  mismatch_type?: string;
  /** SHA-256 hex digest binding this attestation to the validation event (Patent 3 Claim 8). */
  linking_hash: string;
}

// ─── Evidence Layer — transcript reconciliation ──────────────────
//
// Wire types for POST /v1/transcript-reconciliation (tag `reconciliation`).
// The Go handler declares both request and response as a generic JSON object
// in the swagger spec; the shapes below reflect the documented field names.

/** One transcript segment submitted for reconciliation. */
export interface TranscriptReconciliationSegment {
  turn_number: number;
  text: string;
  [key: string]: unknown;
}

/** Request body for POST /v1/transcript-reconciliation. */
export interface ReconcileTranscriptRequest {
  call_id: string;
  segments: TranscriptReconciliationSegment[];
  /** Identifies the transcript source, e.g. "post_call_asr". */
  source: string;
}

/** One per-segment reconciliation result. */
export interface TranscriptSegmentResult {
  /** Corresponds to the segment's turn_number. */
  sequence_number?: number;
  /** "matched", "mismatched", or "unvalidated". */
  status?: "matched" | "mismatched" | "unvalidated";
  /** Populated only when `status` is "mismatched". */
  mismatch_classification?: string;
  /** Server-computed SHA-256 of the transcript segment text. */
  transcript_hash?: string;
  /** SHA-256 stored in the validation event, if present. */
  validated_hash?: string;
  /** @deprecated not on the wire; use `sequence_number`. */
  turn_number?: number;
  /** @deprecated not on the wire; use `status === "matched"`. */
  matched?: boolean;
  [key: string]: unknown;
}

/** Response from POST /v1/transcript-reconciliation. */
export interface ReconcileTranscriptResponse {
  call_id: string;
  total_segments: number;
  matched_segments: number;
  mismatched_segments: number;
  unvalidated_segments: number;
  segment_results: TranscriptSegmentResult[];
  /** Number of semantic cross-turn contradictions recorded. Zero unless `cross_turn_status` is "completed". */
  cross_turn_finding_count?: number;
  /** Advisory semantic contradiction findings. Omitted when none were recorded. */
  cross_turn_findings?: CrossTurnFinding[];
  /** LLM model that analysed the transcript. Present only when `cross_turn_status` is "completed". */
  cross_turn_model?: string;
  /** LLM provider that analysed the transcript. */
  cross_turn_provider?: string;
  /** Whether the semantic cross-turn contradiction pass ran. */
  cross_turn_status?: CrossTurnStatus;
}

/** reconciliation.ReconciliationResultDoc.cross_turn_status values. */
export type CrossTurnStatus =
  | "disabled"
  | "skipped_insufficient_turns"
  | "skipped_unknown_provider"
  | "completed"
  | "failed";

/** reconciliation.CrossTurnFindingDoc — an advisory cross-turn contradiction. */
export interface CrossTurnFinding {
  /** Model's self-reported confidence. */
  confidence?: "low" | "medium" | "high";
  /** Coarse category of the contradiction. */
  kind?: "opening_hours" | "closing_hours" | "price" | "availability" | "policy" | "commitment" | "fact" | "other";
  /** Short (at most 300 characters) description of the contradiction. */
  summary?: string;
  /** sequence_number of the earlier conflicting agent statement. */
  turn_a?: number;
  /** sequence_number of the later conflicting agent statement. */
  turn_b?: number;
}

// ─── Tenant Management ───────────────────────────────────────────────────────

/**
 * Request body for POST /v1/tenants.
 */
export interface CreateTenantRequest {
  /** Human-readable tenant name. Required. */
  name: string;
  /** Billing tier: "starter" | "professional" | "enterprise". Defaults to "starter". */
  plan?: "starter" | "professional" | "enterprise";
  /** Label for the tenant's first API key. Defaults to "default". */
  key_name?: string;
}

/**
 * API key info returned in the combined POST /v1/tenants response.
 * The `key` field contains the full plaintext key returned EXACTLY ONCE.
 */
export interface CreateTenantAPIKeyInfo {
  /** Stable UUID for this key. */
  key_id: string;
  /**
   * Full plaintext API key (e.g. "aud_live_...").
   * RETURNED ONCE — store it securely immediately.
   */
  key: string;
  /** First 8 characters of the key, stored for display. */
  key_prefix: string;
  /** Human-readable label. */
  name: string;
  /** RBAC role: "owner" for the first key. */
  role: string;
}

/**
 * Response from POST /v1/tenants.
 */
export interface CreateTenantResponse {
  tenant_id: string;
  name: string;
  plan: string;
  hmac_key_arn: string;
  created_at: string;
  updated_at: string;
  api_key: CreateTenantAPIKeyInfo;
}

/**
 * Tenant record returned by GET /v1/tenants/{tenant_id}.
 */
export interface Tenant {
  tenant_id: string;
  name: string;
  plan: string;
  hmac_key_arn: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request body for PATCH /v1/tenants/{tenant_id}.
 */
export interface UpdateTenantRequest {
  name?: string;
  plan?: "starter" | "professional" | "enterprise";
}

/**
 * Optional query filters for GET /v1/tenants/{tenant_id}/usage.
 */
export interface GetTenantUsageOptions {
  /** Inclusive start of billing window (RFC3339). */
  period_start?: string;
  /** Exclusive end of billing window (RFC3339). */
  period_end?: string;
}

/**
 * Aggregated usage statistics for a tenant's billing period, returned by
 * GET /v1/tenants/{tenant_id}/usage. An all-zero record (tenant_id/period
 * populated) is returned when no usage row exists yet for the requested
 * period.
 */
export interface UsageRecord {
  /** Server-generated UUID primary key. */
  usage_id: string;
  /** UUID of the tenant this record belongs to. */
  tenant_id: string;
  /** Inclusive start of the aggregation window (UTC). */
  period_start: string;
  /** Exclusive end of the aggregation window (UTC). */
  period_end: string;
  /** Total number of calls during the period. */
  calls_total: number;
  /** Number of inbound calls during the period. */
  calls_inbound: number;
  /** Number of outbound calls during the period. */
  calls_outbound: number;
  /** Number of Validator invocations during the period. */
  validator_checks: number;
  /** Number of evidence events written to the append-only log. */
  evidence_events_count: number;
  /** Number of fail-open events (Validator timed out / circuit-broke). */
  fail_open_count: number;
  /** Total LLM input token consumption for cost tracking. */
  llm_tokens_in: number;
  /** Total LLM output token consumption for cost tracking. */
  llm_tokens_out: number;
  /** Server-generated creation timestamp (UTC). */
  created_at: string;
  /** Server-generated last-update timestamp (UTC). */
  updated_at: string;
  /**
   * Where the counts come from: `"stored"` for a persisted usage record,
   * `"live"` when they were counted on request from the tenant's calls and
   * evidence events (a live record has a zero `usage_id` and
   * `created_at`/`updated_at` set to the time it was computed).
   */
  source?: UsageRecordSource;
}

/** Origin of a {@link UsageRecord}'s counts. */
export type UsageRecordSource = "stored" | "live";

/**
 * An API key record (without the raw key).
 */
export interface APIKey {
  api_key_id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  role: string;
  created_at: string;
  /** Optional expiry timestamp; absent means never expires. */
  expires_at?: string;
  revoked_at?: string;
  /** Authorised operations for this key. An empty list means no scope restrictions. */
  scopes?: string[];
}

/**
 * Request body for POST /v1/tenants/{tenant_id}/keys.
 */
export interface GenerateKeyRequest {
  /** Human-readable label for this key. Required. */
  name: string;
  /** RBAC role: "owner" | "developer" | "viewer". Defaults to "owner". */
  role?: "owner" | "developer" | "viewer";
}

/**
 * Response from POST /v1/tenants/{tenant_id}/keys.
 * The `key` field contains the full plaintext key returned EXACTLY ONCE.
 */
export interface GenerateKeyResponse extends APIKey {
  /**
   * Full raw API key value.
   * RETURNED ONCE — store it securely immediately.
   */
  key: string;
}

/**
 * Response from GET /v1/tenants/{tenant_id}/keys.
 */
export interface ListKeysResponse {
  keys: APIKey[];
  /** @deprecated not sent by the server; use `has_more` / `next_cursor`. Always undefined. */
  total?: number;
  /** True when additional keys exist beyond this page. */
  has_more?: boolean;
  /** Opaque cursor to pass as `cursor` to fetch the next page. Empty when `has_more` is false. */
  next_cursor?: string;
}

/**
 * A single blocklist pattern entry in a tenant configuration.
 */
export interface BlocklistPattern {
  /** Unique identifier for this pattern within the config. */
  id: string;
  /** List of search terms. At least one, at most 50. */
  terms: string[];
  /** Action taken on match: "modify" | "block". */
  severity: "modify" | "block";
  /** Substitute string when severity == "modify". Auto-escalates to "block" if empty. */
  replacement_text?: string;
  /** Optional label for grouping related patterns. */
  category?: string;
}

/**
 * Sealed settings for the prompt_confidentiality validator.
 * Snake_case fields match the API.
 */
export interface PromptConfidentialityConfig {
  /** Inject anti-disclosure hardening into the agent prompt. */
  hardening: boolean;
  /** Plant canary tokens in the prompt and detect them in output. */
  canary: boolean;
  /** Enable n-gram overlap detection against the prompt. */
  ngram: boolean;
  /** Phrase length in words for n-gram matching (4-8). */
  ngram_size: number;
  /** Minimum n-gram matches to count as a detection (1-10). */
  ngram_min_matches: number;
  /** Phrases exempt from n-gram detection. */
  allowlist_phrases: string[];
}

/**
 * Request body for POST /v1/configurations.
 */
export interface CreateConfigurationRequest {
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** Human-readable name for this configuration. */
  name: string;
  /** ISO 3166-1 alpha-2 country codes. Supported: NL, DE, BE, FR, IE, AT, IT, ES. */
  countries: string[];
  /** Blocklist patterns. Maximum 1000 entries. */
  blocklist_patterns?: BlocklistPattern[];
  /** Per-check validator mode (e.g. "enforce", "shadow", "off"). */
  validator_modes?: Record<string, string>;
  /** Sealed settings for the prompt_confidentiality check. */
  prompt_confidentiality_config?: PromptConfidentialityConfig;
  /** ASR provider configuration (M9 BYOK). Keys live in Secrets Manager. */
  asr_config?: Record<string, unknown>;
  /** Auto-handover-on-escalation policy, e.g. `{"enabled":true,"escalation_threshold":0.6}`. */
  auto_handover_config?: Record<string, unknown>;
  /** Consent-gating rules: `{"rules":[...]}`. */
  consent_config?: Record<string, unknown>;
  /** Per-language AI disclosure texts. */
  disclosure_texts?: Record<string, unknown>;
  /** Agent-initiated end-of-call policy. An empty object means off. */
  end_call?: TenantEndCallConfig;
  /** Per-language fallback response strings. */
  fallback_response?: Record<string, unknown>;
  /** Multi-candidate generation config (M7). */
  multi_candidate?: Record<string, unknown>;
  /** Output-constraint enforcement config (M7). */
  output_constraint?: Record<string, unknown>;
  /** Pricing constraints per product category. */
  pricing_bands?: Record<string, unknown>;
  /** Opts the configuration into call recording. Defaults to false. */
  record_calls?: boolean;
  /** Overrides the platform default recording retention window, in days. */
  recording_retention_days?: number;
  /** Base URL of the tenant's upstream LLM endpoint. */
  upstream_llm_url?: string;
  /** Voicemail-detection handling policy. Disabled by default. */
  voicemail?: TenantVoicemailConfig;
  /** Raw API key / bearer token for `upstream_llm_url`; the service stores it in Secrets Manager and never returns it. */
  upstream_llm_key?: string;
  /** Rejected if client-supplied; the service derives the ARN from `upstream_llm_key`. */
  upstream_llm_secret_arn?: string;
}

/**
 * A persisted tenant configuration.
 */
export interface TenantConfiguration {
  config_id: string;
  tenant_id: string;
  name: string;
  countries: string[];
  blocklist_patterns: BlocklistPattern[];
  config_seal_hash: string;
  version: number;
  created_at: string;
  updated_at: string;
  validator_modes?: Record<string, string>;
  prompt_confidentiality_config?: PromptConfidentialityConfig;
  /** ASR provider configuration (M9 BYOK). Keys live in Secrets Manager. */
  asr_config?: Record<string, unknown>;
  /** Auto-handover-on-escalation policy, e.g. `{"enabled":true,"escalation_threshold":0.6}`. */
  auto_handover_config?: Record<string, unknown>;
  /** Consent-gating rules: `{"rules":[...]}`. */
  consent_config?: Record<string, unknown>;
  /** Per-language AI disclosure texts. */
  disclosure_texts?: Record<string, unknown>;
  /** Agent-initiated end-of-call policy. An empty object means off. */
  end_call?: TenantEndCallConfig;
  /** Per-language fallback response strings. */
  fallback_response?: Record<string, unknown>;
  /** Multi-candidate generation config (M7). */
  multi_candidate?: Record<string, unknown>;
  /** Output-constraint enforcement config (M7). */
  output_constraint?: Record<string, unknown>;
  /** Pricing constraints per product category. */
  pricing_bands?: Record<string, unknown>;
  /** Opts the configuration into call recording. Defaults to false. */
  record_calls?: boolean;
  /** Overrides the platform default recording retention window, in days. */
  recording_retention_days?: number;
  /** Base URL of the tenant's upstream LLM endpoint. */
  upstream_llm_url?: string;
  /** Voicemail-detection handling policy. Disabled by default. */
  voicemail?: TenantVoicemailConfig;
  /** Sealed copy of the tenant's PII encryption switch. */
  pii_encryption_enabled?: boolean;
  /** Set when the configuration has been soft-deleted. */
  deleted_at?: string;
  /** Static agent greeting spoken verbatim via TTS at connect. */
  begin_message?: string;
  /** "Who speaks first" policy. */
  start_speaker?: string;
  /** Concrete LLM model this configuration is sealed to run under. */
  llm_model?: string;
  /** LLM provider for `llm_model`. */
  llm_provider?: string;
  /** Secrets Manager ARN holding the upstream LLM key. */
  upstream_llm_secret_arn?: string;
  /** Custom post-call extraction schema. */
  post_call_extraction?: TenantPostCallExtractionConfig;
  /** Post-call summary policy. */
  post_call_summary?: TenantPostCallSummaryConfig;
}

/** tenant.EndCallConfig — agent-initiated end-of-call policy. */
export interface TenantEndCallConfig {
  /** Locale -> fixed line spoken immediately before hanging up. */
  closing_line?: Record<string, string>;
  /** Ends the call when the caller stops speaking (raw object, see the API reference). */
  silence?: Record<string, unknown>;
  /** Locale -> goodbye phrases that end the call when detected at the end of the caller's utterance. */
  trigger_phrases?: Record<string, string[]>;
}

/** tenant.VoicemailConfig — voicemail-detection handling policy. */
export interface TenantVoicemailConfig {
  /** Expected voicemail beep tone frequency (Hz). */
  beep_hz?: number;
  /** Behaviour once voicemail is detected. */
  branch?: "leave_message" | "hangup";
  /** Maximum time (ms) the detector has to reach a decision. */
  decision_window_ms?: number;
  /** Turns voicemail handling on/off. */
  enabled?: boolean;
  /** Locale -> message left when `branch` is "leave_message". */
  message?: Record<string, string>;
}

/** tenant.ExtractionField — one typed field of a post-call extraction schema. */
export interface TenantExtractionField {
  /** Natural-language extraction instruction (<= 256 characters). */
  description?: string;
  /** Constrains a "string" field; only "date-time" is supported. */
  format?: "date-time";
  /** JSON key in `data.extraction`; must match `^[a-z0-9_]{1,40}$`. */
  name?: string;
  /** Extracted value type. */
  type?: "string" | "boolean" | "number" | "enum";
  /** Allowed values when `type` is "enum". */
  values?: string[];
}

/** tenant.PostCallExtractionConfig — custom post-call extraction schema. */
export interface TenantPostCallExtractionConfig {
  /** Opts the agent into custom post-call extraction. */
  enabled?: boolean;
  /** Typed fields the LLM extracts from the finished transcript. */
  fields?: TenantExtractionField[];
}

/** tenant.PostCallSummaryConfig — post-call summary policy. */
export interface TenantPostCallSummaryConfig {
  /** Disposition values the LLM must choose from when enabled. */
  dispositions?: string[];
  /** Opts the agent into post-call summary generation. */
  enabled?: boolean;
}

/**
 * Response from GET /v1/configurations listing multiple configs.
 */
export interface ListConfigurationsResponse {
  configurations: TenantConfiguration[];
  /** @deprecated not sent by the server; use `has_more` / `next_cursor`. Always undefined. */
  total?: number;
  /** True when additional configurations exist beyond this page. */
  has_more?: boolean;
  /** Opaque cursor to pass as `cursor` to fetch the next page. Empty when `has_more` is false. */
  next_cursor?: string;
}

/**
 * Request body for PUT /v1/configurations/{config_id}.
 */
export interface UpdateConfigurationRequest {
  name?: string;
  countries?: string[];
  blocklist_patterns?: BlocklistPattern[];
  validator_modes?: Record<string, string>;
  prompt_confidentiality_config?: PromptConfidentialityConfig;
  /** ASR provider configuration (M9 BYOK). Keys live in Secrets Manager. */
  asr_config?: Record<string, unknown>;
  /** Auto-handover-on-escalation policy, e.g. `{"enabled":true,"escalation_threshold":0.6}`. */
  auto_handover_config?: Record<string, unknown>;
  /** Consent-gating rules: `{"rules":[...]}`. */
  consent_config?: Record<string, unknown>;
  /** Per-language AI disclosure texts. */
  disclosure_texts?: Record<string, unknown>;
  /** Agent-initiated end-of-call policy. An empty object means off. */
  end_call?: TenantEndCallConfig;
  /** Per-language fallback response strings. */
  fallback_response?: Record<string, unknown>;
  /** Multi-candidate generation config (M7). */
  multi_candidate?: Record<string, unknown>;
  /** Output-constraint enforcement config (M7). */
  output_constraint?: Record<string, unknown>;
  /** Pricing constraints per product category. */
  pricing_bands?: Record<string, unknown>;
  /** Opts the configuration into call recording. Defaults to false. */
  record_calls?: boolean;
  /** Overrides the platform default recording retention window, in days. */
  recording_retention_days?: number;
  /** Base URL of the tenant's upstream LLM endpoint. */
  upstream_llm_url?: string;
  /** Voicemail-detection handling policy. Disabled by default. */
  voicemail?: TenantVoicemailConfig;
  /** Raw API key / bearer token for `upstream_llm_url`; the service stores it in Secrets Manager and never returns it. */
  upstream_llm_key?: string;
  /** Rejected if client-supplied; the service derives the ARN from `upstream_llm_key`. */
  upstream_llm_secret_arn?: string;
}

// ─── Configuration (camelCase SDK types with serialization helpers) ──────────

/**
 * Request body for creating or updating a configuration, using camelCase field
 * names as exposed by the SDK. Serialise to snake_case before sending to the
 * API via {@link serializeConfigurationRequest}.
 */
export interface ConfigurationRequest {
  name: string;
  countries: string[];
  validatorModes?: Record<string, string>;
  blocklistPatterns?: BlocklistPattern[];
  pricingBands?: Record<string, unknown>;
  disclosureTexts?: Record<string, string>;
  fallbackResponse?: Record<string, string>;
  /** Custom LLM endpoint URL for this configuration. Overrides operator default. */
  upstreamLlmUrl?: string;
  /** AWS Secrets Manager ARN for the customer LLM API key. */
  upstreamLlmSecretArn?: string;
  /** Sealed settings for the prompt_confidentiality check (inner fields stay snake_case). */
  promptConfidentialityConfig?: PromptConfidentialityConfig;
}

/**
 * A persisted tenant configuration returned by the API, using camelCase field
 * names as exposed by the SDK. Deserialise from a snake_case API response via
 * {@link deserializeConfigurationResponse}.
 */
export interface ConfigurationResponse {
  configId: string;
  tenantId: string;
  name: string;
  version: number;
  countries: string[];
  validatorModes: Record<string, string>;
  blocklistPatterns: BlocklistPattern[];
  pricingBands: Record<string, unknown>;
  disclosureTexts: Record<string, string>;
  fallbackResponse: Record<string, string>;
  configSealHash: string;
  upstreamLlmUrl?: string;
  upstreamLlmSecretArn?: string;
  promptConfidentialityConfig?: PromptConfidentialityConfig;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Serialises a {@link ConfigurationRequest} (camelCase) to the snake_case
 * wire format expected by the Audact API.
 *
 * Only defined fields are included in the output object.
 */
export function serializeConfigurationRequest(
  req: ConfigurationRequest,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: req.name,
    countries: req.countries,
  };
  if (req.validatorModes !== undefined) {
    out["validator_modes"] = req.validatorModes;
  }
  if (req.blocklistPatterns !== undefined) {
    out["blocklist_patterns"] = req.blocklistPatterns;
  }
  if (req.pricingBands !== undefined) {
    out["pricing_bands"] = req.pricingBands;
  }
  if (req.disclosureTexts !== undefined) {
    out["disclosure_texts"] = req.disclosureTexts;
  }
  if (req.fallbackResponse !== undefined) {
    out["fallback_response"] = req.fallbackResponse;
  }
  if (req.upstreamLlmUrl !== undefined) {
    out["upstream_llm_url"] = req.upstreamLlmUrl;
  }
  if (req.upstreamLlmSecretArn !== undefined) {
    out["upstream_llm_secret_arn"] = req.upstreamLlmSecretArn;
  }
  if (req.promptConfidentialityConfig !== undefined) {
    out["prompt_confidentiality_config"] = req.promptConfidentialityConfig;
  }
  return out;
}

/**
 * Deserialises a raw snake_case API response object into a
 * {@link ConfigurationResponse} (camelCase).
 */
export function deserializeConfigurationResponse(
  data: Record<string, unknown>,
): ConfigurationResponse {
  return {
    configId: data["config_id"] as string,
    tenantId: data["tenant_id"] as string,
    name: data["name"] as string,
    version: data["version"] as number,
    countries: data["countries"] as string[],
    validatorModes: (data["validator_modes"] ?? {}) as Record<string, string>,
    blocklistPatterns: (data["blocklist_patterns"] ?? []) as BlocklistPattern[],
    pricingBands: (data["pricing_bands"] ?? {}) as Record<string, unknown>,
    disclosureTexts: (data["disclosure_texts"] ?? {}) as Record<string, string>,
    fallbackResponse: (data["fallback_response"] ?? {}) as Record<
      string,
      string
    >,
    configSealHash: data["config_seal_hash"] as string,
    upstreamLlmUrl:
      data["upstream_llm_url"] !== undefined
        ? (data["upstream_llm_url"] as string)
        : undefined,
    upstreamLlmSecretArn:
      data["upstream_llm_secret_arn"] !== undefined
        ? (data["upstream_llm_secret_arn"] as string)
        : undefined,
    promptConfidentialityConfig:
      data["prompt_confidentiality_config"] !== undefined &&
      data["prompt_confidentiality_config"] !== null
        ? (data["prompt_confidentiality_config"] as PromptConfidentialityConfig)
        : undefined,
    createdAt: data["created_at"] as string,
    updatedAt: data["updated_at"] as string,
    deletedAt:
      data["deleted_at"] !== undefined
        ? (data["deleted_at"] as string)
        : undefined,
  };
}

// ─── LLM Proxy ───────────────────────────────────────────────────────────────

/**
 * A single message in an LLM conversation.
 */
export interface LLMMessage {
  /** Participant role: "system", "user", "assistant", or "tool" (the spec declares a plain string). */
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Function name for tool result messages (role "tool"). */
  name?: string;
  /** Identifies which tool call this message answers (role "tool"). */
  tool_call_id?: string;
  /** Tool invocations from an assistant message. */
  tool_calls?: ProxyToolCall[];
}

/**
 * Alias for {@link LLMMessage}. Used by the OpenAI-compatible proxy endpoints.
 */
export type ChatMessage = LLMMessage;

/**
 * Request body for POST /v1/proxy/chat (LLM Proxy).
 */
export interface ProxyChatRequest {
  /** UUID of the call/session. */
  call_id: string;
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** UUID of the tenant configuration to apply. */
  config_id: string;
  /** 1-based turn number. */
  turn: number;
  /** The conversation messages to send to the upstream LLM. */
  messages: LLMMessage[];
  /** Whether to stream the response. Default: false. */
  stream?: boolean;
  /** Target upstream model identifier (e.g. "gpt-4o"). */
  model?: string;
}

/**
 * A non-streaming response from POST /v1/proxy/chat.
 */
export interface ProxyChatResponse {
  /** Completion identifier assigned by the upstream provider. */
  id?: string;
  /** Always "chat.completion" for non-streaming responses. */
  object?: string;
  /** Unix timestamp when the completion was created. */
  created?: number;
  /** Echoes the upstream model name. */
  model?: string;
  /** Generated message(s). */
  choices?: ProxyChatCompletionChoice[];
  /** Compliance metadata injected by the proxy; absent when validation did not run. */
  audact_validation?: ProxyAudactValidationMeta;
  /** @deprecated not on the wire (the proxy returns the OpenAI shape); use `audact_validation.call_id`. */
  call_id?: string;
  /** @deprecated not on the wire; always undefined. */
  turn?: number;
  /** @deprecated not on the wire; use `choices[0].message.content`. */
  content?: string;
  /** @deprecated not on the wire; use `audact_validation.verdict`. */
  verdict?: Verdict;
  /** @deprecated not on the wire; always undefined. */
  receipt?: Receipt;
  /** @deprecated not on the wire; always undefined. */
  compliance_score?: ComplianceScore;
  /** Token consumption. */
  usage?: ProxyUsageStats;
}

/** proxy.AudactValidationMeta — Audact compliance metadata on a proxied completion. */
export interface ProxyAudactValidationMeta {
  /** UUID of the validated call. */
  call_id?: string;
  /** True when the 40ms Validator deadline was exceeded; content was NOT validated. */
  fail_open?: boolean;
  /** True when the response content was rewritten by the Validator (verdict MODIFY). */
  modified?: boolean;
  /** Aggregated validation verdict: ALLOW, MODIFY, or BLOCK. */
  verdict?: string;
}

/** proxy.ChatCompletionChoice */
export interface ProxyChatCompletionChoice {
  /** Why the model stopped generating (e.g. "stop", "length", "content_filter"). */
  finish_reason?: string;
  /** 0-based choice index. */
  index?: number;
  /** Assistant response message. */
  message?: ChatMessage;
}

/** proxy.ChatCompletionRequest — the OpenAI-compatible wire body of POST /v1/proxy/openai. */
export interface ProxyChatCompletionRequest {
  /** Reasoning-model equivalent of `max_tokens`. */
  max_completion_tokens?: number;
  /** Limits the response length. */
  max_tokens?: number;
  /** Ordered conversation history. */
  messages?: ChatMessage[];
  /** Upstream model, e.g. "gpt-4o". */
  model?: string;
  /** Controls parallel tool execution (forwarded as-is). */
  parallel_tool_calls?: boolean;
  /** Hidden-reasoning effort for reasoning models ("minimal"|"low"|"medium"|"high"). */
  reasoning_effort?: string;
  /** Requests server-sent events streaming. */
  stream?: boolean;
  /** Sampling randomness; forwarded verbatim. */
  temperature?: number;
  /** Tool selection behaviour (raw OpenAI value, forwarded as-is). */
  tool_choice?: unknown;
  /** Function tool definitions forwarded upstream. */
  tools?: ProxyToolDefinition[];
}

/** proxy.ToolCall */
export interface ProxyToolCall {
  /** Invoked function name/arguments. */
  function?: ProxyToolCallFunction;
  /** Tool call identifier assigned by the upstream provider. */
  id?: string;
  /** Which tool call this delta belongs to when streaming. */
  index?: number;
  /** Always "function". */
  type?: string;
}

/** proxy.ToolCallFunction */
export interface ProxyToolCallFunction {
  /** JSON-encoded argument string (arrives incrementally when streaming). */
  arguments?: string;
  /** Function name being invoked. */
  name?: string;
}

/** proxy.ToolDefinition */
export interface ProxyToolDefinition {
  /** Callable function's schema. */
  function?: ProxyToolFunctionSchema;
  /** Always "function". */
  type?: string;
}

/** proxy.ToolFunctionSchema */
export interface ProxyToolFunctionSchema {
  /** Helps the model decide when to invoke the function. */
  description?: string;
  /** Function name the model may invoke. */
  name?: string;
  /** JSON Schema of the function's arguments. */
  parameters?: unknown;
}

/** proxy.UsageStats */
export interface ProxyUsageStats {
  completion_tokens?: number;
  prompt_tokens?: number;
  total_tokens?: number;
}

// ─── Health ───────────────────────────────────────────────────────────────────

/**
 * Response from GET /v1/health.
 */
export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  /** Server-generated timestamp. */
  timestamp?: string;
  /** Per-dependency status. */
  components?: Record<string, HealthComponentStatus>;
  /** @deprecated not sent by the server; use `components`. Always undefined. */
  checks?: Record<string, { status: "ok" | "error"; error?: string }>;
}

/** health.ComponentStatus — status of one dependency in {@link HealthResponse}. */
export interface HealthComponentStatus {
  error?: string;
  latency?: string;
  status?: string;
}

// ─── Platform Admin (Export/Import) ────────────────────────────────
//
// Wire types for the platform-admin cross-tenant provisioning surface: GET
// /v1/platform/export/tenants/{tenant_id}, GET /v1/platform/export/agents/{agent_id},
// and POST /v1/platform/import/tenants/{target_tenant_id} (Tenant Management
// service, port 8085). Every route requires a platform admin
// token (Authorization: Bearer <token>), never a tenant API key.
//
// Bundle field names mirror the JSON tags verbatim (camelCase,
// e.g. "upstreamLLM", "needsSecret") since the JSON representation of a
// bundle is a direct sibling of its canonical YAML form. Import result
// manifest field names mirror importer.Response's `json:"..."` tags verbatim
// (snake_case, e.g. "dry_run", "bundle_sha256") to match every other wire
// type in this file.

/** Bundle serialization format requested via the `Accept` header. */
export type PlatformBundleFormat = "yaml" | "json";

/** Options for {@link PlatformClient.exportTenant}. */
export interface PlatformExportOptions {
  /** Response format: "yaml" (default, human-diffable) or "json". */
  format?: PlatformBundleFormat;
}

/** Options for {@link PlatformClient.exportAgent}. */
export interface PlatformExportAgentOptions extends PlatformExportOptions {
  /**
   * UUID of the tenant that owns the agent. Required unless the platform
   * token authorizes exactly one tenant target.
   */
  tenantId: string;
}

/** Conflict policy for entities that already exist in the target tenant. */
export type PlatformImportMode = "create-only" | "upsert";

/** Options for {@link PlatformClient.importTenant}. */
export interface PlatformImportOptions {
  /** Return the plan without creating anything. Default: false. */
  dryRun?: boolean;
  /**
   * Conflict policy. "create-only" (the default) always creates fresh
   * resources; "upsert" is accepted by the server but not yet implemented
   * (rejected with HTTP 501).
   */
  mode?: PlatformImportMode;
  /**
   * Repeatable `<ref>.<field>=<value>` assignments provisioning a real
   * secret/connection for one redacted bundle entity. The raw value is never
   * echoed back or logged.
   */
  setSecret?: string[];
}

/**
 * Bundle-safe, redacted projection of a Configuration
 *.
 */
export interface PlatformUpstreamLLMSpec {
  url?: string;
  needsSecret?: boolean;
}

/** Bundle ConfigurationSpec. */
export interface PlatformConfigurationSpec {
  /** Stable, human-readable identifier within the bundle. Never a UUID. */
  ref: string;
  name: string;
  countries?: string[];
  validatorModes?: Record<string, unknown>;
  blocklistPatterns?: BlocklistPattern[];
  pricingBands?: Record<string, unknown>;
  disclosureTexts?: Record<string, unknown>;
  fallbackResponse?: Record<string, unknown>;
  multiCandidate?: Record<string, unknown>;
  outputConstraint?: Record<string, unknown>;
  asrConfig?: Record<string, unknown>;
  autoHandoverConfig?: Record<string, unknown>;
  upstreamLLM?: PlatformUpstreamLLMSpec;
  promptConfidentialityConfig?: Record<string, unknown>;
}

/** Bundle ToolHeaderSpec. */
export interface PlatformToolHeaderSpec {
  key: string;
  /** Omitted (never populated) whenever needsSecret is true. */
  value?: string;
  needsSecret?: boolean;
}

/** Bundle ToolQueryParamSpec. */
export interface PlatformToolQueryParamSpec {
  key: string;
  mode: "const" | "description";
  value: string;
}

/** Bundle ToolResponseVarSpec. */
export interface PlatformToolResponseVarSpec {
  name: string;
  jsonPath: string;
}

/** Bundle SpeakDuringSpec. */
export interface PlatformSpeakDuringSpec {
  enabled: boolean;
  text?: string;
}

/** Bundle ToolExecutionSpec. */
export interface PlatformToolExecutionSpec {
  speakDuring: PlatformSpeakDuringSpec;
  timeoutMs?: number;
  modelOverride?: string;
}

/** Bundle ToolSpec. */
export interface PlatformToolSpec {
  /** Stable, human-readable identifier within the bundle. Never a UUID. */
  ref: string;
  name: string;
  description: string;
  method: string;
  url: string;
  headers?: PlatformToolHeaderSpec[];
  queryParams?: PlatformToolQueryParamSpec[];
  parameters?: Record<string, unknown>;
  argsOnly?: boolean;
  responseVars?: PlatformToolResponseVarSpec[];
  execution?: PlatformToolExecutionSpec;
  /** Platform-tool provider (e.g. "cal_com"). Empty for ordinary HTTP tools. */
  provider?: string;
  providerTool?: string;
  /** Bundle ref of the integration connection this tool executes with. */
  connectionRef?: string;
  providerConfig?: Record<string, unknown>;
}

/** Bundle AgentSpec. */
export interface PlatformAgentSpec {
  /** Stable, human-readable identifier within the bundle. Never a UUID. */
  ref: string;
  name: string;
  prompt: string;
  voiceId?: string;
  llmModel?: string;
  llmProvider?: string;
  sttProvider?: string;
  ttsProvider?: string;
  ttsModel?: string;
  language?: string;
  temperature?: number;
  jurisdiction?: string;
  /** Bundle ref of the Configuration this agent uses, if any. */
  configRef?: string;
  /** Bundle refs of the tools attached to this agent. */
  toolRefs?: string[];
}

/** Bundle Metadata. */
export interface PlatformBundleMetadata {
  name: string;
  description?: string;
}

/** Bundle Spec. */
export interface PlatformBundleSpec {
  configurations?: PlatformConfigurationSpec[];
  tools?: PlatformToolSpec[];
  agents?: PlatformAgentSpec[];
}

/** Bundle `kind` values. */
export type PlatformBundleKind = "TenantBundle" | "AgentBundle";

/**
 * The top-level bundle envelope returned by
 * {@link PlatformClient.exportTenant}/{@link PlatformClient.exportAgent} when
 * requested with `format: "json"`.
 */
export interface PlatformBundle {
  /** Always "audact.ai/v1". */
  apiVersion: "audact.ai/v1";
  kind: PlatformBundleKind;
  metadata: PlatformBundleMetadata;
  spec: PlatformBundleSpec;
}

/** Bundle EntityKind. */
export type PlatformEntityKind = "configuration" | "tool" | "agent";

/**
 * One row of {@link PlatformImportResponse.entities}: what happened (or,
 * under dry_run, would happen) to one bundle entity
 *.
 */
export interface PlatformImportEntityResult {
  /** The bundle entity's stable ref. */
  ref: string;
  kind: PlatformEntityKind;
  name: string;
  /** "created" in every response the server currently produces. */
  status: string;
  /** Fresh target-tenant UUID. Empty under dry_run. */
  new_id?: string;
  /** True when this entity requires a `setSecret` follow-up to be functional. */
  needs_secret: boolean;
}

/**
 * The per-entity result manifest returned by
 * {@link PlatformClient.importTenant}.
 */
export interface PlatformImportResponse {
  /** True means nothing in `entities` was actually persisted (plan only). */
  dry_run: boolean;
  /** Echoes the request's mode flag (always "create-only" on success today). */
  mode: string;
  /** Lowercase hex SHA-256 digest of the exact bundle bytes parsed. */
  bundle_sha256: string;
  /** Tally of entities by kind, e.g. {"configuration":1,"tool":2,"agent":1}. */
  counts: Record<string, number>;
  /** Full per-entity manifest, in configurations -> tools -> agents order. */
  entities: PlatformImportEntityResult[];
  /** Human-readable, non-fatal notices (one per entity missing a secret). */
  warnings?: string[];
}

// ─── Numbers / KYC (Voice Gateway) ─────────────────────────────────
//
// Wire types for the number-provisioning surface: KYC document upload/
// management, KYC document sets (Telnyx regulatory requirement groups), and
// number orders.
// Field names mirror the Go JSON tags verbatim (snake_case). No `tenant_id`
// field anywhere — the tenant is always resolved from the API key (SEC-027).

/**
 * Telnyx's exact `phone_number_type` allowlist (voice.NumberTypes) — the
 * canonical set of number types Audact supports for provisioning.
 */
export type NumberType = "local" | "national" | "mobile" | "toll_free";

/**
 * Metadata for a single KYC document. Document bytes are never returned by any endpoint.
 */
export interface KYCDocument {
  id: string;
  doc_type: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  /** Hex-encoded SHA-256 digest of the plaintext file. */
  sha256: string;
  /** Set once the document has been pushed to Telnyx. */
  telnyx_document_id?: string;
  created_at: string;
  updated_at: string;
}

/** Response from GET /v1/kyc/documents. */
export interface ListKYCDocumentsResponse {
  documents: KYCDocument[];
}

/**
 * A single Telnyx regulatory requirement for a (country, number_type) pair
 *.
 */
export interface KYCRequirement {
  id: string;
  requirement_type: string;
  name: string;
  required: boolean;
}

/** Response from GET /v1/kyc/requirements. */
export interface ListKYCRequirementsResponse {
  /** Explicitly empty (never absent) when Telnyx legitimately requires nothing. */
  requirements: KYCRequirement[];
}

/**
 * One requirement answer supplied when creating a KYC document set. Exactly
 * one of `document_id`/`text_value` must be set.
 */
export interface KYCDocumentSetItemRequest {
  /** Telnyx regulatory requirement id (see {@link KYCRequirement.id}). */
  requirement_id: string;
  requirement_type?: string;
  /** References an already-uploaded {@link KYCDocument}. */
  document_id?: string;
  /** Answers a free-text requirement (e.g. a tax ID). */
  text_value?: string;
}

/** Request body for POST /v1/kyc/document-sets. */
export interface CreateKYCDocumentSetRequest {
  name: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "NL". */
  country_code: string;
  number_type: NumberType | string;
  items: KYCDocumentSetItemRequest[];
}

/**
 * One requirement slot within a KYC document set's detail view — only
 * populated by {@link KYCDocumentSet.items} on set responses that include it.
 */
export interface KYCDocumentSetItem {
  requirement_id: string;
  requirement_type: string;
  document_id?: string;
  /** Mapped document's filename/doc_type — never the bytes. */
  document_filename?: string;
  doc_type?: string;
  text_value?: string;
}

/**
 * A KYC document set — a tenant's answers to every Telnyx regulatory
 * requirement for a (country_code, number_type) pair.
 */
export interface KYCDocumentSet {
  id: string;
  name: string;
  country_code: string;
  number_type: string;
  action: string;
  telnyx_requirement_group_id?: string;
  status: "draft" | "submitted" | "approved" | "rejected" | "expired";
  status_detail?: string;
  /** Populated on create/get responses; omitted from list responses. */
  items?: KYCDocumentSetItem[];
  created_at: string;
  updated_at: string;
}

/** Response from GET /v1/kyc/document-sets. */
export interface ListKYCDocumentSetsResponse {
  document_sets: KYCDocumentSet[];
}

/** Response from POST /v1/kyc/dek/rotate. */
export interface RotateKycDekResponse {
  /** The tenant's new current Document Encryption Key version. */
  new_version: number;
}

/** A single Telnyx available-number inventory match. */
export interface AvailableNumber {
  phone_number: string;
  phone_number_type: string;
  country_code: string;
}

/** Response from GET /v1/numbers/available. */
export interface ListAvailableNumbersResponse {
  /** Explicitly empty (never an error) when Telnyx has no matching inventory. */
  numbers: AvailableNumber[];
}

/** Request body for POST /v1/numbers/orders. */
export interface CreateNumberOrderRequest {
  country_code: string;
  number_type: NumberType | string;
  /** The already-`approved` KYC document set this order is placed against. */
  set_id: string;
  /** Exact E.164 number to order. When omitted, the first available match is used. */
  phone_number?: string;
  /** Narrows the available-number search when `phone_number` is omitted. */
  area_code?: string;
}

/**
 * A Telnyx number order.
 */
export interface NumberOrder {
  id: string;
  country_code: string;
  number_type: string;
  set_id: string;
  phone_number?: string;
  telnyx_order_id?: string;
  status:
    | "pending"
    | "requirement_review"
    | "ordering"
    | "success"
    | "failure"
    | "cancelled";
  failure_reason?: string;
  /** References the DID pool row created once the order succeeds. */
  phone_number_id?: string;
  created_at: string;
  updated_at: string;
}

/** Response from GET /v1/numbers/orders. */
export interface ListNumberOrdersResponse {
  orders: NumberOrder[];
}

// ─── DID phone number lifecycle ────────────────────────────────────

/**
 * A DID phone number in the tenant's pool.
 */
export interface PhoneNumber {
  id: string;
  did: string;
  country_code: string;
  status: "available" | "assigned" | "suspended";
  /** Present only when `status` is "assigned". */
  assigned_agent_id?: string;
  /**
   * Carrier of an Audact-provisioned number: "telnyx". "twilio" only appears
   * on numbers registered before Audact numbers became Telnyx-only.
   * For `origin: "byo"` numbers see `provider`.
   */
  trunk_provider?: "telnyx" | "twilio";
  trunk_id?: string;
  /**
   * Who provisioned this DID: Audact's own Telnyx relationship, or a
   * tenant-owned BYO SIP trunk. Absent on numbers predating BYO support (treat as
   * "audact").
   */
  origin?: NumberOrigin;
  /** The BYO connection's SIP provider. Only present when `origin` is "byo". */
  provider?: SipProvider;
  /** The owning BYO connection's health. Only present when `origin` is "byo". */
  connection_health?: BYOConnectionHealth;
  /** UUID of the owning BYO SIP-trunk connection. Present only when `origin` is "byo". */
  byo_connection_id?: string;
  created_at: string;
  updated_at: string;
}

/** Query filters for {@link NumbersClient.listNumbers}. */
export interface ListNumbersOptions {
  /** ISO 3166-1 alpha-2 country code filter, e.g. "NL". */
  country?: string;
  /** Lifecycle state filter. */
  status?: "available" | "assigned" | "suspended";
  /** Maximum results per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor returned as `next_cursor` from a prior call. */
  cursor?: string;
}

/** Response from GET /v1/numbers. */
export interface ListNumbersResponse {
  numbers: PhoneNumber[];
  total_count?: number;
  /** Absent or null when no more pages exist. */
  next_cursor?: string;
}

/**
 * Request body for POST /v1/numbers.
 *
 * Origin-aware (§3C FR9): when `origin` is "byo", the number is a
 * tenant-owned SIP trunk DID rather than an Audact-provisioned one. `origin`
 * is never inferred: omitting it means "audact" even when `connection` or
 * `byo_connection_id` is set. To add a number you already own at Twilio, send
 * `origin: "byo"` with `connection.provider: "twilio"`.
 * `byo_connection_id` and `connection` are mutually exclusive — supply the
 * UUID of an existing connection (from {@link NumbersClient.createByoConnection}
 * / {@link NumbersClient.listByoConnections}) XOR an inline connection
 * description to create-or-reuse one in the same call.
 */
export interface CreateNumberRequest {
  /** E.164 phone number to add, e.g. "+442045136446". */
  did: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "GB". */
  country_code: string;
  /**
   * Telephony carrier for Audact-provisioned (`origin: "audact"`) numbers.
   * Only "telnyx" is accepted; any other value is rejected with 400. A number
   * you already own at Twilio is added with `origin: "byo"` and
   * `connection.provider: "twilio"` instead. Defaults to "telnyx" when omitted.
   * Ignored for `origin: "byo"` numbers — see `connection`.
   */
  trunk_provider?: "telnyx";
  /** Defaults to "audact" when omitted. */
  origin?: NumberOrigin;
  /**
   * UUID of an existing BYO connection to attach this DID to. Mutually
   * exclusive with `connection`. Only valid when `origin` is "byo".
   */
  byo_connection_id?: string;
  /**
   * Inline BYO SIP trunk description — creates a new connection, or reuses
   * a matching existing one (dedupes on provider/sip_host/sip_username),
   * in the same call. Mutually exclusive with `byo_connection_id`. Only
   * valid when `origin` is "byo".
   */
  connection?: BYOConnectionInput;
}

/** Request body for POST /v1/numbers/{id}/assign. */
export interface AssignNumberRequest {
  /** UUID of the agent to assign this DID to. */
  agent_id: string;
}

/** Request body for PUT /v1/numbers/{id}/trunk. */
export interface SetNumberTrunkRequest {
  /**
   * LiveKit outbound SIP trunk resource ID (the `sip_trunk_id` of an
   * outbound trunk returned by `GET /v1/sip/trunks`). An empty string
   * clears the link.
   */
  trunk_id: string;
}

// ─── Bring-Your-Own-Telephony (BYO) connections ────────────────────

/**
 * Discriminates who provisioned a phone number: Audact's own Telnyx
 * relationship, or a tenant-owned SIP trunk.
 */
export type NumberOrigin = "audact" | "byo";

/**
 * The telephony provider a BYO SIP trunk connection runs on
 *. Only selects
 * connect-copy/default-allowlist behaviour — every provider takes the
 * identical SIP-only code path.
 */
export type SipProvider = "twilio" | "telnyx" | "generic_sip";

/** SIP transport protocol for a BYO connection's outbound trunk. */
export type SipTransport = "udp" | "tcp" | "tls" | "auto";

/**
 * Health state of a BYO connection's SIP trunk
 *.
 *
 * - `unverified`: no calls received yet (initial state).
 * - `healthy`: the connect/verify probe (or a real call) succeeded.
 * - `unreachable`: the SIP host could not be reached.
 * - `auth_failed`: credentials were rejected on a real inbound/outbound call.
 */
export type BYOConnectionHealth =
  | "unverified"
  | "healthy"
  | "unreachable"
  | "auth_failed";

/**
 * A bring-your-own SIP trunk connection
 *. Credentials are
 * never included — only whether one is currently stored
 * (`has_credentials`).
 */
export interface BYOConnection {
  id: string;
  name: string;
  provider: SipProvider;
  sip_host: string;
  sip_transport: SipTransport;
  /** Whether a SIP username/password is currently stored. Never the values. */
  has_credentials: boolean;
  inbound_allowed_ips?: string[];
  connection_health: BYOConnectionHealth;
  /** PII-free human-readable explanation of `connection_health`. */
  health_detail?: string;
  /** Most recent SIP final-response code observed on a failed attempt, if any. */
  last_error_code?: number;
  last_error_at?: string;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * A tenant-supplied SIP trunk description, shared by the explicit
 * `POST /v1/byo/connections` body and the inline `connection` object
 * accepted by origin-aware {@link CreateNumberRequest} (§3C FR9b).
 */
export interface BYOConnectionInput {
  /**
   * Display name. Required on the explicit create endpoint; optional on the
   * inline-connection path (the server synthesizes one when omitted).
   */
  name?: string;
  provider: SipProvider;
  sip_host: string;
  /** Defaults to "auto" when omitted. */
  sip_transport?: SipTransport;
  /**
   * Required together with `sip_password` unless `inbound_allowed_ips` is
   * supplied instead — at least one auth mechanism is mandatory.
   */
  sip_username?: string;
  /** Never echoed back on any response — stored only in Secrets Manager. */
  sip_password?: string;
  /** Inbound IP allowlist (CIDR or bare-IP strings). */
  inbound_allowed_ips?: string[];
}

/** Request body for POST /v1/byo/connections. `name` is required. */
export interface CreateBYOConnectionRequest extends BYOConnectionInput {
  name: string;
}

/**
 * Request body for PUT /v1/byo/connections/{id}. Every field is optional: a
 * zero-valued/omitted field leaves the corresponding column unchanged.
 * Supplying both `sip_username` and `sip_password` rotates the stored
 * credential. To CLEAR `inbound_allowed_ips` explicitly, send an empty array
 * rather than omitting the field.
 */
export type UpdateBYOConnectionRequest = Partial<BYOConnectionInput>;

/** Query filters for {@link NumbersClient.listByoConnections}. */
export interface ListByoConnectionsOptions {
  /** Maximum results per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor returned as `next_cursor` from a prior call. */
  cursor?: string;
}

/** Response from GET /v1/byo/connections. */
export interface ListByoConnectionsResponse {
  connections: BYOConnection[];
  /** Absent or null when no more pages exist. */
  next_cursor?: string;
}

/**
 * This deployment's SIP ingress configuration
 * — from
 * GET /v1/byo/config. Deployment-wide, not tenant-specific.
 */
export interface ByoConfig {
  /** SIP host this deployment accepts inbound BYO calls on. */
  sip_ingress_host: string;
  /** Source IPs/CIDRs Audact's SIP ingress signals from. */
  signaling_ips?: string[];
}

// ─── Calls / SIP (Voice Gateway) ────────────────────────────────────

/** Request body for POST /v1/sip/calls/outbound. */
export interface OutboundCallRequest {
  /**
   * UUID of the voice agent to handle this call. When set, a room.created
   * event is published so the agent-worker spawns an STT→LLM→TTS pipeline
   * in the LiveKit room. Obtain from POST /v1/agents or GET /v1/agents.
   */
  agent_id?: string;
  /**
   * Phone number to call, in strict E.164: a leading '+', the country code,
   * then the subscriber number — digits only, 8 to 16 characters in total,
   * no spaces, dashes, dots or parentheses. Numbers are not normalised;
   * "+44 20 7946 0958" is rejected with 400 INVALID_REQUEST.
   * Example: "+442079460958". Required.
   */
  destination_number: string;
  /**
   * Per-call key/value pairs substituted into the agent prompt ({{var}})
   * and exposed to tools. Values are strings.
   */
  dynamic_variables?: Record<string, string>;
  /**
   * Caller ID to present on the outbound call, in strict E.164: a leading
   * '+', the country code, then the subscriber number — digits only, 8 to 16
   * characters in total, no spaces, dashes, dots or parentheses. Numbers are
   * not normalised; "+31 20 123 4567" is rejected with 400 INVALID_REQUEST.
   * Must also be one of your own numbers (GET /v1/numbers), otherwise 400
   * INVALID_REQUEST. Required.
   */
  from_number: string;
  /**
   * Hard cap on this call's duration, in seconds, enforced server-side.
   * Omit or set to 0 to fall back to the agent's configured default.
   * Must be 0..10800 (3 hours).
   */
  max_duration_seconds?: number;
  /**
   * Arbitrary per-call JSON persisted to calls.metadata and echoed on
   * lifecycle webhook events. Never logged.
   */
  metadata?: Record<string, unknown>;
  /**
   * When set, synthesizes the outcome of this call instead of placing a
   * real one. Only accepted when sandbox mode is enabled for the
   * authenticated tenant/API key; otherwise rejected with 403.
   */
  requested_outcome?:
    | "answered"
    | "no_answer"
    | "busy"
    | "rejected"
    | "invalid_destination"
    | "voicemail";
  /**
   * Tenant-supplied subject identifiers (hashes only, never
   * plaintext). Compute each with `clientHash(type, value)`. Shredding any of
   * these identities erases the call's encrypted PII.
   */
  identifiers?: PIIIdentifier[];
}

/** Response from POST /v1/sip/calls/outbound (200 idempotent replay or 201 created). */
export interface OutboundCallResponse {
  /** Server-generated UUID for this call session. */
  call_id: string;
  /** LiveKit participant identity for the agent in this room. */
  participant_id?: string;
  /** LiveKit room name created for this call. */
  room_name: string;
  /** SIP Call-ID header value assigned by the carrier. */
  sip_call_id?: string;
}

/** Request body for POST /v1/sip/calls/inbound. */
export interface InboundCallRequest {
  /** Destination DID in E.164 format that received the call. Required. */
  called_did: string;
  /** Originating phone number in E.164 format. Required. */
  caller_number: string;
  /**
   * Per-call key/value pairs substituted into the agent prompt ({{var}})
   * and exposed to tools. Values are strings.
   */
  dynamic_variables?: Record<string, string>;
  /**
   * Arbitrary per-call JSON persisted to calls.metadata and echoed on
   * lifecycle webhook events. Never logged.
   */
  metadata?: Record<string, unknown>;
  /**
   * Optional subject identifier hashes (sha256_hex of the normalized value,
   * 64 lowercase hex) registered for PII encryption and erasure by identity.
   * Type is one of name, email, phone.
   */
  identifiers?: PIIIdentifier[];
}

/** Response from POST /v1/sip/calls/inbound (200 idempotent replay or 201 created). */
export interface InboundCallResponse {
  /** Server-generated UUID for this call session. */
  call_id: string;
  /** LiveKit room name created for this call. */
  room_name: string;
  /** Identifier of the SIP trunk that received this call. */
  trunk_id?: string;
}

/** Request body for POST /v1/sip/calls/browser. */
export interface BrowserCallRequest {
  /**
   * UUID of the agent to connect the browser test call to. Obtain agent
   * UUIDs from POST /v1/agents or GET /v1/agents. Required.
   */
  agent_id: string;
  /**
   * Per-call key/value pairs substituted into the agent prompt ({{var}})
   * and exposed to tools. Values are strings.
   */
  dynamic_variables?: Record<string, string>;
  /**
   * Arbitrary per-call JSON persisted to calls.metadata and echoed on
   * lifecycle webhook events. Never logged.
   */
  metadata?: Record<string, unknown>;
  /**
   * Tenant-supplied subject identifiers (hashes only, never
   * plaintext). Compute each with `clientHash(type, value)`. Shredding any of
   * these identities erases the call's encrypted PII.
   */
  identifiers?: PIIIdentifier[];
}

/** Response from POST /v1/sip/calls/browser (200 idempotent replay or 201 created). */
export interface BrowserCallResponse {
  /**
   * Server-generated UUID for this call session. Use it with
   * GET /v1/sip/calls/{call_id}/status to poll the call's lifecycle state.
   */
  call_id: string;
  /**
   * Signed JWT the browser client presents to join the LiveKit room over
   * WebRTC. Treat it as a short-lived secret; do not log it.
   */
  livekit_token: string;
  /**
   * Public WebSocket URL the browser client connects to (using
   * livekit_token) to join the room.
   */
  livekit_url: string;
  /** LiveKit room name created for this call. */
  room_name: string;
}

/** Response from POST /v1/sip/calls/{call_id}/hangup. */
export interface HangupResponse {
  /** UUID of the call that was terminated. */
  call_id: string;
  /** LiveKit room that was deleted. */
  room_name: string;
  /** Always "terminated" on success. */
  status: string;
}

/** Response from GET /v1/sip/calls/{call_id}/status. */
export interface CallStatusResponse {
  /** UUID of the call. */
  call_id: string;
  /** LiveKit room backing this call. */
  room_name: string;
  /**
   * Server-generated UTC timestamp when the call began. Omitted if the
   * call state does not carry a parsable started_at value.
   */
  started_at?: string;
  /** Current call lifecycle state. */
  status: "active" | "terminated";
}

/** Request body for POST /v1/sip/calls/{call_id}/handover. */
export interface HandoverRequest {
  /**
   * Optional short code/enum describing why the caller asked for (or
   * triggered) the handover. Not required for every handover_reason.
   */
  caller_reason?: string;
  /** E.164 phone number of the human supervisor to dial. Required. */
  destination: string;
  /** Why the handover was triggered. Required. */
  handover_reason:
    | "agent_requested"
    | "escalation"
    | "operator_requested"
    | "caller_requested";
  /**
   * Controls how the human is briefed before the caller is bridged in.
   * Defaults to "spoken" when omitted.
   */
  whisper_mode?: "spoken" | "portal" | "both";
}

/** Response from POST /v1/sip/calls/{call_id}/handover. */
export interface HandoverResponse {
  /** UUID of the call being handed over. */
  call_id: string;
  /**
   * Server-generated UUID for this handover session. Use it to poll
   * GET /v1/sip/handovers/{handover_id}.
   */
  handover_id: string;
  /** Always "initiated" on success. */
  state: string;
}

/** Response from GET /v1/sip/handovers/{handover_id}. */
export interface HandoverStateResponse {
  /** UUID of the caller's active call being handed over. */
  call_id: string;
  /**
   * Server-generated UTC timestamp when the handover reached a terminal
   * state (ended or cancelled). Absent while in flight.
   */
  completed_at?: string;
  /**
   * Whisper/summary delivery outcome (e.g. "delivered", "pending",
   * "failed"). Empty until set by agent-worker.
   */
  delivery_status?: string;
  /**
   * SHA-256 hex digest of the human's E.164 number. The raw phone number
   * is never returned by this endpoint.
   */
  destination_hash?: string;
  /** UUID of the handover session. */
  handover_id: string;
  /** One of agent_requested, escalation, operator_requested, caller_requested. */
  handover_reason?: string;
  /** Server-generated UTC timestamp when the handover was first requested. */
  initiated_at?: string;
  /**
   * Current handover lifecycle state: initiated, summarizing, dialing,
   * whispering, bridged, ended, cancelled, or failed.
   */
  state: string;
  /**
   * How the summary presented to the human was produced: "llm" (normal
   * path) or "template" (deadline fallback). Empty until the
   * summarizing stage completes.
   */
  summary_source?: string;
  /** One of spoken, portal, both. */
  whisper_mode?: string;
}

/** Request body for POST /v1/sip/calls/{call_id}/transfer. */
export interface TransferRequest {
  /** E.164 phone number to transfer the call to. Required. */
  destination: string;
  /**
   * Controls the transfer type. "blind" sends a SIP REFER immediately;
   * "warm" keeps the caller on hold while the agent speaks to the transfer
   * target first. Defaults to "blind" when omitted.
   */
  transfer_option?: "blind" | "warm";
}

/** Response from POST /v1/sip/calls/{call_id}/transfer. */
export interface TransferResponse {
  /** UUID of the call being transferred. */
  call_id: string;
  /** Always "started" on success. */
  status: string;
  /**
   * Server-generated UUID for this transfer session. Use it to call the
   * bridge/cancel/end endpoints.
   */
  transfer_id: string;
  /** Resolved transfer type (blind or warm). */
  transfer_option: string;
}

/** Response from GET /v1/sip/transfers/{transfer_id}. */
export interface TransferSessionResponse {
  /** UUID of the agent handling the call, if available. */
  agent_id?: string;
  /** UUID of the call being transferred. */
  call_id: string;
  /**
   * Server-generated UTC timestamp when the transfer reached a terminal
   * state (bridged, cancelled, or ended). Absent while "started".
   */
  completed_at?: string;
  /**
   * SHA-256 hex digest of the destination E.164 number. The raw phone
   * number is never returned by this endpoint.
   */
  destination_hash?: string;
  /** Server-generated UTC timestamp when the transfer was first requested. */
  initiated_at?: string;
  /** Current transfer lifecycle state. */
  status: "started" | "bridged" | "cancelled" | "ended";
  /** UUID of the transfer session. */
  transfer_id: string;
  /** Transfer type: "blind" or "warm". */
  transfer_option: "blind" | "warm";
}

/** Response from POST /v1/sip/transfers/{transfer_id}/(bridge|cancel|end). */
export interface TransferStateResponse {
  /** The new transfer status. */
  status: string;
  /** UUID of the updated transfer session. */
  transfer_id: string;
}

// ─── Calls / SIP trunks, routes, admission-url, WS ticket ─────────

/** Query options for {@link CallsClient.listTrunks}. */
export interface ListTrunksOptions {
  /** Maximum inbound trunks per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor returned as `next_cursor` from a prior call. */
  cursor?: string;
}

/** An inbound SIP trunk summary, as returned by {@link CallsClient.listTrunks}. */
export interface InboundTrunkSummary {
  /** LiveKit-assigned SIP trunk ID. */
  sip_trunk_id: string;
  /** Telephony carrier. */
  provider: "telnyx" | "twilio";
  /** E.164 phone number associated with this trunk. */
  did: string;
}

/** An outbound SIP trunk summary, as returned by {@link CallsClient.listTrunks}. */
export interface OutboundTrunkSummary {
  /** LiveKit-assigned SIP trunk ID. */
  sip_trunk_id: string;
  /** Telephony carrier. */
  provider: "telnyx" | "twilio";
  /** SIP proxy hostname for outbound calls. */
  address: string;
}

/** Response from GET /v1/sip/trunks. */
export interface ListTrunksResponse {
  /** Current page of inbound SIP trunks for the tenant. */
  inbound_trunks: InboundTrunkSummary[];
  /** All outbound SIP trunks for the tenant (at most one; not paginated). */
  outbound_trunks: OutboundTrunkSummary[];
  /** True when additional inbound trunks exist beyond this page. */
  has_more?: boolean;
  /** Opaque cursor to pass as `?cursor=` to fetch the next page of inbound trunks. */
  next_cursor?: string;
}

/** Request body for POST /v1/sip/trunks/inbound. */
export interface CreateInboundTrunkRequest {
  /** Telephony carrier. Required. */
  provider: "telnyx" | "twilio";
  /** DID phone numbers (E.164) that belong to this inbound trunk. Required. */
  inbound_numbers: string[];
  /**
   * Source IPs/CIDRs permitted to deliver inbound INVITEs to this trunk.
   * Supply it (with no auth_* fields) to register a NO-AUTH, IP-authenticated
   * inbound trunk — the mode Telnyx FQDN connections use. Required when no
   * credentials are given; optional as an extra restriction alongside
   * credentials.
   */
  allowed_addresses?: string[];
  /**
   * AWS Secrets Manager ARN for the SIP username credential. Mutually
   * exclusive with `auth_username` — if both are set, this field takes
   * precedence.
   */
  auth_user_arn?: string;
  /**
   * AWS Secrets Manager ARN for the SIP password credential. Mutually
   * exclusive with `auth_password` — if both are set, this field takes
   * precedence.
   */
  auth_pass_arn?: string;
  /**
   * Plain-text SIP username. If provided (instead of `auth_user_arn`), the
   * server creates/updates a Secrets Manager secret and stores the resulting
   * ARN — never echoed back or logged.
   */
  auth_username?: string;
  /**
   * Plain-text SIP password. If provided (instead of `auth_pass_arn`), the
   * server creates/updates a Secrets Manager secret and stores the resulting
   * ARN — never echoed back or logged.
   */
  auth_password?: string;
}

/** Response from POST /v1/sip/trunks/inbound (200 idempotent replay or 201 created). */
export interface CreateInboundTrunkResponse {
  /** LiveKit-assigned SIP trunk identifier. */
  sip_trunk_id: string;
  /** Telephony carrier. */
  provider: "telnyx" | "twilio";
  /** DID phone numbers registered to this trunk. */
  inbound_numbers: string[];
  /** Always "registered" on success. */
  status: string;
}

/** Request body for POST /v1/sip/trunks/outbound. */
export interface CreateOutboundTrunkRequest {
  /** Telephony carrier. Required. */
  provider: "telnyx" | "twilio";
  /** SIP proxy hostname used for outbound calls. Required. */
  address: string;
  /** DID phone numbers (E.164) usable as caller ID through this trunk. Required by LiveKit. */
  numbers: string[];
  /** AWS Secrets Manager ARN for the SIP username credential. */
  auth_user_arn?: string;
  /** AWS Secrets Manager ARN for the SIP password credential. */
  auth_pass_arn?: string;
  /** SIP transport protocol. Defaults to "auto". Use "tcp" for providers like Telnyx that require TCP. */
  transport?: "auto" | "udp" | "tcp" | "tls";
}

/** Response from POST /v1/sip/trunks/outbound (200 idempotent replay or 201 created). */
export interface CreateOutboundTrunkResponse {
  /** LiveKit-assigned SIP trunk identifier. */
  sip_trunk_id: string;
  /** Telephony carrier. */
  provider: "telnyx" | "twilio";
  /** SIP proxy hostname for outbound calls. */
  address: string;
  /** Always "registered" on success. */
  status: string;
}

/** Query options for {@link CallsClient.listDispatchRules}. */
export interface ListDispatchRulesOptions {
  /** Maximum results per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor returned as `next_cursor` from a prior call. */
  cursor?: string;
}

/** A SIP dispatch rule (route), as returned by {@link CallsClient.listDispatchRules}. */
export interface RouteSummary {
  /** LiveKit-assigned dispatch rule ID. */
  dispatch_rule_id: string;
  /** E.164 phone number this rule accepts calls on. */
  did: string;
  /** UUID of the agent routed by this rule. */
  agent_id: string;
  /** LiveKit room prefix used by the dispatch rule. */
  room_prefix?: string;
}

/** Response from GET /v1/sip/routes. */
export interface ListDispatchRulesResponse {
  /** Current page of SIP dispatch rules for the tenant. */
  routes: RouteSummary[];
  /** True when additional routes exist beyond this page. */
  has_more?: boolean;
  /** Opaque cursor to pass as `?cursor=` to fetch the next page. */
  next_cursor?: string;
}

/** Request body for POST /v1/sip/routes. */
export interface CreateDispatchRuleRequest {
  /** E.164 phone number to route, e.g. "+31201234567". Required. */
  did: string;
  /**
   * UUID of the agent to dispatch calls to this DID. Obtain agent UUIDs from
   * POST /v1/agents or GET /v1/agents. Required.
   */
  agent_id: string;
}

/** Response from POST /v1/sip/routes (200 idempotent replay or 201 created). */
export interface CreateDispatchRuleResponse {
  /** LiveKit-assigned dispatch rule ID for this route. */
  dispatch_rule_id: string;
  /** Always "routed" on success. */
  status: string;
}

/** Response from GET/PUT /v1/sip/admission-url. */
export interface AdmissionUrlResponse {
  /** The tenant's configured pre-connect admission hook URL, or "" when disabled. */
  admission_url: string;
}

/** Request body for PUT /v1/sip/admission-url. */
export interface SetAdmissionUrlRequest {
  /**
   * The http(s) endpoint to POST inbound-call admission requests to. An
   * empty string clears it (disables the hook).
   */
  admission_url: string;
}

/** Response from POST /v1/ws/ticket. */
export interface CreateWsTicketResponse {
  /**
   * Single-use UUID valid for 30 seconds. Pass it as the `?ticket=` query
   * parameter when connecting to `GET /v1/ws/calls`.
   */
  ticket: string;
}

// ─── Webhooks (Tenant Management) ──────────────────────────────────

/**
 * Known webhook event type strings (the `events` enum of the webhook request
 * schemas). Discover them at runtime via {@link WebhooksClient.listWebhookEventTypes}.
 */
export type WebhookEventName =
  | "call_analyzed"
  | "call_end_detected"
  | "call_ended"
  | "call_started"
  | "call_summary"
  | "chat_analyzed"
  | "chat_ended"
  | "chat_started"
  | "compliance.byo_connection_created"
  | "compliance.byo_connection_deleted"
  | "compliance.byo_connection_health_changed"
  | "compliance.byo_connection_verified"
  | "compliance.byo_number_attached"
  | "compliance.byo_number_detached"
  | "compliance.call_blocked"
  | "compliance.call_score_finalized"
  | "compliance.chain_tampered"
  | "compliance.chain_verified"
  | "compliance.fail_open"
  | "compliance.kyc_set_approved"
  | "compliance.kyc_set_rejected"
  | "compliance.kyc_set_submitted"
  | "compliance.number_provisioning_approved"
  | "compliance.number_provisioning_failed"
  | "compliance.number_provisioning_requested"
  | "compliance.policy_evaluated"
  | "compliance.receipt_issued"
  | "compliance.validation_completed"
  | "compliance.violation_detected"
  | "handover_completed"
  | "handover_initiated"
  | "handover_summary_ready"
  | "transcript_updated"
  | "transfer_bridged"
  | "transfer_cancelled"
  | "transfer_ended"
  | "transfer_started"
  | "voicemail_detected";

/** A configured webhook endpoint, as returned by the webhooks CRUD API. */
export interface WebhookEndpoint {
  /** UUID of the webhook endpoint. */
  id: string;
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** UUID of the agent this endpoint is scoped to; unset for account/compliance scope. */
  agent_id?: string;
  /** HTTPS URL that receives POST deliveries. */
  url: string;
  /** Subscribed event type strings. An empty array means "all events" (no filtering). */
  events: string[];
  /** Endpoint scope: "account" (tenant-wide fallback), "agent" (overrides account), or "compliance" (overrides all others for compliance.* events). */
  scope: "account" | "agent" | "compliance";
  /** Whether deliveries are currently attempted for this endpoint. */
  is_active: boolean;
}

/** Request body for {@link WebhooksClient.createWebhook}. */
export interface CreateWebhookRequest {
  /** Customer HTTPS endpoint URL. Required — must use the https scheme. */
  url: string;
  /** Non-empty list of known event type strings (see {@link WebhooksClient.listWebhookEventTypes}). Required. */
  events: WebhookEventName[];
  /** Endpoint scope. Required. */
  scope: "account" | "agent" | "compliance";
  /** Required when `scope` is "agent". */
  agent_id?: string;
}

/**
 * Response from {@link WebhooksClient.createWebhook}.
 *
 * `signing_secret` is present only on the single call that first provisions
 * the tenant's HMAC signing secret — store it immediately, as it is never
 * returned again by any endpoint (Stripe/Twilio "reveal once" pattern).
 */
export interface CreateWebhookResponse extends WebhookEndpoint {
  signing_secret?: string;
}

/** Request body for {@link WebhooksClient.updateWebhook}. All fields optional — omit to leave unchanged. */
export interface UpdateWebhookRequest {
  /** New HTTPS endpoint URL. */
  url?: string;
  /** Replacement subscription list; must be non-empty when provided. */
  events?: WebhookEventName[];
  /** Enables or disables the endpoint. */
  is_active?: boolean;
}

/** Query options for {@link WebhooksClient.listWebhooks}. */
export interface ListWebhooksOptions {
  /** Results per page (default 20, max 100). */
  limit?: number;
  /** Opaque pagination cursor returned as `next_cursor` from a prior call. */
  cursor?: string;
}

/** Response from {@link WebhooksClient.listWebhooks}. */
export interface ListWebhooksResponse {
  /** Current page of webhook endpoints. */
  items: WebhookEndpoint[];
  /** Opaque cursor to pass as `?cursor=` for the next page. Empty when `has_more` is false. */
  next_cursor?: string;
  /** True when additional pages exist after this one. */
  has_more: boolean;
}

/** Response from {@link WebhooksClient.testWebhook}. */
export interface TestWebhookResponse {
  /** True when the endpoint returned a 2xx HTTP status. */
  success: boolean;
  /** HTTP status code returned by the endpoint; unset on a network-level error. */
  status_code?: number;
  /** Round-trip latency in milliseconds; unset on a network-level error. */
  latency_ms?: number;
  /** Human-readable failure reason; present only when `success` is false. */
  error?: string;
}

/** A single webhook delivery attempt, as returned by {@link WebhooksClient.listWebhookDeliveries}. */
export interface WebhookDeliveryRecord {
  /** Delivery record UUID. */
  id: string;
  /** UUID of the endpoint that received (or should receive) the delivery. */
  endpoint_id: string;
  /** ID of the originating webhook event. */
  event_id: string;
  /** Event type string, mirrors the originating event. */
  event_type: string;
  /** Current delivery lifecycle state. */
  status: "pending" | "success" | "failed" | "dead_letter";
  /** HTTP status returned by the customer endpoint; unset when the request never reached the server. */
  http_status?: number;
  /** Total attempts made so far, including the initial attempt (maximum 4: 1 initial + 3 retries). */
  attempt_count: number;
  /** Round-trip time of the last successful attempt, in milliseconds. */
  latency_ms?: number;
  /** Human-readable error from the most recent failed attempt. Never contains PII. */
  last_error?: string;
  /** UTC timestamp the delivery record was first created. */
  created_at: string;
  /** UTC timestamp the delivery reached a terminal state; unset while still in-flight. */
  completed_at?: string;
}

/** Query options for {@link WebhooksClient.listWebhookDeliveries}. */
export interface ListWebhookDeliveriesOptions {
  /** Maximum records to return (default 50, max 200). */
  limit?: number;
  /** Number of records to skip (default 0). */
  offset?: number;
}

/** Response from {@link WebhooksClient.listWebhookDeliveries}. */
export interface ListWebhookDeliveriesResponse {
  /** Paginated slice of delivery records for the endpoint. */
  deliveries: WebhookDeliveryRecord[];
  /** Total number of delivery records for the endpoint (for pagination UIs). */
  total: number;
}

/** Response from {@link WebhooksClient.resendWebhookDelivery}. */
export interface ResendWebhookDeliveryResponse {
  /** True when the delivery was successfully re-queued. */
  requeued: boolean;
  /** UUID of the re-queued delivery record. */
  delivery_id: string;
}

/** A single known webhook event type, as returned by {@link WebhooksClient.listWebhookEventTypes}. */
export interface WebhookEventTypeInfo {
  /** Event type string used in webhook subscriptions, e.g. "call_ended". */
  name: string;
  /** Human-readable explanation of when this event fires. */
  description: string;
  /** Grouping category, e.g. "voice", "chat", "compliance". */
  category: string;
  /** Path (+ query) to this event type's example payload, via {@link WebhooksClient.getWebhookEventSchema}. */
  schema_url: string;
}

/** Response from {@link WebhooksClient.listWebhookEventTypes}. */
export interface ListWebhookEventTypesResponse {
  /** Every known webhook event type. */
  event_types: WebhookEventTypeInfo[];
}

/** Response from {@link WebhooksClient.getWebhookEventSchema}. */
export interface WebhookEventSchema {
  /** Event type string this schema documents. */
  event_type: string;
  /** Grouping category, e.g. "voice", "chat", "compliance". */
  category: string;
  /** Human-readable explanation of when this event fires. */
  description: string;
  /** Version tag of this hand-maintained example catalogue; bumped on breaking field-set changes. */
  schema_version: string;
  /** Fully-populated, illustrative example of the JSON envelope delivered for this event type. */
  example_payload: unknown;
  /** How sensitive fields are handled for this event category; always set for compliance.* events. */
  pii_handling_note?: string;
}

/** Response from {@link WebhooksClient.getWebhookSecretStatus}. */
export interface WebhookSecretStatusResponse {
  /** True while the 72-hour dual-signature rotation grace period is active. */
  in_rotation: boolean;
  /** UTC timestamp when the rotation grace window closes; unset when `in_rotation` is false. */
  grace_period_ends?: string;
  /** UTC timestamp when the signing secret was first provisioned for this tenant. */
  created_at: string;
}

/**
 * Response from {@link WebhooksClient.rotateWebhookSecret}.
 *
 * `signing_secret` is the new plaintext key, returned exactly once — store it
 * securely, as no later call (including `getWebhookSecretStatus` or another
 * rotate) will ever return it again.
 */
export interface RotateWebhookSecretResponse {
  /** Always true on a 200 response. */
  rotated: boolean;
  /** The newly generated plaintext HMAC-SHA256 signing secret (64 lowercase hex characters). */
  signing_secret: string;
  /** UTC timestamp when the previous signing key stops being valid for verification. */
  grace_period_ends: string;
}

// ─── Agents (Agent Worker) ─────────────────────────────────────────

/** Query options for {@link AgentsClient.listAgents}. */
export interface ListAgentsOptions {
  /** Max number of agents to return (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's next_cursor. */
  cursor?: string;
}

/**
 * A voice agent, as returned by the agent-worker CRUD API
 * (`GET/POST/PUT/PATCH/DELETE /v1/agents`).
 *
 * `end_call`/`voicemail`/`post_call_summary`/`post_call_extraction`/
 * `auto_handover_config` are policy objects sealed onto the agent's
 * per-agent Configuration; their shapes are documented server-side (see
 * `tenant.EndCallConfig` et al.) and left loosely typed here since the SDK
 * only needs to pass them through.
 */
export interface Agent {
  /** Server-generated UUID primary key. */
  agent_id: string;
  /** UUID of the tenant that owns this agent. */
  tenant_id: string;
  /** Human-readable agent name. */
  name: string;
  /** System prompt / instructions given to the LLM. */
  prompt: string;
  /** BCP-47 language code the agent operates in. */
  language: string;
  /** TTS voice identifier used for this agent's spoken responses. */
  voice_id: string;
  /** LLM provider, e.g. "openai" | "mistral". */
  llm_provider: string;
  /** LLM model identifier, e.g. "gpt-4.1-mini". */
  llm_model: string;
  /** Speech-to-text provider, e.g. "deepgram". */
  stt_provider: string;
  /** Text-to-speech provider: "voxtral" | "elevenlabs". */
  tts_provider: string;
  /** TTS model ("" = provider default). */
  tts_model?: string;
  /** Agent lifecycle state: "draft" | "published" | "archived". */
  status: string;
  /** Server-managed optimistic-concurrency counter, incremented on every update. */
  version: number;
  /** Compliance jurisdiction code (ISO 3166-1 alpha-2), e.g. "NL". */
  jurisdiction?: string;
  /** E.164 DID phone number currently routed to this agent, when assigned. */
  assigned_phone?: string;
  /** UUID of the dedicated per-agent Configuration row; omitted for legacy agents. */
  configuration_id?: string;
  /** Tool UUIDs currently attached to this agent. */
  tool_ids?: string[];
  /** LLM sampling temperature, in [0.0, 2.0]. */
  temperature?: number;
  /** Caps a call's total duration in seconds; 0 means no cap. Writes accept 0..10800 (3 hours). */
  max_duration_seconds?: number;
  /** Whether the agent speaks first at connect. */
  greet_on_connect?: boolean;
  /** Static agent greeting spoken verbatim via TTS at connect. */
  begin_message?: string;
  /** Who speaks first at call connect: "agent" | "caller". */
  start_speaker?: "agent" | "caller";
  /** End-call & voicemail-detection policy. */
  end_call?: Record<string, unknown>;
  voicemail?: Record<string, unknown>;
  /** Agency-configurable post-call summary policy. */
  post_call_summary?: Record<string, unknown>;
  /** Custom post-call extraction schema (tirza-support-spec A3). */
  post_call_extraction?: Record<string, unknown>;
  /** Auto-handover-on-escalation policy. */
  auto_handover_config?: Record<string, unknown>;
  /** Server-generated creation timestamp (UTC). */
  created_at: string;
  /** Server-generated last-update timestamp (UTC). */
  updated_at: string;
  /** Set when the agent has been soft-deleted; omitted for active agents. */
  deleted_at?: string;
}

/** Response from {@link AgentsClient.listAgents}. */
export interface ListAgentsResponse {
  /** Current page of non-deleted agents, ordered by created_at DESC. */
  agents: Agent[];
  /** True when additional agents exist beyond this page. */
  has_more: boolean;
  /** Opaque cursor to pass as `?cursor=` for the next page. Empty when has_more is false. */
  next_cursor?: string;
}

/** LLM provider accepted by the agent API (server allow-list). */
export type AgentLLMProvider = "mistral" | "openai";

/** LLM model accepted by the agent API (server allow-list). */
export type AgentLLMModel = "gpt-4.1-mini" | "mistral-small-2603";

/** Speech-to-text provider accepted by the agent API. */
export type AgentSTTProvider = "deepgram";

/**
 * Text-to-speech provider accepted by the agent API. Voxtral (Mistral, EU) is
 * the default; ElevenLabs (US, global endpoint) is opt-in per agent.
 */
export type AgentTTSProvider = "voxtral" | "elevenlabs";

/**
 * Provider-specific TTS model. `""` selects the provider default. The allowed
 * values depend on `tts_provider` (a mismatch is a 400 naming `tts_model`).
 */
export type AgentTTSModel =
  | ""
  | "eleven_flash_v2_5"
  | "eleven_multilingual_v2"
  | "eleven_turbo_v2_5"
  | "voxtral-mini-tts-2603";

/** Built-in TTS voice id accepted by the agent API. See {@link AgentsClient.listVoices}. */
export type AgentVoiceId =
  | "en_paul_angry"
  | "en_paul_cheerful"
  | "en_paul_confident"
  | "en_paul_excited"
  | "en_paul_happy"
  | "en_paul_neutral"
  | "en_paul_sad"
  | "fr_marie_angry"
  | "fr_marie_excited"
  | "fr_marie_happy"
  | "fr_marie_neutral"
  | "fr_marie_sad";

/**
 * Voice id accepted on agent create/update/patch: a built-in
 * {@link AgentVoiceId} or a tenant-cloned voice id (`POST /v1/voices`). The
 * server enforces no closed list, only a denylist of retired voices.
 */
export type AgentVoiceIdInput = AgentVoiceId | (string & {});

/** Request body for {@link AgentsClient.createAgent}. */
export interface CreateAgentRequest {
  /** Human-readable agent name. Required, non-empty. */
  name: string;
  /** BCP-47 language code the agent operates in. Required. */
  language: string;
  /** System prompt / instructions given to the LLM. Optional (a sample prompt is applied when omitted). */
  prompt?: string;
  /** TTS voice identifier. See {@link AgentsClient.listVoices} for valid values. */
  voice_id?: AgentVoiceIdInput;
  /** LLM provider: "mistral" | "openai". */
  llm_provider?: AgentLLMProvider;
  /** LLM model identifier, e.g. "gpt-4.1-mini" | "mistral-small-2603". */
  llm_model?: AgentLLMModel;
  /** Speech-to-text provider: "deepgram". */
  stt_provider?: AgentSTTProvider;
  /** Text-to-speech provider: "voxtral". */
  tts_provider?: AgentTTSProvider;
  /** TTS model for the provider; omit (or `""`) for the provider default. */
  tts_model?: AgentTTSModel;
  /** Initial lifecycle state. Optional; defaults to "published". Only "draft"/"published" are valid at create time. */
  status?: "draft" | "published";
  /** Compliance jurisdiction code. Optional; defaults to "DE". */
  jurisdiction?: string;
  /** LLM sampling temperature, in [0.0, 2.0]. Omit for the 0.7 default; an explicit 0.0 is honored verbatim. */
  temperature?: number | null;
  /** Caps a call's total duration in seconds; 0 (default) means no cap. Must be 0..10800 (3 hours). */
  max_duration_seconds?: number;
  /** Whether the agent speaks first at connect. Defaults to true when omitted. */
  greet_on_connect?: boolean;
  /** Static agent greeting spoken verbatim via TTS at connect. */
  begin_message?: string;
  /** Who speaks first at call connect. Defaults to "agent". */
  start_speaker?: "agent" | "caller";
  end_call?: Record<string, unknown>;
  voicemail?: Record<string, unknown>;
  post_call_summary?: Record<string, unknown>;
  post_call_extraction?: Record<string, unknown>;
  auto_handover_config?: Record<string, unknown>;
  /** UUIDs of tools to attach to the agent at creation time. */
  tool_ids?: string[];
}

/** Response from {@link AgentsClient.createAgent} (201 created). */
export interface CreateAgentResponse {
  /** Server-generated UUID primary key. */
  agent_id: string;
  /** UUID of the tenant that owns this agent. */
  tenant_id: string;
  name: string;
  prompt: string;
  language: string;
  voice_id: string;
  llm_provider: string;
  llm_model: string;
  stt_provider: string;
  tts_provider: string;
  /** TTS model ("" = provider default). */
  tts_model?: string;
  /** Agent lifecycle state as persisted ("draft" or "published"). */
  status: string;
  temperature?: number;
  /** Jurisdiction code applied, echoing the request (empty when unset). */
  jurisdiction?: string;
  /** UUID of the provisioned per-agent Configuration; omitted when provisioning did not run. */
  configuration_id?: string;
  tool_ids?: string[];
  /** Server-generated creation timestamp (UTC, RFC 3339). */
  created_at: string;
}

/**
 * Request body for {@link AgentsClient.updateAgent} — a full-replacement PUT.
 * All mutable fields are replaced; omitted fields are treated as their zero
 * value (use {@link AgentsClient.patchAgent} for partial updates).
 */
export interface UpdateAgentRequest {
  name: string;
  language: string;
  prompt: string;
  voice_id?: AgentVoiceIdInput;
  llm_provider?: AgentLLMProvider;
  llm_model?: AgentLLMModel;
  stt_provider?: AgentSTTProvider;
  tts_provider?: AgentTTSProvider;
  /** TTS model for the provider; omit (or `""`) for the provider default. */
  tts_model?: AgentTTSModel;
  status?: "archived" | "draft" | "published";
  jurisdiction?: string;
  temperature?: number | null;
  max_duration_seconds?: number;
  greet_on_connect?: boolean;
  begin_message?: string;
  start_speaker?: "agent" | "caller";
  end_call?: Record<string, unknown>;
  voicemail?: Record<string, unknown>;
  post_call_summary?: Record<string, unknown>;
  post_call_extraction?: Record<string, unknown>;
  auto_handover_config?: Record<string, unknown>;
  tool_ids?: string[];
}

/**
 * Request body for {@link AgentsClient.patchAgent} — only the supplied fields
 * change; omitted fields keep their current value. Server-managed fields
 * (tenant_id, configuration_id, version) cannot be set.
 */
export interface PatchAgentRequest {
  name?: string;
  language?: string;
  prompt?: string;
  voice_id?: AgentVoiceIdInput;
  llm_provider?: AgentLLMProvider;
  llm_model?: AgentLLMModel;
  stt_provider?: AgentSTTProvider;
  tts_provider?: AgentTTSProvider;
  /** TTS model for the provider; omit (or `""`) for the provider default. */
  tts_model?: AgentTTSModel;
  status?: "archived" | "draft" | "published";
  jurisdiction?: string;
  temperature?: number | null;
  max_duration_seconds?: number;
  greet_on_connect?: boolean;
  begin_message?: string;
  start_speaker?: "agent" | "caller";
  end_call?: Record<string, unknown>;
  voicemail?: Record<string, unknown>;
  post_call_summary?: Record<string, unknown>;
  post_call_extraction?: Record<string, unknown>;
  auto_handover_config?: Record<string, unknown>;
  tool_ids?: string[];
}

/** Response from {@link AgentsClient.deleteAgent}. */
export interface DeleteAgentResponse {
  /** Always true on success. */
  deleted: boolean;
}

/** Response from {@link AgentsClient.getPipelineStatus}. */
export interface PipelineStatusResponse {
  /** Number of voice pipeline instances currently running in the agent-worker process. */
  active_pipelines: number;
  /** UTC instant this status snapshot was generated (RFC 3339). */
  timestamp: string;
}

/** A single TTS voice, as returned by {@link AgentsClient.getVoice} or within {@link VoiceProvider}. */
export interface Voice {
  /** Stable identifier used in agent configuration (`Agent.voice_id`). */
  voice_id: string;
  /** Human-readable display name for the voice. */
  name: string;
  /** BCP-47 language code (e.g. "en", "de", "en-GB"). */
  language: string;
  /** "male" or "female". */
  gender: string;
  /** Speaking style (e.g. "neutral", "conversational", "professional"). */
  style?: string;
  /** Region/accent descriptor (e.g. "British", "French"). */
  accent?: string;
  /** Short playable audio sample of this voice, if hosted. */
  preview_url?: string;
  /**
   * Language codes the voice can speak (e.g. "de", "ja"); `language` is its
   * native one. ElevenLabs voices are multilingual.
   */
  languages?: string[];
}

/** One TTS model of a provider and the languages it speaks. */
export interface TTSModelInfo {
  /** `tts_model` value (`""` on an agent selects the default). */
  id: string;
  default: boolean;
  /** Language codes the model speaks; absent when not published (Voxtral). */
  languages?: string[];
}

/** Filters for {@link AgentsClient.listVoices}. */
export interface ListVoicesParams {
  /** Keep voices (and models) that speak this language, e.g. "de" or "de-DE"; native speakers first. */
  language?: string;
  /** Keep one TTS provider. */
  provider?: AgentTTSProvider;
  /** Maximum voices per provider, 1–1000 (server default 100). */
  limit?: number;
}

/** One TTS provider's catalogue entry, as returned within {@link ListVoicesResponse}. */
export interface VoiceProvider {
  /** Human-readable provider label shown in the UI. */
  display_name: string;
  /** Ordered list of voices offered by this provider. */
  voices: Voice[];
  /** The provider's TTS models and the languages each speaks. */
  models?: TTSModelInfo[];
  /** How many voices matched before the per-provider limit. */
  total?: number;
  /** True when `voices` was cut to the limit; narrow with `language` or raise `limit`. */
  truncated?: boolean;
}

/** Response from {@link AgentsClient.listVoices} — the full voice catalog keyed by provider. */
export type ListVoicesResponse = Record<string, VoiceProvider>;

/** Optional fields for {@link AgentsClient.createVoice}'s multipart voice-clone request. */
export interface CreateVoiceOptions {
  /** BCP-47 language tag, e.g. "en-GB". */
  language?: string;
  /** Region/accent label, e.g. "British". */
  accent?: string;
  /** "female" | "male". */
  gender?: string;
  /** Speaking style, e.g. "professional". */
  style?: string;
  /** Filename recorded for the uploaded reference clip. */
  filename?: string;
}

/** Response from {@link AgentsClient.createVoice} (201 created). */
export interface CreateVoiceResponse {
  voice_id: string;
  name: string;
  language: string;
  gender: string;
  style?: string;
  accent?: string;
  preview_url?: string;
  provider: string;
}

// ─── Tools (Agent Worker) ───────────────────────────────────────────
//
// Wire types for the custom function-calling tool CRUD surface and the
// agent-tool attachment endpoints.
// Field names mirror the Go JSON tags verbatim (snake_case).

/** A single static HTTP header sent with every tool request (pipeline.ToolHeader). */
export interface ToolHeader {
  /** HTTP header name (e.g. "Authorization", "X-Api-Key"). */
  key: string;
  /** Header value, or a `{{varName}}` template resolved at execution time. */
  value: string;
}

/** A single query parameter appended to the tool URL (pipeline.ToolQueryParam). */
export interface ToolQueryParam {
  /** Query parameter name (e.g. "format", "limit"). */
  key: string;
  /** "const" (fixed value) or "description" (LLM-supplied at call time). */
  mode: "const" | "description";
  /** Fixed value ("const") or LLM-facing description ("description"). */
  value: string;
}

/**
 * Maps a JSON path inside a tool's HTTP response to a dynamic variable name
 * (pipeline.ToolResponseVar) available to subsequent tool calls/prompts.
 */
export interface ToolResponseVar {
  /** Variable name written to the dynamic variable store. */
  name: string;
  /** Dot-separated key path into the response body (e.g. "data.user.id"). */
  json_path: string;
}

/** Controls in-flight hold audio while an HTTP tool call is executing (pipeline.SpeakDuringExec). */
export interface ToolSpeakDuring {
  /** Activates speak-during behaviour for this tool. */
  enabled: boolean;
  /** Phrase spoken while the tool executes. Required when `enabled` is true. */
  text?: string;
}

/** Runtime dispatch settings for a tool (pipeline.ToolExecution). */
export interface ToolExecution {
  /** In-flight hold audio settings. */
  speak_during: ToolSpeakDuring;
  /** HTTP client timeout override in ms, 1–300000. Zero/omitted uses the default. */
  timeout_ms?: number;
  /** Swaps the LLM model for the single turn that invokes this tool. */
  model_override?: string;
}

/**
 * Full tool configuration (pipeline.ToolConfig), returned by every tool CRUD
 * operation. `method`/`url`/`parameters` are only populated for a custom HTTP
 * tool; a platform-supplied tool (`provider` set, e.g. "cal_com") instead
 * carries `provider_tool`/`connection_id`/`provider_config`.
 */
export interface ToolConfig {
  /** Server-generated UUID primary key. */
  tool_id: string;
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** Unique, machine-readable identifier within the tenant. Matches `^[a-zA-Z0-9_-]+$`. */
  name: string;
  /** Natural-language explanation sent to the LLM as the function description. */
  description: string;
  /** HTTP method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE". Empty for a platform tool. */
  method?: string;
  /** Absolute HTTP(S) endpoint. May contain `{{varName}}` placeholders. Empty for a platform tool. */
  url?: string;
  /** Static HTTP headers sent with every request. */
  headers?: ToolHeader[];
  /** Query parameters appended to the URL. */
  query_params?: ToolQueryParam[];
  /** JSON Schema (type:object) defining the LLM-supplied call arguments. */
  parameters?: Record<string, unknown>;
  /** When true, returns the (merged) call arguments verbatim without making an HTTP request. */
  args_only: boolean;
  /** JSON response paths extracted into the pipeline's dynamic variable store. */
  response_vars?: ToolResponseVar[];
  /** Runtime dispatch settings (timeout, speak-during, model). */
  execution: ToolExecution;
  /** Server-generated UTC creation timestamp (RFC 3339). */
  created_at: string;
  /** Server-generated UTC last-modification timestamp (RFC 3339). */
  updated_at: string;
  /** Set on soft-delete; absent/undefined means the tool is active. */
  deleted_at?: string;
  /** Platform-tool provider (e.g. "cal_com"). Empty for an ordinary custom HTTP tool. */
  provider?: string;
  /** Specific operation exposed by `provider` (e.g. "book_appointment"). */
  provider_tool?: string;
  /** UUID of the integration connection supplying credentials for a platform tool. */
  connection_id?: string;
  /**
   * A warm_transfer tool's destination number with all but its last four
   * digits masked (e.g. "•••• 9354"). Response-only, never stored.
   */
  destination_hint?: string;
  /**
   * Provider-specific configuration (event type, timezone, field mappings).
   * For a `warm_transfer` tool, `destination` is written as a plaintext E.164
   * number but returned as an opaque encrypted token — never the plaintext
   * value (PII-at-rest hardening); re-saving it unchanged is a safe no-op.
   */
  provider_config?: Record<string, unknown>;
}

/**
 * Request body for {@link ToolsClient.createTool} (`POST /v1/tools`) and
 * {@link ToolsClient.replaceTool} (`PUT /v1/tools/{tool_id}`, full
 * replacement). Required for a custom HTTP tool (`provider` empty): `name`,
 * `description`, `method`, `url`. Required for a platform-supplied tool
 * (`provider` set): `name`, `description`, `provider`, `provider_tool`,
 * `connection_id` — `method`/`url`/`parameters` must then be left empty.
 */
export interface CreateToolRequest {
  name: string;
  description: string;
  method?: string;
  url?: string;
  headers?: ToolHeader[];
  query_params?: ToolQueryParam[];
  parameters?: Record<string, unknown>;
  /** Defaults to false server-side when omitted. */
  args_only?: boolean;
  response_vars?: ToolResponseVar[];
  execution?: ToolExecution;
  provider?: string;
  provider_tool?: string;
  connection_id?: string;
  provider_config?: Record<string, unknown>;
}

/**
 * Request body for {@link ToolsClient.updateTool} (`PATCH /v1/tools/{tool_id}`)
 * — a partial update. Only the fields supplied here overwrite the stored
 * configuration; omit any field you do not want to change.
 */
export interface UpdateToolRequest {
  name?: string;
  description?: string;
  method?: string;
  url?: string;
  headers?: ToolHeader[];
  query_params?: ToolQueryParam[];
  parameters?: Record<string, unknown>;
  args_only?: boolean;
  response_vars?: ToolResponseVar[];
  execution?: ToolExecution;
  provider?: string;
  provider_tool?: string;
  connection_id?: string;
  provider_config?: Record<string, unknown>;
}

/** Query options for {@link ToolsClient.listTools}. */
export interface ListToolsOptions {
  /** Exact name filter. */
  name?: string;
  /** Opaque pagination cursor (opaque token from a previous response). */
  cursor?: string;
  /** Page size, 1–100 (default 20). */
  limit?: number;
}

/** Response from {@link ToolsClient.listTools} (`GET /v1/tools`). */
export interface ListToolsResponse {
  /** Never null — empty array when no tools match. */
  tools: ToolConfig[];
  has_more: boolean;
  /** Omitted when `has_more` is false. */
  cursor?: string;
}

/** Response from {@link ToolsClient.deleteTool} (`DELETE /v1/tools/{tool_id}`). */
export interface DeleteToolResponse {
  /** Always true on success. */
  deleted: boolean;
}

/** Response from {@link ToolsClient.testTool} (`POST /v1/tools/{tool_id}/test`). */
export interface TestToolResponse {
  /** Echoes the tested tool's UUID. */
  tool_id: string;
  /** True only when every check for this tool's kind passed. */
  healthy: boolean;
  /** Checks that succeeded before either `healthy` became true or a check failed. */
  checks_passed?: string[];
  /** `book_appointment` field_mappings entries sourced from a call dynamic variable. */
  dynamic_var_fields?: string[];
  /** Stable, redacted failure code — never a raw credential or provider error message. */
  error?: string;
}

/** Query options for {@link ToolsClient.listAgentTools}. */
export interface ListAgentToolsOptions {
  /** Opaque pagination cursor (opaque token from a previous response). */
  cursor?: string;
  /** Page size (default 50, max 200). */
  limit?: number;
}

/**
 * Response from {@link ToolsClient.listAgentTools} (`GET
 * /v1/agents/{agent_id}/tools`) — the shared `{items, has_more, next_cursor}`
 * cursor-page envelope.
 */
export interface ListAgentToolsResponse {
  items: ToolConfig[];
  has_more: boolean;
  /** Omitted when `has_more` is false. */
  next_cursor?: string;
}

/** Request body for {@link ToolsClient.attachToolToAgent} (`POST /v1/agents/{agent_id}/tools`). */
export interface AttachToolRequest {
  /** UUID of the tool to attach. Obtain via {@link ToolsClient.listTools}/{@link ToolsClient.createTool}. */
  tool_id: string;
}

/** Response from {@link ToolsClient.attachToolToAgent}. */
export interface AttachToolResponse {
  agent_id: string;
  tool_id: string;
  /** Always true on success (attach is idempotent). */
  attached: boolean;
}

/** Response from {@link ToolsClient.detachToolFromAgent} (`DELETE /v1/agents/{agent_id}/tools/{tool_id}`). */
export interface DetachToolResponse {
  /** Always true on success (detach is a no-op if not currently attached). */
  detached: boolean;
}

// ─── Integrations (Agent Worker) ────────────────────────────────────
//
// Cal.com bring-your-own-account + OAuth connection management
//. Field
// names mirror the Go JSON tags verbatim (snake_case).

/** Connection credential method (integrations.AuthMethod). */
export type ConnectionAuthMethod = "api_key" | "oauth";

/** Connection lifecycle state (integrations.Status). */
export type ConnectionStatus = "active" | "revoked" | "error";

/**
 * Last-observed reachability/token state (integrations.Health), refreshed by
 * {@link IntegrationsClient.testConnection} and by credential-resolution
 * during tool execution.
 */
export type ConnectionHealth =
  | "connected"
  | "token_expired"
  | "revoked"
  | "error"
  | "unknown";

/**
 * A bring-your-own-account or OAuth integration connection
 * (integrations.Connection). Credentials are always masked — only
 * `has_api_key`/`has_oauth_token` booleans are ever returned, never a
 * Secrets Manager ARN or a raw API key/OAuth token.
 */
export interface Connection {
  connection_id: string;
  tenant_id: string;
  /** Upstream integration identifier, e.g. "cal_com". */
  provider: string;
  /** Tenant-chosen, tenant-unique (among non-deleted rows) label. */
  name: string;
  auth_method: ConnectionAuthMethod;
  status: ConnectionStatus;
  health: ConnectionHealth;
  /** True when an api_key credential is present, without exposing it. */
  has_api_key: boolean;
  /** True when OAuth tokens are present, without exposing them. */
  has_oauth_token: boolean;
  /** Cal.com username, when known (disambiguates event types by slug). */
  cal_username?: string;
  /** Granted OAuth scope string, when applicable. */
  oauth_scope?: string;
  /** Access token expiry (OAuth connections only, RFC 3339). */
  oauth_expires_at?: string;
  /** When `health` was last (re)computed (RFC 3339). */
  last_checked_at?: string;
  /** Redacted, human-readable description of the last failure. Never a secret. */
  last_error?: string;
  created_at: string;
  updated_at: string;
  /** Set on soft-delete (revoke); absent/undefined means the connection is live. */
  deleted_at?: string;
}

/** Query options for {@link IntegrationsClient.listConnections}. */
export interface ListConnectionsOptions {
  /** Filter by provider (e.g. "cal_com"). */
  provider?: string;
}

/** Response from {@link IntegrationsClient.listConnections} (`GET /v1/integrations`). */
export interface ListConnectionsResponse {
  connections: Connection[];
}

/**
 * Request body for {@link IntegrationsClient.createConnection}
 * (`POST /v1/integrations`) — a bring-your-own-account API-key connection.
 * OAuth connections are created via {@link IntegrationsClient.calcomOauthStart}
 * and its callback, never via this method.
 */
export interface CreateConnectionRequest {
  /** Tenant-chosen, tenant-unique label. Required, at most 120 characters. */
  name: string;
  /** Only "cal_com" is currently supported; empty defaults to "cal_com". */
  provider?: string;
  /** Only "api_key" is accepted by this endpoint; empty defaults to "api_key". */
  auth_method?: "api_key";
  /**
   * Raw Cal.com API key pasted from the user's own Cal.com dashboard
   * (Settings → Developer → API Keys). Write-only: never stored or echoed
   * back — only its AWS Secrets Manager ARN is persisted.
   */
  api_key: string;
  /** Cal.com username, to disambiguate event types by slug. Optional. */
  cal_username?: string;
}

/** Options for {@link IntegrationsClient.deleteConnection}. */
export interface DeleteConnectionOptions {
  /** Force revoke, cascade-soft-deleting dependent tools before revoking. */
  force?: boolean;
}

/** Response from {@link IntegrationsClient.deleteConnection} (`DELETE /v1/integrations/{connection_id}`). */
export interface DeleteConnectionResponse {
  /** Always true on success. */
  deleted: boolean;
}

/** A single Cal.com event type (calcom.EventType), as returned by `GET /v2/event-types`. */
export interface CalComEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  hidden: boolean;
}

/** Response from {@link IntegrationsClient.listConnectionEventTypes} (`GET /v1/integrations/{connection_id}/event-types`). */
export interface ListConnectionEventTypesResponse {
  event_types: CalComEventType[];
}

/** Health-check outcome from {@link IntegrationsClient.testConnection} (`POST /v1/integrations/{connection_id}/test`). */
export interface TestConnectionResponse {
  /** Echoes the tested connection's UUID. */
  connection_id: string;
  /** True only when credential resolution AND the live Cal.com probe both succeeded. */
  healthy: boolean;
  /** Mirrors {@link ConnectionHealth} — the same value persisted on the connection row. */
  health: ConnectionHealth;
  /** Number of event types Cal.com returned. Only populated when `healthy` is true. */
  event_type_count?: number;
  /**
   * Stable, redacted error code (e.g. "connection_revoked", "auth_failed",
   * "rate_limited") — never a raw Cal.com error message or credential
   * material. Empty when `healthy` is true.
   */
  error?: string;
}

/** Query options for {@link IntegrationsClient.calcomOauthStart}. */
export interface CalcomOauthStartOptions {
  /** Requested connection name (server defaults when omitted). */
  name?: string;
  /** Cal.com username, to disambiguate event types by slug. */
  cal_username?: string;
}

/** Response from {@link IntegrationsClient.calcomOauthStart} (`GET /v1/integrations/cal_com/oauth/start`). */
export interface CalcomOauthStartResponse {
  /** Cal.com-hosted consent screen URL to redirect the user's browser to. */
  authorize_url: string;
}

/**
 * Query options for {@link IntegrationsClient.calcomOauthCallback}, beyond
 * the required `state`.
 */
export interface CalcomOauthCallbackOptions {
  /** Authorization code from Cal.com (absent when `error` is set). */
  code?: string;
  /** Cal.com-side error code (e.g. the user declined consent). */
  error?: string;
}

// ─── Org self-service (Org Management) — OrgBearer ────────────────

/**
 * An org admin account (org.OrgAdmin). `role` is reserved for future RBAC —
 * today always `"org_admin"`.
 */
export interface OrgAdmin {
  admin_id: string;
  org_id: string;
  email: string;
  /** Empty string when unset (the underlying column is nullable). */
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  disabled_at?: string;
  email_verified_at?: string;
}

/**
 * An organization (org.Organization). `verification_status` is one of
 * `"unverified"`, `"verified"`, `"rejected"` — set by a platform admin via
 * `client.platform.orgs.verifyOrganization`/`rejectOrganization`, never by
 * the org itself.
 */
export interface Organization {
  org_id: string;
  name: string;
  legal_name: string;
  /** `"individual"` or `"company"`. */
  entity_type: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  verification_status: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  verified_by_kid?: string;
  default_billing_ref?: string;
}

/**
 * An organization's KYC record (org.OrgKYC). All fields beyond `org_id`/
 * `created_at`/`updated_at` are optional — absent fields are simply unset,
 * not rejected.
 */
export interface OrgKYC {
  org_id: string;
  created_at: string;
  updated_at: string;
  /** @deprecated not part of org.OrgKYC (`legal_name` lives on {@link Organization}); kept for compatibility. */
  legal_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  address_country?: string;
  registration_number?: string;
  incorporation_country?: string;
  incorporation_region?: string;
  incorporation_date?: string;
  lei?: string;
  vat_id?: string;
  tax_id?: string;
  tax_residence_country?: string;
  nationality?: string;
  date_of_birth?: string;
  representative_name?: string;
  representative_role?: string;
  website?: string;
  /** Overflow JSONB for jurisdiction-specific extras. Never national ID numbers. */
  additional?: Record<string, unknown>;
}

/**
 * Request body for {@link OrgClient.signup} (`POST /v1/org/signup`).
 * `entity_type` must be exactly `"individual"` or `"company"`; `country`
 * must be an ISO 3166-1 alpha-2 code.
 */
export interface OrgSignupRequest {
  org_name: string;
  name?: string;
  email: string;
  /** Plaintext signup password (>= 12 chars). Never logged, never echoed back. */
  password: string;
  entity_type: "individual" | "company";
  legal_name: string;
  country: string;
  /** Optional KYC superset captured at signup (subset of {@link OrgKYC} fields). */
  kyc?: Partial<OrgKYC>;
}

/** Response from {@link OrgClient.signup} (`POST /v1/org/signup`). */
export interface OrgSignupResponse {
  token: string;
  expires_in: number;
  org: Organization;
  admin: OrgAdmin;
}

/** Request body for {@link OrgClient.login} (`POST /v1/org/login`). */
export interface OrgLoginRequest {
  email: string;
  password: string;
}

/** Response from {@link OrgClient.login} (`POST /v1/org/login`). */
export interface OrgLoginResponse {
  token: string;
  expires_in: number;
  /**
   * Mirrors the organization's CURRENT (DB-checked) `verification_status` at
   * login time. A UX hint only — every protected route re-checks the
   * database, never this field.
   */
  ver: boolean;
}

/** Response from {@link OrgClient.refresh} (`POST /v1/org/refresh`). */
export interface OrgRefreshResponse {
  token: string;
  expires_in: number;
}

/**
 * Response from {@link OrgClient.getProfile}/{@link OrgClient.updateProfile}
 * (`GET`/`PATCH /v1/org/profile`).
 */
export interface OrgProfileResponse {
  org: Organization;
  admin: OrgAdmin;
}

/**
 * Request body for {@link OrgClient.updateProfile} (`PATCH /v1/org/profile`).
 * Absent/empty fields are left unchanged.
 */
export interface OrgUpdateProfileRequest {
  /** When non-empty, replaces the organization's display name. */
  org_name?: string;
  /** When non-empty, replaces the calling admin's display name. */
  admin_name?: string;
}

/** Response from {@link OrgClient.getKYC}/{@link OrgClient.updateKYC} (`GET`/`PATCH /v1/org/kyc`). */
export interface OrgKYCResponse {
  kyc: OrgKYC;
}

/**
 * Request body for {@link OrgClient.updateKYC} (`PATCH /v1/org/kyc`) — a
 * partial merge onto the organization's existing KYC record. Absent fields
 * are left unchanged; a provided-but-malformed field returns 422 `kyc_invalid`.
 */
export type OrgKYCPatchRequest = Partial<Omit<OrgKYC, "org_id" | "created_at" | "updated_at">>;

// ─── Org — org-tenant lifecycle ───────────────────────────────────
//
// Wire types for the org-owned tenant lifecycle: GET/POST /v1/org/tenants,
// GET /v1/org/tenants/{id}, DELETE /v1/org/tenants/{id}, and the
// enable/disable/restore/initialize/keys/impersonate actions
// (served by Org Management). All routes use OrgBearer, like the rest of
// {@link OrgClient}. Field names mirror the Go JSON tags verbatim
// (snake_case).

/**
 * A tenant owned by the caller's organization (org.TenantSummary).
 * `status` is `"active"` or `"disabled"`; `deleted_at` is set once
 * soft-deleted; `initialized_at` is set once the tenant's first
 * configuration + owner key have been provisioned.
 */
export interface OrgTenantSummary {
  tenant_id: string;
  name: string;
  status: string;
  created_at: string;
  /** Nil for a live tenant. */
  deleted_at?: string;
  /** Nil until {@link OrgClient.initializeTenant} succeeds. */
  initialized_at?: string;
}

/** Query options accepted by {@link OrgClient.listTenants}. */
export interface OrgListTenantsOptions {
  /** Include soft-deleted tenants. Default false. */
  include_deleted?: boolean;
  /** Max number of tenants to return (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's next_cursor. */
  cursor?: string;
}

/** Response from {@link OrgClient.listTenants} (`GET /v1/org/tenants`). */
export interface OrgListTenantsResponse {
  tenants: OrgTenantSummary[];
  /** Empty when no further tenants exist beyond this page. */
  next_cursor?: string;
}

/**
 * Request body for {@link OrgClient.createTenant} (`POST /v1/org/tenants`).
 */
export interface OrgCreateTenantRequest {
  /** Human-readable tenant name. Required, non-empty. */
  name: string;
}

/** Response from {@link OrgClient.createTenant} (`POST /v1/org/tenants`). */
export interface OrgCreateTenantResponse {
  tenant: OrgTenantSummary;
}

/** Response from {@link OrgClient.getTenant} (`GET /v1/org/tenants/{id}`). */
export interface OrgGetTenantResponse {
  tenant: OrgTenantSummary;
}

/**
 * Response from {@link OrgClient.softDeleteTenant}/
 * {@link OrgClient.enableTenant}/{@link OrgClient.disableTenant}/
 * {@link OrgClient.restoreTenant} — every org-tenant action route that just
 * returns the updated tenant.
 */
export interface OrgTenantActionResponse {
  tenant: OrgTenantSummary;
}

/**
 * Response from {@link OrgClient.impersonateTenant}
 * (`POST /v1/org/tenants/{id}/impersonate`).
 */
export interface OrgImpersonateTenantResponse {
  /**
   * Short-lived tenant JWT (`{tid, role:"owner", imp, oid}`, ~20 minutes)
   * the caller can present to tenant-facing services to act as the
   * tenant's owner. Returned exactly once — never stored server-side,
   * never logged.
   */
  tenant_token: string;
  /** Remaining token lifetime in seconds (~1200s / 20m). */
  expires_in: number;
}

/**
 * A newly-minted tenant owner API key (org.InitializeAPIKeyView), returned
 * by {@link OrgClient.initializeTenant}/{@link OrgClient.issueTenantKey}.
 * The `key` field is the full raw value, returned exactly once.
 */
export interface OrgTenantAPIKeyView {
  api_key_id: string;
  /** Full raw API key value. RETURNED ONCE — store it securely immediately. */
  key: string;
  key_prefix: string;
  /** Always `"owner"` for keys minted by these routes. */
  role: string;
}

/**
 * Response from {@link OrgClient.initializeTenant}
 * (`POST /v1/org/tenants/{id}/initialize`).
 */
export interface OrgInitializeTenantResponse {
  tenant: OrgTenantSummary;
  api_key: OrgTenantAPIKeyView;
}

/**
 * Request body for {@link OrgClient.issueTenantKey}
 * (`POST /v1/org/tenants/{id}/keys`).
 */
export interface OrgIssueTenantKeyRequest {
  /** Human-readable label for the new key. Optional, defaults to `"owner"`. */
  name?: string;
}

/**
 * Response from {@link OrgClient.issueTenantKey}
 * (`POST /v1/org/tenants/{id}/keys`).
 */
export interface OrgIssueTenantKeyResponse {
  api_key: OrgTenantAPIKeyView;
}

// ─── Platform-org admin — PlatformBearer ─────────────────────────
//
// Wire types for the platform-admin org-management surface: list/find,
// verify, and reject organizations, and find/recover org_admins
// (served by Org Management). Every route here uses `PlatformBearer` — a
// pre-minted Ed25519 platform token, entirely distinct from both the tenant
// API key and the `OrgBearer` JWT used by the rest of {@link OrgClient}.
// Field names mirror the Go JSON tags verbatim (snake_case). Reuses
// {@link Organization}/{@link OrgAdmin} (defined above for the org
// self-service surface) since the wire shapes are identical.

/** Query options accepted by {@link PlatformOrgClient.listOrganizations}. */
export interface PlatformListOrganizationsOptions {
  /** Filter by verification_status. */
  status?: "unverified" | "verified" | "rejected";
  /** Filter by an org_admin's exact (case-insensitive) email, returning its owning organization. */
  email?: string;
  /** Max number of organizations to return (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's next_cursor. */
  cursor?: string;
}

/**
 * Response from {@link PlatformOrgClient.listOrganizations}
 * (`GET /v1/platform/organizations`).
 */
export interface PlatformListOrganizationsResponse {
  organizations: Organization[];
  /** Empty when no further organizations exist beyond this page. */
  next_cursor?: string;
}

/**
 * Response from {@link PlatformOrgClient.verifyOrganization}/
 * {@link PlatformOrgClient.rejectOrganization}
 * (`POST /v1/platform/organizations/{org_id}/verify`|`/reject`).
 */
export interface PlatformOrganizationResponse {
  organization: Organization;
}

/**
 * Request body for {@link PlatformOrgClient.rejectOrganization}
 * (`POST /v1/platform/organizations/{org_id}/reject`). `reason` is
 * required — persisted only in the org_audit_log `"org.reject"` row's
 * metadata, never on the organization record itself.
 */
export interface PlatformRejectOrganizationRequest {
  reason: string;
}

/** Query options accepted by {@link PlatformOrgClient.findOrgAdmins}. */
export interface PlatformFindOrgAdminsOptions {
  /** Exact org_admin email (CITEXT, case-insensitive). */
  email?: string;
  /** Organization UUID. */
  org_id?: string;
}

/**
 * Response from {@link PlatformOrgClient.findOrgAdmins}
 * (`GET /v1/platform/org-admins`). Never includes password_hash.
 */
export interface PlatformFindOrgAdminsResponse {
  org_admins: OrgAdmin[];
}

/**
 * Response from {@link PlatformOrgClient.changeOrgAdminEmail}
 * (`PATCH /v1/platform/org-admins/{admin_id}`).
 */
export interface PlatformOrgAdminResponse {
  org_admin: OrgAdmin;
}

/**
 * Request body for {@link PlatformOrgClient.changeOrgAdminEmail}
 * (`PATCH /v1/platform/org-admins/{admin_id}`).
 */
export interface PlatformChangeOrgAdminEmailRequest {
  email: string;
}

/**
 * Request body for {@link PlatformOrgClient.resetOrgAdminPassword}
 * (`POST /v1/platform/org-admins/{admin_id}/reset-password`). Omit or leave
 * `new_password` empty to mint a one-time reset token instead of setting a
 * password directly.
 */
export interface PlatformResetOrgAdminPasswordRequest {
  /** >= 12 chars when provided. Never echoed back or logged. */
  new_password?: string;
}

/**
 * Response from {@link PlatformOrgClient.resetOrgAdminPassword}
 * (`POST /v1/platform/org-admins/{admin_id}/reset-password`).
 */
export interface PlatformResetOrgAdminPasswordResponse {
  /** `"password_set"` (new_password mode) or `"token"` (one-time reset-token mode). */
  reset: string;
  /** Present ONLY in `"token"` mode. Returned exactly once — never stored in plaintext beyond a short Redis TTL. */
  token?: string;
  /** Present ONLY in `"token"` mode: the token's remaining lifetime in seconds. */
  expires_in?: number;
}

// ─── Aggregation (Aggregator) ──────────────────────────────────────

/** Options for {@link AggregationClient.listProofs} (`GET /v1/proofs`). */
export interface ListProofsOptions {
  /** Results per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's `next_cursor`. */
  cursor?: string;
}

/**
 * Summary of a single aggregation window in which the authenticated tenant
 * participated (`GET /v1/proofs` list item).
 */
export interface AggregationProofSummary {
  /** Server-generated UUID of the aggregation_results row. */
  aggregation_id: string;
  /** Monotonically increasing batch sequence number. */
  batch_number: number;
  /** Server-generated timestamp of the aggregation_results row. */
  created_at: string;
  /** Hex-encoded SHA-256 Merkle root of the padded tree. */
  merkle_root: string;
  /** Lifecycle state: one of pending, timestamped, attested, complete, failed. */
  status: string;
  /** Hex-encoded per-tenant aggregate hash for this window. */
  tenant_aggregate_hash: string;
  /** Time attested by the RFC 3161 TSA. Absent when no proof exists yet. */
  timestamp_time?: string;
  /** URL of the Time-Stamp Authority endpoint. Absent when no proof exists yet. */
  tsa_url?: string;
  /** Exclusive end of the aggregation window (UTC). */
  window_end: string;
  /** Canonical RFC 3339 string identifying the window (equals window_start). */
  window_id: string;
  /** Inclusive start of the aggregation window (UTC). */
  window_start: string;
}

/** Response from {@link AggregationClient.listProofs} (`GET /v1/proofs`). */
export interface ProofListResponse {
  /** Current page of aggregation windows, newest first. */
  proofs: AggregationProofSummary[];
  /** `len(proofs)`, provided for caller convenience. */
  count: number;
  /** Number of aggregation windows the tenant participated in, across all pages. Omitted if the store cannot count. */
  total?: number;
  /** True when additional results exist beyond this page. */
  has_more: boolean;
  /** Opaque cursor to pass as `cursor` to fetch the next page. Empty when `has_more` is false. */
  next_cursor?: string;
}

/**
 * One step of a Merkle authentication path
 * ({@link BranchProofResponse.steps} / {@link VerifyInclusionRequest.steps}).
 */
export interface MerkleProofStep {
  /** Hex-encoded SHA-256 sibling hash at this level. */
  hash: string;
  /**
   * Sibling's position relative to the current node: `"left"` — combine as
   * SHA-256(sibling || current); `"right"` — combine as
   * SHA-256(current || sibling).
   */
  position: string;
}

/**
 * Merkle authentication path proving a tenant's aggregate hash is included
 * in a Merkle root (embedded in {@link ProofResponse.branch_proof}).
 */
export interface BranchProofResponse {
  /** Total number of leaf positions (real + padding). */
  leaf_count: number;
  /** Hex-encoded SHA-256 of the tenant's aggregate hash leaf. */
  leaf_hash: string;
  /** 0-based position of this leaf in the padded tree. */
  leaf_index: number;
  /** Number of padding leaves added to reach the minimum 16. */
  pad_count: number;
  /** Hex-encoded SHA-256 Merkle root. Equals `merkle_root` in {@link ProofResponse}. */
  root: string;
  /** Ordered Merkle authentication path from leaf to root. */
  steps: MerkleProofStep[];
  /** Number of levels above the leaf level. */
  tree_depth: number;
}

/**
 * Response from {@link AggregationClient.getProof}
 * (`GET /v1/proofs/{window_id}`).
 */
export interface ProofResponse {
  /** Server-generated UUID of the aggregation_results row. */
  aggregation_id: string;
  /** Monotonically increasing batch sequence number. */
  batch_number: number;
  /** Merkle authentication path proving inclusion of this tenant's leaf. */
  branch_proof: BranchProofResponse;
  /** Hex-encoded SHA-256 Merkle root of the padded tree. */
  merkle_root: string;
  /** Hex-encoded per-tenant aggregate hash forming this tenant's leaf. */
  tenant_aggregate_hash: string;
  /** Time attested by the RFC 3161 TSA. */
  timestamp_time?: string;
  /** Base64-encoded DER-encoded RFC 3161 TimeStampToken. */
  timestamp_token?: string;
  /** URL of the Time-Stamp Authority endpoint that issued the token. */
  tsa_url?: string;
  /** Canonical RFC 3339 string identifying the window (equals window_start). */
  window_id: string;
}

/** Single entry of the meta-chain (chain-of-chains) of Merkle roots. */
export interface MetaChainEntry {
  aggregation_id: string;
  chain_hash: string;
  merkle_root: string;
  meta_id: string;
  previous_hash: string;
  sequence: number;
}

/** Options for {@link AggregationClient.getMetachain} (`GET /v1/metachain`). */
export interface GetMetachainOptions {
  /** Number of entries per page (default 50, max 200). */
  limit?: number;
  /** Opaque pagination cursor from a previous response's `next_cursor`. */
  cursor?: string;
}

/** Response from {@link AggregationClient.getMetachain} (`GET /v1/metachain`). */
export interface MetaChainResponse {
  /** `len(entries)`, provided for caller convenience. */
  count: number;
  /** Total number of entries in the whole meta-chain. Omitted if the store cannot count. */
  total?: number;
  /** Current page of the meta-chain in ascending sequence order. */
  entries: MetaChainEntry[];
  /** True when additional entries exist beyond this page. */
  has_more: boolean;
  /** Opaque cursor to pass as `cursor` to fetch the next page. Empty when `has_more` is false. */
  next_cursor?: string;
}

/**
 * Request body for {@link AggregationClient.verifyInclusion}
 * (`POST /v1/verify-inclusion`).
 */
export interface VerifyInclusionRequest {
  /** Total number of leaf positions (real + padding). Informational only. */
  leaf_count?: number;
  /** Hex-encoded SHA-256 hash of the leaf being proven. */
  leaf_hash: string;
  /** 0-based position of the leaf in the padded tree. */
  leaf_index?: number;
  /** Number of padding leaves added to reach the minimum 16. Informational only. */
  pad_count?: number;
  /** Hex-encoded SHA-256 Merkle root to verify against. */
  root: string;
  /** Ordered Merkle authentication path from leaf to root. */
  steps: MerkleProofStep[];
  /** Number of levels above the leaf level. Informational only. */
  tree_depth?: number;
}

/**
 * Response from {@link AggregationClient.verifyInclusion}
 * (`POST /v1/verify-inclusion`).
 */
export interface VerifyInclusionResponse {
  /** True iff the supplied proof cryptographically demonstrates inclusion. */
  valid: boolean;
}

/**
 * Request body for {@link AggregationClient.triggerAggregation}
 * (`POST /v1/admin/aggregate`). Requires the owner role.
 */
export interface AdminAggregateRequest {
  /** Inclusive start of the evidence collection window (RFC 3339 UTC). Required if `window_end` is set. */
  window_start?: string;
  /** Exclusive end of the evidence collection window (RFC 3339 UTC). Required if `window_start` is set. */
  window_end?: string;
}

/**
 * Response from {@link AggregationClient.triggerAggregation}
 * (`POST /v1/admin/aggregate`).
 */
export interface AdminAggregateResponse {
  /** Server-generated UUID of the aggregation_results row. */
  aggregation_id: string;
  /** Monotonically increasing sequence number for this batch. */
  batch_number: number;
  /** Total number of leaves (real + padding) in the tree. */
  leaf_count: number;
  /** Hex-encoded SHA-256 Merkle root of the padded tree. */
  merkle_root: string;
  /** Number of distinct tenants with evidence in the window. */
  tenant_count: number;
  /** Time attested by the RFC 3161 TSA. */
  ts_timestamp?: string;
  /** Common Name / Organisation of the TSA signing certificate. */
  tsa_name?: string;
  /** Exclusive end of the aggregated window (UTC). */
  window_end: string;
  /** Inclusive start of the aggregated window (UTC). */
  window_start: string;
}

// ─── Policy (Policy Engine) ────────────────────────────────────────

/**
 * Call-level facts referenced by policy rule conditions. The most common
 * cross-jurisdiction fields are named here; per-jurisdiction fields also
 * exist — see {@link PolicyClient.getPolicy}.
 */
export interface PolicyEvaluationContext {
  /**
   * `"inbound"` (the human called the agent) or `"outbound"` (the agent
   * called the human). Quiet-hours/calling-hours restrictions only apply to
   * outbound calls.
   */
  direction?: "inbound" | "outbound";
  /**
   * RFC 3339 timestamp of the call, used to evaluate quiet-hours/
   * calling-hours windows server-side. Defaults to the current time when
   * absent. Ignored when `direction` is `"inbound"`.
   */
  call_time?: string;
  /**
   * Overrides the server-computed quiet-hours result. Exists primarily for
   * tests and pre-computed pipelines — most callers should not set this.
   */
  call_within_permitted_hours?: boolean;
  /** The contact's recorded consent state, e.g. `"granted"`, `"revoked"`, `"unknown"`. */
  consent_status?: string;
  /** Classifies the contact for marketing-consent rules, e.g. `"consumer"`, `"business"`. */
  contact_type?: string;
  /** True when the contact number is registered on the jurisdiction's Do-Not-Call list. */
  dnc_registered?: boolean;
  /** True when the contact has a pre-existing customer relationship with the tenant. */
  existing_relationship?: boolean;
}

/**
 * Request body for {@link PolicyClient.evaluatePolicy} (`POST /v1/evaluate`).
 */
export interface EvaluatePolicyRequest {
  /** ISO 3166-1 alpha-2 code of the call's jurisdiction (case-insensitive). */
  country: string;
  /** Call-level facts referenced by rule conditions. Required; must not be omitted. */
  context: PolicyEvaluationContext;
  /**
   * BCP-47 language code of the caller/agent voice (e.g. `"de-DE"`). When
   * supplied, the response also includes `require_disclosure` and (when
   * true) `disclosure_text`/`disclosure_language`.
   */
  language?: string;
  /** Call session ID, used for `compliance.policy_evaluated` event correlation. */
  call_id?: string;
  /** Audact tenant ID, used for `compliance.policy_evaluated` event correlation. */
  tenant_id?: string;
  /** Voice/chat agent ID that triggered this evaluation. */
  agent_id?: string;
}

/**
 * Response from {@link PolicyClient.evaluatePolicy} (`POST /v1/evaluate`).
 */
export interface EvaluatePolicyResponse {
  /** Final determination: `"ALLOW"` or `"BLOCK"`. */
  verdict: "ALLOW" | "BLOCK";
  /** IDs of the use cases that produced a BLOCK. Empty (never null) when `verdict` is ALLOW. */
  applicable_rules: string[];
  /** Human-readable explanations when `verdict` is BLOCK. Empty (never null) when ALLOW. */
  reasons: string[];
  /** Formatted as `"{COUNTRY}_v{semver}"`, e.g. `"NL_v1.1.0"`. */
  policy_version?: string;
  /**
   * Earliest UTC time the call would be permitted. Set only when `verdict`
   * is BLOCK and the block is time-bounded (quiet hours/calling hours), not
   * for a permanent reason such as DNC or missing consent.
   */
  next_permitted_at?: string;
  /** True when the jurisdiction requires a disclosure statement at call start. Only set when `language` was supplied. */
  require_disclosure?: boolean;
  /** Exact text to synthesize via TTS. Only set when `require_disclosure` is true. */
  disclosure_text?: string;
  /**
   * BCP-47 language key `disclosure_text` was actually resolved under —
   * may differ from the requested `language` on fallback. Only set when
   * `require_disclosure` is true.
   */
  disclosure_language?: string;
}

/** A Do-Not-Call registry integration listed on a {@link GetPolicyResponse}. */
export interface PolicyDNCAdapter {
  id: string;
  type: string;
  description: string;
  required: boolean;
}

/** A public holiday on which calls are blocked, listed on a {@link GetPolicyResponse}. */
export interface PolicyHoliday {
  date: string;
  name: string;
}

/** A time window during which outbound calls are blocked. */
export interface PolicyQuietWindow {
  label: string;
  start: string;
  end: string;
  timezone: string;
  days: string[];
}

/** A parent→child jurisdiction rule-inheritance relationship. */
export interface PolicyJurisdictionCascade {
  parent: string;
  children: string[];
}

/** A single condition evaluated as part of a {@link PolicyUseCase}. */
export interface PolicyRuleCondition {
  field: string;
  operator: string;
  value: string;
}

/** One ordered compliance rule evaluated per call. */
export interface PolicyUseCase {
  id: string;
  description: string;
  default_verdict: string;
  block_reasons: string[];
  conditions: PolicyRuleCondition[];
}

/**
 * Response from {@link PolicyClient.getPolicy} (`GET /v1/policies/{country}`):
 * the complete policy document for a country, including use cases and
 * quiet hours.
 */
export interface GetPolicyResponse {
  /** ISO 3166-1 alpha-2 code this policy covers (e.g. `"NL"`, `"EU"`). */
  country: string;
  /** Semver string for this policy document. */
  version: string;
  /** RFC 3339 timestamp this policy version was last changed. */
  updated_at: string;
  use_cases: PolicyUseCase[];
  quiet_hours: PolicyQuietWindow[];
  holidays: PolicyHoliday[];
  dnc_adapters: PolicyDNCAdapter[];
  jurisdiction_cascade: PolicyJurisdictionCascade[];
}

/** Query options for {@link PolicyClient.checkCallingHours}. */
export interface CheckCallingHoursOptions {
  /** ISO 3166-1 alpha-2 country code (e.g. `"NL"`, `"DE"`, `"FR"`). Required. */
  country: string;
  /** RFC 3339 timestamp to check; defaults to the current server time (UTC). */
  call_time?: string;
}

/**
 * Response from {@link PolicyClient.checkCallingHours}
 * (`GET /v1/calling-hours/check`).
 */
export interface CallingHoursCheckResponse {
  /** True when an outbound call is permitted right now for the requested jurisdiction. */
  allowed: boolean;
  /** Earliest UTC time an outbound call would be permitted. Omitted when `allowed` is true. */
  next_permitted_at?: string;
  /** Formatted as `"{COUNTRY}_v{semver}"`, e.g. `"NL_v1.1.0"`. */
  policy_version?: string;
  /** Why the call is currently blocked: `"quiet_hours"` or `"holiday"`. Empty when `allowed` is true. */
  reason?: "quiet_hours" | "holiday";
}

// ─── Audio Validator ───────────────────────────────────────────────

/** Per-call metadata carried on an {@link ValidateAudioRequest}. */
export interface AudioCallContext {
  /** True when the AI disclosure has already been delivered to the called party. */
  disclosure_delivered?: boolean;
  /** BCP-47 language tag of the call (e.g. `"nl"`, `"de"`). */
  language?: string;
}

/**
 * Request body for {@link AudioClient.validateAudio}
 * (`POST /v1/validate-audio`).
 */
export interface ValidateAudioRequest {
  /** Identifies the call/session. */
  call_id: string;
  /** 1-based turn number within this call. */
  turn_number: number;
  /** Base64-encoded raw audio bytes. */
  audio_data: string;
  /** Encoding of `audio_data`. */
  audio_format: "pcm_s16le_16000" | "wav" | "mp3";
  /** UUID of the tenant configuration to apply. */
  configuration_id?: string;
  /**
   * The call's config seal. Optional: when omitted the call's pinned seal is
   * used; required only for speech in a call with no pinned seal.
   */
  config_seal_hash?: string;
  /** Overrides the default ASR provider for this request. */
  asr_provider?: string;
  /** Enables multi-model ASR for this request. */
  parallel_asr?: boolean;
  /** Segmentation strategy: `"asr_first"` (default) or `"prosodic_first"`. */
  segmentation_method?: string;
  /** Per-call metadata (language, disclosure state). */
  call_context?: AudioCallContext;
}

/** Per-check compliance detail on an {@link AudioSegmentResult}. */
export interface AudioCheckResult {
  /** Stable identifier of the check (e.g. `"blocklist_scan"`). */
  check_id: string;
  /** ALLOW, MODIFY, or BLOCK. */
  verdict: Verdict;
  /** Short, PII-free explanation of the verdict. */
  reason?: string;
}

/** Multi-model ASR agreement summary, present only when `parallel_asr` was requested. */
export interface AudioParallelASRSummary {
  /** Number of ASR models that responded. */
  model_count: number;
  /** True when every model produced the same transcription text. */
  converged: boolean;
  /** Difference between the highest and lowest model confidence scores. */
  confidence_spread: number;
}

/** Whether the ASR produced text for a segment: `"no_speech"` means the segment is ALLOW but nothing was checked. */
export type TranscriptionStatus = "transcribed" | "no_speech";

/** Per-segment validation outcome on a {@link ValidateAudioResponse}. */
export interface AudioSegmentResult {
  /** Zero-based position of this segment in the call turn. */
  segment_index: number;
  /** ASR output. Never stored in evidence events — only `text_hash` travels the chain. */
  transcribed_text?: string;
  /** SHA-256 hex digest of `transcribed_text`. */
  text_hash?: string;
  /** SHA-256 hex digest of the raw audio segment bytes. */
  audio_hash?: string;
  /** Compliance verdict: ALLOW, MODIFY, or BLOCK. */
  verdict: Verdict;
  /** Audio routing decision: `"forward"`, `"substitute"`, or `"block"`. */
  action: string;
  /** Which segmentation strategy was used. */
  segmentation_method?: string;
  /** Which ASR model produced the transcription. */
  asr_model_id?: string;
  /** ASR model's confidence score for this segment. */
  asr_confidence?: number;
  /** Per-check compliance detail. */
  check_results?: AudioCheckResult[];
  /** Non-null when parallel ASR was used. */
  parallel_asr_result?: AudioParallelASRSummary;
  /** Whether the ASR produced text for this segment. */
  transcription_status?: TranscriptionStatus;
}

/** Compliance receipt (HMAC integrity tag) returned by {@link AudioClient.validateAudio}. */
export interface AudioComplianceReceipt {
  /** Aggregated compliance verdict. */
  verdict?: string;
  /** SHA-256 of the original audio bytes. */
  input_hash?: string;
  /** SHA-256 of the forwarded or substituted audio bytes. */
  output_hash?: string;
  /** SHA-256 of the ASR transcription. */
  text_hash?: string;
  /** Last evidence chain hash for this call. */
  evidence_hash?: string;
  /** Version of the tenant configuration applied. */
  config_version?: number;
  /** Policy schema version identifier. */
  policy_version?: string;
  /** Segmentation strategy used. */
  segmentation_method?: string;
  /** Confidence score from the first (or primary) segment. */
  asr_confidence?: number;
  /** HMAC-SHA256 integrity tag over the fields above. */
  signature?: string;
  /** Call this receipt belongs to. */
  call_id?: string;
  /** Turn this audio segment was validated for. */
  turn_number?: number;
  /** Server time of the validation (UTC, RFC 3339). */
  timestamp?: string;
  /** Config seal pinned to the call. */
  config_seal_hash?: string;
  /** Integrity-tag mechanism, e.g. `"hmac-sha256"`. */
  auth_mechanism?: string;
  /** Audio receipt format version, e.g. `"1.1.0"`. Absent on older receipts. */
  receipt_format_version?: string;
}

/**
 * Response from {@link AudioClient.validateAudio}
 * (`POST /v1/validate-audio`).
 */
export interface ValidateAudioResponse {
  /** Aggregated verdict across all segments. */
  verdict: string;
  /** Per-segment validation results. */
  segments: AudioSegmentResult[];
  /** Compliance receipt with an HMAC integrity tag (dual `audio_hash` + `text_hash`). */
  receipt?: AudioComplianceReceipt;
  /** True when the validator timed out for any segment. */
  fail_open?: boolean;
  /** UUID of the evidence event written for this request. */
  evidence_event_id?: string;
  /** SHA-256 hex digest of the evidence event. */
  evidence_hash?: string;
  /** `"success"`, `"failed"`, or `"skipped"`. */
  evidence_write_status?: string;
}

/**
 * Request body for {@link AudioClient.reconcileAudio}
 * (`POST /v1/audio-reconciliation`).
 */
export interface AudioReconciliationRequest {
  /** UUID of the completed call to reconcile. Obtain from `evidence.listCalls()`. */
  call_id: string;
  /** Base64-encoded audio bytes (PCM, WAV, or MP3). */
  audio_data: string;
  /** Encoding of `audio_data`. */
  audio_format: "pcm_s16le_16000" | "wav" | "mp3";
  /** Optional UUID of the agent configuration whose `asr_config` should be used for ASR key resolution. */
  configuration_id?: string;
  /** Overrides the default ASR provider for this request. */
  asr_provider?: string;
  /** BCP-47 language tag (e.g. `"nl"`, `"de"`, `"es"`). */
  language?: string;
}

/** Options for {@link AudioClient.reconcileAudio}. */
export interface ReconcileAudioOptions {
  /** Max `segment_results` entries to return (default 100, max 200). */
  limit?: number;
  /** Return only `segment_results` with `sequence_number` greater than this value, for paging. */
  after_sequence?: number;
  /** Optional idempotency key; retried requests with the same key replay the original response. */
  idempotencyKey?: string;
}

/** Per-segment outcome on an {@link AudioReconciliationResponse}. */
export interface AudioSegmentReconciliationResult {
  /** Corresponds to the segment's `turn_number`. */
  sequence_number: number;
  /** `"matched"`, `"mismatched"`, or `"unvalidated"`. */
  status: string;
  /** Populated only when `status` is `"mismatched"`. */
  mismatch_classification?: string;
  /** Server-computed SHA-256 of the transcript segment text. */
  transcript_hash?: string;
  /** SHA-256 stored in the validation event, if present. */
  validated_hash?: string;
}

/**
 * Response from {@link AudioClient.reconcileAudio}
 * (`POST /v1/audio-reconciliation`).
 */
export interface AudioReconciliationResponse {
  /** UUID of the reconciled call. */
  call_id: string;
  /** Number of agent segments processed (always the full count, unaffected by pagination). */
  total_segments: number;
  /** Count of segments with status `"matched"` (always the full count). */
  matched_segments: number;
  /** Count of segments with status `"mismatched"` (always the full count). */
  mismatched_segments: number;
  /** Count of segments with status `"unvalidated"` (always the full count). */
  unvalidated_segments: number;
  /** Per-segment outcomes, ordered by `sequence_number`. Paginated — see `has_more`. */
  segment_results: AudioSegmentReconciliationResult[];
  /** True when additional `segment_results` exist beyond this page. */
  has_more?: boolean;
  /** Which ASR model produced the transcription. */
  asr_model_id?: string;
  /** Overall ASR confidence score. */
  asr_confidence?: number;
}

// ─── Auth (Tenant Management gateway) ──────────────────────────────

/**
 * Response from {@link AuthClient.exchangeKey}
 * (`POST /v1/auth/exchange-key`).
 *
 * The access token is also returned by {@link AuthClient.refreshToken}. The
 * paired refresh token (7-day TTL) is set server-side as an httpOnly,
 * `SameSite=Strict` cookie scoped to `/v1/auth` — it is never present in
 * either JSON body, so `fetch` callers rely on the runtime's cookie jar to
 * carry it back on `refreshToken()`.
 */
export interface ExchangeKeyResponse {
  /** Short-lived JWT (15 min). Send as `Authorization: Bearer <access_token>`. */
  access_token: string;
  /** Always `"Bearer"`. */
  token_type: string;
  /** Access token lifetime in seconds (900 = 15 min). */
  expires_in: number;
}

/**
 * Response from {@link AuthClient.refreshToken} (`POST /v1/auth/refresh`).
 * Shape-identical to {@link ExchangeKeyResponse}.
 */
export interface RefreshTokenResponse {
  /** New short-lived JWT (15 min). */
  access_token: string;
  /** Always `"Bearer"`. */
  token_type: string;
  /** Access token lifetime in seconds (900 = 15 min). */
  expires_in: number;
}

// ─── API Error ────────────────────────────────────────────────────────────────

/**
 * Structured API error returned by the Audact services.
 */
export interface APIErrorBody {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

// ─── Client Configuration ────────────────────────────────────────────────────

/**
 * Service base URL overrides. Defaults to localhost ports per service.
 */
export interface ServiceURLs {
  /** Validator service base URL. Default: http://localhost:8082 */
  validator?: string;
  /** Evidence Layer service base URL. Default: http://localhost:8083 */
  evidence?: string;
  /** LLM Proxy service base URL. Default: http://localhost:8084 */
  llmProxy?: string;
  /** Tenant Management service base URL. Default: http://localhost:8085 */
  tenantManagement?: string;
  /**
   * Platform-admin (export/import) API base URL. Defaults to the same host
   * as `tenantManagement` (port 8085) since the platform-admin routes are
   * served by Tenant Management, not a separate service.
   */
  platform?: string;
  /** Voice Gateway service base URL (KYC + number provisioning). Default: http://localhost:8088 */
  voiceGateway?: string;
  /** Agent Worker service base URL. Default: http://localhost:8089 */
  agentWorker?: string;
  /** Org Management service base URL. Default: http://localhost:8092 */
  orgManagement?: string;
  /** Aggregator service base URL. Default: http://localhost:8087 */
  aggregator?: string;
  /** Audio Validator service base URL. Default: http://localhost:8086 */
  audioValidator?: string;
  /** Policy Engine service base URL. Default: http://localhost:8081 */
  policyEngine?: string;
}

/**
 * Configuration options for the AudactClient.
 */
export interface AudactClientOptions {
  /**
   * API key for authentication.
   * Sent as the `Authorization: Bearer <apiKey>` header on all requests.
   */
  apiKey: string;
  /**
   * One public host for every service, e.g. "https://api.audact.ai". A trailing "/" or "/v1" is stripped. Per-service `serviceUrls` still win.
   */
  baseUrl?: string;
  /**
   * Override the base URLs for each Audact service.
   * Useful for pointing at deployed environments instead of localhost.
   */
  serviceUrls?: ServiceURLs;
  /**
   * Request timeout in milliseconds. Default: 30000 (30 seconds).
   * Streaming requests use a longer default of 300000 (5 minutes).
   */
  timeoutMs?: number;
  /**
   * OrgBearer JWT for the org self-service surface (org-management, port
   * 8092). Obtained out-of-band or via `OrgClient.login()`, which stores it
   * automatically. The SDK never mints this token itself.
   */
  orgToken?: string;
  /**
   * PlatformBearer Ed25519 token for the platform-admin org surface
   * (org-management, port 8092, `client.platform.orgs`). The SDK never mints
   * this token itself — the caller must supply a pre-minted token.
   */
  platformToken?: string;
}

// ─── Compliance events, erased keysets, platform admin keys ───────

/** evidence.PIIErasedKeysetsResponse — GET /v1/calls/{call_id}/pii/erased-keysets */
export interface PIIErasedKeysetsResponse {
  /**
   * Subset of the requested keyset ids that include a crypto-shredded identity.
   * Tokens sealed under these keysets can never be decrypted again.
   */
  erased_keyset_ids: string[];
}

/**
 * Values of the `event_subtype` query parameter of GET /v1/compliance/events.
 * `policy_triggered`, `audit_logged` and `receipt_issued` are webhook-only and
 * always yield an empty page; returned events carry a ComplianceEventLogSubtype.
 */
export type ComplianceEventSubtype =
  | "validation_completed"
  | "violation_detected"
  | "fail_open"
  | "policy_triggered"
  | "audit_logged"
  | "receipt_issued";

/** `event_subtype` of a returned compliance event: the only three the event log projects. */
export type ComplianceEventLogSubtype = "validation_completed" | "violation_detected" | "fail_open";

/** Aggregate pipeline verdict of a compliance event (evidence.ComplianceEvent.verdict). */
export type ComplianceVerdict = Verdict;

/** Severity band of a compliance event's check (evidence.ComplianceEvent.severity). */
export type ComplianceSeverity = "critical" | "high" | "medium" | "low";

/**
 * evidence.ComplianceEvent — one item of GET /v1/compliance/events: every
 * validation result, ALLOW included. Only `agent_id`, `event_subtype` and
 * `timestamp` are always present; the server omits the other fields when empty
 * or unrecorded (an ALLOW turn has no check, severity or detail).
 */
export interface ComplianceEvent {
  /** Not yet populated; resolve the agent via GET /v1/calls/{call_id}. */
  agent_id: string;
  /** The call this event belongs to. */
  call_id?: string;
  /** Highest-severity non-ALLOW check for a violation; absent otherwise. */
  check_id?: string;
  /** Composite compliance score in [0,1] when recorded. */
  compliance_score?: number;
  /** The check's structural reason (no PII); absent for non-violations. */
  detail?: string;
  event_subtype: ComplianceEventLogSubtype;
  /** Band of check_id; absent for non-violations. */
  severity?: ComplianceSeverity;
  /** Server-generated UTC time of the event. */
  timestamp: string;
  /** Turn number within the call, when recorded. */
  turn_sequence?: number;
  verdict?: ComplianceVerdict;
}

/** Query filters accepted by GET /v1/compliance/events (camelCase keys map to snake_case query names). */
export interface ListComplianceEventsOptions {
  eventSubtype?: ComplianceEventSubtype;
  verdict?: ComplianceVerdict;
  severity?: ComplianceSeverity;
  callId?: string;
  cursor?: string;
  limit?: number;
}

/** evidence.ListComplianceEventsResponse — GET /v1/compliance/events */
export interface ListComplianceEventsResponse {
  /** Page of events ordered by timestamp DESC; empty (never null) when nothing matches. */
  events: ComplianceEvent[];
  has_more: boolean;
  /** Opaque cursor for the next page; omitted when has_more is false. */
  next_cursor?: string;
  /** Number of events matching the filters across all pages. */
  total: number;
}

/** org.AdminKey — a platform admin signing key. */
export interface AdminKey {
  active: boolean;
  added_at: string;
  disabled_at?: string;
  kid: string;
  operator: string;
}

/** org.addAdminKeyRequest — POST /v1/platform/admin-keys */
export interface AddAdminKeyRequest {
  /** Identifies the key; tokens signed with it carry this kid. */
  kid: string;
  /** PEM-wrapped PKIX Ed25519 public key. */
  public_key_pem: string;
  /** Who the key belongs to. Defaults to the calling token's actor. */
  operator?: string;
}

/** org.listAdminKeysResponse — GET /v1/platform/admin-keys */
export interface ListAdminKeysResponse {
  admin_keys: AdminKey[];
}

/** org.adminKeyResponse — POST /v1/platform/admin-keys and .../{kid}/disable */
export interface AdminKeyResponse {
  admin_key: AdminKey;
}

// ─── Knowledge bases (Tenant Management) ────────────────────────────
//
// Wire types for the RAG knowledge-base surface — KB CRUD, sources, agent
// links, crawl exclusions and the retrieval test harness. Every `/v1/knowledge-bases*`
// route is served by Tenant Management. Field names mirror the
// Go JSON tags verbatim (snake_case); `omitempty` fields are optional.

/** Origin of a knowledge-base source (kb.SourceType). */
export type KBSourceType = "url" | "file" | "text";

/** Lifecycle state of a knowledge-base source's ingestion (kb.SourceStatus). */
export type KBSourceStatus = "pending" | "processing" | "ready" | "failed";

/** robots.txt handling for URL sources: `"honor"` (server default) or `"override"`. */
export type KBRobotsPolicy = "honor" | "override";

/** Speaker of one retrieval-test turn. `"system"` turns are excluded from query condensation. */
export type KBRetrievalTurnRole = "user" | "assistant" | "system";

/** A tenant-scoped knowledge base (kb.KBResponse). */
export interface KnowledgeBase {
  /** Server-generated UUID primary key. */
  kb_id: string;
  /** UUID of the owning tenant. */
  tenant_id: string;
  /** Human-readable label. */
  name: string;
  /** When true, sources are re-ingested on a 24h schedule. */
  auto_refresh: boolean;
  /** Crawler robots.txt handling: "honor" or "override". */
  robots_policy: KBRobotsPolicy;
  /** Server-generated UTC creation timestamp (RFC 3339). */
  created_at: string;
  /** Server-generated UTC last-mutation timestamp (RFC 3339). */
  updated_at: string;
}

/** Request body for {@link KnowledgeBasesClient.createKnowledgeBase} (kb.CreateKBRequest). */
export interface CreateKnowledgeBaseRequest {
  /** Human-readable label, 1–200 characters. */
  name: string;
  /** Enable 24h scheduled re-ingestion. Defaults to false. */
  auto_refresh?: boolean;
  /** "honor" (default) or "override"; any other value is a 400. */
  robots_policy?: KBRobotsPolicy;
}

/**
 * Request body for {@link KnowledgeBasesClient.patchKnowledgeBase}
 * (kb.PatchKBRequest). Omit a field to leave it unchanged.
 */
export interface PatchKnowledgeBaseRequest {
  /** New display name, 1–200 characters. Display-only; does not affect retrieval. */
  name?: string;
  auto_refresh?: boolean;
}

/** Query options for {@link KnowledgeBasesClient.listKnowledgeBases}. */
export interface ListKnowledgeBasesOptions {
  /** Page size (default 20, max 100). */
  limit?: number;
  /** Opaque cursor from a previous response's `next_cursor`. */
  cursor?: string;
}

/** Response from {@link KnowledgeBasesClient.listKnowledgeBases} (kb.ListKBsResponse). */
export interface ListKnowledgeBasesResponse {
  /** Current page, ordered by kb_id ascending. Never null. */
  items: KnowledgeBase[];
  has_more: boolean;
  /** Omitted when `has_more` is false. */
  next_cursor?: string;
}

/** A knowledge-base source (kb.SourceResponse). */
export interface KBSource {
  /** Stable UUID primary key. */
  source_id: string;
  tenant_id: string;
  /** Parent knowledge base UUID. */
  kb_id: string;
  type: KBSourceType;
  /** The URL for url sources, the original filename for file sources; omitted for text sources. */
  uri?: string;
  /** Optional human-readable name; omitted when unset. */
  title?: string;
  /** Server-truncated snippet of a text source's content; never the full content. */
  content_preview?: string;
  status: KBSourceStatus;
  /** Most recent ingest error; omitted on success. */
  error?: string;
  /** Incremented on each reingest. */
  ingest_version: number;
  /** Per-source configuration (crawl flags, etc.). */
  config?: Record<string, unknown>;
  /**
   * Chunks stored by the latest successful ingestion. Absent until a
   * first ingestion has finished.
   */
  chunk_count?: number;
  /**
   * Page coverage of the latest successful ingestion. Absent until a
   * first ingestion has finished.
   */
  crawl_coverage?: KBCrawlCoverage;
  /**
   * ISO 8601 UTC time the latest successful ingestion finished.
   * Absent until a first ingestion has finished.
   */
  last_ingested_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Page coverage of a source's latest successful ingestion
 * (kb.CrawlCoverageResponse). A single page, file or text source
 * reports 1 discovered / 1 stored.
 */
export interface KBCrawlCoverage {
  /** Pages found. */
  discovered: number;
  /** Pages whose content was stored. */
  stored: number;
  /** Pages skipped by the knowledge base's exclusion list. */
  excluded: number;
  /** Pages that could not be fetched or ingested. */
  failed: number;
}

/**
 * JSON request body for {@link KnowledgeBasesClient.addKBSource}
 * (kb.AddSourceRequest). Use `type: "url"` with `url`, or `type: "text"` with
 * `content`. File sources must be uploaded as multipart via
 * {@link KnowledgeBasesClient.uploadKBSourceFile}; the JSON path rejects
 * `type: "file"` with 400.
 */
export interface AddKBSourceRequest {
  /** "url" or "text"; upload files with {@link KnowledgeBasesClient.uploadKBSourceFile}. */
  type: Exclude<KBSourceType, "file">;
  /** Page or site to crawl (http/https). Required when `type` is "url". */
  url?: string;
  /** Raw text content. Required when `type` is "text". */
  content?: string;
  /** Optional human-readable name, max 200 characters. */
  title?: string;
  /** Per-source flags, e.g. `{ auto_crawl: true, depth: 2, auto_refresh: false }` for url sources. */
  config?: Record<string, unknown>;
}

/** Options for {@link KnowledgeBasesClient.uploadKBSourceFile} (multipart form fields). */
export interface UploadKBSourceFileOptions {
  /** Display filename; the server falls back to the uploaded part's filename. */
  filename?: string;
  /** Per-source config, JSON-encoded into the `config` form field. */
  config?: Record<string, unknown>;
}

/**
 * Request body for {@link KnowledgeBasesClient.patchKBSource}
 * (kb.PatchSourceRequest). At least one field must be provided.
 */
export interface PatchKBSourceRequest {
  /** New human-readable name, 1–200 characters. */
  title?: string;
  /** Replacement text (text sources only, up to 1 MiB); triggers re-chunk + re-embed. */
  content?: string;
}

/** Response from {@link KnowledgeBasesClient.listKBSources} (kb.ListSourcesResponse). */
export interface ListKBSourcesResponse {
  /** All sources for the KB, ordered by created_at ascending. Never null. */
  items: KBSource[];
  total: number;
}

/** A link between a knowledge base and an agent, with its retrieval tuning (kb.AgentLinkResponse). */
export interface KBAgentLink {
  kb_id: string;
  agent_id: string;
  tenant_id: string;
  /** Maximum chunks returned per retrieval query (1–10). */
  top_k: number;
  /** Minimum cosine similarity (0.0–1.0). */
  similarity_threshold: number;
  /** System-prompt fragment injected before retrieved passages ("" when unset). */
  retrieval_instruction: string;
  created_at: string;
}

/**
 * Request body for {@link KnowledgeBasesClient.putKBAgentLink}
 * (kb.PutLinkRequest). Omitted fields take the defaults top_k=3,
 * similarity_threshold=0.6, retrieval_instruction="".
 */
export interface PutKBAgentLinkRequest {
  /** 1–10. */
  top_k?: number;
  /** 0.0–1.0. */
  similarity_threshold?: number;
  /** Max 500 characters. */
  retrieval_instruction?: string;
}

/**
 * Request body for {@link KnowledgeBasesClient.patchKBAgentLink}
 * (kb.PatchLinkRequest). Only the fields supplied are updated.
 */
export interface PatchKBAgentLinkRequest {
  /** 1–10. */
  top_k?: number;
  /** 0.0–1.0. */
  similarity_threshold?: number;
  /** Max 500 characters. */
  retrieval_instruction?: string;
}

/**
 * Response from {@link KnowledgeBasesClient.listKBAgentLinks} and
 * {@link KnowledgeBasesClient.listKBLinksByAgent} (kb.ListLinksResponse).
 */
export interface ListKBAgentLinksResponse {
  /** Ordered by created_at ascending. Never null. */
  items: KBAgentLink[];
  total: number;
}

/**
 * A crawl exclusion rule (kb.CrawlExclusionResponse): exactly one of
 * `crawl_path` (path-prefix rule) or `url` (exact-URL rule) is present.
 */
export interface KBCrawlExclusion {
  /** Stable UUID primary key. */
  id: string;
  kb_id: string;
  tenant_id: string;
  /** Path-prefix exclusion; omitted for exact-URL rules. */
  crawl_path?: string;
  /** Exact URL exclusion; omitted for path-prefix rules. */
  url?: string;
  created_at: string;
}

/**
 * Request body for {@link KnowledgeBasesClient.addExclusion}
 * (kb.AddExclusionRequest). Provide exactly one of `crawl_path` or `url`
 * (max 200 characters each).
 */
export interface AddKBExclusionRequest {
  /** Path-prefix exclusion, e.g. "/admin". */
  crawl_path?: string;
  /** Exact URL exclusion. */
  url?: string;
}

/** Response from {@link KnowledgeBasesClient.listExclusions} (kb.ListExclusionsResponse). */
export interface ListKBExclusionsResponse {
  /** Ordered by created_at ascending. Never null. */
  items: KBCrawlExclusion[];
  total: number;
}

/** One conversation turn for the retrieval test harness (kb.TestHarnessTurn). */
export interface KBTestRetrievalTurn {
  /** "user", "assistant" or "system". */
  role: KBRetrievalTurnRole;
  content: string;
}

/**
 * Request body for {@link KnowledgeBasesClient.testKBRetrieval}
 * (kb.TestRetrievalRequest). Provide `question` or `turns`, not both.
 */
export interface KBTestRetrievalRequest {
  /** Shorthand for a single user turn. */
  question?: string;
  /** Multi-turn conversation history. */
  turns?: KBTestRetrievalTurn[];
  /** Ad-hoc max chunks override, 1–10 (default 3). */
  top_k?: number;
  /** Ad-hoc similarity threshold override, 0.0–1.0 (default 0.0 = return all). */
  threshold?: number;
}

/** One ranked chunk returned by the retrieval test harness (kb.TestHarnessHit). */
export interface KBTestRetrievalHit {
  /** Raw chunk content. */
  text: string;
  source_id: string;
  kb_id: string;
  /** Cosine similarity in [0, 1]. */
  similarity: number;
}

/**
 * Response from {@link KnowledgeBasesClient.testKBRetrieval}
 * (kb.TestRetrievalResponse). An empty result is HTTP 200 with
 * `empty: true` — not an error.
 */
export interface KBTestRetrievalResponse {
  /** Query produced by the condensation stage; may be "". */
  condensed_query: string;
  /** Sorted by similarity descending. Never null; `[]` when `empty`. */
  hits: KBTestRetrievalHit[];
  empty: boolean;
}
