package br.org.ficas.api.service;

import br.org.ficas.api.infra.exception.ConflictException;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.CategoryRepository;
import br.org.ficas.api.dto.category.CategoryDto;
import br.org.ficas.api.dto.category.CategoryRef;
import br.org.ficas.api.dto.category.CategoryUpsertRequest;
import br.org.ficas.api.model.entity.Category;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> list() {
        return categoryRepository.findAllByOrderBySortOrderAscIdAsc().stream()
                .map(CategoryService::toDto)
                .toList();
    }

    @Transactional
    public CategoryDto create(CategoryUpsertRequest request) {
        if (categoryRepository.existsBySlug(request.slug())) {
            throw new ConflictException("Slug already in use: " + request.slug());
        }
        Category category = new Category(request.slug(), request.name(), request.description(),
                request.sortOrder() == null ? 0 : request.sortOrder());
        return toDto(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDto update(Long id, CategoryUpsertRequest request) {
        Category category = require(id);
        categoryRepository.findBySlug(request.slug())
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new ConflictException("Slug already in use: " + request.slug());
                });
        category.setSlug(request.slug());
        category.setName(request.name());
        category.setDescription(request.description());
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }
        return toDto(category);
    }

    @Transactional
    public void delete(Long id) {
        categoryRepository.delete(require(id));
    }

    @Transactional(readOnly = true)
    public Category require(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> NotFoundException.of("Category", id));
    }

    public static CategoryDto toDto(Category category) {
        return new CategoryDto(category.getId(), category.getSlug(), category.getName(), category.getDescription());
    }

    public static CategoryRef toRef(Category category) {
        return category == null ? null
                : new CategoryRef(category.getId(), category.getSlug(), category.getName());
    }
}
