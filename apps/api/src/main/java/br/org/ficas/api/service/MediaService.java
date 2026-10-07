package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.MediaRepository;
import br.org.ficas.api.infra.storage.StorageService;
import br.org.ficas.api.dto.media.MediaDto;
import br.org.ficas.api.model.entity.MediaAsset;
import java.io.IOException;
import java.io.InputStream;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Media metadata service. Validates uploads and persists {@code media_assets} rows, delegating the
 * actual byte storage to the configured {@link StorageService} (local disk or S3/MinIO). The public
 * URL shape is always {@code /media/<yyyy>/<MM>/<uuid>.<ext>}.
 */
@Service
public class MediaService {

    private static final Logger log = LoggerFactory.getLogger(MediaService.class);
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml", "application/pdf");
    private static final Map<String, String> EXTENSION_TO_MIME = Map.of(
            "png", "image/png",
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "gif", "image/gif",
            "webp", "image/webp",
            "svg", "image/svg+xml",
            "pdf", "application/pdf");

    private static final String URL_PREFIX = "/media/";

    private final MediaRepository mediaRepository;
    private final StorageService storageService;
    private final long maxSizeBytes;

    public MediaService(MediaRepository mediaRepository, StorageService storageService,
            @Value("${app.media.max-size-bytes:52428800}") long maxSizeBytes) {
        this.mediaRepository = mediaRepository;
        this.storageService = storageService;
        this.maxSizeBytes = maxSizeBytes;
    }

    @Transactional(readOnly = true)
    public Page<MediaDto> list(String q, Pageable pageable) {
        Page<MediaAsset> page = (q == null || q.isBlank())
                ? mediaRepository.findAll(pageable)
                : mediaRepository.findByFilenameContainingIgnoreCaseOrAltContainingIgnoreCase(q, q, pageable);
        return page.map(MediaService::toDto);
    }

    @Transactional
    public MediaDto store(MultipartFile file, String alt) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("file must not be empty");
        }
        if (file.getSize() > maxSizeBytes) {
            throw new BadRequestException("file exceeds the " + (maxSizeBytes / (1024 * 1024)) + "MB limit");
        }
        String originalFilename = sanitize(file.getOriginalFilename());
        String extension = extensionOf(originalFilename);
        String mimeType = resolveMimeType(file.getContentType(), extension);
        if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new BadRequestException("unsupported file type: " + mimeType);
        }

        YearMonth now = YearMonth.now(ZoneOffset.UTC);
        String key = "%04d/%02d/%s%s".formatted(now.getYear(), now.getMonthValue(),
                UUID.randomUUID().toString().replace("-", ""), extension);

        try (InputStream in = file.getInputStream()) {
            storageService.put(in, file.getSize(), key, mimeType);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read uploaded file", ex);
        }

        String url = URL_PREFIX + key;
        MediaAsset asset = mediaRepository.save(new MediaAsset(originalFilename, url, mimeType, file.getSize(), alt));
        log.info("media_stored id={} url={} sizeBytes={}", asset.getId(), url, file.getSize());
        return toDto(asset);
    }

    @Transactional
    public void delete(Long id) {
        MediaAsset asset = mediaRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Media", id));
        mediaRepository.delete(asset);
        String key = keyFromUrl(asset.getUrl());
        if (key != null) {
            storageService.delete(key);
        }
    }

    /** Extracts the storage key from a {@code /media/...} URL, or {@code null} for foreign URLs. */
    static String keyFromUrl(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) {
            return null;
        }
        String key = url.substring(URL_PREFIX.length());
        return key.isBlank() ? null : key;
    }

    private static String resolveMimeType(String contentType, String extension) {
        if (contentType != null && !contentType.isBlank() && !"application/octet-stream".equalsIgnoreCase(contentType)) {
            return contentType.toLowerCase(Locale.ROOT);
        }
        return EXTENSION_TO_MIME.getOrDefault(extension.replace(".", ""), "application/octet-stream");
    }

    private static String sanitize(String filename) {
        String name = (filename == null || filename.isBlank()) ? "file" : java.nio.file.Paths.get(filename).getFileName().toString();
        return name.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            return "";
        }
        return filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    public static MediaDto toDto(MediaAsset asset) {
        return new MediaDto(asset.getId(), asset.getUrl(), asset.getFilename(),
                asset.getMimeType(), asset.getSizeBytes(), asset.getAlt());
    }
}
