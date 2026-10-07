package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.PageEntity;
import br.org.ficas.api.model.enums.ContentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PageRepository extends JpaRepository<PageEntity, Long> {

    Optional<PageEntity> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<PageEntity> findByStatusOrderByMenuOrderAscIdAsc(ContentStatus status);

    @Query("""
            select p from PageEntity p
            where (:q is null or lower(p.title) like :qLike or lower(p.slug) like :qLike)
              and (:status is null or p.status = :status)
            """)
    Page<PageEntity> search(@Param("q") String q,
                            @Param("qLike") String qLike,
                            @Param("status") ContentStatus status,
                            Pageable pageable);
}
