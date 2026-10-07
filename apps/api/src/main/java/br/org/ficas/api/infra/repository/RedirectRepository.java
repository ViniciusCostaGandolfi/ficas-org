package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.Redirect;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RedirectRepository extends JpaRepository<Redirect, Long> {

    Optional<Redirect> findByFromPath(String fromPath);

    boolean existsByFromPath(String fromPath);

    /** Returns which of the given {@code from_path} values already exist (used to split insert/update counts). */
    @Query("select r.fromPath from Redirect r where r.fromPath in :fromPaths")
    List<String> findExistingFromPaths(@Param("fromPaths") Collection<String> fromPaths);

    /** Admin listing; {@code qLike} is a pre-lowered {@code %contains%} pattern, or {@code null} for all. */
    @Query("select r from Redirect r where (:qLike is null or lower(r.fromPath) like :qLike)")
    Page<Redirect> search(@Param("qLike") String qLike, Pageable pageable);

    /** Idempotent PostgreSQL upsert keyed on the unique {@code from_path}. */
    @Modifying
    @Query(value = """
            insert into redirects (from_path, to_path, status_code)
            values (:fromPath, :toPath, :statusCode)
            on conflict (from_path) do update
            set to_path = excluded.to_path,
                status_code = excluded.status_code
            """, nativeQuery = true)
    void upsert(@Param("fromPath") String fromPath,
                @Param("toPath") String toPath,
                @Param("statusCode") int statusCode);
}
