package br.org.ficas.api.controller;

import br.org.ficas.api.dto.page.PageDto;
import br.org.ficas.api.dto.page.PageSummaryDto;
import br.org.ficas.api.service.PageService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/pages")
public class PagePublicController {

    private final PageService pageService;

    public PagePublicController(PageService pageService) {
        this.pageService = pageService;
    }

    @GetMapping
    public List<PageSummaryDto> list() {
        return pageService.listPublic();
    }

    @GetMapping("/{slug}")
    public PageDto get(@PathVariable String slug) {
        return pageService.getPublicBySlug(slug);
    }
}
