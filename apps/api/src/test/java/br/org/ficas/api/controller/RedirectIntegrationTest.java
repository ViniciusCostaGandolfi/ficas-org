package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import br.org.ficas.api.infra.repository.RedirectRepository;
import br.org.ficas.api.model.entity.Redirect;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RedirectIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RedirectRepository redirectRepository;

    @Test
    void lookupResolvesDateBasedPostPathWithTrailingSlash() throws Exception {
        redirectRepository.save(new Redirect(
                "/2025/06/06/redirect-it-sample", "/noticias/redirect-it-sample", 301));

        mockMvc.perform(get("/api/public/redirects/2025/06/06/redirect-it-sample/"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fromPath").value("/2025/06/06/redirect-it-sample"))
                .andExpect(jsonPath("$.toPath").value("/noticias/redirect-it-sample"))
                .andExpect(jsonPath("$.statusCode").value(301));
    }

    @Test
    void lookupResolvesQueryBasedPostRedirect() throws Exception {
        redirectRepository.save(new Redirect("/?p=999999", "/noticias/query-sample", 301));

        mockMvc.perform(get("/api/public/redirects/").queryParam("p", "999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.toPath").value("/noticias/query-sample"));
    }

    @Test
    void unknownPathReturns404() throws Exception {
        mockMvc.perform(get("/api/public/redirects/does/not/exist"))
                .andExpect(status().isNotFound());
    }
}
