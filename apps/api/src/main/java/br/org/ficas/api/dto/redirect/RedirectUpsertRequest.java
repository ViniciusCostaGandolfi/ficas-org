package br.org.ficas.api.dto.redirect;

import jakarta.validation.constraints.NotBlank;

/**
 * One entry of the bulk redirect import payload:
 * {@code {"fromPath":"/old","toPath":"/new","statusCode":301}}.
 *
 * <p>{@code fromPath} and {@code toPath} are required. {@code statusCode} is optional and defaults
 * to {@code 301}; when present it must be one of {@code 301, 302, 307, 308}. Blank fields and
 * unsupported status codes are rejected with {@code 400 Bad Request}.
 */
public record RedirectUpsertRequest(
        @NotBlank String fromPath,
        @NotBlank String toPath,
        Integer statusCode) {
}
