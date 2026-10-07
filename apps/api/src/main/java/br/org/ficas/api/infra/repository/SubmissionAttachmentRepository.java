package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.SubmissionAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionAttachmentRepository extends JpaRepository<SubmissionAttachment, Long> {
}
