package br.org.ficas.api.controller;

import br.org.ficas.api.infra.security.UserPrincipal;
import br.org.ficas.api.infra.web.PageResponse;
import br.org.ficas.api.dto.post.AdminPostDto;
import br.org.ficas.api.dto.post.AdminPostSummaryDto;
import br.org.ficas.api.dto.post.PostUpsertRequest;
import br.org.ficas.api.service.PostService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
@RequestMapping("/api/admin/posts")
public class PostAdminController {

    private final PostService postService;

    public PostAdminController(PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public PageResponse<AdminPostSummaryDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        return PageResponse.from(postService.listAdmin(page, size, q, status, category));
    }

    @PostMapping
    public ResponseEntity<AdminPostDto> create(@Valid @RequestBody PostUpsertRequest request, Authentication authentication) {
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        AdminPostDto created = postService.create(request, principal.id());
        return ResponseEntity.created(URI.create("/api/admin/posts/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public AdminPostDto get(@PathVariable Long id) {
        return postService.getAdmin(id);
    }

    @PutMapping("/{id}")
    public AdminPostDto update(@PathVariable Long id, @Valid @RequestBody PostUpsertRequest request) {
        return postService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        postService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/publish")
    public AdminPostDto publish(@PathVariable Long id) {
        return postService.publish(id);
    }

    @PostMapping("/{id}/unpublish")
    public AdminPostDto unpublish(@PathVariable Long id) {
        return postService.unpublish(id);
    }
}
