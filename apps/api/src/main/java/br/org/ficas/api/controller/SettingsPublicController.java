package br.org.ficas.api.controller;

import br.org.ficas.api.dto.settings.SiteSettingsDto;
import br.org.ficas.api.service.SiteSettingService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/settings")
public class SettingsPublicController {

    private final SiteSettingService siteSettingService;

    public SettingsPublicController(SiteSettingService siteSettingService) {
        this.siteSettingService = siteSettingService;
    }

    @GetMapping
    public SiteSettingsDto get() {
        return siteSettingService.get();
    }
}
