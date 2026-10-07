package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.SiteSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteSettingRepository extends JpaRepository<SiteSetting, Short> {
}
