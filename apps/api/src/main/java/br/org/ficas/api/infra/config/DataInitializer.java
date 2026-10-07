package br.org.ficas.api.infra.config;

import br.org.ficas.api.infra.repository.CategoryRepository;
import br.org.ficas.api.infra.repository.MenuItemRepository;
import br.org.ficas.api.infra.repository.SiteSettingRepository;
import br.org.ficas.api.infra.repository.UserRepository;
import br.org.ficas.api.model.entity.Category;
import br.org.ficas.api.model.entity.MenuItem;
import br.org.ficas.api.model.entity.SiteSetting;
import br.org.ficas.api.model.entity.User;
import br.org.ficas.api.model.enums.Role;
import br.org.ficas.api.service.SiteSettingService;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Idempotent bootstrap of the data the MVP requires: admin user, singleton settings, base
 * categories and the initial navigation menu.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private static final List<String[]> CATEGORIES = List.of(
            new String[] {"noticias", "Notícias", "Novidades e comunicados do FICAS"},
            new String[] {"projetos", "Projetos", "Projetos e iniciativas"},
            new String[] {"editais", "Editais", "Editais e chamadas públicas"});

    /** Parent groups have no dedicated page; {@code #} keeps the anchor non-navigable. */

    private static final List<MenuGroup> MENU = List.of(
            new MenuGroup("Institucional", "#", List.of(
                    new MenuSeed("História", "/historia"),
                    new MenuSeed("Filosofia", "/filosofia"),
                    new MenuSeed("Metodologia", "/metodologia"),
                    new MenuSeed("Conselhos", "/conselhos"),
                    new MenuSeed("Equipe", "/equipe"),
                    new MenuSeed("Balanço", "/balanco"),
                    new MenuSeed("Homenagem", "/homenagem"))),
            new MenuGroup("Atuação", "#", List.of(
                    new MenuSeed("Atuação", "/atuacao"),
                    new MenuSeed("Programas", "/programas"),
                    new MenuSeed("Assessorias", "/assessorias"),
                    new MenuSeed("Ações", "/acoes"),
                    new MenuSeed("Parceiros", "/parceiros"))),
            new MenuGroup("Publicações", "#", List.of(
                    new MenuSeed("Biblioteca Magui Gioielli", "/biblioteca"),
                    new MenuSeed("Publicações", "/publicacoes"),
                    new MenuSeed("Relatórios de Atividades", "/relatorios-de-atividades"),
                    new MenuSeed("Artigos e Textos", "/artigos-e-textos"),
                    new MenuSeed("Leituras Recomendadas", "/leituras-recomendadas"),
                    new MenuSeed("Multimídia", "/multimidia"))),
            new MenuGroup("Notícias", "#", List.of(
                    new MenuSeed("Últimas notícias", "/noticias"),
                    new MenuSeed("FICAS em Ação", "/ficas-em-acao"),
                    new MenuSeed("Dicas FICAS", "/dicas-ficas"))),
            new MenuGroup("Contato", "/contato", List.of()));

    private final UserRepository userRepository;
    private final SiteSettingRepository siteSettingRepository;
    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    public DataInitializer(UserRepository userRepository, SiteSettingRepository siteSettingRepository,
                           CategoryRepository categoryRepository, MenuItemRepository menuItemRepository,
                           PasswordEncoder passwordEncoder, AppProperties properties) {
        this.userRepository = userRepository;
        this.siteSettingRepository = siteSettingRepository;
        this.categoryRepository = categoryRepository;
        this.menuItemRepository = menuItemRepository;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedAdmin();
        seedSettings();
        seedCategories();
        seedMenu();
    }

    private void seedAdmin() {
        String email = properties.seed().adminEmail();
        if (userRepository.existsByEmail(email)) {
            return;
        }
        User admin = new User(
                properties.seed().adminName(),
                email,
                passwordEncoder.encode(properties.seed().adminPassword()),
                Role.ADMIN);
        userRepository.save(admin);
        log.info("seed_admin_created email={}", email);
    }

    private void seedSettings() {
        if (siteSettingRepository.existsById(SiteSetting.SINGLETON_ID)) {
            return;
        }
        siteSettingRepository.save(SiteSettingService.defaultSetting());
        log.info("seed_site_settings_created");
    }

    private void seedCategories() {
        for (String[] category : CATEGORIES) {
            if (!categoryRepository.existsBySlug(category[0])) {
                categoryRepository.save(new Category(category[0], category[1], category[2], 0));
                log.info("seed_category_created slug={}", category[0]);
            }
        }
    }

    private void seedMenu() {
        if (menuItemRepository.count() > 0) {
            return;
        }
        int total = 0;
        int groupOrder = 0;
        for (MenuGroup group : MENU) {
            MenuItem parent = new MenuItem();
            parent.setLabel(group.label());
            parent.setUrl(group.url());
            parent.setTarget("_self");
            parent.setSortOrder(groupOrder++);
            parent.setParent(null);
            MenuItem savedParent = menuItemRepository.save(parent);
            total++;

            int childOrder = 0;
            for (MenuSeed child : group.children()) {
                MenuItem item = new MenuItem();
                item.setLabel(child.label());
                item.setUrl(child.url());
                item.setTarget("_self");
                item.setSortOrder(childOrder++);
                item.setParent(savedParent);
                menuItemRepository.save(item);
                total++;
            }
        }
        log.info("seed_menu_created groups={} items={}", MENU.size(), total);
    }

    /** A top-level navigation entry and its ordered children (empty = a plain link). */
    private record MenuGroup(String label, String url, List<MenuSeed> children) {
    }

    /** A navigation leaf (label + route). */
    private record MenuSeed(String label, String url) {
    }
}
