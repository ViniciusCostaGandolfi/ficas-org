package br.org.ficas.api.dto.menu;

import java.util.List;

/** Public menu item (recursive): {@code {id, label, url, target, children}}. */
public record MenuItemDto(
        Long id,
        String label,
        String url,
        String target,
        List<MenuItemDto> children) {
}
