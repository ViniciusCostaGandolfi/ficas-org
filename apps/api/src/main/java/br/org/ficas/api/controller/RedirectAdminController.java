package br.org.ficas.api.controller;

import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.redirect.AdminRedirectDto;
import br.org.ficas.api.dto.redirect.BulkRedirectsResponse;
import br.org.ficas.api.dto.redirect.RedirectUpsertRequest;
import br.org.ficas.api.service.RedirectService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin management of the WordPress-era redirect table (ADMIN or EDITOR). The public lookup in
 * {@link RedirectPublicController} is unaffected; both share {@link RedirectService}.
 */
@RestController
@RequestMapping("/api/admin/redirects")
public class RedirectAdminController {

    private final RedirectService redirectService;

    public RedirectAdminController(RedirectService redirectService) {
        this.redirectService = redirectService;
    }

    @GetMapping
    public PageResponse<AdminRedirectDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q) {
        return PageResponse.from(redirectService.adminList(page, size, q));
    }

    @PostMapping("/bulk")
    public BulkRedirectsResponse bulk(@Valid @RequestBody List<RedirectUpsertRequest> requests) {
        return redirectService.bulkUpsert(requests);
    }
}
