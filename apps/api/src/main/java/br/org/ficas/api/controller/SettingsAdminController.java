package br.org.ficas.api.controller;

import br.org.ficas.api.dto.settings.SiteSettingsDto;
import br.org.ficas.api.service.SiteSettingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** ADMIN-only; access is enforced in {@code SecurityConfig}. */
@RestController
@RequestMapping("/api/admin/settings")
public class SettingsAdminController {

    private final SiteSettingService siteSettingService;

    public SettingsAdminController(SiteSettingService siteSettingService) {
        this.siteSettingService = siteSettingService;
    }

    @GetMapping
    public SiteSettingsDto get() {
        return siteSettingService.get();
    }

    @PutMapping
    public SiteSettingsDto update(@Valid @RequestBody SiteSettingsDto request) {
        return siteSettingService.update(request);
    }
}
