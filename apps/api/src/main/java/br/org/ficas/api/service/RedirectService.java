package br.org.ficas.api.service;

import br.org.ficas.api.infra.repository.RedirectRepository;
import br.org.ficas.api.dto.redirect.RedirectDto;
import br.org.ficas.api.model.entity.Redirect;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lookup of WordPress-era URLs. Stored {@code from_path} values are normalized (single leading
 * slash, no trailing slash) while an optional query string (e.g. {@code /?p=123}) is preserved.
 */
@Service
public class RedirectService {

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
}
