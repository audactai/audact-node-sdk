# Changelog

All notable changes to the `@audactcore/sdk` TypeScript SDK are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added
- `KBSource.chunk_count`, `KBSource.crawl_coverage` (new `KBCrawlCoverage`:
  discovered / stored / excluded / failed pages) and `KBSource.last_ingested_at`:
  the outcome of the source's latest successful ingestion. Absent
  until a first ingestion has finished.

## [0.4.0] - 2026-10-21

### Added (2026-10-20)
- `ListVoicesParams.limit` (1–1000; server default 100 per provider) and
  `VoiceProvider.total` / `VoiceProvider.truncated`.

### Breaking
- `AddKBSourceRequest.type` is narrowed to `"url" | "text"`; `"file"` was always
  rejected with 400 on that JSON body. Upload files with `uploadKBSourceFile`.
- `C2PAManifest.signature` removed; `signature_algorithm` is now `"ES256"` (real
  C2PA claim signing with an X.509 chain, generator version 2.0.0).

### Added
- ElevenLabs languages: `Voice.languages`, `VoiceProvider.models` /
  `TTSModelInfo`, and `listVoices({ language, provider })` (native speakers
  first; both optional, so existing calls are unchanged).
- ElevenLabs TTS: `AgentTTSProvider` accepts `"elevenlabs"`; new
  `AgentTTSModel` (`""` = provider default, `eleven_flash_v2_5`,
  `eleven_turbo_v2_5`, `eleven_multilingual_v2`, `voxtral-mini-tts-2603`) as
  `tts_model` on create/update/patch requests, `tts_model` on agent responses,
  and `ttsModel` on the platform bundle agent spec. `listVoices()` returns an
  `elevenlabs` group; the voice must belong to the chosen provider (400,
  `field: voice_id`).
- `dist/` rebuilt from `src/` (it was last built 2026-09-18).
- `AudioSegmentResult.transcription_status` and the `TranscriptionStatus` type
  (`"transcribed" | "no_speech"`).
- Types: `C2PAHashDataAssertion` (in the `C2PAAssertion` union), `C2PAAssetRef`,
  `C2PAManifestStoreRef`, `C2PASigningCredential`, `C2PAManifestListItem`,
  `C2PAManifestListResponse`, `ListC2PAManifestsOptions`.
- `C2PAManifest` gains `manifest_id`, `call_id`, `asset`, `manifest_store`,
  `signing_credential`.
- `EvidenceClient.listC2PAManifests`, `downloadC2PAManifestStore` (`ArrayBuffer`),
  `downloadC2PAAsset` (follows the 302 to the presigned URL),
  `getC2PATrustAnchor` (PEM string).
- Type `C2PAListSigner` names the list item's `signing_credential` subset.
  `C2PAAssetRef.kind` is the spec enum `"recording" | "evidence_export"`.
  The SDK now covers 188 of 190 operations.
- `client.knowledgeBases` (`KnowledgeBasesClient`, Tenant Management) covers the
  20 `knowledge-bases` operations: `listKnowledgeBases`,
  `createKnowledgeBase`, `getKnowledgeBase`, `patchKnowledgeBase`,
  `deleteKnowledgeBase`; sources `listKBSources`, `addKBSource` (JSON url/text),
  `uploadKBSourceFile` (multipart file form of the same operation),
  `getKBSource`, `patchKBSource`, `reingestKBSource`, `deleteKBSource`; agent
  links `listKBAgentLinks`, `listKBLinksByAgent`, `putKBAgentLink`,
  `patchKBAgentLink`, `deleteKBAgentLink`; crawl exclusions `listExclusions`,
  `addExclusion`, `deleteExclusion`; and `testKBRetrieval`.
- Types for the 21 `kb.*` definitions: `KnowledgeBase`, `KBSource`,
  `KBSourceType`, `KBSourceStatus`, `KBAgentLink`, `KBCrawlExclusion`,
  `KBTestRetrievalTurn`, `KBTestRetrievalHit`, the request/response envelopes,
  plus `ListKnowledgeBasesOptions` and `UploadKBSourceFileOptions`.
  The SDK now covers 208 of 210 operations.

- `EvidenceClient.generateC2PAManifest(callId, idempotencyKey?)` accepts an
  optional Idempotency-Key. Every manifest is stored permanently, so retries
  should carry a key.
- `ValidateAudioRequest.config_seal_hash` and
  `TurnDeliveryStatus.confirmation_count` close schema drift.
- `TenantsClient.getConfigurationVersion(configId, version)` returns one
  immutable earlier version of a configuration. The SDK now covers
  209 of 211 operations.
- `ResolvedConfigVersion` gains the version's settings: `countries`,
  `validator_modes`, `blocklist_patterns`, `pricing_bands`, `consent_config`,
  `disclosure_texts`, `fallback_response`, `output_constraint`,
  `prompt_confidentiality_config`, `end_call`, `voicemail`, `begin_message`,
  `llm_model`, `llm_provider`.
- `AudioComplianceReceipt` gains `call_id`, `turn_number`, `timestamp`,
  `config_seal_hash`, `auth_mechanism`, `receipt_format_version`.
