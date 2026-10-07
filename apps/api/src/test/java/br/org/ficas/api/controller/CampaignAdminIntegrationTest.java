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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CampaignAdminIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void crudRoundTripPersistsFormSchema() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String slug = "edital-admin-crud";

        MvcResult created = mockMvc.perform(post("/api/admin/campaigns")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Edital de Teste",
                                  "slug": "%s",
                                  "description": "Chamada pública",
                                  "status": "DRAFT",
                                  "startsAt": "2026-01-01T00:00:00Z",
                                  "endsAt": "2026-03-01T00:00:00Z",
                                  "formSchema": {
                                    "fields": [ { "name": "org", "type": "text", "required": true } ]
                                  }
                                }
                                """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value(slug))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.formSchema.fields[0].name").value("org"))
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // GET single round-trips the free-form schema.
        mockMvc.perform(get("/api/admin/campaigns/" + id).cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.formSchema.fields[0].type").value("text"));

        // Admin list contains the created campaign with its schema.
        MvcResult list = mockMvc.perform(get("/api/admin/campaigns?page=0&size=100").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andReturn();
        JsonNode listed = findBySlug(
                objectMapper.readTree(list.getResponse().getContentAsString()).get("content"), slug);
        assertThat(listed).as("admin list contains the created campaign").isNotNull();
        assertThat(listed.get("formSchema").get("fields").get(0).get("name").asText()).isEqualTo("org");

        // PUT updates content and schema.
        mockMvc.perform(put("/api/admin/campaigns/" + id)
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Edital de Teste (atualizado)",
                                  "slug": "%s",
                                  "status": "PUBLISHED",
                                  "formSchema": { "fields": [] }
                                }
                                """.formatted(slug)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Edital de Teste (atualizado)"))
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.formSchema.fields").isArray());

        // publish/unpublish flip the ContentStatus.
        mockMvc.perform(post("/api/admin/campaigns/" + id + "/unpublish").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"));
        mockMvc.perform(post("/api/admin/campaigns/" + id + "/publish").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        // DELETE, then GET → 404.
        mockMvc.perform(delete("/api/admin/campaigns/" + id).cookie(authCookie(token)))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/admin/campaigns/" + id).cookie(authCookie(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void duplicateSlugReturnsConflict() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String slug = "edital-slug-conflito";

        mockMvc.perform(post("/api/admin/campaigns")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Primeiro","slug":"%s"}
                                """.formatted(slug)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/admin/campaigns")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Segundo","slug":"%s"}
                                """.formatted(slug)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.title").value("Conflict"));
    }

    @Test
    void missingCampaignReturnsNotFound() throws Exception {
        String token = loginAndGetToken(mockMvc);

        mockMvc.perform(get("/api/admin/campaigns/999999").cookie(authCookie(token)))
                .andExpect(status().isNotFound());

        mockMvc.perform(put("/api/admin/campaigns/999999")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Inexistente","slug":"inexistente"}
                                """))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/admin/campaigns/999999").cookie(authCookie(token)))
                .andExpect(status().isNotFound());
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
