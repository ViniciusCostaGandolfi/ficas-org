package br.org.ficas.api.dto.redirect;

/**
 * Result of a bulk redirect upsert: how many rules were received, newly inserted and updated
 * (already existing {@code fromPath}). {@code inserted + updated == received} unless the batch
 * repeats a {@code fromPath}, in which case every repetition after the first counts as an update.
 */
public record BulkRedirectsResponse(int received, int inserted, int updated) {
}
