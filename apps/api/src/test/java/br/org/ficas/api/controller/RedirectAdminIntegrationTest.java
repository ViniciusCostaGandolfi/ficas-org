package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import br.org.ficas.api.infra.repository.RedirectRepository;
import br.org.ficas.api.model.entity.Redirect;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration coverage for {@code /api/admin/redirects}: idempotent bulk upsert, paginated listing
 * with the {@code q} filter, input validation and the interaction with the public lookup.
 */
class RedirectAdminIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RedirectRepository redirectRepository;

    /** Unique, lowercase, already-normalized prefix so batched rows never collide across tests. */
    private static String uniquePrefix() {
        return "/bulk-it-" + UUID.randomUUID().toString().toLowerCase();
    }

    private long countRowsForPrefix(String prefix) {
        return redirectRepository.search("%" + prefix + "%", PageRequest.of(0, 200)).getTotalElements();
    }

    private MvcResult postBulk(String token, String json) throws Exception {
        return mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andReturn();
    }

    @Test
    void bulkUpsertInsertsThenRepostUpdatesWithoutDuplicating() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();
        String body = """
                [
                  {"fromPath":"%s/a","toPath":"/novo/a","statusCode":301},
                  {"fromPath":"%s/b","toPath":"/novo/b","statusCode":302},
                  {"fromPath":"%s/c","toPath":"/novo/c"}
                ]
                """.formatted(prefix, prefix, prefix);

        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(3))
                .andExpect(jsonPath("$.inserted").value(3))
                .andExpect(jsonPath("$.updated").value(0));

        assertThat(countRowsForPrefix(prefix)).isEqualTo(3);
        // statusCode omitted defaults to 301.
        assertThat(redirectRepository.findByFromPath(prefix + "/c"))
                .map(Redirect::getStatusCode)
                .contains(301);

        // Re-posting the identical batch must update, not duplicate.
        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(3))
                .andExpect(jsonPath("$.inserted").value(0))
                .andExpect(jsonPath("$.updated").value(3));

        assertThat(countRowsForPrefix(prefix)).isEqualTo(3);
    }

    @Test
    void bulkUpsertUpdatesExistingTarget() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();
        String from = prefix + "/moved";

        postBulk(token, """
                [{"fromPath":"%s","toPath":"/primeiro","statusCode":301}]
                """.formatted(from));
        postBulk(token, """
                [{"fromPath":"%s","toPath":"/segundo","statusCode":308}]
                """.formatted(from));

        assertThat(redirectRepository.findByFromPath(from))
                .map(Redirect::getToPath)
                .contains("/segundo");
        assertThat(redirectRepository.findByFromPath(from))
                .map(Redirect::getStatusCode)
                .contains(308);
        assertThat(countRowsForPrefix(prefix)).isEqualTo(1);
    }

    @Test
    void listSupportsPaginationAndQueryFilter() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();
        StringBuilder batch = new StringBuilder("[");
        for (int i = 1; i <= 5; i++) {
            batch.append(i > 1 ? "," : "")
                    .append("{\"fromPath\":\"").append(prefix).append("/p").append(i)
                    .append("\",\"toPath\":\"/dest/").append(i).append("\",\"statusCode\":301}");
        }
        batch.append("]");
        postBulk(token, batch.toString());

        mockMvc.perform(get("/api/admin/redirects")
                        .cookie(authCookie(token))
                        .param("page", "0")
                        .param("size", "2")
                        .param("q", prefix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").exists())
                .andExpect(jsonPath("$.content[0].fromPath").exists())
                .andExpect(jsonPath("$.content[0].toPath").exists())
                .andExpect(jsonPath("$.content[0].statusCode").value(301));

        mockMvc.perform(get("/api/admin/redirects")
                        .cookie(authCookie(token))
                        .param("page", "2")
                        .param("size", "2")
                        .param("q", prefix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));

        // q is a case-insensitive contains on fromPath.
        mockMvc.perform(get("/api/admin/redirects")
                        .cookie(authCookie(token))
                        .param("q", prefix + "/p3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/admin/redirects")
                        .cookie(authCookie(token))
                        .param("q", prefix.toUpperCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(5));
    }

    @Test
    void publicLookupStillResolvesBulkInsertedRule() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();
        String fromPath = prefix + "/legacy";

        postBulk(token, """
                [{"fromPath":"%s","toPath":"/novo-legacy","statusCode":301}]
                """.formatted(fromPath));

        mockMvc.perform(get("/api/public/redirects" + fromPath))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fromPath").value(fromPath))
                .andExpect(jsonPath("$.toPath").value("/novo-legacy"))
                .andExpect(jsonPath("$.statusCode").value(301));
    }

    @Test
    void blankFieldsReturn400() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();

        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"fromPath":"   ","toPath":"/y","statusCode":301}]
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"fromPath":"%s/x","toPath":"","statusCode":301}]
                                """.formatted(prefix)))
                .andExpect(status().isBadRequest());

        assertThat(countRowsForPrefix(prefix)).isZero();
    }

    @Test
    void invalidStatusCodeReturns400() throws Exception {
        String token = loginAndGetToken(mockMvc);
        String prefix = uniquePrefix();

        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"fromPath":"%s/x","toPath":"/y","statusCode":200}]
                                """.formatted(prefix)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(countRowsForPrefix(prefix)).isZero();
    }

    @Test
    void emptyArrayIsAccepted() throws Exception {
        String token = loginAndGetToken(mockMvc);

        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .cookie(authCookie(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(0))
                .andExpect(jsonPath("$.inserted").value(0))
                .andExpect(jsonPath("$.updated").value(0));
    }

    @Test
    void adminEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/admin/redirects/bulk")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                [{"fromPath":"/nao-autenticado","toPath":"/y","statusCode":301}]
                                """))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/redirects"))
                .andExpect(status().isUnauthorized());
    }
}
