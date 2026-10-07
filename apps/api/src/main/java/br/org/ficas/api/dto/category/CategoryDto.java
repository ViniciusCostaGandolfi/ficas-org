package br.org.ficas.api.dto.category;

/** {@code {id, slug, name, description}}. */
public record CategoryDto(Long id, String slug, String name, String description) {
}
