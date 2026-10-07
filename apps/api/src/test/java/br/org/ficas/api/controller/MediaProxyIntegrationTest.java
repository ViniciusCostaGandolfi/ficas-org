package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Verifies the {@code /media/**} proxy streams bytes from the configured StorageService. */
class MediaProxyIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void uploadedMediaIsServedFromStorageWithContentType() throws Exception {
        String token = loginAndGetToken(mockMvc);
        long mediaId = uploadMedia(mockMvc, token, "proxy-check.png");

        String mediaUrl = objectMapper.readTree(mockMvc.perform(get("/api/admin/media")
                        .param("q", "proxy-check")
                        .cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("content").get(0).get("url").asText();

        assertThat(mediaUrl).startsWith("/media/");

        MvcResult served = mockMvc.perform(get(mediaUrl))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(header().string("Cache-Control", "max-age=3600, public"))
                .andReturn();

        assertThat(served.getResponse().getContentAsByteArray()).isNotEmpty();
        assertThat(mediaId).isPositive();
    }
}
