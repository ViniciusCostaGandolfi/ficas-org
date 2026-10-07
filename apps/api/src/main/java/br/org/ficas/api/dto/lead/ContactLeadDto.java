package br.org.ficas.api.dto.lead;

import java.time.Instant;

/** Persisted contact lead. */
public record ContactLeadDto(
        Long id,
        String name,
        String email,
        String phone,
        String message,
        String source,
        boolean consent,
        Instant createdAt) {
}
