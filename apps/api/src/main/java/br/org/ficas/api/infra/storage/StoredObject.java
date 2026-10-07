package br.org.ficas.api.infra.storage;

import org.springframework.core.io.Resource;

/**
 * A single stored object: its bytes (as a {@link Resource}), the content type to serve it with and
 * its length. Produced by {@link StorageService#get(String)} and streamed back by the media proxy.
 */
public record StoredObject(Resource resource, String contentType, long contentLength) {
}
