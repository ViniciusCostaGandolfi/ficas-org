package br.org.ficas.api.dto.campaign;

import br.org.ficas.api.model.enums.ContentStatus;
import java.time.Instant;
import java.util.Map;

/**
 * Full admin campaign/edital representation: every editable field plus the raw cover media id and
 * the free-form {@code formSchema} the builder round-trips.
 */
public record AdminCampaignDto(
        Long id,
        String slug,
        String title,
        String description,
        ContentStatus status,
        Instant startsAt,
        Instant endsAt,
        String coverImageUrl,
        Long coverMediaId,
        Map<String, Object> formSchema,
        Instant createdAt,
        Instant updatedAt) {
}
