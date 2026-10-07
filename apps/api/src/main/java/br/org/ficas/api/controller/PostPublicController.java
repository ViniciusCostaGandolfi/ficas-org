package br.org.ficas.api.controller;

import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.post.PostDto;
import br.org.ficas.api.dto.post.PostSummaryDto;
import br.org.ficas.api.service.PostService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/posts")
public class PostPublicController {

    private final PostService postService;

    public PostPublicController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public PageResponse<PostSummaryDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String q) {
        return PageResponse.from(postService.listPublic(page, size, category, q));
    }

    @GetMapping("/{slug}")
    public PostDto get(@PathVariable String slug) {
        return postService.getPublicBySlug(slug);
    }
}
