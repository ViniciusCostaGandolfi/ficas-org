package br.org.ficas.api.infra.storage;

import java.io.InputStream;
import org.springframework.core.io.Resource;

/**
 * Backend-agnostic byte storage for media.
 *
 * <p>Keys are always storage-relative paths (e.g. {@code 2026/10/<uuid>.png} or
 * {@code import/<hash>.jpg}); the public URL is derived as {@code /media/<key>} so the URL shape
 * stays identical whether the bytes live on local disk or in S3/MinIO. Mirrors the elder-back
 * {@code S3Service} contract while remaining usable by the local-disk fallback.
 */
public interface StorageService {

    /**
     * Stores {@code size} bytes from {@code in} under {@code key}.
     *
     * @return the stored key (the input {@code key}, for chaining)
     */
    String put(InputStream in, long size, String key, String contentType);

    /** Reads a stored object; throws {@code NotFoundException} when the key does not exist. */
    StoredObject get(String key);

    /** Deletes the object if present; never throws for a missing key. */
    void delete(String key);

    /** Public URL for a stored key ({@code /media/<key>}). */
    String publicUrl(String key);

    /** Whether this backend is currently able to serve writes/reads. */
    boolean isEnabled();
}
