import { marked } from "marked";

import { resolveMediaUrl } from "./media";

/**
 * Rewrite `/media/**` paths inside a snippet of HTML (either authored HTML or
 * Markdown already rendered to HTML) to the API origin, so imported WordPress
 * content and Markdown images resolve from the browser.
 */
const MEDIA_ATTRIBUTE_PATTERN = /(src|href)=(["'])(\/media\/[^"']*)\2/gi;

function rewriteMediaPaths(html: string): string {
  return html.replace(
    MEDIA_ATTRIBUTE_PATTERN,
    (_match, attribute: string, quote: string, path: string) => {
      const resolved = resolveMediaUrl(path) ?? path;
      return `${attribute}=${quote}${resolved}${quote}`;
    },
  );
}

/**
 * Render CMS content to HTML for the public site and the admin preview.
 *
 * The `contentFormat` field is part of the frozen API contract:
 *   - `"MARKDOWN"` → parsed with `marked` (GFM + single-line breaks).
 *   - anything else (`"HTML"`, unknown, `null`, `undefined`) → kept as-is,
 *     which preserves every pre-existing record.
 *
 * In both cases `/media/**` media paths are rewritten to the API origin.
 * `marked.parse` runs synchronously by default, so this helper is safe to call
 * inside SSR loaders/components.
 */
export function renderContentHtml(
  content: string,
  format?: "HTML" | "MARKDOWN" | string | null,
): string {
  if (!content) return "";

  let html = content;
  if (format === "MARKDOWN") {
    try {
      const parsed = marked.parse(content, { gfm: true, breaks: true });
      html = typeof parsed === "string" ? parsed : content;
    } catch (error) {
      // Never break a public page because of malformed Markdown.
      console.error("[markdown] failed to parse content:", error);
      html = content;
    }
  }

  return rewriteMediaPaths(html);
}
