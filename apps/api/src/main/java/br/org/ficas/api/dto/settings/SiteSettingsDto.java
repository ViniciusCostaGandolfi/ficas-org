package br.org.ficas.api.dto.settings;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** Public/admin site settings shape. */
public record SiteSettingsDto(
        @NotBlank String siteName,
        String siteDescription,
        String logoUrl,
        String faviconUrl,
        Social social,
        Contact contact,
        Pix pix) {

    /** Social links. Field order defines the serialized JSON key order. */
    public record Social(String instagram, String facebook, String youtube, String twitter, String linkedin) {
    }

    public record Contact(String email, String phone, String address) {
    }

    public record Pix(String key, String qrImageUrl, List<String> suggestedAmounts) {
    }
}
