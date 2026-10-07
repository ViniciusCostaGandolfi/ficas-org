package br.org.ficas.api.dto.tag;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** {@code {name, slug}}. */
public record TagUpsertRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 150) String slug) {
}
