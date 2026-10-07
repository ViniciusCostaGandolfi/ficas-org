package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.MediaRepository;
import br.org.ficas.api.infra.repository.PageRepository;
import br.org.ficas.api.dto.page.AdminPageDto;
import br.org.ficas.api.dto.page.AdminPageSummaryDto;
import br.org.ficas.api.dto.page.PageDto;
import br.org.ficas.api.dto.page.PageSummaryDto;
import br.org.ficas.api.dto.page.PageUpsertRequest;
import br.org.ficas.api.model.entity.MediaAsset;
import br.org.ficas.api.model.entity.PageEntity;
import br.org.ficas.api.model.enums.ContentFormat;
import br.org.ficas.api.model.enums.ContentStatus;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PageService {

    private final PageRepository pageRepository;
    private final MediaRepository mediaRepository;

    public PageService(PageRepository pageRepository, MediaRepository mediaRepository) {
        this.pageRepository = pageRepository;
        this.mediaRepository = mediaRepository;
    }

    @Transactional(readOnly = true)
    public List<PageSummaryDto> listPublic() {
        return pageRepository.findByStatusOrderByMenuOrderAscIdAsc(ContentStatus.PUBLISHED).stream()
                .map(PageService::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageDto getPublicBySlug(String slug) {
        PageEntity page = pageRepository.findBySlug(slug)
                .filter(p -> p.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Page not found: " + slug));
        return toDto(page);
    }

    @Transactional(readOnly = true)
    public Page<AdminPageSummaryDto> listAdmin(int page, int size, String q, String status) {
        ContentStatus statusFilter = parseStatus(status);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "menuOrder", "id"));
        String query = (q == null || q.isBlank()) ? null : q.trim();
        String qLike = query == null ? null : "%" + query.toLowerCase(Locale.ROOT) + "%";
        return pageRepository.search(query, qLike, statusFilter, pageable).map(PageService::toAdminSummary);
    }

    @Transactional(readOnly = true)
    public AdminPageDto getAdmin(Long id) {
        return toAdminDto(require(id));
    }

    @Transactional
    public AdminPageDto create(PageUpsertRequest request) {
        if (pageRepository.existsBySlug(request.slug())) {
            throw new ConflictException("Slug already in use: " + request.slug());
        }
        PageEntity page = new PageEntity();
        apply(page, request);
        return toAdminDto(pageRepository.save(page));
    }

    @Transactional
    public AdminPageDto update(Long id, PageUpsertRequest request) {
        PageEntity page = require(id);
        pageRepository.findBySlug(request.slug())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Slug already in use: " + request.slug());
                });
        apply(page, request);
        return toAdminDto(page);
    }

    @Transactional
    public void delete(Long id) {
        pageRepository.delete(require(id));
    }

    private void apply(PageEntity page, PageUpsertRequest request) {
        page.setTitle(request.title());
        page.setSlug(request.slug());
        page.setContent(request.content());
        page.setContentFormat(parseContentFormat(request.contentFormat()));
        page.setExcerpt(request.excerpt());
        page.setSeoTitle(request.seoTitle());
        page.setSeoDescription(request.seoDescription());
        page.setMenuOrder(request.menuOrder() == null ? 0 : request.menuOrder());
        page.setShowInMenu(request.showInMenu() != null && request.showInMenu());
        page.setStatus(request.status() == null ? ContentStatus.DRAFT : request.status());
        page.setHeroMedia(resolveHero(request.heroMediaId()));
    }

    private MediaAsset resolveHero(Long heroMediaId) {
        if (heroMediaId == null) {
            return null;
        }
        return mediaRepository.findById(heroMediaId)
                .orElseThrow(() -> NotFoundException.of("Media", heroMediaId));
    }

    private static ContentStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ContentStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid status: " + status);
        }
    }

    /** Null/blank defaults to {@link ContentFormat#HTML}; an unknown value is a 400. */
    private static ContentFormat parseContentFormat(String contentFormat) {
        if (contentFormat == null || contentFormat.isBlank()) {
            return ContentFormat.HTML;
        }
        try {
            return ContentFormat.valueOf(contentFormat.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid contentFormat: " + contentFormat);
        }
    }

    @Transactional(readOnly = true)
    public PageEntity require(Long id) {
        return pageRepository.findById(id).orElseThrow(() -> NotFoundException.of("Page", id));
    }

    public static PageSummaryDto toSummary(PageEntity page) {
        return new PageSummaryDto(page.getId(), page.getSlug(), page.getTitle(),
                page.getMenuOrder(), page.isShowInMenu());
    }

    public static PageDto toDto(PageEntity page) {
        return new PageDto(
                page.getId(),
                page.getSlug(),
                page.getTitle(),
                page.getMenuOrder(),
                page.isShowInMenu(),
                page.getContent(),
                page.getContentFormat().name(),
                page.getExcerpt(),
                page.getHeroMedia() == null ? null : page.getHeroMedia().getUrl(),
                page.getSeoTitle(),
                page.getSeoDescription(),
                page.getUpdatedAt());
    }

    public static AdminPageSummaryDto toAdminSummary(PageEntity page) {
        return new AdminPageSummaryDto(
                page.getId(),
                page.getSlug(),
                page.getTitle(),
                page.getMenuOrder(),
                page.isShowInMenu(),
                page.getStatus(),
                heroMediaId(page));
    }

    public static AdminPageDto toAdminDto(PageEntity page) {
        return new AdminPageDto(
                page.getId(),
                page.getSlug(),
                page.getTitle(),
                page.getMenuOrder(),
                page.isShowInMenu(),
                page.getContent(),
                page.getContentFormat().name(),
                page.getExcerpt(),
                page.getHeroMedia() == null ? null : page.getHeroMedia().getUrl(),
                heroMediaId(page),
                page.getSeoTitle(),
                page.getSeoDescription(),
                page.getStatus(),
                page.getUpdatedAt());
    }

    private static Long heroMediaId(PageEntity page) {
        return page.getHeroMedia() == null ? null : page.getHeroMedia().getId();
    }
}
