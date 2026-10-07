package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SettingsAdminIntegrationTest extends AbstractIntegrationTest {

    private static final String INSTAGRAM_LINK = "https://www.instagram.com/insta_ficas/";

    /** Exactly the fields SiteSettingsDto exposes — no embed field may exist. */
    private static final List<String> EXPECTED_SETTINGS_KEYS = List.of(
            "siteName", "siteDescription", "logoUrl", "faviconUrl", "social", "contact", "pix");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void publicSettingsExposeInstagramLinkWithoutEmbedOrToken() throws Exception {
        String token = loginAndGetToken(mockMvc);

        // Admin save accepts the plain settings shape (no embed field at all).
        mockMvc.perform(put("/api/admin/settings")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(settingsBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.social.instagram").value(INSTAGRAM_LINK));

        // Admin read confirms the social link round-tripped.
        mockMvc.perform(get("/api/admin/settings").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.social.instagram").value(INSTAGRAM_LINK));

        // Public settings expose the Instagram link and never an embed field / token config.
        MvcResult result = mockMvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.social.instagram").value(INSTAGRAM_LINK))
                .andExpect(jsonPath("$.instagram").doesNotExist())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn();

        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(body).doesNotContain("accessToken");

        // The payload has exactly the seven expected top-level keys, so no embed field is present.
        JsonNode node = objectMapper.readTree(body);
        List<String> keys = new ArrayList<>();
        node.fieldNames().forEachRemaining(keys::add);
        assertThat(keys).containsExactlyElementsOf(EXPECTED_SETTINGS_KEYS);
    }

    private static String settingsBody() {
        return """
                {
                  "siteName": "FICAS",
                  "siteDescription": "Compartilhando conhecimentos, transformando pessoas e organizações",
                  "logoUrl": "/brand/logo-ficas.png",
                  "faviconUrl": null,
                  "social": {
                    "instagram": "%s",
                    "facebook": "https://www.facebook.com/ficas.sp",
                    "youtube": "",
                    "twitter": "https://twitter.com/FICAS_SP",
                    "linkedin": "https://br.linkedin.com/company/ficas"
                  },
                  "contact": {"email":"","phone":"","address":""},
                  "pix": {"key":"","qrImageUrl":null,"suggestedAmounts":[]}
                }
                """.formatted(INSTAGRAM_LINK);
    }
}
