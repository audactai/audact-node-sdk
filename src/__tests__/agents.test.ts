/**
 * Audact TypeScript SDK — AgentsClient test suite
 *
 * Covers the agent-worker voice agent management surface: agent CRUD
 * (full PUT + partial PATCH), duplication, TTS voice catalog CRUD (including
 * the multipart voice-clone upload), and pipeline-load status.
 *
 * Uses vitest with a `fetch` spy so the tests run without a real server, per
 * the idiom established in client.test.ts / numbers.test.ts / webhooks.test.ts.
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

import { AgentsClient, AudactError } from "../client.js";

import type {
  Agent,
  CreateAgentResponse,
  CreateVoiceResponse,
  DeleteAgentResponse,
  ListAgentsResponse,
  ListVoicesResponse,
  PipelineStatusResponse,
  Voice,
} from "../types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const API_KEY = "aud_live_test1234567890abcdef";
const AGENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const TENANT_ID = "550e8400-e29b-41d4-a716-446655440001";
const VOICE_ID = "en_paul_neutral";

const AGENT: Agent = {
  agent_id: AGENT_ID,
  tenant_id: TENANT_ID,
  name: "Support Bot",
  prompt: "You are a helpful support agent for Acme Corp.",
  language: "en-US",
  voice_id: VOICE_ID,
  llm_provider: "openai",
  llm_model: "gpt-4.1-mini",
  stt_provider: "deepgram",
  tts_provider: "voxtral",
  status: "published",
  version: 1,
  created_at: "2026-03-18T15:17:00Z",
  updated_at: "2026-03-18T15:17:00Z",
};

const LIST_AGENTS_RESPONSE: ListAgentsResponse = {
  agents: [AGENT],
  has_more: false,
};

const CREATE_AGENT_RESPONSE: CreateAgentResponse = {
  agent_id: AGENT_ID,
  tenant_id: TENANT_ID,
  name: "Support Bot",
  prompt: "You are a helpful support agent for Acme Corp.",
  language: "en-US",
  voice_id: VOICE_ID,
  llm_provider: "openai",
  llm_model: "gpt-4.1-mini",
  stt_provider: "deepgram",
  tts_provider: "voxtral",
  status: "published",
  created_at: "2026-03-18T15:17:00Z",
};

const DELETE_AGENT_RESPONSE: DeleteAgentResponse = { deleted: true };

const PIPELINE_STATUS_RESPONSE: PipelineStatusResponse = {
  active_pipelines: 3,
  timestamp: "2026-09-15T12:00:00Z",
};

const VOICE: Voice = {
  voice_id: VOICE_ID,
  name: "Paul (Neutral)",
  language: "en",
  gender: "male",
  style: "neutral",
};

const LIST_VOICES_RESPONSE: ListVoicesResponse = {
  voxtral: {
    display_name: "Voxtral",
    voices: [VOICE],
  },
};

const CREATE_VOICE_RESPONSE: CreateVoiceResponse = {
  voice_id: "cloned-voice-123",
  name: "British Receptionist (female)",
  language: "en-GB",
  gender: "female",
  style: "professional",
  accent: "British",
  provider: "voxtral",
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

function mockFetchNoContent(): FetchMock {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(null, {
      status: 204,
      headers: { "X-Request-ID": "req-test-124" },
    }),
  );
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

describe("AgentsClient", () => {
  let client: AgentsClient;

  beforeEach(() => {
    client = new AgentsClient("http://localhost:8089", API_KEY, 30_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Agent CRUD ─────────────────────────────────────────────────────────────

  describe("listAgents()", () => {
    it("calls GET /v1/agents", async () => {
      const spy = mockFetchOk(LIST_AGENTS_RESPONSE);

      const result = await client.listAgents();

      expect(result.agents).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/agents");
      expect(init.method).toBe("GET");
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${API_KEY}`,
      });
    });

    it("appends limit/cursor query params", async () => {
      const spy = mockFetchOk(LIST_AGENTS_RESPONSE);

      await client.listAgents({ limit: 10, cursor: "abc" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/agents?limit=10&cursor=abc");
    });

    it("throws AudactError on HTTP 400 for an invalid limit", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "limit must be positive" },
        400,
      );
      await expect(client.listAgents({ limit: -1 })).rejects.toMatchObject({
        status: 400,
      });
      await expect(client.listAgents({ limit: -1 })).rejects.toBeInstanceOf(
        AudactError,
      );
    });
  });

  describe("createAgent()", () => {
    it("calls POST /v1/agents", async () => {
      const spy = mockFetchOk(CREATE_AGENT_RESPONSE, 201);

      const result = await client.createAgent({
        name: "Support Bot",
        language: "en-US",
        voice_id: VOICE_ID,
      });

      expect(result.agent_id).toBe(AGENT_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/agents");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "Support Bot",
        language: "en-US",
        voice_id: VOICE_ID,
      });
    });

    it("accepts a tenant-cloned voice id", async () => {
      const spy = mockFetchOk(CREATE_AGENT_RESPONSE, 201);

      await client.createAgent({
        name: "Support Bot",
        language: "en-US",
        voice_id: "cloned-voice-123",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string).voice_id).toBe("cloned-voice-123");
    });

    it("sends tts_provider elevenlabs and tts_model, and parses tts_model back", async () => {
      const spy = mockFetchOk({ ...CREATE_AGENT_RESPONSE, tts_provider: "elevenlabs", tts_model: "eleven_turbo_v2_5" }, 201);

      const result = await client.createAgent({
        name: "Concierge",
        tts_provider: "elevenlabs",
        tts_model: "eleven_turbo_v2_5",
        voice_id: "EXAVITQu4vr4xnSDxMaL",
      });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.tts_provider).toBe("elevenlabs");
      expect(body.tts_model).toBe("eleven_turbo_v2_5");
      expect(result.tts_model).toBe("eleven_turbo_v2_5");
    });

    it("omits tts_model when the caller does not set it (server applies the provider default)", async () => {
      const spy = mockFetchOk(CREATE_AGENT_RESPONSE, 201);

      await client.createAgent({ name: "Default", tts_provider: "elevenlabs", voice_id: "EXAVITQu4vr4xnSDxMaL" });

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      expect("tts_model" in JSON.parse(init.body as string)).toBe(false);
    });

    it("throws AudactError on HTTP 400 for a missing name", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "name is required" },
        400,
      );
      await expect(
        client.createAgent({ name: "", language: "en-US" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("getAgent()", () => {
    it("calls GET /v1/agents/:id", async () => {
      const spy = mockFetchOk(AGENT);

      const result = await client.getAgent(AGENT_ID);

      expect(result.agent_id).toBe(AGENT_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/agents/${AGENT_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getAgent(AGENT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("updateAgent()", () => {
    it("calls PUT /v1/agents/:id", async () => {
      const spy = mockFetchOk({ ...AGENT, name: "Renamed Bot" });

      const result = await client.updateAgent(AGENT_ID, {
        name: "Renamed Bot",
        language: "en-US",
        prompt: "You are a helpful support agent for Acme Corp.",
      });

      expect(result.name).toBe("Renamed Bot");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/agents/${AGENT_ID}`);
      expect(init.method).toBe("PUT");
      expect(JSON.parse(init.body as string)).toEqual({
        name: "Renamed Bot",
        language: "en-US",
        prompt: "You are a helpful support agent for Acme Corp.",
      });
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(
        client.updateAgent(AGENT_ID, {
          name: "Renamed Bot",
          language: "en-US",
          prompt: "x",
        }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("patchAgent()", () => {
    it("calls PATCH /v1/agents/:id", async () => {
      const spy = mockFetchOk({ ...AGENT, status: "draft" });

      const result = await client.patchAgent(AGENT_ID, { status: "draft" });

      expect(result.status).toBe("draft");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/agents/${AGENT_ID}`);
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body as string)).toEqual({ status: "draft" });
    });

    it("throws AudactError on HTTP 400 for invalid JSON/validation error", async () => {
      mockFetchError(
        { error: "INVALID_REQUEST", message: "invalid status" },
        400,
      );
      await expect(
        client.patchAgent(AGENT_ID, { status: "draft" }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe("deleteAgent()", () => {
    it("calls DELETE /v1/agents/:id", async () => {
      const spy = mockFetchOk(DELETE_AGENT_RESPONSE);

      const result = await client.deleteAgent(AGENT_ID);

      expect(result.deleted).toBe(true);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/agents/${AGENT_ID}`);
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.deleteAgent(AGENT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("duplicateAgent()", () => {
    it("calls POST /v1/agents/:id/duplicate", async () => {
      const spy = mockFetchOk(
        { ...AGENT, agent_id: "copy-id", name: "Support Bot (Copy)" },
        201,
      );

      const result = await client.duplicateAgent(AGENT_ID);

      expect(result.name).toBe("Support Bot (Copy)");
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        `http://localhost:8089/v1/agents/${AGENT_ID}/duplicate`,
      );
      expect(init.method).toBe("POST");
    });

    it("throws AudactError on HTTP 404 for a missing source agent", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.duplicateAgent(AGENT_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  // ── Voices ─────────────────────────────────────────────────────────────────

  describe("listVoices()", () => {
    it("calls GET /v1/voices", async () => {
      const spy = mockFetchOk(LIST_VOICES_RESPONSE);

      const result = await client.listVoices();

      expect(result["voxtral"]?.voices).toHaveLength(1);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/voices");
      expect(init.method).toBe("GET");
    });

    it("sends language and provider filters and parses languages/models", async () => {
      const spy = mockFetchOk({
        elevenlabs: {
          display_name: "ElevenLabs",
          models: [{ id: "eleven_flash_v2_5", default: true, languages: ["de", "en"] }],
          voices: [{ voice_id: "DeDeDeDeDeDeDeDeDeDe", name: "Lena", language: "de", gender: "female", languages: ["de", "en"] }],
        },
      });

      const result = await client.listVoices({ language: "de-DE", provider: "elevenlabs" });

      const [url] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/voices?language=de-DE&provider=elevenlabs");
      expect(result.elevenlabs?.models?.[0]?.languages).toEqual(["de", "en"]);
      expect(result.elevenlabs?.voices[0]?.languages).toContain("de");
    });

    it("throws AudactError on HTTP 401", async () => {
      mockFetchError(
        { error: "UNAUTHORIZED", message: "missing bearer token" },
        401,
      );
      await expect(client.listVoices()).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("createVoice()", () => {
    it("calls POST /v1/voices with a FormData body and no Content-Type header", async () => {
      const spy = mockFetchOk(CREATE_VOICE_RESPONSE, 201);
      const audio = new Blob(["fake audio bytes"], { type: "audio/mpeg" });

      const result = await client.createVoice(
        audio,
        "British Receptionist (female)",
        true,
        {
          filename: "clip.mp3",
          language: "en-GB",
          accent: "British",
          gender: "female",
          style: "professional",
        },
      );

      expect(result.voice_id).toBe("cloned-voice-123");

      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/voices");
      expect(init.method).toBe("POST");

      // Positive control: the body IS a FormData instance...
      expect(init.body).toBeInstanceOf(FormData);
      const form = init.body as FormData;
      expect(form.get("name")).toBe("British Receptionist (female)");
      expect(form.get("audio")).toBeInstanceOf(Blob);
      expect(form.get("consent_confirmed")).toBe("true");
      expect(form.get("language")).toBe("en-GB");
      expect(form.get("accent")).toBe("British");
      expect(form.get("gender")).toBe("female");
      expect(form.get("style")).toBe("professional");

      // ...and no `Content-Type` header was set at all, so `fetch` can
      // compute its own `multipart/form-data; boundary=...` value. This
      // guards the base.ts FormData branch reused from NumbersClient.
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBeUndefined();
      expect(headers["Authorization"]).toBe(`Bearer ${API_KEY}`);
    });

    it("sends consent_confirmed as the literal string false when not confirmed", async () => {
      const spy = mockFetchOk(CREATE_VOICE_RESPONSE, 201);
      const audio = new Blob(["fake audio bytes"], { type: "audio/mpeg" });

      await client.createVoice(audio, "Test Voice", false);

      const [, init] = spy.mock.calls[0] as [string, RequestInit];
      const form = init.body as FormData;
      expect(form.get("consent_confirmed")).toBe("false");
    });

    it("throws AudactError on HTTP 422 (VOICE_REJECTED)", async () => {
      mockFetchError(
        { error: "VOICE_REJECTED", message: "sample rejected" },
        422,
      );
      const audio = new Blob(["bytes"], { type: "audio/mpeg" });
      await expect(
        client.createVoice(audio, "Bad Voice", true),
      ).rejects.toMatchObject({ status: 422 });
    });
  });

  describe("getVoice()", () => {
    it("calls GET /v1/voices/:id", async () => {
      const spy = mockFetchOk(VOICE);

      const result = await client.getVoice(VOICE_ID);

      expect(result.voice_id).toBe(VOICE_ID);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`http://localhost:8089/v1/voices/${VOICE_ID}`);
      expect(init.method).toBe("GET");
    });

    it("throws AudactError on HTTP 404", async () => {
      mockFetchError({ error: "NOT_FOUND", message: "not found" }, 404);
      await expect(client.getVoice(VOICE_ID)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe("deleteVoice()", () => {
    it("calls DELETE /v1/voices/:id", async () => {
      const spy = mockFetchNoContent();

      const result = await client.deleteVoice("cloned-voice-123");

      expect(result).toBeUndefined();
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/voices/cloned-voice-123");
      expect(init.method).toBe("DELETE");
    });

    it("throws AudactError on HTTP 400 for a built-in preset voice", async () => {
      mockFetchError(
        {
          error: "INVALID_REQUEST",
          message: "Built-in preset voices cannot be deleted",
        },
        400,
      );
      await expect(client.deleteVoice(VOICE_ID)).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  // ── Pipeline status ─────────────────────────────────────────────────────────

  describe("getPipelineStatus()", () => {
    it("calls GET /v1/pipeline/status", async () => {
      const spy = mockFetchOk(PIPELINE_STATUS_RESPONSE);

      const result = await client.getPipelineStatus();

      expect(result.active_pipelines).toBe(3);
      const [url, init] = spy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("http://localhost:8089/v1/pipeline/status");
      expect(init.method).toBe("GET");
    });
  });
});
