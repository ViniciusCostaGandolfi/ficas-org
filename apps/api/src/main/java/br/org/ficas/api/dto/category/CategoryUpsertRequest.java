package br.org.ficas.api.dto.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code {name, slug, description, sortOrder}}. */
public record CategoryUpsertRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 150) String slug,
        @Size(max = 500) String description,
        Integer sortOrder) {
}
