/**
 * Audact TypeScript SDK — shared HTTP transport
 *
 * Home of {@link AudactError} and {@link BaseServiceClient}: the fetch-based
 * transport every service sub-client (ValidatorClient, EvidenceClient,
 * LLMProxyClient, TenantClient, PlatformClient) builds on.
 *
 * This lives in its own module (rather than client.ts, where it originated)
 * so that client.ts and platform.ts can both depend on it without forming an
 * import cycle: client.ts wires PlatformClient into AudactClient, and
 * platform.ts's PlatformClient extends BaseServiceClient.
 */

// ─── AudactError ────────────────────────────────────────────────────────────

/**
 * Thrown by all AudactClient methods when the server returns a non-2xx status
 * or when the fetch itself fails (network error, timeout, etc.).
 */
export class AudactError extends Error {
  /** HTTP status code, or 0 for network/timeout errors. */
  public readonly status: number;
  /** Structured error body from the server, when available. */
  public readonly body: unknown;
  /** Request ID echoed from X-Request-ID response header, when present. */
  public readonly requestId: string | undefined;
  /** Machine-readable error code from the `{"error": {"code"}}` envelope. */
  readonly code?: string;
  /** Human-readable remediation hint from the envelope, when present. */
  readonly hint?: string;
  /** Structured error details from the envelope, when present. */
  readonly details?: unknown;
  /** Seconds to wait before retrying, parsed from `Retry-After` (429). */
  readonly retryAfter?: number;

  constructor(
    message: string,
    status: number,
    body: unknown = null,
    requestId?: string,
    extra?: {
      code?: string;
      hint?: string;
      details?: unknown;
      retryAfter?: number;
    },
  ) {
    super(message);
    this.name = "AudactError";
    this.status = status;
    this.body = body;
    this.requestId = requestId;
    this.code = extra?.code;
    this.hint = extra?.hint;
    this.details = extra?.details;
    this.retryAfter = extra?.retryAfter;
  }
}

/**
 * Parses a Retry-After header: delta-seconds, or an HTTP-date converted to
 * seconds from now (clamped at 0). Returns undefined when absent/unparseable.
 */
function parseRetryAfter(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v);
  const t = Date.parse(v);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.ceil((t - Date.now()) / 1000));
}

/**
 * Reads the error body of a non-2xx response and builds an {@link AudactError}.
 * Envelope: nested `{"error": {...}}` first, top-level fields as fallback.
 */
async function buildError(response: Response): Promise<AudactError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Ignore parse errors on error responses (e.g. non-JSON bodies).
  }
  const root =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const env =
    typeof root.error === "object" && root.error !== null
      ? (root.error as Record<string, unknown>)
      : root;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v !== "" ? v : undefined;
  const message = str(env.message) ?? `HTTP ${response.status}`;
  const requestId =
    str(env.request_id) ?? response.headers.get("X-Request-ID") ?? undefined;
  return new AudactError(message, response.status, body, requestId, {
    code: str(env.code),
    hint: str(env.hint),
    details: env.details,
    retryAfter:
      response.status === 429
        ? parseRetryAfter(response.headers.get("Retry-After"))
        : undefined,
  });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

export const DEFAULT_TIMEOUT_MS = 30_000;
export const STREAMING_TIMEOUT_MS = 300_000;

/**
 * Builds an AbortSignal that fires after `ms` milliseconds.
 * Falls back gracefully when AbortSignal.timeout is unavailable.
 */
function makeTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

// ─── Base service client ────────────────────────────────────────────────────

/**
 * Shared HTTP transport used by all sub-clients.
 * Not intended for direct use; use the service-specific sub-clients instead.
 */
export class BaseServiceClient {
  protected readonly baseUrl: string;
  protected readonly apiKey: string;
  protected readonly timeoutMs: number;
  /**
   * Bearer token used instead of `apiKey` when set — e.g. the JWT returned by
   * `OrgClient.login()` (OrgBearer) or a caller-supplied Ed25519 platform
   * token (PlatformBearer, see `platformToken` in {@link AudactClientOptions}
   * in types.ts). The SDK never mints either kind of token itself.
   */
  protected authToken?: string;

  constructor(baseUrl: string, apiKey: string, timeoutMs: number) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Sets (or clears, when `undefined`) the bearer token sent instead of
   * `apiKey` on subsequent requests. Used by sub-clients that authenticate
   * with a token obtained after construction (e.g. `OrgClient.login()`) or
   * supplied up front (e.g. a `platformToken`).
   */
  setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  /**
   * Executes an HTTP request and parses the JSON response.
   * Throws {@link AudactError} on non-2xx status codes or network errors.
   */
  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    // Multipart uploads (e.g. NumbersClient's KYC document endpoints) pass a
    // FormData body. fetch computes its own `multipart/form-data; boundary=...`
    // Content-Type from a FormData body, so one must NEVER be set here — doing
    // so (or JSON.stringify-ing the FormData) corrupts the upload. JSON
    // requests are unaffected and keep sending Content-Type: application/json.
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authToken ?? this.apiKey}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...extraHeaders,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: isFormData
          ? (body as FormData)
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
        signal: makeTimeoutSignal(this.timeoutMs),
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Network request failed";
      throw new AudactError(msg, 0, null);
    }

    const requestId =
      response.headers.get("X-Request-ID") ?? undefined;

    if (!response.ok) {
      throw await buildError(response);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return (await response.json()) as T;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to parse response JSON";
      throw new AudactError(msg, response.status, null, requestId);
    }
  }

  /**
   * Executes an HTTP request and returns the raw `Response` for the caller to
   * consume as a stream. The response is NOT parsed here.
   *
   * Throws {@link AudactError} on non-2xx status codes or network errors.
   */
  protected async requestStream(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authToken ?? this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...extraHeaders,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: makeTimeoutSignal(STREAMING_TIMEOUT_MS),
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Network request failed";
      throw new AudactError(msg, 0, null);
    }

    if (!response.ok) {
      throw await buildError(response);
    }

    return response;
  }

  /**
   * Executes an HTTP request and returns the raw `Response` without parsing
   * or buffering the body — unlike {@link request} (always JSON) and
   * {@link requestStream} (always `Accept: text/event-stream`), the caller
   * fully controls `extraHeaders`/`body` and decides how to consume the
   * response (`.text()`, `.json()`, or streaming via `.body`).
   *
   * Used by PlatformClient (platform.ts) for bundle export/import, where the
   * body is YAML/JSON file content rather than a small JSON object, and may
   * be too large to buffer as a single JS string on either side of the wire.
   *
   * Throws {@link AudactError} on non-2xx status codes or network errors.
   */
  protected async requestRaw(
    method: string,
    path: string,
    body?: BodyInit,
    extraHeaders?: Record<string, string>,
    repeatedHeaders?: Array<[string, string]>,
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const baseHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.authToken ?? this.apiKey}`,
      ...extraHeaders,
    };
    // When repeatable headers are present (e.g. the X-Audact-Set-Secret import
    // assignments — a plaintext secret that must NEVER go in the URL), send headers as a tuple
    // list so the same name can appear more than once. Otherwise keep the plain object form.
    const headers: HeadersInit =
      repeatedHeaders && repeatedHeaders.length > 0
        ? [...Object.entries(baseHeaders), ...repeatedHeaders]
        : baseHeaders;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        signal: makeTimeoutSignal(this.timeoutMs),
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Network request failed";
      throw new AudactError(msg, 0, null);
    }

    if (!response.ok) {
      throw await buildError(response);
    }

    return response;
  }
}
