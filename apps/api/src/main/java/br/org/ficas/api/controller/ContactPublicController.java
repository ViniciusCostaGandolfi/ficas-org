package br.org.ficas.api.controller;

import br.org.ficas.api.dto.lead.ContactLeadDto;
import br.org.ficas.api.dto.lead.ContactRequest;
import br.org.ficas.api.service.LeadService;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/contact")
public class ContactPublicController {

    private final LeadService leadService;

    public ContactPublicController(LeadService leadService) {
        this.leadService = leadService;
    }

    @PostMapping
    public ResponseEntity<ContactLeadDto> create(@Valid @RequestBody ContactRequest request) {
        ContactLeadDto created = leadService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/leads/" + created.id())).body(created);
    }
}
