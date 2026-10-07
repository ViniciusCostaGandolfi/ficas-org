package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.Campaign;
import br.org.ficas.api.model.enums.ContentStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    Optional<Campaign> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Page<Campaign> findByStatus(ContentStatus status, Pageable pageable);

    @Query("""
            select c from Campaign c
            where (:q is null or lower(c.title) like :qLike or lower(c.slug) like :qLike)
              and (:status is null or c.status = :status)
            """)
    Page<Campaign> search(@Param("q") String q,
                          @Param("qLike") String qLike,
                          @Param("status") ContentStatus status,
                          Pageable pageable);
}
