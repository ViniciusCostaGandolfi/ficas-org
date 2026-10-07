package br.org.ficas.api.infra.storage;

import br.org.ficas.api.infra.config.AwsProperties;
import br.org.ficas.api.infra.exception.NotFoundException;
import java.io.InputStream;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * S3/MinIO {@link StorageService}, selected with {@code app.storage.provider=s3}.
 *
 * <p>Mirrors the elder/daniel house pattern: constructor injection via {@link ObjectProvider} so the
 * bean still constructs (and the app still boots) when {@code aws.enabled=false} and the
 * {@code S3Client} bean is absent; a missing bucket is auto-created on first write; reads throw the
 * domain {@code NotFoundException} for a missing key so the {@code /media/**} proxy answers 404.
 */
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "provider", havingValue = "s3")
public class S3StorageServiceImp implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageServiceImp.class);

    private final AwsProperties properties;
    private final S3Client s3Client;

    public S3StorageServiceImp(AwsProperties properties, ObjectProvider<S3Client> s3ClientProvider) {
        this.properties = properties;
        this.s3Client = s3ClientProvider.getIfAvailable();
    }

    @Override
    public boolean isEnabled() {
        return properties.enabled() && s3Client != null
                && properties.bucketName() != null && !properties.bucketName().isBlank();
    }

    @Override
    public String put(InputStream in, long size, String key, String contentType) {
        garantirCliente();
        ensureBucket();
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(key)
                .contentType(contentType)
                .build();
        try {
            s3Client.putObject(request, RequestBody.fromInputStream(in, size));
        } catch (S3Exception ex) {
            throw new IllegalStateException("S3 upload failed for key: " + key, ex);
        }
        return key;
    }

    @Override
    public StoredObject get(String key) {
        garantirCliente();
        try {
            ResponseBytes<GetObjectResponse> object = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                    .bucket(properties.bucketName())
                    .key(key)
                    .build());
            String contentType = object.response().contentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = mimeForKey(key);
            }
            return new StoredObject(new ByteArrayResource(object.asByteArray()), contentType,
                    object.response().contentLength());
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                throw NotFoundException.of("Media", key);
            }
            throw new IllegalStateException("S3 read failed for key: " + key, ex);
        }
    }

    @Override
    public void delete(String key) {
        if (!isEnabled()) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(properties.bucketName())
                    .key(key)
                    .build());
        } catch (S3Exception ex) {
            log.warn("s3_delete_failed key={} status={}", key, ex.statusCode(), ex);
        }
    }

    @Override
    public String publicUrl(String key) {
        return "/media/" + key;
    }

    private void garantirCliente() {
        if (!isEnabled()) {
            throw new IllegalStateException(
                    "Armazenamento S3/MinIO indisponível. Verifique aws.enabled, aws.bucket.name e as credenciais.");
        }
    }

    /** Creates the media bucket on first write when it does not exist yet (idempotent). */
    private void ensureBucket() {
        String bucket = properties.bucketName();
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception ex) {
            if (ex.statusCode() != 404) {
                throw ex;
            }
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("s3_bucket_created name={}", bucket);
            } catch (S3Exception createFailure) {
                log.warn("s3_bucket_create_failed name={} message={}", bucket, createFailure.getMessage());
            }
        }
    }

    private static String mimeForKey(String key) {
        String name = key.toLowerCase(Locale.ROOT);
        if (name.endsWith(".png")) {
            return "image/png";
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (name.endsWith(".gif")) {
            return "image/gif";
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        if (name.endsWith(".pdf")) {
            return "application/pdf";
        }
        return "application/octet-stream";
    }
}
