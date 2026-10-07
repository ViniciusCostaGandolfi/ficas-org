package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PostIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createPublishAndReadPost() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String slug = "meu-post-teste";

        MvcResult created = mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Meu Post de Teste",
                                  "slug": "%s",
                                  "excerpt": "Resumo do post",
                                  "content": "<p>Conteudo</p>",
                                  "status": "DRAFT"
                                }
                                """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value(slug))
                .andExpect(jsonPath("$.content").value("<p>Conteudo</p>"))
                .andReturn();

        JsonNode body = objectMapper.readTree(created.getResponse().getContentAsString());
        long id = body.get("id").asLong();

        mockMvc.perform(post("/api/admin/posts/" + id + "/publish")
                        .cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));

        mockMvc.perform(get("/api/public/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].slug").value(slug))
                .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(1)));

        mockMvc.perform(get("/api/public/posts/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Meu Post de Teste"))
                .andExpect(jsonPath("$.content").value("<p>Conteudo</p>"));
    }

    @Test
    void draftPostIsNotVisiblePublicly() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String slug = "rascunho-nao-publicado";

        mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Rascunho","slug":"%s","content":"<p>x</p>","status":"DRAFT"}
                                """.formatted(slug)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/public/posts/" + slug))
                .andExpect(status().isNotFound());
    }

    @Test
    void createPostWithoutTitleReturnsValidationProblem() throws Exception {
        String token = loginAndGetToken(mockMvc);
        mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"sem-titulo","content":"<p>x</p>"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void adminListReturnsPaginationEnvelope() throws Exception {
        String token = loginAndGetToken(mockMvc);
        mockMvc.perform(get("/api/admin/posts?page=0&size=5")
                        .cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(5))
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    void adminRoundTripExposesEditorFieldsAndPublicOmitsThem() throws Exception {
        String token = loginAndGetToken(mockMvc);
        long mediaId = uploadMedia(mockMvc, token, "cover.png");

        MvcResult tagResult = mockMvc.perform(post("/api/admin/tags")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Dow","slug":"dow"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        long tagId = objectMapper.readTree(tagResult.getResponse().getContentAsString()).get("id").asLong();

        String slug = "post-editor-fields";
        MvcResult created = mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Post Editor",
                                  "slug": "%s",
                                  "content": "<p>editor</p>",
                                  "categoryId": 1,
                                  "tagIds": [%d],
                                  "coverMediaId": %d,
                                  "status": "DRAFT"
                                }
                                """.formatted(slug, tagId, mediaId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.categoryId").value(1))
                .andExpect(jsonPath("$.coverMediaId").value(mediaId))
                .andExpect(jsonPath("$.tagIds[0]").value(tagId))
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        // Admin get exposes the editor fields.
        mockMvc.perform(get("/api/admin/posts/" + id).cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.categoryId").value(1))
                .andExpect(jsonPath("$.coverMediaId").value(mediaId))
                .andExpect(jsonPath("$.tagIds[0]").value(tagId));

        // Admin list exposes the editor fields for the created post.
        MvcResult listResult = mockMvc.perform(get("/api/admin/posts?page=0&size=100").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode listed = findBySlug(
                objectMapper.readTree(listResult.getResponse().getContentAsString()).get("content"), slug);
        assertThat(listed).as("admin list contains the created post").isNotNull();
        assertThat(listed.get("status").asText()).isEqualTo("DRAFT");
        assertThat(listed.get("categoryId").asLong()).isEqualTo(1L);
        assertThat(listed.get("coverMediaId").asLong()).isEqualTo(mediaId);
        assertThat(listed.get("tagIds").get(0).asLong()).isEqualTo(tagId);

        // Publish, then the public DTOs must still omit the admin-only fields.
        mockMvc.perform(post("/api/admin/posts/" + id + "/publish").cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));

        mockMvc.perform(get("/api/public/posts/" + slug))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").doesNotExist())
                .andExpect(jsonPath("$.categoryId").doesNotExist())
                .andExpect(jsonPath("$.coverMediaId").doesNotExist())
                .andExpect(jsonPath("$.tagIds").doesNotExist());

        mockMvc.perform(get("/api/public/posts?page=0&size=100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").doesNotExist())
                .andExpect(jsonPath("$.content[0].categoryId").doesNotExist())
                .andExpect(jsonPath("$.content[0].coverMediaId").doesNotExist())
                .andExpect(jsonPath("$.content[0].tagIds").doesNotExist());
    }

    @Test
    void contentFormatRoundTripsAndDefaultsToHtml() throws Exception {
        String token = loginAndGetToken(mockMvc);

        MvcResult markdown = mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Post Markdown",
                                  "slug": "post-markdown-round-trip",
                                  "content": "# Título",
                                  "contentFormat": "MARKDOWN",
                                  "status": "DRAFT"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"))
                .andExpect(jsonPath("$.content").value("# Título"))
                .andReturn();
        long id = objectMapper.readTree(markdown.getResponse().getContentAsString()).get("id").asLong();

        // Admin detail round-trips the format.
        mockMvc.perform(get("/api/admin/posts/" + id).cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"));

        // Public detail exposes it after publish.
        mockMvc.perform(post("/api/admin/posts/" + id + "/publish").cookie(authCookie(token)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/public/posts/post-markdown-round-trip"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contentFormat").value("MARKDOWN"));

        // Omitted contentFormat defaults to HTML.
        mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Post Html","slug":"post-html-default","content":"<p>x</p>","status":"DRAFT"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contentFormat").value("HTML"));
    }

    @Test
    void invalidContentFormatReturnsBadRequest() throws Exception {
        String token = loginAndGetToken(mockMvc);
        mockMvc.perform(post("/api/admin/posts")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Formato inválido",
                                  "slug": "post-formato-invalido",
                                  "content": "x",
                                  "contentFormat": "WIKI",
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
