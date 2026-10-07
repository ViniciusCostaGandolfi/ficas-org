package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.BadRequestException;
import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.CategoryRepository;
import br.org.ficas.api.infra.repository.MediaRepository;
import br.org.ficas.api.infra.repository.PostRepository;
import br.org.ficas.api.infra.repository.TagRepository;
import br.org.ficas.api.dto.post.AdminPostDto;
import br.org.ficas.api.dto.post.AdminPostSummaryDto;
import br.org.ficas.api.dto.post.AuthorRef;
import br.org.ficas.api.dto.post.PostDto;
import br.org.ficas.api.dto.post.PostSummaryDto;
import br.org.ficas.api.dto.post.PostUpsertRequest;
import br.org.ficas.api.model.entity.Category;
import br.org.ficas.api.model.entity.MediaAsset;
import br.org.ficas.api.model.entity.Post;
import br.org.ficas.api.model.entity.Tag;
import br.org.ficas.api.model.entity.User;
import br.org.ficas.api.model.enums.ContentFormat;
import br.org.ficas.api.model.enums.ContentStatus;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PostService {

    private final PostRepository postRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final MediaRepository mediaRepository;
    private final UserService userService;

    public PostService(PostRepository postRepository, CategoryRepository categoryRepository,
                       TagRepository tagRepository, MediaRepository mediaRepository, UserService userService) {
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
        this.tagRepository = tagRepository;
        this.mediaRepository = mediaRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public Page<PostSummaryDto> listPublic(int page, int size, String category, String q) {
        return search(pageable(page, size), ContentStatus.PUBLISHED, category, q).map(PostService::toSummary);
    }

    @Transactional(readOnly = true)
    public PostDto getPublicBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .filter(p -> p.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> new NotFoundException("Post not found: " + slug));
        return toDto(post);
    }

    @Transactional(readOnly = true)
    public Page<AdminPostSummaryDto> listAdmin(int page, int size, String q, String status, String category) {
        ContentStatus statusFilter = parseStatus(status);
        return search(pageable(page, size), statusFilter, category, q).map(PostService::toAdminSummary);
    }

    @Transactional(readOnly = true)
    public AdminPostDto getAdmin(Long id) {
        return toAdminDto(require(id));
    }

    @Transactional
    public AdminPostDto create(PostUpsertRequest request, Long authorId) {
        if (postRepository.existsBySlug(request.slug())) {
            throw new ConflictException("Slug already in use: " + request.slug());
        }
        User author = userService.require(authorId);
        Post post = new Post();
        post.setAuthor(author);
        apply(post, request);
        return toAdminDto(postRepository.save(post));
    }

    @Transactional
    public AdminPostDto update(Long id, PostUpsertRequest request) {
        Post post = require(id);
        postRepository.findBySlug(request.slug())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Slug already in use: " + request.slug());
                });
        apply(post, request);
        return toAdminDto(post);
    }

    @Transactional
    public void delete(Long id) {
        postRepository.delete(require(id));
    }

    @Transactional
    public AdminPostDto publish(Long id) {
        Post post = require(id);
        post.setStatus(ContentStatus.PUBLISHED);
        if (post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        }
        return toAdminDto(post);
    }

    @Transactional
    public AdminPostDto unpublish(Long id) {
        Post post = require(id);
        post.setStatus(ContentStatus.DRAFT);
        return toAdminDto(post);
    }

    private void apply(Post post, PostUpsertRequest request) {
        post.setTitle(request.title());
        post.setSlug(request.slug());
        post.setExcerpt(request.excerpt());
        post.setContent(request.content());
        post.setContentFormat(parseContentFormat(request.contentFormat()));
        post.setSeoTitle(request.seoTitle());
        post.setSeoDescription(request.seoDescription());
        post.setCategory(resolveCategory(request.categoryId()));
        post.setCoverMedia(resolveCover(request.coverMediaId()));
        post.setTags(resolveTags(request.tagIds()));
        ContentStatus status = request.status() == null ? ContentStatus.DRAFT : request.status();
        post.setStatus(status);
        if (request.publishedAt() != null) {
            post.setPublishedAt(request.publishedAt());
        } else if (status == ContentStatus.PUBLISHED && post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        }
    }

    private Category resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> NotFoundException.of("Category", categoryId));
    }

    private MediaAsset resolveCover(Long coverMediaId) {
        if (coverMediaId == null) {
            return null;
        }
        return mediaRepository.findById(coverMediaId)
                .orElseThrow(() -> NotFoundException.of("Media", coverMediaId));
    }

    private Set<Tag> resolveTags(List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return new HashSet<>();
        }
        List<Tag> found = tagRepository.findAllById(new HashSet<>(tagIds));
        if (found.size() != new HashSet<>(tagIds).size()) {
            throw new NotFoundException("One or more tags were not found");
        }
        return new HashSet<>(found);
    }

    private Page<Post> search(Pageable pageable, ContentStatus status, String category, String q) {
        Long catId = null;
        String catSlug = null;
        if (category != null && !category.isBlank()) {
            String trimmed = category.trim();
            try {
                catId = Long.valueOf(trimmed);
            } catch (NumberFormatException ex) {
                catSlug = trimmed;
            }
        }
        String query = (q == null || q.isBlank()) ? null : q.trim();
        String qLike = query == null ? null : "%" + query.toLowerCase(Locale.ROOT) + "%";
        return postRepository.search(query, qLike, status, catId, catSlug, pageable);
    }

    private static Pageable pageable(int page, int size) {
        Sort sort = Sort.by(
                new Sort.Order(Sort.Direction.DESC, "publishedAt").nullsLast(),
                new Sort.Order(Sort.Direction.DESC, "id"));
        return PageRequest.of(page, size, sort);
    }

    private static ContentStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ContentStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid status: " + status);
        }
    }

    /** Null/blank defaults to {@link ContentFormat#HTML}; an unknown value is a 400. */
    private static ContentFormat parseContentFormat(String contentFormat) {
        if (contentFormat == null || contentFormat.isBlank()) {
            return ContentFormat.HTML;
        }
        try {
            return ContentFormat.valueOf(contentFormat.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid contentFormat: " + contentFormat);
        }
    }

    @Transactional(readOnly = true)
    public Post require(Long id) {
        return postRepository.findById(id).orElseThrow(() -> NotFoundException.of("Post", id));
    }

    public static PostSummaryDto toSummary(Post post) {
        return new PostSummaryDto(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getCoverMedia() == null ? null : post.getCoverMedia().getUrl(),
                CategoryService.toRef(post.getCategory()),
                post.getTags().stream()
                        .sorted(Comparator.comparing(Tag::getName))
                        .map(TagService::toDto)
                        .toList(),
                post.getAuthor() == null ? null : new AuthorRef(post.getAuthor().getId(), post.getAuthor().getName()),
                post.getPublishedAt());
    }

    public static PostDto toDto(Post post) {
        return new PostDto(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                post.getCoverMedia() == null ? null : post.getCoverMedia().getUrl(),
                CategoryService.toRef(post.getCategory()),
                post.getTags().stream()
                        .sorted(Comparator.comparing(Tag::getName))
                        .map(TagService::toDto)
                        .toList(),
                post.getAuthor() == null ? null : new AuthorRef(post.getAuthor().getId(), post.getAuthor().getName()),
                post.getPublishedAt(),
                post.getContent(),
                post.getContentFormat().name(),
                post.getSeoTitle(),
                post.getSeoDescription(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    public static AdminPostSummaryDto toAdminSummary(Post post) {
        List<Tag> tags = sortedTags(post);
        return new AdminPostSummaryDto(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                coverUrl(post),
                coverId(post),
                CategoryService.toRef(post.getCategory()),
                categoryId(post),
                tags.stream().map(TagService::toDto).toList(),
                tags.stream().map(Tag::getId).toList(),
                authorRef(post),
                post.getStatus(),
                post.getPublishedAt());
    }

    public static AdminPostDto toAdminDto(Post post) {
        List<Tag> tags = sortedTags(post);
        return new AdminPostDto(
                post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getExcerpt(),
                coverUrl(post),
                coverId(post),
                CategoryService.toRef(post.getCategory()),
                categoryId(post),
                tags.stream().map(TagService::toDto).toList(),
                tags.stream().map(Tag::getId).toList(),
                authorRef(post),
                post.getStatus(),
                post.getPublishedAt(),
                post.getContent(),
                post.getContentFormat().name(),
                post.getSeoTitle(),
                post.getSeoDescription(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    private static List<Tag> sortedTags(Post post) {
        return post.getTags().stream().sorted(Comparator.comparing(Tag::getName)).toList();
    }

    private static String coverUrl(Post post) {
        return post.getCoverMedia() == null ? null : post.getCoverMedia().getUrl();
    }

    private static Long coverId(Post post) {
        return post.getCoverMedia() == null ? null : post.getCoverMedia().getId();
    }

    private static Long categoryId(Post post) {
        return post.getCategory() == null ? null : post.getCategory().getId();
    }

    private static AuthorRef authorRef(Post post) {
        return post.getAuthor() == null ? null
                : new AuthorRef(post.getAuthor().getId(), post.getAuthor().getName());
    }
}
