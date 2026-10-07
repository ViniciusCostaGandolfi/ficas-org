package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.MenuItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {

    List<MenuItem> findAllByOrderBySortOrderAscIdAsc();
}
