package br.org.ficas.api.dto.post;

import br.org.ficas.api.dto.category.CategoryRef;
import br.org.ficas.api.dto.tag.TagDto;
import java.time.Instant;
import java.util.List;

/** Full post representation (summary fields plus content/SEO/timestamps). */
public record PostDto(
        Long id,
        String slug,
        String title,
        String excerpt,
        String coverImageUrl,
        CategoryRef category,
        List<TagDto> tags,
        AuthorRef author,
        Instant publishedAt,
        String content,
        String contentFormat,
        String seoTitle,
        String seoDescription,
        Instant createdAt,
        Instant updatedAt) {
}
