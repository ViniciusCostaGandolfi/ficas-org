package br.org.ficas.api.infra.web;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Pagination envelope shared by every list endpoint:
 * {@code { "content": [], "page": 0, "size": 9, "totalElements": 0, "totalPages": 0 }}.
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    public static <T> PageResponse<T> of(List<T> content, int page, int size, long totalElements, int totalPages) {
        return new PageResponse<>(content, page, size, totalElements, totalPages);
    }
}
