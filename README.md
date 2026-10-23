# @audactcore/sdk

Official TypeScript SDK for the Audact AI compliance platform. A thin, dependency-free wrapper
(Node ≥18 `fetch`/`FormData`/`AbortSignal`/`URLSearchParams` only) around Audact's HTTP services —
Validator, Evidence Layer, LLM Proxy, Tenant Management, Voice Gateway, Agent Worker, Aggregator,
Policy Engine, Audio Validator, and Org Management.

## Install

```bash
npm install @audactcore/sdk
```

## Quick start

```ts
import { AudactClient } from "@audactcore/sdk";

const client = new AudactClient({ apiKey: process.env.AUDACT_API_KEY! });

const result = await client.validator.validate({
  call_id: "a1b2c3d4-...",
  tenant_id: "t1t2t3...",
  config_id: "c1c2c3...",
  turn: 1,
  content: "Hello, I am an AI assistant.",
  context: {
    previous_turns: [],
    call_state: { disclosure_delivered: false },
  },
});

if (result.verdict === "ALLOW") {
  console.log("Content approved:", result.content);
}
```

## Base URL

Every service sits behind one public host, path-routed under `/v1`. The SDK targets the production
host, `https://api.audact.ai`, unless told otherwise. To use another host, pass `baseUrl` or set the
`AUDACT_BASE_URL` environment variable:

```ts
const client = new AudactClient({ apiKey: process.env.AUDACT_API_KEY!, baseUrl: "https://api.example.com" });
```

A trailing `/` or `/v1` is stripped; requests go to `<host>/v1/...`. The host is resolved in this
order: `serviceUrls` (per service), `baseUrl`, `AUDACT_BASE_URL` (where `process.env` exists), then
`https://api.audact.ai`.

`serviceUrls` is only needed for a local stack, where every service listens on its own port. The
SDK exports those ports as `LOCAL_SERVICE_URLS`:

```ts
import { AudactClient, LOCAL_SERVICE_URLS } from "@audactcore/sdk";

const local = new AudactClient({ apiKey: process.env.AUDACT_API_KEY!, serviceUrls: LOCAL_SERVICE_URLS });
```

> **Upgrading from 0.4.x:** without `baseUrl`, 0.4.x targeted `http://localhost:8081`–`8092`. If you
> relied on that, pass `serviceUrls: LOCAL_SERVICE_URLS`.

## Coverage

The SDK is at full parity with the documented API: **209 of 211** operations in
the documented Audact API are covered (the remaining 2 are receive-side provider→platform webhooks —
`POST /telnyx/webhook` and `POST /webhooks/livekit` — which are ingress endpoints Audact receives,
never calls).

| Sub-client | Service (port) | Auth | What it covers |
|---|---|---|---|
| `client.validator` | Validator (8082) | API key | Per-turn ACVF validation, finalize call score |
| `client.evidence` | Evidence Layer (8083) | API key | Evidence events, chains, verify/reconstruct, calls, violations, Article 50 reports/exports, C2PA, receipts, delivery, transcript reconciliation |
| `client.llmProxy` | LLM Proxy (8084) | API key | Compliance-validated LLM chat completion (sync + streaming) |
| `client.tenants` | Tenant Management (8085) | API key | Tenant CRUD, usage, API keys, configurations |
| `client.numbers` | Voice Gateway (8088) | API key | KYC documents/sets, number provisioning lifecycle (order, assign, suspend, resume, release, trunk) |
| `client.calls` | Voice Gateway (8088) | API key | SIP call lifecycle (outbound/inbound/browser, hangup, status, handover, transfer), trunks, dispatch rules, admission URL, WS tickets |
| `client.webhooks` | Tenant Management (8085) | API key | Webhook endpoint CRUD, test-ping, delivery history/resend, event-type/schema discovery, secret status/rotation |
| `client.agents` | Agent Worker (8089) | API key | Agent CRUD + duplicate, TTS voice catalog CRUD, pipeline status |
| `client.tools` | Agent Worker (8089) | API key | Function-calling tool CRUD/test, agent-tool attach/detach |
| `client.integrations` | Agent Worker (8089) | API key | Cal.com connection CRUD, health check, event-type discovery, OAuth start/callback |
| `client.knowledgeBases` | Tenant Management (8085) | API key | Knowledge-base (RAG) CRUD, sources (url/text JSON + multipart file upload, reingest), agent links with retrieval tuning, crawl exclusions, retrieval test harness |
| `client.aggregation` | Aggregator (8087) | API key (public: `getMetachain`, `verifyInclusion`) | Merkle aggregation proofs, public meta-chain, offline inclusion verification |
| `client.policy` | Policy Engine (8081) | API key | Policy evaluation, jurisdiction policy documents, calling-hours pre-check |
| `client.audio` | Audio Validator (8086) | API key | Synchronous per-turn audio validation, post-call audio-to-transcript reconciliation |
| `client.auth` | Tenant Management (8085) | API key | API-key ↔ JWT session bridge (exchange, refresh) |
| `client.org` | Org Management (8092) | **OrgBearer** (JWT) | Org self-service: signup/login/refresh/logout, profile, KYC |
| `client.org` (tenants) | Org Management (8092) | **OrgBearer** (JWT) | Org-owned tenant lifecycle: list/create/get, soft-delete/enable/disable/restore, initialize, issue key, impersonate |
| `client.platform` | Tenant Management (8085) | Platform admin API key | Cross-tenant export/import (tenant, agent) |
| `client.platform.orgs` | Org Management (8092) | **PlatformBearer** (Ed25519) | Platform-admin org surface: list/verify/reject organizations, find/recover org admins |

