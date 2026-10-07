package br.org.ficas.api.dto.post;

import br.org.ficas.api.model.enums.ContentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Admin create/update payload for posts. */
public record PostUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        @Size(max = 1000) String excerpt,
        String content,
        String contentFormat,
        Long categoryId,
        List<Long> tagIds,
        Long coverMediaId,
        ContentStatus status,
        Instant publishedAt,
        @Size(max = 255) String seoTitle,
        @Size(max = 500) String seoDescription) {
}
