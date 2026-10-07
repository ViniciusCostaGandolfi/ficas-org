package br.org.ficas.api.dto.redirect;

/** Public redirect mapping returned by {@code GET /api/public/redirects/{path}}. */
public record RedirectDto(String fromPath, String toPath, int statusCode) {
}
