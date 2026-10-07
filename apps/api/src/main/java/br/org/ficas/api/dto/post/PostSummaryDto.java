package br.org.ficas.api.dto.post;

import br.org.ficas.api.dto.category.CategoryRef;
import br.org.ficas.api.dto.tag.TagDto;
import java.time.Instant;
import java.util.List;

/** Post list item. */
public record PostSummaryDto(
        Long id,
        String slug,
        String title,
        String excerpt,
        String coverImageUrl,
        CategoryRef category,
        List<TagDto> tags,
        AuthorRef author,
        Instant publishedAt) {
}
