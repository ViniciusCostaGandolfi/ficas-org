package br.org.ficas.api.dto.menu;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Admin menu replace payload (recursive). */
public record MenuItemUpsertRequest(
        @NotBlank @Size(max = 150) String label,
        @NotBlank @Size(max = 500) String url,
        String target,
        Integer sortOrder,
        Long parentId,
        List<MenuItemUpsertRequest> children) {
}
