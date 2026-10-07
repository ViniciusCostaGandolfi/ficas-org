package br.org.ficas.api.controller;

import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.campaign.AdminCampaignDto;
import br.org.ficas.api.dto.campaign.CampaignUpsertRequest;
import br.org.ficas.api.service.CampaignService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/campaigns")
public class CampaignAdminController {

    private final CampaignService campaignService;

    public CampaignAdminController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @GetMapping
    public PageResponse<AdminCampaignDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status) {
        return PageResponse.from(campaignService.adminList(page, size, q, status));
    }

    @PostMapping
    public ResponseEntity<AdminCampaignDto> create(@Valid @RequestBody CampaignUpsertRequest request) {
        AdminCampaignDto created = campaignService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/campaigns/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public AdminCampaignDto get(@PathVariable Long id) {
        return campaignService.adminGet(id);
    }

    @PutMapping("/{id}")
    public AdminCampaignDto update(@PathVariable Long id, @Valid @RequestBody CampaignUpsertRequest request) {
        return campaignService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        campaignService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public AdminCampaignDto publish(@PathVariable Long id) {
        return campaignService.publish(id);
    }

    @PostMapping("/{id}/unpublish")
    public AdminCampaignDto unpublish(@PathVariable Long id) {
        return campaignService.unpublish(id);
    }
}
