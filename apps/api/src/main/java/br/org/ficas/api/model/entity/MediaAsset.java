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

/** Uploaded media asset ({@code media_assets}). */
@Entity
@Table(name = "media_assets")
@EntityListeners(AuditingEntityListener.class)
public class MediaAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String filename;

    @Column(nullable = false, unique = true, length = 500)
    private String url;

    @Column(name = "mime_type", nullable = false, length = 120)
    private String mimeType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(length = 500)
    private String alt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected MediaAsset() {
    }

    public MediaAsset(String filename, String url, String mimeType, long sizeBytes, String alt) {
        this.filename = filename;
        this.url = url;
        this.mimeType = mimeType;
        this.sizeBytes = sizeBytes;
        this.alt = alt;
    }

    public Long getId() {
        return id;
    }

    public String getFilename() {
        return filename;
    }

    public String getUrl() {
        return url;
    }

    public String getMimeType() {
        return mimeType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public String getAlt() {
        return alt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
