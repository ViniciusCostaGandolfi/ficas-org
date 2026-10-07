package br.org.ficas.api.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit test for the stored-key/URL mapping helpers used by {@link MediaService}. */
class MediaServiceTest {

    @Test
    void keyFromUrlExtractsStorageKeyAndRejectsForeignUrls() {
        assertThat(MediaService.keyFromUrl("/media/import/abc.jpg")).isEqualTo("import/abc.jpg");
        assertThat(MediaService.keyFromUrl("/media/2026/10/xyz.png")).isEqualTo("2026/10/xyz.png");
        assertThat(MediaService.keyFromUrl("https://ficas.org.br/wp/x.jpg")).isNull();
        assertThat(MediaService.keyFromUrl("/media/")).isNull();
        assertThat(MediaService.keyFromUrl(null)).isNull();
    }
}
