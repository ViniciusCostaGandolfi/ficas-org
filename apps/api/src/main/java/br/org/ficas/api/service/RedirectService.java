package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.repository.RedirectRepository;
import br.org.ficas.api.dto.redirect.AdminRedirectDto;
import br.org.ficas.api.dto.redirect.BulkRedirectsResponse;
import br.org.ficas.api.dto.redirect.RedirectDto;
import br.org.ficas.api.dto.redirect.RedirectUpsertRequest;
import br.org.ficas.api.model.entity.Redirect;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lookup of WordPress-era URLs. Stored {@code from_path} values are normalized (single leading
 * slash, no trailing slash) while an optional query string (e.g. {@code /?p=123}) is preserved.
 */
@Service
public class RedirectService {

    /** Redirect status codes the public lookup is allowed to emit. */
    private static final Set<Integer> ALLOWED_STATUS_CODES = Set.of(301, 302, 307, 308);
    private static final int DEFAULT_STATUS_CODE = 301;

    private final RedirectRepository redirectRepository;

    public RedirectService(RedirectRepository redirectRepository) {
        this.redirectRepository = redirectRepository;
    }

    /**
     * Finds the redirect for a requested path. Trailing slashes are ignored; a query string is
     * first tried as part of the key ({@code /?p=123}) and then ignored.
     */
    @Transactional(readOnly = true)
    public Optional<RedirectDto> lookup(String rawPath, String query) {
        String raw = (rawPath == null || rawPath.isBlank()) ? "/" : rawPath;
        if (query != null && !query.isBlank()) {
            raw = raw + (raw.indexOf('?') >= 0 ? "&" : "?") + query;
        }
        String normalized = normalize(raw);
        Optional<Redirect> found = redirectRepository.findByFromPath(normalized);
        if (found.isEmpty()) {
            String pathOnly = normalize(stripQuery(raw));
            if (!pathOnly.equals(normalized)) {
                found = redirectRepository.findByFromPath(pathOnly);
            }
        }
        return found.map(r -> new RedirectDto(r.getFromPath(), r.getToPath(), r.getStatusCode()));
    }

    /** Idempotently stores a redirect (no-op when {@code fromPath} already exists). */
    @Transactional
    public boolean insertIfAbsent(String fromPath, String toPath, int statusCode) {
        String from = normalize(fromPath);
        if (from.isEmpty() || from.equals(normalize(toPath))) {
            // Skip identity mappings: a self-redirect would loop on the SSR frontend.
            return false;
        }
        if (redirectRepository.existsByFromPath(from)) {
            return false;
        }
        redirectRepository.save(new Redirect(from, toPath, statusCode));
        return true;
    }

    /** Admin listing of stored rules, optionally filtered by a case-insensitive {@code from_path} substring. */
    @Transactional(readOnly = true)
    public Page<AdminRedirectDto> adminList(int page, int size, String q) {
        Sort sort = Sort.by(Sort.Direction.ASC, "fromPath").and(Sort.by(Sort.Direction.ASC, "id"));
        Pageable pageable = PageRequest.of(page, size, sort);
        String query = (q == null || q.isBlank()) ? null : q.trim().toLowerCase(Locale.ROOT);
        String qLike = query == null ? null : "%" + query + "%";
        return redirectRepository.search(qLike, pageable)
                .map(r -> new AdminRedirectDto(r.getId(), r.getFromPath(), r.getToPath(), r.getStatusCode()));
    }

    /**
     * Idempotently imports a batch of redirect rules into {@code redirects}, upserting on the unique
     * {@code from_path}. {@code fromPath} is normalized exactly like a public lookup key, so imported
     * rules resolve through {@code GET /api/public/redirects/**}. An empty batch is a no-op.
     *
     * @throws BadRequestException when an entry is null, has a blank {@code fromPath}/{@code toPath}
     *                             or carries a status code outside {@code 301/302/307/308}
     */
    @Transactional
    public BulkRedirectsResponse bulkUpsert(List<RedirectUpsertRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            return new BulkRedirectsResponse(0, 0, 0);
        }
        List<PreparedRedirect> prepared = new ArrayList<>(requests.size());
        for (RedirectUpsertRequest request : requests) {
            prepared.add(prepare(request));
        }

        Set<String> distinctFromPaths = prepared.stream()
                .map(PreparedRedirect::fromPath)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> existing = new HashSet<>(redirectRepository.findExistingFromPaths(distinctFromPaths));

        Set<String> seen = new HashSet<>();
        int inserted = 0;
        int updated = 0;
        for (PreparedRedirect entry : prepared) {
            if (existing.contains(entry.fromPath()) || !seen.add(entry.fromPath())) {
                updated++;
            } else {
                inserted++;
            }
        }

        // Dedupe within the batch (last occurrence wins) so the same key is written once.
        Map<String, PreparedRedirect> lastWins = new LinkedHashMap<>();
        for (PreparedRedirect entry : prepared) {
            lastWins.put(entry.fromPath(), entry);
        }
        for (PreparedRedirect entry : lastWins.values()) {
            redirectRepository.upsert(entry.fromPath(), entry.toPath(), entry.statusCode());
        }

        return new BulkRedirectsResponse(requests.size(), inserted, updated);
    }

    private static PreparedRedirect prepare(RedirectUpsertRequest request) {
        if (request == null) {
            throw new BadRequestException("Redirect entry must not be null");
        }
        if (request.fromPath() == null || request.fromPath().isBlank()) {
            throw new BadRequestException("fromPath must not be blank");
        }
        if (request.toPath() == null || request.toPath().isBlank()) {
            throw new BadRequestException("toPath must not be blank");
        }
        int statusCode = resolveStatusCode(request.statusCode());
        return new PreparedRedirect(normalize(request.fromPath()), request.toPath(), statusCode);
    }

    private static int resolveStatusCode(Integer statusCode) {
        if (statusCode == null) {
            return DEFAULT_STATUS_CODE;
        }
        if (!ALLOWED_STATUS_CODES.contains(statusCode)) {
            throw new BadRequestException(
                    "Invalid statusCode: " + statusCode + " (allowed: 301, 302, 307, 308)");
        }
        return statusCode;
    }

    /**
     * Ensures a single leading slash, drops a trailing slash (except for the root) and keeps any
     * query string untouched. Example: {@code home/} → {@code /home}; {@code ?p=1} → {@code /?p=1}.
     */
    public static String normalize(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return "/";
        }
        String value = candidate.trim();
        int queryAt = value.indexOf('?');
        String path = queryAt >= 0 ? value.substring(0, queryAt) : value;
        String query = queryAt >= 0 ? value.substring(queryAt) : "";
        if (path.isEmpty()) {
            path = "/";
        } else if (!path.startsWith("/")) {
            path = "/" + path;
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path + query;
    }

    private static String stripQuery(String value) {
        int queryAt = value.indexOf('?');
        return queryAt >= 0 ? value.substring(0, queryAt) : value;
    }

    /** A validated and normalized bulk entry ready to be upserted. */
    private record PreparedRedirect(String fromPath, String toPath, int statusCode) {
    }
}
