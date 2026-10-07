package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.Redirect;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RedirectRepository extends JpaRepository<Redirect, Long> {

    Optional<Redirect> findByFromPath(String fromPath);

    boolean existsByFromPath(String fromPath);
}
