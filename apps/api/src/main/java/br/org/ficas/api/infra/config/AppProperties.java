package br.org.ficas.api.infra.config;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Strongly typed application configuration, bound from the {@code app.*} namespace
 * (see {@code .env.example} for the environment variable mapping).
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Jwt jwt,
        Cors cors,
        Seed seed,
        Mail mail,
        Storage storage,
        Cookie cookie) {

    /** JWT signing/expiry configuration. */
    public record Jwt(String secret, Duration ttl) {
    }

    /** CORS configuration. {@code allowedOrigins} is a comma-separated list. */
    public record Cors(String allowedOrigins) {
        public List<String> allowedOriginList() {
            if (allowedOrigins == null || allowedOrigins.isBlank()) {
                return List.of();
            }
            return Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
    }

    /** Bootstrap administrator seed. */
    public record Seed(String adminEmail, String adminPassword, String adminName) {
    }

    /** Outbound e-mail configuration. When {@code enabled} is false, e-mails are only persisted. */
    public record Mail(boolean enabled, String host, int port, String username, String password, String to) {
    }

    /**
     * Media storage configuration.
     *
     * @param localDir root directory used by the local-disk provider
     * @param provider which {@code StorageService} to activate: {@code local} (default, disk) or
     *                 {@code s3} (AWS S3 / MinIO via the AWS SDK)
     */
    public record Storage(String localDir, @DefaultValue("local") String provider) {
    }

    /** Auth cookie flags. */
    public record Cookie(boolean secure) {
    }
}
