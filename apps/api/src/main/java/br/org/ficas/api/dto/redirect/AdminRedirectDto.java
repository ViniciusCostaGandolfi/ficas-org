package br.org.ficas.api.dto.redirect;

/** Admin projection of a redirect: {@code {id, fromPath, toPath, statusCode}}. */
public record AdminRedirectDto(
        Long id,
        String fromPath,
        String toPath,
        int statusCode) {
}
