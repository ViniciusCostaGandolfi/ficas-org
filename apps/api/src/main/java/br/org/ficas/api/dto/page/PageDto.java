package br.org.ficas.api.dto.page;

import java.time.Instant;

/** Full page representation. */
public record PageDto(
        Long id,
        String slug,
        String title,
        int menuOrder,
        boolean showInMenu,
        String content,
        String contentFormat,
        String excerpt,
        String heroImageUrl,
        String seoTitle,
        String seoDescription,
        Instant updatedAt) {
}
