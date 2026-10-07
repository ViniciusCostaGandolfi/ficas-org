package br.org.ficas.api.service;

import br.org.ficas.api.infra.repository.MenuItemRepository;
import br.org.ficas.api.dto.menu.AdminMenuItemDto;
import br.org.ficas.api.dto.menu.MenuItemDto;
import br.org.ficas.api.dto.menu.MenuItemUpsertRequest;
import br.org.ficas.api.model.entity.MenuItem;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuService {

    private static final String DEFAULT_TARGET = "_self";

    private final MenuItemRepository menuItemRepository;

    public MenuService(MenuItemRepository menuItemRepository) {
        this.menuItemRepository = menuItemRepository;
    }

    @Transactional(readOnly = true)
    public List<MenuItemDto> publicTree() {
        TreeIndex index = index();
        return index.roots().stream().map(item -> toPublic(item, index)).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminMenuItemDto> adminTree() {
        TreeIndex index = index();
        return index.roots().stream().map(item -> toAdmin(item, index)).toList();
    }

    @Transactional
    public List<AdminMenuItemDto> replaceAll(List<MenuItemUpsertRequest> items) {
        menuItemRepository.deleteAllInBatch();
        menuItemRepository.flush();
        if (items != null) {
            items.forEach(item -> persist(item, null));
        }
        return adminTree();
    }

    private MenuItem persist(MenuItemUpsertRequest request, MenuItem parent) {
        MenuItem item = new MenuItem();
        item.setLabel(request.label());
        item.setUrl(request.url());
        item.setTarget(request.target() == null || request.target().isBlank() ? DEFAULT_TARGET : request.target());
        item.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        item.setParent(parent);
        MenuItem saved = menuItemRepository.save(item);
        if (request.children() != null) {
            request.children().forEach(child -> persist(child, saved));
        }
        return saved;
    }

    private TreeIndex index() {
        List<MenuItem> all = menuItemRepository.findAllByOrderBySortOrderAscIdAsc();
        Map<Long, List<MenuItem>> byParent = new HashMap<>();
        List<MenuItem> roots = new ArrayList<>();
        for (MenuItem item : all) {
            if (item.getParent() == null) {
                roots.add(item);
            } else {
                byParent.computeIfAbsent(item.getParent().getId(), key -> new ArrayList<>()).add(item);
            }
        }
        return new TreeIndex(roots, byParent);
    }

    private static MenuItemDto toPublic(MenuItem item, TreeIndex index) {
        List<MenuItemDto> children = index.children(item).stream().map(child -> toPublic(child, index)).toList();
        return new MenuItemDto(item.getId(), item.getLabel(), item.getUrl(), item.getTarget(), children);
    }

    private static AdminMenuItemDto toAdmin(MenuItem item, TreeIndex index) {
        Long parentId = item.getParent() == null ? null : item.getParent().getId();
        List<AdminMenuItemDto> children = index.children(item).stream().map(child -> toAdmin(child, index)).toList();
        return new AdminMenuItemDto(item.getId(), item.getLabel(), item.getUrl(), item.getTarget(),
                item.getSortOrder(), parentId, children);
    }

    private record TreeIndex(List<MenuItem> roots, Map<Long, List<MenuItem>> byParent) {
        List<MenuItem> children(MenuItem item) {
            return byParent.getOrDefault(item.getId(), List.of());
        }
    }
}
