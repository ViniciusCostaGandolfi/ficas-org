package br.org.ficas.api.dto.campaign;

import br.org.ficas.api.model.enums.ContentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Map;

/**
 * Admin create/update payload for campaigns/editais.
 *
 * <p>{@code formSchema} is a free-form JSON object. It is typed as a map so a JSON array, string or
 * number is rejected at binding time (400 Malformed request); {@code null} defaults to an empty
 * object. {@code title} and {@code slug} are required.
 */
public record CampaignUpsertRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String slug,
        String description,
        ContentStatus status,
        Instant startsAt,
        Instant endsAt,
        Long coverMediaId,
        Map<String, Object> formSchema) {
}