### Added in 0.3.0

| Method | Route |
|---|---|
| `client.pii.listErasedKeysets(callId, keysetIds)` | `GET /v1/calls/{call_id}/pii/erased-keysets` |
| `client.evidence.listComplianceEvents(opts?)` | `GET /v1/compliance/events` |
| `client.platform.listAdminKeys()` | `GET /v1/platform/admin-keys` |
| `client.platform.addAdminKey(req)` | `POST /v1/platform/admin-keys` |
| `client.platform.disableAdminKey(kid)` | `POST /v1/platform/admin-keys/{kid}/disable` |

## Choosing a TTS provider

Agents speak through Voxtral by default. To use ElevenLabs, set the provider,
optionally a model, and a voice from the provider's group in `listVoices()`:

```ts
const voices = await client.agents.listVoices();
const voice = voices.elevenlabs.voices[0].voice_id;

await client.agents.createAgent({
  name: "Concierge",
  language: "en",
  tts_provider: "elevenlabs",
  tts_model: "eleven_flash_v2_5", // omit for the provider default
  voice_id: voice,
});
```

A voice from another provider is rejected with a 400 naming `voice_id`.

## Error handling

Failed requests throw `AudactError`, populated from the API's `{"error": {...}}` envelope:

```ts
import { AudactError } from "@audactcore/sdk";

try {
  await client.evidence.getCallDetail("missing");
} catch (err) {
  if (err instanceof AudactError) {
    console.error(err.status, err.code, err.message);
    console.error("request id:", err.requestId); // quote this to support
    if (err.hint) console.error("hint:", err.hint);
    if (err.status === 429) console.error("retry in", err.retryAfter, "s");
  }
}
```

`hint`, `details` and `retryAfter` may be `undefined`.

## Auth flows

Most sub-clients send `Authorization: Bearer <apiKey>` using the `apiKey` passed to the
`AudactClient` constructor. Two surfaces use a different bearer token, set via `setAuthToken()` (or
supplied up front in `AudactClientOptions`):

- **OrgBearer** — a JWT obtained from `client.org.login()`. The SDK stores it on the `org` sub-client
  automatically; every subsequent `client.org.*` call (including the tenant-lifecycle methods) sends
  it instead of the API key.
- **PlatformBearer** — a pre-minted Ed25519 token. The SDK never mints this token; pass it in via
  `AudactClientOptions.platformToken` or `client.platform.orgs.setAuthToken(token)`.

### Org login flow

```ts
import { AudactClient } from "@audactcore/sdk";

const client = new AudactClient({ apiKey: "aud_live_..." });

// login() is public (no bearer required) and stores the returned access
// token on client.org automatically.
await client.org.login({ email: "admin@example.com", password: "hunter2" });

// Subsequent calls send `Authorization: Bearer <jwt>`.
const profile = await client.org.getProfile();
const tenants = await client.org.listTenants();

// Clear the token when done.
await client.org.logout();
```

When the access token expires, call `login()` again. `client.org.refresh()` exists for browser
dashboards only: the refresh token lives in an httpOnly, `SameSite=Strict` cookie, which only a
browser on the same site as the API stores and sends back. From Node it always fails with
`401 refresh token is required`. The same applies to `client.auth.refreshToken()`; call
`client.auth.exchangeKey()` again instead.

Alternatively, start pre-authenticated:

```ts
const client = new AudactClient({
  apiKey: "aud_live_...",
  orgToken: "<jwt from a prior login>",
  platformToken: "<pre-minted Ed25519 token>",
});
```

### Webhooks

```ts
const endpoint = await client.webhooks.createWebhook({
  url: "https://example.com/hooks/audact",
  events: ["call_ended", "compliance.violation_detected"],
  scope: "account",
});

await client.webhooks.testWebhook(endpoint.id);

const deliveries = await client.webhooks.listWebhookDeliveries(endpoint.id);
```

`client.webhooks.listWebhookEventTypes()` returns every event name you can subscribe to. `scope`
is `"account"`, `"agent"` (also pass `agent_id`) or `"compliance"`.

## Development

```bash
npm install
npx tsc --noEmit   # typecheck
npm run build      # emit dist/esm + dist/cjs
npm run test       # vitest
```

## Contributing

This repository is published from Audact's private source repository; every commit here is an
automated sync. Please open issues here. Pull requests can't be merged directly, but they are
welcome as proposals and will be ported by the maintainers. See [CONTRIBUTING.md](CONTRIBUTING.md).
