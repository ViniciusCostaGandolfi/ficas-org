package br.org.ficas.api.controller;

import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.page.AdminPageDto;
import br.org.ficas.api.dto.page.AdminPageSummaryDto;
import br.org.ficas.api.dto.page.PageUpsertRequest;
import br.org.ficas.api.service.PageService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/pages")
public class PageAdminController {

    private final PageService pageService;

    public PageAdminController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping
    public PageResponse<AdminPageSummaryDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status) {
        return PageResponse.from(pageService.listAdmin(page, size, q, status));
    }

    @PostMapping
    public ResponseEntity<AdminPageDto> create(@Valid @RequestBody PageUpsertRequest request) {
        AdminPageDto created = pageService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/pages/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public AdminPageDto get(@PathVariable Long id) {
        return pageService.getAdmin(id);
    }

    @PutMapping("/{id}")
    public AdminPageDto update(@PathVariable Long id, @Valid @RequestBody PageUpsertRequest request) {
        return pageService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        pageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
