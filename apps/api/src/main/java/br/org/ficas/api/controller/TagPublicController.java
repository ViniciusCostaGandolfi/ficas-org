package br.org.ficas.api.controller;

import br.org.ficas.api.dto.tag.TagDto;
import br.org.ficas.api.service.TagService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/tags")
public class TagPublicController {

    private final TagService tagService;

    public TagPublicController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<TagDto> list() {
        return tagService.list();
    }
}
