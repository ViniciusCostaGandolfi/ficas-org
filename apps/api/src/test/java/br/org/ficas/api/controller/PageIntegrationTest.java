package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PageIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void adminRoundTripExposesEditorFieldsAndPublicOmitsThem() throws Exception {
        String token = loginAndGetToken(mockMvc);
        long mediaId = uploadMedia(mockMvc, token, "hero.png");
        String slug = "pagina-editor-fields";

        MvcResult created = mockMvc.perform(post("/api/admin/pages")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Página Editor",
                                  "slug": "%s",
                                  "content": "<p>pagina</p>",
                                  "excerpt": "resumo",
                                  "heroMediaId": %d,
                                  "menuOrder": 5,
                                  "showInMenu": true,
                                  "status": "PUBLISHED"
                                }
                                """.formatted(slug, mediaId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroMediaId").value(mediaId))
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Admin get exposes the editor fields.
        mockMvc.perform(get("/api/admin/pages/" + id).cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.heroMediaId").value(mediaId))
                .andExpect(jsonPath("$.heroImageUrl").exists());

        // Admin list exposes the editor fields for the created page.
        MvcResult listResult = mockMvc.perform(get("/api/admin/pages?page=0&size=100").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode listed = findBySlug(
                objectMapper.readTree(listResult.getResponse().getContentAsString()).get("content"), slug);
        assertThat(listed).as("admin list contains the created page").isNotNull();
        assertThat(listed.get("status").asText()).isEqualTo("PUBLISHED");
        assertThat(listed.get("heroMediaId").asLong()).isEqualTo(mediaId);

        // Public DTOs must omit the admin-only fields.
        mockMvc.perform(get("/api/public/pages/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.heroImageUrl").exists())
                .andExpect(jsonPath("$.heroMediaId").doesNotExist())
                .andExpect(jsonPath("$.status").doesNotExist());

        MvcResult publicList = mockMvc.perform(get("/api/public/pages"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode publicNode = findBySlug(
                objectMapper.readTree(publicList.getResponse().getContentAsString()), slug);
        assertThat(publicNode).as("public pages list contains the published page").isNotNull();
        assertThat(publicNode.has("status")).isFalse();
        assertThat(publicNode.has("heroMediaId")).isFalse();
    }

    @Test
    void contentFormatRoundTripsAndDefaultsToHtml() throws Exception {
        String token = loginAndGetToken(mockMvc);

        MvcResult markdown = mockMvc.perform(post("/api/admin/pages")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Página Markdown",
                                  "slug": "pagina-markdown-round-trip",
                                  "content": "# Título",
                                  "contentFormat": "MARKDOWN",
                                  "status": "PUBLISHED"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"))
                .andReturn();
        long id = objectMapper.readTree(markdown.getResponse().getContentAsString()).get("id").asLong();

        // Admin detail round-trips the format.
        mockMvc.perform(get("/api/admin/pages/" + id).cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"));

        // Public detail exposes it.
        mockMvc.perform(get("/api/public/pages/pagina-markdown-round-trip"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"));

        // Omitted contentFormat defaults to HTML.
        mockMvc.perform(post("/api/admin/pages")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Página Html","slug":"pagina-html-default","content":"<p>x</p>","status":"DRAFT"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentFormat").value("HTML"));
    }

    @Test
    void invalidContentFormatReturnsBadRequest() throws Exception {
        String token = loginAndGetToken(mockMvc);
        mockMvc.perform(post("/api/admin/pages")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Formato inválido",
                                  "slug": "pagina-formato-invalido",
                                  "content": "x",
                                  "contentFormat": "RST",
                                  "status": "DRAFT"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"));
    }

    private static JsonNode findBySlug(JsonNode content, String slug) {
        for (JsonNode node : content) {
            if (slug.equals(node.get("slug").asText())) {
                return node;
            }
        }
        return null;
    }
}
