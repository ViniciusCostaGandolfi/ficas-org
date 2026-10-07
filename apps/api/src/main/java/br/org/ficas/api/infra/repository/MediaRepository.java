package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.MediaAsset;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<MediaAsset, Long> {

    Page<MediaAsset> findByFilenameContainingIgnoreCaseOrAltContainingIgnoreCase(
            String filename, String alt, Pageable pageable);

    Optional<MediaAsset> findByUrl(String url);
}
