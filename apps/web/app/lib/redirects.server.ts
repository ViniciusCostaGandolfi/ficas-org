import { redirect } from "react-router";

import { createApi } from "./api.server";
import { ApiError, type RedirectDto } from "./types";

/**
 * Resolve a WordPress-era URL to its current location through the public API.
 *
 * The API exposes `GET /api/public/redirects/{path}`, where `{path}` is the
 * requested site path *after* the prefix (query string included). It answers
 * `200 { fromPath, toPath, statusCode }` on a match and `404` otherwise.
 *
 * Everything here is best-effort: a missing API, a 404, or any network failure
 * simply yields `null` so the caller can render the normal page/not-found.
 */

const SKIP_PREFIXES = ["/assets", "/media", "/api"];

/** Any trailing "file extension" means the request is an asset, not a page. */
const FILE_EXTENSION = /\.[a-z0-9]+$/i;

export function shouldSkipRedirectLookup(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  if (
    SKIP_PREFIXES.some(
      (prefix) => lower === prefix || lower.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  return FILE_EXTENSION.test(lower);
}

/** Strip query/hash and trailing slashes so `/a/` and `/a` compare equal. */
function normalizeForCompare(value: string): string {
  const path = value.split(/[?#]/)[0] ?? value;
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Ensure the redirect target is an absolute path (or an absolute URL). */
function toAbsoluteTarget(toPath: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(toPath) || toPath.startsWith("/")) {
    return toPath;
  }
  return `/${toPath}`;
}

/**
 * Look up a legacy redirect for the incoming request. Returns the match or
 * `null` (no rule, skipped asset path, non-GET, or any failure).
 */
export async function findLegacyRedirect(
  request: Request,
): Promise<RedirectDto | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;

  const url = new URL(request.url);
  if (shouldSkipRedirectLookup(url.pathname)) return null;

  const suffix = `${url.pathname}${url.search}`;
  const api = createApi(request);

  try {
    const match = await api.get<RedirectDto>(`/api/public/redirects${suffix}`);
    if (!match || typeof match !== "object" || !match.toPath) return null;

    // Loop guard: never redirect a path onto itself.
    if (
      normalizeForCompare(match.toPath) === normalizeForCompare(url.pathname)
    ) {
      return null;
    }

    return match;
  } catch (error) {
    // A 404 is the normal "no rule" answer; anything else is logged.
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error("[redirects] lookup failed:", error);
    }
    return null;
  }
}

/** Build the React Router redirect for a matched rule. */
export function legacyRedirectResponse(match: RedirectDto) {
  const status =
    match.statusCode >= 300 && match.statusCode < 400 ? match.statusCode : 301;
  return redirect(toAbsoluteTarget(match.toPath), { status });
}
