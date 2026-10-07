package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.TagRepository;
import br.org.ficas.api.dto.tag.TagDto;
import br.org.ficas.api.dto.tag.TagUpsertRequest;
import br.org.ficas.api.model.entity.Tag;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TagService {

    private final TagRepository tagRepository;

    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public List<TagDto> list() {
        return tagRepository.findAllByOrderByNameAsc().stream().map(TagService::toDto).toList();
    }

    @Transactional
    public TagDto create(TagUpsertRequest request) {
        if (tagRepository.existsBySlug(request.slug())) {
            throw new ConflictException("Slug already in use: " + request.slug());
        }
        return toDto(tagRepository.save(new Tag(request.slug(), request.name())));
    }

    @Transactional
    public TagDto update(Long id, TagUpsertRequest request) {
        Tag tag = require(id);
        tagRepository.findBySlug(request.slug())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Slug already in use: " + request.slug());
                });
        tag.setSlug(request.slug());
        tag.setName(request.name());
        return toDto(tag);
    }

    @Transactional
    public void delete(Long id) {
        tagRepository.delete(require(id));
    }

    @Transactional(readOnly = true)
    public Tag require(Long id) {
        return tagRepository.findById(id).orElseThrow(() -> NotFoundException.of("Tag", id));
    }

    public static TagDto toDto(Tag tag) {
        return new TagDto(tag.getId(), tag.getSlug(), tag.getName());
    }
}
