package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.Post;
import br.org.ficas.api.model.enums.ContentStatus;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostRepository extends JpaRepository<Post, Long> {

    Optional<Post> findBySlug(String slug);

    boolean existsBySlug(String slug);

    @Query("""
            select p from Post p
            left join p.category c
            where (:q is null
                    or lower(p.title) like :qLike
                    or lower(coalesce(p.excerpt, '')) like :qLike)
              and (:status is null or p.status = :status)
              and (:catId is null or c.id = :catId)
              and (:catSlug is null or c.slug = :catSlug)
            """)
    Page<Post> search(@Param("q") String q,
                      @Param("qLike") String qLike,
                      @Param("status") ContentStatus status,
                      @Param("catId") Long catId,
                      @Param("catSlug") String catSlug,
                      Pageable pageable);
}
