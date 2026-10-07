package br.org.ficas.api.dto.post;

import br.org.ficas.api.dto.category.CategoryRef;
import br.org.ficas.api.dto.tag.TagDto;
import br.org.ficas.api.model.enums.ContentStatus;
import java.time.Instant;
import java.util.List;

/**
 * Full admin post representation: {@link PostDto} plus the raw foreign keys and status the editor
 * needs to prefill its form.
 */
public record AdminPostDto(
        Long id,
        String slug,
        String title,
        String excerpt,
        String coverImageUrl,
        Long coverMediaId,
        CategoryRef category,
        Long categoryId,
        List<TagDto> tags,
        List<Long> tagIds,
        AuthorRef author,
        ContentStatus status,
        Instant publishedAt,
        String content,
        String contentFormat,
        String seoTitle,
        String seoDescription,
        Instant createdAt,
        Instant updatedAt) {
}
