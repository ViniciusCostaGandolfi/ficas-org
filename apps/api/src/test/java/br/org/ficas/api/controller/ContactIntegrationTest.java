package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ContactIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contactLeadIsPersistedAndListedForAdmin() throws Exception {
        mockMvc.perform(post("/api/public/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Fulano de Tal",
                                  "email": "fulano@example.com",
                                  "phone": "+55 11 99999-0000",
                                  "message": "Gostaria de saber mais sobre o FICAS.",
                                  "consent": true,
                                  "source": "home"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.email").value("fulano@example.com"));

        String token = loginAndGetToken(mockMvc);
        mockMvc.perform(get("/api/admin/leads?page=0&size=10")
                        .cookie(authCookie(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.content[0].name").value("Fulano de Tal"));
    }

    @Test
    void contactWithoutConsentReturnsValidationProblem() throws Exception {
        mockMvc.perform(post("/api/public/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sem Consentimento","email":"sem@example.com","message":"x","consent":false}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation failed"))
                .andExpect(jsonPath("$.errors.consent").exists());
    }

    @Test
    void adminLeadsRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/admin/leads"))
                .andExpect(status().isUnauthorized());
    }
}
