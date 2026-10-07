package br.org.ficas.api.dto.menu;

import java.util.List;

/** Admin menu item (recursive), including ordering/parenting metadata. */
public record AdminMenuItemDto(
        Long id,
        String label,
        String url,
        String target,
        int sortOrder,
        Long parentId,
        List<AdminMenuItemDto> children) {
}
