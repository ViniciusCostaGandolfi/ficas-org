package br.org.ficas.api.dto.page;

/** Page list item: {@code {id, slug, title, menuOrder, showInMenu}}. */
public record PageSummaryDto(
        Long id,
        String slug,
        String title,
        int menuOrder,
        boolean showInMenu) {
}
