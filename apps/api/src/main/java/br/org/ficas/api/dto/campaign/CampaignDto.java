package br.org.ficas.api.dto.campaign;

import java.time.Instant;
import java.util.Map;

/** Public campaign/edital representation. */
public record CampaignDto(
        Long id,
        String slug,
        String title,
        String description,
        String status,
        Instant startsAt,
        Instant endsAt,
        String coverImageUrl,
        Map<String, Object> formSchema) {
}
