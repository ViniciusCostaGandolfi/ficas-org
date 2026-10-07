package br.org.ficas.api.controller;

import br.org.ficas.api.dto.menu.AdminMenuItemDto;
import br.org.ficas.api.dto.menu.MenuItemUpsertRequest;
import br.org.ficas.api.service.MenuService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/menu")
public class MenuAdminController {

    private final MenuService menuService;

    public MenuAdminController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public List<AdminMenuItemDto> get() {
        return menuService.adminTree();
    }

    @PutMapping
    public List<AdminMenuItemDto> replace(@Valid @RequestBody List<MenuItemUpsertRequest> items) {
        return menuService.replaceAll(items);
    }
}