- `UsageRecord.source` and the `UsageRecordSource` type
  (`"stored" | "live"`).

### Fixed
- `disableAdminKey` documents the server's real semantics. 409 means "cannot
  disable the last active admin key", and disabling an already-disabled key
  succeeds. The admin-key methods need a platform token minted for the
  `admin_keys` action.
- `listComplianceEvents` is no longer described as "non-ALLOW": the endpoint
  also returns ALLOW validation results.

### Changed
- Agent create/update/patch `voice_id` accepts any string
  (`AgentVoiceIdInput = AgentVoiceId | (string & {})`). Tenant-cloned voice ids
  are valid there; `AgentVoiceId` only lists the built-in catalogue.
- `KnowledgeBase.robots_policy`, `CreateKnowledgeBaseRequest.robots_policy` and
  `KBTestRetrievalTurn.role` are narrowed from `string` to the new literal unions
  `KBRobotsPolicy` (`"honor" | "override"`) and `KBRetrievalTurnRole`
  (`"user" | "assistant" | "system"`). Code that passes other strings no longer
  type-checks (the server already rejects other `robots_policy` values).

## [0.3.0] - 2026-10-15

Brings the SDK in line with the documented API (186 operations, 184 covered).

### ⚠️ Behavioural change

- **`AudactError.message`** now carries the server's message (parsed from
  `{"error": {"code", "message", "hint", "details", "request_id"}}`, with a top-level
  fallback) instead of `HTTP <status>`. Code that matched on `"HTTP 4xx"` must be updated.
- Type fixes to match the wire (compile-time only):
  - `CallRecord.direction` / `CallDetail.direction`: `string` → `"inbound" | "outbound"`.
  - Agent create/update/patch `voice_id`, `llm_provider`, `llm_model`, `stt_provider`,
    `tts_provider`: `string` → spec enum unions.
  - `CreateWebhookRequest.events` / `UpdateWebhookRequest.events`: `string[]` → `WebhookEventName[]`.
  - `PIIExemptType` no longer includes `"name"` (the server rejects it).
  - `Report.direction` narrowed to `"inbound" | "outbound"`; `PlatformBundle.apiVersion` is the
    literal `"audact.ai/v1"`; `LLMMessage.role` gains `"tool"`.
  - Fields the server never sends are now optional and `@deprecated`: `ChainResponse`
    `tenant_id`/`total`, `ReconstructResponse.tenant_id`, `VerifyChainResponse` `valid`/`error`,
    `HealthResponse.checks`, `ListConfigurationsResponse.total`, `ListKeysResponse.total`,
    `ProxyChatResponse` `call_id`/`turn`/`content`/`verdict`/`receipt`/`compliance_score`,
    `TranscriptSegmentResult` `turn_number`/`matched`.
  - `ProxyChatResponse` models the OpenAI-shaped wire (use `choices[0].message.content`);
    `VerifyChainResponse` use `status`/`broken_at_sequence`; `TranscriptSegmentResult` uses
    `sequence_number`/`status`; `HealthResponse` use `components`.

### Added

- `client.pii.listErasedKeysets`, `client.evidence.listComplianceEvents`,
  `client.platform.listAdminKeys`, `addAdminKey`, `disableAdminKey`.
- 12 new types: `PIIErasedKeysetsResponse`, `ComplianceEvent`, `ComplianceEventSubtype`,
  `ComplianceEventLogSubtype`, `ComplianceVerdict`, `ComplianceSeverity`,
  `ListComplianceEventsOptions`, `ListComplianceEventsResponse`, `AdminKey`,
  `AddAdminKeyRequest`, `ListAdminKeysResponse`, `AdminKeyResponse`. Only `agent_id`,
  `event_subtype` and `timestamp` are always present on a `ComplianceEvent`.
- `baseUrl` client option (one host for all services; `serviceUrls` still win) and
  `normalizeBaseUrl`.
- `AudactError.code`, `hint`, `details`, `retryAfter` (from `Retry-After` on 429);
  `requestId` falls back to the `X-Request-ID` header.
- Schema-parity test comparing TS interfaces with swagger definitions; parity test now reads
  `swagger.json`; `package-lock.json`.
- `package.json` `repository`, `homepage`, `bugs` metadata.

### Fixed

- Missing fields, optionality and enum unions across agents, calls, numbers, BYO, webhooks,
  tools, integrations, receipts, chains, health, proxy, tenant configuration, API keys, PII
  and delivery types, aligned to swagger (22 new exported types, incl. `CallDirection`,
  `AgentLLMProvider`, `AgentLLMModel`, `AgentSTTProvider`, `AgentTTSProvider`,
  `AgentVoiceId`, `WebhookEventName`).

## [0.2.0]

Full parity with the documented API (160 of 162 operations at the time): added the Aggregator,
Policy, Audio Validator, Auth, Org (self-service, tenants), platform-org and Cal.com integrations
clients, BYO number connections, PII methods with `clientHash`/normalization, and an
anti-drift parity test.

## [0.1.0]

Initial release: Validator, Evidence, LLM Proxy, Tenant Management and Voice Gateway clients.
