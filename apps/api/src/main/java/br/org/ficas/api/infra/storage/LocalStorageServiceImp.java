package br.org.ficas.api.infra.storage;

import br.org.ficas.api.infra.config.AppProperties;
import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.exception.NotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;

/**
 * Local-disk {@link StorageService}. Kept as the default ({@code app.storage.provider=local}) so
 * offline runs and the test suite keep working without S3/MinIO, and so the importer can be
 * exercised against the filesystem. Selected when {@code app.storage.provider} is {@code local} or
 * unset.
 */
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "local", matchIfMissing = true)
public class LocalStorageServiceImp implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageServiceImp.class);

    private static final Map<String, String> EXTENSION_TO_MIME = Map.ofEntries(
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif", "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("svg", "image/svg+xml"),
            Map.entry("pdf", "application/pdf"));

    private final Path root;

    public LocalStorageServiceImp(AppProperties properties) {
        this.root = Paths.get(properties.storage().localDir()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(root);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to create media storage directory: " + root, ex);
        }
    }

    @Override
    public String put(InputStream in, long size, String key, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to store file: " + key, ex);
        }
        return key;
    }

    @Override
    public StoredObject get(String key) {
        Path target = resolve(key);
        if (!Files.isRegularFile(target)) {
            throw NotFoundException.of("Media", key);
        }
        try {
            return new StoredObject(new FileSystemResource(target), probeContentType(target), Files.size(target));
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read stored file: " + key, ex);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException ex) {
            log.warn("local_storage_delete_failed key={}", key, ex);
        }
    }

    @Override
    public String publicUrl(String key) {
        return "/media/" + key;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    private Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new BadRequestException("invalid media key");
        }
        return target;
    }

    private static String probeContentType(Path target) {
        try {
            String detected = Files.probeContentType(target);
            if (detected != null && !detected.isBlank()) {
                return detected;
            }
        } catch (IOException ignored) {
            // fall through to the extension map
        }
        String name = target.getFileName().toString();
        int dot = name.lastIndexOf('.');
        if (dot >= 0 && dot < name.length() - 1) {
            String mime = EXTENSION_TO_MIME.get(name.substring(dot + 1).toLowerCase(Locale.ROOT));
            if (mime != null) {
                return mime;
            }
        }
        return "application/octet-stream";
    }
}
