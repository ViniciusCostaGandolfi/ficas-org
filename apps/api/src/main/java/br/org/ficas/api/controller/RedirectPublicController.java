package br.org.ficas.api.controller;

import br.org.ficas.api.dto.redirect.RedirectDto;
import br.org.ficas.api.service.RedirectService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public redirect lookup used by the SSR frontend to answer WordPress-era URLs with a 301.
 * Returns {@code 200 {fromPath,toPath,statusCode}} or {@code 404} when no rule matches.
 */
@RestController
@RequestMapping("/api/public/redirects")
public class RedirectPublicController {

    private static final String PREFIX = "/api/public/redirects";

    private final RedirectService redirectService;

    public RedirectPublicController(RedirectService redirectService) {
        this.redirectService = redirectService;
    }

    @GetMapping({"", "/**"})
    public ResponseEntity<RedirectDto> lookup(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String raw = uri.length() > PREFIX.length() ? uri.substring(PREFIX.length()) : "/";
        String query = request.getQueryString();
        Optional<RedirectDto> found = redirectService.lookup(raw, query);
        return found.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
