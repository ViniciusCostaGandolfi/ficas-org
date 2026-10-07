/**
 * Media URL resolution.
 *
 * Media objects live in MinIO/S3 and are proxied by the API under `/media/**`.
 * The API returns relative paths (e.g. `/media/import/<hash>.jpg`), but the web
 * origin does not serve that prefix — so any `<img src="/media/...">` would hit
 * the web router instead of the image. These helpers rewrite those paths to the
 * public API origin, which is reachable from the browser.
 *
 * Export is client-safe: it only reads `import.meta.env` and does no server I/O.
 */

/** Browser-reachable API origin (no trailing slash). Falls back to local dev. */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const base = raw && raw.length > 0 ? raw : "http://localhost:8080";
  return base.replace(/\/+$/, "");
}

/** True for `http://`, `https://`, `data:`, `blob:`, `//` and any other scheme. */
const ABSOLUTE_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * Resolve a CMS/media URL into something an `<img>` can load from the browser.
 *
 * - empty/null            → `undefined`
 * - absolute (`http:`, `https:`, `data:`, `blob:`, `//`, any scheme) → unchanged
 * - path starting `/media/` → prefixed with the public API origin
 * - anything else (`/brand/...`, `/home/...`, `/assets/...`) → unchanged
 *   (those are served by the web app from `apps/web/public`)
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  if (ABSOLUTE_PATTERN.test(value)) return value;
  if (value.startsWith("/media/")) {
    return `${getApiOrigin()}${value}`;
  }
  return value;
}
