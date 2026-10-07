package br.org.ficas.api.dto.page;

import br.org.ficas.api.model.enums.ContentStatus;
import java.time.Instant;

/** Full admin page representation: {@link PageDto} plus status and the hero media id. */
public record AdminPageDto(
        Long id,
        String slug,
        String title,
        int menuOrder,
        boolean showInMenu,
        String content,
        String contentFormat,
        String excerpt,
        String heroImageUrl,
        Long heroMediaId,
        String seoTitle,
        String seoDescription,
        ContentStatus status,
        Instant updatedAt) {
}
