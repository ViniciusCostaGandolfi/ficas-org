package br.org.ficas.api.infra.storage;

import br.org.ficas.api.infra.config.AwsProperties;
import br.org.ficas.api.infra.exception.NotFoundException;
import java.io.ByteArrayInputStream;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the S3/MinIO {@link br.org.ficas.api.infra.storage.StorageService} provider, exercised
 * without a live MinIO: key/URL mapping, the graceful disabled path, and request shaping against a
 * mocked {@link S3Client}.
 */
class S3StorageServiceImpTest {

    private static AwsProperties enabledProperties() {
        return new AwsProperties("access", "secret", "us-east-1", true,
                "http://localhost:9000", true, new AwsProperties.Bucket("ficas-media"));
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<S3Client> providerReturning(S3Client client) {
        ObjectProvider<S3Client> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(client);
        return provider;
    }

    @Test
    void publicUrlMapsKeyToMediaPath() {
        S3StorageServiceImp storage = new S3StorageServiceImp(
                enabledProperties(), providerReturning(mock(S3Client.class)));
        assertThat(storage.publicUrl("import/abc123.jpg")).isEqualTo("/media/import/abc123.jpg");
    }

    @Test
    void disabledWhenNoClientIsAvailable() {
        S3StorageServiceImp storage = new S3StorageServiceImp(
                enabledProperties(), providerReturning(null));

        assertThat(storage.isEnabled()).isFalse();
        assertThat(storage.publicUrl("import/x.png")).isEqualTo("/media/import/x.png");
        assertThatThrownBy(() -> storage.put(new ByteArrayInputStream(new byte[]{1}), 1, "a.png", "image/png"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("indisponível");
    }

    @Test
    void putSendsBucketKeyAndContentType() {
        S3Client client = mock(S3Client.class);
        S3StorageServiceImp storage = new S3StorageServiceImp(enabledProperties(), providerReturning(client));
        byte[] bytes = {1, 2, 3};

        String key = storage.put(new ByteArrayInputStream(bytes), bytes.length, "import/x.png", "image/png");

        assertThat(key).isEqualTo("import/x.png");
        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(client).putObject(captor.capture(), any(RequestBody.class));
        assertThat(captor.getValue().bucket()).isEqualTo("ficas-media");
        assertThat(captor.getValue().key()).isEqualTo("import/x.png");
        assertThat(captor.getValue().contentType()).isEqualTo("image/png");
    }

    @Test
    void getMapsBytesAndContentType() {
        S3Client client = mock(S3Client.class);
        S3StorageServiceImp storage = new S3StorageServiceImp(enabledProperties(), providerReturning(client));
        byte[] bytes = {9, 8, 7};
        GetObjectResponse response = GetObjectResponse.builder()
                .contentType("image/jpeg")
                .contentLength((long) bytes.length)
                .build();
        when(client.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenReturn(ResponseBytes.fromByteArray(response, bytes));

        StoredObject object = storage.get("import/x.jpg");

        assertThat(object.contentType()).isEqualTo("image/jpeg");
        assertThat(object.contentLength()).isEqualTo(bytes.length);
        verify(client).getObjectAsBytes(any(GetObjectRequest.class));
    }

    @Test
    void missingKeyMapsToNotFound() {
        S3Client client = mock(S3Client.class);
        S3StorageServiceImp storage = new S3StorageServiceImp(enabledProperties(), providerReturning(client));
        when(client.getObjectAsBytes(any(GetObjectRequest.class)))
                .thenThrow(S3Exception.builder().statusCode(404).message("not found").build());

        assertThatThrownBy(() -> storage.get("missing.png")).isInstanceOf(NotFoundException.class);
    }

    @Test
    void deleteSendsBucketAndKeyWhenEnabled() {
        S3Client client = mock(S3Client.class);
        S3StorageServiceImp storage = new S3StorageServiceImp(enabledProperties(), providerReturning(client));

        storage.delete("import/old.png");

        ArgumentCaptor<software.amazon.awssdk.services.s3.model.DeleteObjectRequest> captor =
                ArgumentCaptor.forClass(software.amazon.awssdk.services.s3.model.DeleteObjectRequest.class);
        verify(client).deleteObject(captor.capture());
        assertThat(captor.getValue().bucket()).isEqualTo("ficas-media");
        assertThat(captor.getValue().key()).isEqualTo("import/old.png");
    }
}
