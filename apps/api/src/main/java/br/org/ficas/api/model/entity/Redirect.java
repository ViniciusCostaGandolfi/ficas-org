package br.org.ficas.api.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** WordPress import redirect ({@code redirects}), applied by the web lane. */
@Entity
@Table(name = "redirects")
public class Redirect {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "from_path", nullable = false, unique = true, length = 500)
    private String fromPath;

    @Column(name = "to_path", nullable = false, length = 500)
    private String toPath;

    @Column(name = "status_code", nullable = false)
    private int statusCode = 301;

    protected Redirect() {
    }

    public Redirect(String fromPath, String toPath, int statusCode) {
        this.fromPath = fromPath;
        this.toPath = toPath;
        this.statusCode = statusCode;
    }

    public Long getId() {
        return id;
    }

    public String getFromPath() {
        return fromPath;
    }

    public String getToPath() {
        return toPath;
    }

    public int getStatusCode() {
        return statusCode;
    }
}
