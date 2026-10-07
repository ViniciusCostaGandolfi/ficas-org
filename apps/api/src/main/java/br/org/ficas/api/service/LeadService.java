package br.org.ficas.api.service;

import br.org.ficas.api.infra.config.AppProperties;
import br.org.ficas.api.infra.exception.NotFoundException;
import br.org.ficas.api.infra.repository.ContactLeadRepository;
import br.org.ficas.api.dto.lead.ContactLeadDto;
import br.org.ficas.api.dto.lead.ContactRequest;
import br.org.ficas.api.model.entity.ContactLead;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeadService {

    private static final Logger log = LoggerFactory.getLogger(LeadService.class);

    private final ContactLeadRepository contactLeadRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppProperties properties;

    public LeadService(ContactLeadRepository contactLeadRepository,
                       ObjectProvider<JavaMailSender> mailSenderProvider,
                       AppProperties properties) {
        this.contactLeadRepository = contactLeadRepository;
        this.mailSenderProvider = mailSenderProvider;
        this.properties = properties;
    }

    @Transactional
    public ContactLeadDto create(ContactRequest request) {
        ContactLead lead = contactLeadRepository.save(new ContactLead(
                request.name(), request.email(), request.phone(), request.message(),
                request.source(), Boolean.TRUE.equals(request.consent())));
        notifyByEmail(lead);
        return toDto(lead);
    }

    @Transactional(readOnly = true)
    public Page<ContactLeadDto> list(Pageable pageable) {
        return contactLeadRepository.findAll(pageable).map(LeadService::toDto);
    }

    @Transactional
    public void delete(Long id) {
        ContactLead lead = contactLeadRepository.findById(id)
                .orElseThrow(() -> NotFoundException.of("Lead", id));
        contactLeadRepository.delete(lead);
    }

    private void notifyByEmail(ContactLead lead) {
        if (!properties.mail().enabled()) {
            log.debug("contact_mail_skipped_disabled leadId={}", lead.getId());
            return;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("contact_mail_enabled_but_sender_missing leadId={}", lead.getId());
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(properties.mail().to());
            message.setSubject("Novo contato: " + lead.getName());
            message.setText("""
                    Nome: %s
                    E-mail: %s
                    Telefone: %s
                    Origem: %s

                    %s
                    """.formatted(lead.getName(), lead.getEmail(), lead.getPhone(), lead.getSource(), lead.getMessage()));
            sender.send(message);
        } catch (MailException ex) {
            log.error("contact_mail_failed leadId={}", lead.getId(), ex);
        }
    }

    public static ContactLeadDto toDto(ContactLead lead) {
        return new ContactLeadDto(lead.getId(), lead.getName(), lead.getEmail(), lead.getPhone(),
                lead.getMessage(), lead.getSource(), lead.isConsent(), lead.getCreatedAt());
    }
}
