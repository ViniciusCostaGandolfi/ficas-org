package br.org.ficas.api.controller;

import br.org.ficas.api.infra.storage.StorageService;
import br.org.ficas.api.infra.storage.StoredObject;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves {@code /media/**} from the configured {@link StorageService}, so existing content URLs keep
 * working whether the bytes are on local disk or in S3/MinIO. Streams the stored bytes with the
 * stored content type and a public, cacheable response. Replaces the former local-disk
 * {@code ResourceHandler} in {@code WebConfig}.
 */
@RestController
public class MediaHttpController {

    private static final String PREFIX = "/media/";

    private final StorageService storageService;

    public MediaHttpController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/media/{*key}")
    public ResponseEntity<Resource> serve(@PathVariable String key) {
        String cleanKey = key.startsWith("/") ? key.substring(1) : key;
        StoredObject object = storageService.get(cleanKey);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(parseContentType(object.contentType()))
                .contentLength(object.contentLength())
                .body(object.resource());
    }

    private static MediaType parseContentType(String contentType) {
        try {
            return MediaType.parseMediaType(contentType);
        } catch (RuntimeException ex) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
