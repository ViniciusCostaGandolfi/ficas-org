package br.org.ficas.api.dto.media;

/** {@code {id, url, filename, mimeType, sizeBytes, alt}}. */
public record MediaDto(
        Long id,
        String url,
        String filename,
        String mimeType,
        long sizeBytes,
        String alt) {
}
