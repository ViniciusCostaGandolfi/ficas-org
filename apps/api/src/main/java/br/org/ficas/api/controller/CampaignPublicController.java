package br.org.ficas.api.controller;

import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.campaign.CampaignDto;
import br.org.ficas.api.service.CampaignService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public campaign/edital read endpoints. Submission endpoints are intentionally omitted in the MVP
 * (phase 3).
 */
@RestController
@RequestMapping("/api/public/campaigns")
public class CampaignPublicController {

    private final CampaignService campaignService;

    public CampaignPublicController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping
    public PageResponse<CampaignDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size) {
        return PageResponse.from(campaignService.listPublic(page, size));
    }

    @GetMapping("/{slug}")
    public CampaignDto get(@PathVariable String slug) {
        return campaignService.getPublicBySlug(slug);
    }
}
