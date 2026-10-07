package br.org.ficas.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Boots the application against a real PostgreSQL instance via Testcontainers. The container is
 * shared across all integration test classes in the JVM.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    protected static final String ADMIN_EMAIL = "admin@ficas.org.br";
    protected static final String ADMIN_PASSWORD = "admin123";

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:18-alpine"))
                    .withDatabaseName("ficas")
                    .withUsername("ficas")
                    .withPassword("ficas");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /** Logs in as the seeded admin and returns the raw JWT value from the Set-Cookie header. */
    protected String loginAndGetToken(org.springframework.test.web.servlet.MockMvc mockMvc) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(ADMIN_EMAIL, ADMIN_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        String setCookie = result.getResponse().getHeader("Set-Cookie");
        if (setCookie == null) {
            throw new AssertionError("No Set-Cookie header returned by /api/auth/login");
        }
        String firstPart = setCookie.split(";", 2)[0];
        return firstPart.substring(firstPart.indexOf('=') + 1);
    }

    protected jakarta.servlet.http.Cookie authCookie(String token) {
        return new jakarta.servlet.http.Cookie("ficas_token", token);
    }

    /** Uploads a tiny PNG through the admin media endpoint and returns the created media id. */
    protected long uploadMedia(MockMvc mockMvc, String token, String filename) throws Exception {
        byte[] png = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile file = new MockMultipartFile("file", filename, "image/png", png);
        MvcResult result = mockMvc.perform(multipart("/api/admin/media")
                        .file(file)
                        .param("alt", "test")
                        .cookie(authCookie(token)))
                .andExpect(status().isCreated())
                .andReturn();
        return new ObjectMapper()
                .readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8))
                .get("id").asLong();
    }
}
