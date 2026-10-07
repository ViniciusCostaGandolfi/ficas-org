import { ApiError, type ProblemDetails } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8080";

/**
 * Resolve the API base URL.
 * - `API_BASE_URL` wins (server runtime / production).
 * - `VITE_API_BASE_URL` is the value exposed to the client bundle and dev SSR.
 * - Falls back to the local backend.
 */
export function getApiBaseUrl(): string {
  const fromProcess =
    typeof process !== "undefined" ? process.env.API_BASE_URL : undefined;
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = fromProcess ?? fromEnv ?? DEFAULT_BASE_URL;
  return base.replace(/\/+$/, "");
}

export interface ApiFetchOptions extends Omit<RequestInit, "body" | "credentials"> {
  /**
   * The incoming React Router request. During SSR the `Cookie` header is
   * forwarded to the API so the httpOnly `ficas_token` cookie authenticates
   * the call.
   */
  request?: Request;
  /** JSON body — serialized and given the correct Content-Type. */
  json?: unknown;
  /** Raw body (FormData, URLSearchParams, string, ...). */
  body?: BodyInit | null;
}

/**
 * Low-level fetch against the API. Returns the raw `Response` so callers can
 * forward `Set-Cookie` headers (login/logout).
 */
export async function apiFetchRaw(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { request, json, body, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  let finalBody: BodyInit | null = body ?? null;

  if (json !== undefined) {
    finalHeaders.set("Content-Type", "application/json; charset=utf-8");
    finalBody = JSON.stringify(json);
  }

  if (!finalHeaders.has("Accept")) {
    finalHeaders.set("Accept", "application/json");
  }

  if (request) {
    const cookie = request.headers.get("Cookie");
    if (cookie) {
      finalHeaders.set("Cookie", cookie);
    }
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: finalBody,
    // In the browser this sends the httpOnly cookie to the API; on the server
    // cookies are forwarded explicitly through the `request` option.
    credentials: "include",
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {
    status: response.status,
    title: response.statusText || "Request failed",
  };
  try {
    const data = (await response.json()) as ProblemDetails;
    if (data && typeof data === "object") {
      problem = { ...problem, ...data };
    }
  } catch {
    // Body was not JSON (e.g. plain text error) — keep the status info.
  }
  return new ApiError(response.status, problem);
}

/** Fetch + parse JSON, throwing `ApiError` (RFC 7807) on non-2xx. */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const response = await apiFetchRaw(path, options);

  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
  return text as unknown as T;
}

/**
 * Returns a small request-scoped client. Keeps `createApi` ergonomic in
 * loaders/actions while still forwarding the incoming cookie.
 */
export function createApi(request?: Request) {
  return {
    get: <T>(path: string) => apiFetch<T>(path, { request }),
    post: <T>(path: string, json?: unknown) =>
      apiFetch<T>(path, { method: "POST", json, request }),
    put: <T>(path: string, json?: unknown) =>
      apiFetch<T>(path, { method: "PUT", json, request }),
    patch: <T>(path: string, json?: unknown) =>
      apiFetch<T>(path, { method: "PATCH", json, request }),
    delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE", request }),
    upload: <T>(path: string, form: FormData) =>
      apiFetch<T>(path, { method: "POST", body: form, request }),
  };
}

export type Api = ReturnType<typeof createApi>;

/**
 * Run an API call and fall back to a default value when it fails. Used by
 * public loaders so an unavailable/empty API still renders the page (empty
 * state) instead of crashing SSR.
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  label = "api",
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(`[${label}] request failed:`, error);
    return fallback;
  }
}

/** Copy `Set-Cookie` headers from an API response onto a new/target Headers. */
export function forwardSetCookie(
  source: Response,
  target: Headers = new Headers(),
): Headers {
  const headers = source.headers as Headers & { getSetCookie?: () => string[] };
  const cookies: string[] =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : source.headers.get("set-cookie")
        ? [source.headers.get("set-cookie") as string]
        : [];

  for (const cookie of cookies) {
    target.append("Set-Cookie", cookie);
  }
  return target;
}
