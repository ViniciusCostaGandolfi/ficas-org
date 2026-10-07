package br.org.ficas.api.dto.page;

import br.org.ficas.api.model.enums.ContentStatus;

/**
 * Admin page list item: {@link PageSummaryDto} plus status and the hero media id for editor prefill.
 */
public record AdminPageSummaryDto(
        Long id,
        String slug,
        String title,
        int menuOrder,
        boolean showInMenu,
        ContentStatus status,
        Long heroMediaId) {
}
