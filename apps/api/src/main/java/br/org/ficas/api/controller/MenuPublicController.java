package br.org.ficas.api.controller;

import br.org.ficas.api.dto.menu.MenuItemDto;
import br.org.ficas.api.service.MenuService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/menu")
public class MenuPublicController {

    private final MenuService menuService;

    public MenuPublicController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public List<MenuItemDto> menu() {
        return menuService.publicTree();
    }
}
