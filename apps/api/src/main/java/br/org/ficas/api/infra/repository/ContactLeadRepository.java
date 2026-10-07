package br.org.ficas.api.infra.repository;

import br.org.ficas.api.model.entity.ContactLead;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactLeadRepository extends JpaRepository<ContactLead, Long> {
}
