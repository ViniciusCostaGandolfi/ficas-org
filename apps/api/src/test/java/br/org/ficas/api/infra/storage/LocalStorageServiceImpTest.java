package br.org.ficas.api.infra.storage;

import br.org.ficas.api.infra.config.AppProperties;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the local-disk {@link br.org.ficas.api.infra.storage.StorageService} provider. */
class LocalStorageServiceImpTest {

    private static AppProperties properties(Path dir) {
        return new AppProperties(null, null, null, null,
                new AppProperties.Storage(dir.toString(), "local"), null);
    }

    @Test
    void putGetDeleteRoundTrip(@TempDir Path dir) {
        LocalStorageServiceImp storage = new LocalStorageServiceImp(properties(dir));
        byte[] bytes = "conteúdo".getBytes(StandardCharsets.UTF_8);
        String key = "2026/10/foto.png";

        storage.put(new ByteArrayInputStream(bytes), bytes.length, key, "image/png");

        assertThat(Path.of(dir.toString(), key)).exists();
        StoredObject object = storage.get(key);
        assertThat(object.contentType()).isEqualTo("image/png");
        assertThat(object.contentLength()).isEqualTo(bytes.length);
        assertThat(storage.publicUrl(key)).isEqualTo("/media/" + key);
        assertThat(storage.isEnabled()).isTrue();

        storage.delete(key);
        assertThat(Path.of(dir.toString(), key)).doesNotExist();
    }

    @Test
    void rejectsPathTraversal(@TempDir Path dir) {
        LocalStorageServiceImp storage = new LocalStorageServiceImp(properties(dir));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> storage.get("../../etc/passwd"))
                .isInstanceOf(br.org.ficas.api.infra.exception.BadRequestException.class);
    }
}
