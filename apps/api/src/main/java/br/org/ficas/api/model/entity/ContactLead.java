package br.org.ficas.api.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

/** Contact lead ({@code contact_leads}). */
@Entity
@Table(name = "contact_leads")
@EntityListeners(AuditingEntityListener.class)
public class ContactLead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(length = 50)
    private String phone;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(length = 100)
    private String source;

    @Column(nullable = false)
    private boolean consent;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ContactLead() {
    }

    public ContactLead(String name, String email, String phone, String message, String source, boolean consent) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.message = message;
        this.source = source;
        this.consent = consent;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public String getMessage() {
        return message;
    }

    public String getSource() {
        return source;
    }

    public boolean isConsent() {
        return consent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
