package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.CampaignRepository;
import br.org.ficas.api.infra.repository.MediaRepository;
import br.org.ficas.api.dto.campaign.AdminCampaignDto;
import br.org.ficas.api.dto.campaign.CampaignDto;
import br.org.ficas.api.dto.campaign.CampaignUpsertRequest;
import br.org.ficas.api.model.entity.Campaign;
import br.org.ficas.api.model.entity.MediaAsset;
import br.org.ficas.api.model.enums.ContentStatus;
import java.util.HashMap;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Campaign read model plus the builder CRUD. Public endpoints expose published editais only;
 * submission endpoints are phase 3.
 */
@Service
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final MediaRepository mediaRepository;

    public CampaignService(CampaignRepository campaignRepository, MediaRepository mediaRepository) {
        this.campaignRepository = campaignRepository;
        this.mediaRepository = mediaRepository;
    }

    @Transactional(readOnly = true)
    public Page<CampaignDto> listPublic(int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "startsAt").and(Sort.by(Sort.Direction.DESC, "id")));
        return campaignRepository.findByStatus(ContentStatus.PUBLISHED, pageable).map(CampaignService::toDto);
    }

    @Transactional(readOnly = true)
    public CampaignDto getPublicBySlug(String slug) {
        Campaign campaign = campaignRepository.findBySlug(slug)
                .filter(c -> c.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Campaign not found: " + slug));
        return toDto(campaign);
    }

    @Transactional(readOnly = true)
    public Page<AdminCampaignDto> adminList(int page, int size, String q, String status) {
        ContentStatus statusFilter = parseStatus(status);
        Sort sort = Sort.by(
                new Sort.Order(Sort.Direction.DESC, "startsAt").nullsLast(),
                new Sort.Order(Sort.Direction.DESC, "id"));
        Pageable pageable = PageRequest.of(page, size, sort);
        String query = (q == null || q.isBlank()) ? null : q.trim();
        String qLike = query == null ? null : "%" + query.toLowerCase(Locale.ROOT) + "%";
        return campaignRepository.search(query, qLike, statusFilter, pageable).map(CampaignService::toAdminDto);
    }

    @Transactional(readOnly = true)
    public AdminCampaignDto adminGet(Long id) {
        return toAdminDto(require(id));
    }

    @Transactional
    public AdminCampaignDto create(CampaignUpsertRequest request) {
        if (campaignRepository.existsBySlug(request.slug())) {
            throw new ConflictException("Slug already in use: " + request.slug());
        }
        Campaign campaign = new Campaign(
                request.title(),
                request.slug(),
                request.description(),
                request.status(),
                request.startsAt(),
                request.endsAt(),
                resolveCover(request.coverMediaId()),
                request.formSchema());
        return toAdminDto(campaignRepository.save(campaign));
    }

    @Transactional
    public AdminCampaignDto update(Long id, CampaignUpsertRequest request) {
        Campaign campaign = require(id);
        campaignRepository.findBySlug(request.slug())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Slug already in use: " + request.slug());
                });
        apply(campaign, request);
        return toAdminDto(campaign);
    }

    @Transactional
    public void delete(Long id) {
        campaignRepository.delete(require(id));
    }

    @Transactional
    public AdminCampaignDto publish(Long id) {
        Campaign campaign = require(id);
        campaign.setStatus(ContentStatus.PUBLISHED);
        return toAdminDto(campaign);
    }

    @Transactional
    public AdminCampaignDto unpublish(Long id) {
        Campaign campaign = require(id);
        campaign.setStatus(ContentStatus.DRAFT);
        return toAdminDto(campaign);
    }

    private void apply(Campaign campaign, CampaignUpsertRequest request) {
        campaign.setTitle(request.title());
        campaign.setSlug(request.slug());
        campaign.setDescription(request.description());
        campaign.setStatus(request.status() == null ? ContentStatus.DRAFT : request.status());
        campaign.setStartsAt(request.startsAt());
        campaign.setEndsAt(request.endsAt());
        campaign.setCoverMedia(resolveCover(request.coverMediaId()));
        campaign.setFormSchema(request.formSchema() == null ? new HashMap<>() : request.formSchema());
    }

    private MediaAsset resolveCover(Long coverMediaId) {
        if (coverMediaId == null) {
            return null;
        }
        return mediaRepository.findById(coverMediaId)
                .orElseThrow(() -> NotFoundException.of("Media", coverMediaId));
    }

    @Transactional(readOnly = true)
    public Campaign require(Long id) {
        return campaignRepository.findById(id).orElseThrow(() -> NotFoundException.of("Campaign", id));
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

    public static CampaignDto toDto(Campaign campaign) {
        return new CampaignDto(
                campaign.getId(),
                campaign.getSlug(),
                campaign.getTitle(),
                campaign.getDescription(),
                campaign.getStatus().name(),
                campaign.getStartsAt(),
                campaign.getEndsAt(),
                campaign.getCoverMedia() == null ? null : campaign.getCoverMedia().getUrl(),
                campaign.getFormSchema());
    }

    public static AdminCampaignDto toAdminDto(Campaign campaign) {
        return new AdminCampaignDto(
                campaign.getId(),
                campaign.getSlug(),
                campaign.getTitle(),
                campaign.getDescription(),
                campaign.getStatus(),
                campaign.getStartsAt(),
                campaign.getEndsAt(),
                campaign.getCoverMedia() == null ? null : campaign.getCoverMedia().getUrl(),
                campaign.getCoverMedia() == null ? null : campaign.getCoverMedia().getId(),
                campaign.getFormSchema(),
                campaign.getCreatedAt(),
                campaign.getUpdatedAt());
    }
}
