package br.org.ficas.api.dto.page;

import br.org.ficas.api.model.enums.ContentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin create/update payload for pages. */
public record PageUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String content,
        String contentFormat,
        @Size(max = 1000) String excerpt,
        Long heroMediaId,
        Integer menuOrder,
        Boolean showInMenu,
        ContentStatus status,
        @Size(max = 255) String seoTitle,
        @Size(max = 500) String seoDescription) {
}
