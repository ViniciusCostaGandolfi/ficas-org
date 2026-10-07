package br.org.ficas.api.infra.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Object-storage configuration bound from the {@code aws.*} namespace (see {@code .env.example}).
 *
 * <p>Mirrors the {@code authsoftsolutions/elder} + {@code daniel-juridico} house pattern: the same
 * {@code accessKey}/{@code secretKey}/{@code region} + nested {@code bucket.name} shape, extended
 * with MinIO support ({@code endpoint}/{@code pathStyle}) and an {@code enabled} toggle so the app
 * boots cleanly when S3/MinIO is not configured.
 *
 * @param accessKey S3/MinIO access key id (never hardcode; injected from env/secret manager)
 * @param secretKey S3/MinIO secret access key
 * @param region    AWS region, e.g. {@code us-east-1} (MinIO accepts any value)
 * @param enabled   when {@code false} the {@code S3Client}/{@code S3Presigner} beans are not created
 * @param endpoint  custom endpoint for MinIO/S3-compatible servers; when set it becomes the
 *                  {@code endpointOverride} (blank means talk to real AWS S3)
 * @param pathStyle when {@code true} use path-style addressing ({@code host/bucket/key}), which is
 *                  what MinIO expects; {@code false} uses virtual-host addressing
 * @param bucket    nested bucket configuration ({@code bucket.name})
 */
@ConfigurationProperties(prefix = "aws")
public record AwsProperties(
        String accessKey,
        String secretKey,
        @DefaultValue("us-east-1") String region,
        @DefaultValue("false") boolean enabled,
        String endpoint,
        @DefaultValue("true") boolean pathStyle,
        Bucket bucket) {

    /** Nested bucket block ({@code aws.bucket.name}). */
    public record Bucket(String name) {
    }

    /** {@code true} when a custom (MinIO/S3-compatible) endpoint is configured. */
    public boolean hasEndpoint() {
        return endpoint != null && !endpoint.isBlank();
    }

    /** The configured bucket name, or {@code null} when unset. */
    public String bucketName() {
        return bucket == null ? null : bucket.name();
    }
}
