package br.org.ficas.api.infra.config;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/**
 * Exposes {@link S3Client} and {@link S3Presigner} beans for the media storage layer.
 *
 * <p>Follows the {@code authsoftsolutions/daniel-juridico-back} evolution: the beans are created
 * only when {@code aws.enabled=true} ({@link ConditionalOnProperty}), credentials/bucket are
 * validated up front, and when {@code aws.endpoint} is set the client is pointed at a
 * MinIO/S3-compatible server with path-style addressing. Because the beans are absent (rather than
 * failing) when disabled, the API still boots with local-disk storage.
 */
@Configuration
@EnableConfigurationProperties(AwsProperties.class)
public class S3Config {

    @Bean
    @ConditionalOnProperty(prefix = "aws", name = "enabled", havingValue = "true")
    S3Client s3Client(AwsProperties properties) {
        validar(properties);
        var builder = S3Client.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.accessKey(), properties.secretKey())));
        if (properties.hasEndpoint()) {
            builder.endpointOverride(URI.create(properties.endpoint()))
                    .forcePathStyle(properties.pathStyle());
        }
        return builder.build();
    }

    @Bean
    @ConditionalOnProperty(prefix = "aws", name = "enabled", havingValue = "true")
    S3Presigner s3Presigner(AwsProperties properties) {
        validar(properties);
        var builder = S3Presigner.builder()
                .region(Region.of(properties.region()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.accessKey(), properties.secretKey())));
        if (properties.hasEndpoint()) {
            builder.endpointOverride(URI.create(properties.endpoint()))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(properties.pathStyle())
                            .build());
        }
        return builder.build();
    }

    /** Fails fast with a clear message instead of an opaque SDK error at first use. */
    private static void validar(AwsProperties properties) {
        if (properties.bucketName() == null || properties.bucketName().isBlank()) {
            throw new IllegalStateException("aws.bucket.name não configurado");
        }
        if (isBlank(properties.accessKey()) || isBlank(properties.secretKey())) {
            throw new IllegalStateException(
                    "Credenciais AWS ausentes. Configure aws.access-key e aws.secret-key.");
        }
        if (isBlank(properties.region())) {
            throw new IllegalStateException("aws.region não configurado");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
