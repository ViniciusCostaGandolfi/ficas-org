package br.org.ficas.api.service;

import br.org.ficas.api.infra.repository.RedirectRepository;
import br.org.ficas.api.dto.redirect.RedirectDto;
import br.org.ficas.api.model.entity.Redirect;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedirectServiceTest {

    @Mock
    private RedirectRepository redirectRepository;

    private RedirectService service;

    @BeforeEach
    void setUp() {
        service = new RedirectService(redirectRepository);
    }

    @Test
    void normalizeAddsLeadingSlashAndRemovesTrailingSlash() {
        assertThat(RedirectService.normalize("home/")).isEqualTo("/home");
        assertThat(RedirectService.normalize("2025/06/06/x/")).isEqualTo("/2025/06/06/x");
        assertThat(RedirectService.normalize("")).isEqualTo("/");
        assertThat(RedirectService.normalize("/")).isEqualTo("/");
        assertThat(RedirectService.normalize("?p=12")).isEqualTo("/?p=12");
    }

    @Test
    void lookupIgnoresTrailingSlash() {
        when(redirectRepository.findByFromPath("/2025/06/06/x"))
                .thenReturn(Optional.of(new Redirect("/2025/06/06/x", "/noticias/x", 301)));

        Optional<RedirectDto> found = service.lookup("/2025/06/06/x/", null);

        assertThat(found).contains(new RedirectDto("/2025/06/06/x", "/noticias/x", 301));
    }

    @Test
    void lookupMatchesQueryKeyExactly() {
        when(redirectRepository.findByFromPath("/?p=5"))
                .thenReturn(Optional.of(new Redirect("/?p=5", "/noticias/a", 301)));

        Optional<RedirectDto> found = service.lookup("/", "p=5");

        assertThat(found).map(RedirectDto::toPath).contains("/noticias/a");
    }

    @Test
    void lookupFallsBackToPathWhenQueryDoesNotMatch() {
        when(redirectRepository.findByFromPath("/noticias/a?utm=1")).thenReturn(Optional.empty());
        when(redirectRepository.findByFromPath("/noticias/a"))
                .thenReturn(Optional.of(new Redirect("/noticias/a", "/noticias/b", 301)));

        Optional<RedirectDto> found = service.lookup("/noticias/a", "utm=1");

        assertThat(found).map(RedirectDto::toPath).contains("/noticias/b");
    }

    @Test
    void insertSkipsIdentityMappings() {
        assertThat(service.insertIfAbsent("/historia", "/historia", 301)).isFalse();
        verifyNoInteractions(redirectRepository);
    }

    @Test
    void insertStoresNewRedirect() {
        when(redirectRepository.existsByFromPath("/home")).thenReturn(false);

        assertThat(service.insertIfAbsent("/home/", "/", 301)).isTrue();

        verify(redirectRepository).save(org.mockito.ArgumentMatchers.any(Redirect.class));
    }

    @Test
    void insertSkipsExistingRedirect() {
        when(redirectRepository.existsByFromPath("/home")).thenReturn(true);

        assertThat(service.insertIfAbsent("/home", "/", 301)).isFalse();

        verify(redirectRepository, never()).save(org.mockito.ArgumentMatchers.any(Redirect.class));
    }
}
