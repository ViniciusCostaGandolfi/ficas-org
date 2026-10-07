package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.CampaignSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CampaignSubmissionRepository extends JpaRepository<CampaignSubmission, Long> {
}
