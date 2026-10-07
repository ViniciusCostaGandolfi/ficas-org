package br.org.ficas.api.controller;

import br.org.ficas.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicContentIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void settingsExposeSeedValues() throws Exception {
        mockMvc.perform(get("/api/public/settings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.siteName").value("FICAS"))
                .andExpect(jsonPath("$.social.instagram").value("https://www.instagram.com/insta_ficas/"))
                .andExpect(jsonPath("$.social.facebook").value("https://www.facebook.com/ficas.sp"))
                .andExpect(jsonPath("$.social.youtube").value(""))
                .andExpect(jsonPath("$.social.twitter").value("https://twitter.com/FICAS_SP"))
                .andExpect(jsonPath("$.social.linkedin").value("https://br.linkedin.com/company/ficas"))
                .andExpect(jsonPath("$.contact").exists())
                .andExpect(jsonPath("$.pix").exists());
    }

    @Test
    void menuExposesSeededGroupsAsTree() throws Exception {
        mockMvc.perform(get("/api/public/menu"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].label").value("Institucional"))
                .andExpect(jsonPath("$[0].children.length()").value(7))
                .andExpect(jsonPath("$[0].children[0].label").value("História"))
                .andExpect(jsonPath("$[1].label").value("Atuação"))
                .andExpect(jsonPath("$[2].label").value("Publicações"))
                .andExpect(jsonPath("$[3].label").value("Notícias"))
                .andExpect(jsonPath("$[4].label").value("Contato"))
                .andExpect(jsonPath("$[4].url").value("/contato"))
                .andExpect(jsonPath("$[4].children.length()").value(0));
    }

    @Test
    void categoriesExposeSeededCategories() throws Exception {
        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].slug").value("noticias"));
    }

    @Test
    void pagesListIsPublicAndReturnsArray() throws Exception {
        mockMvc.perform(get("/api/public/pages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    void campaignsReturnPaginationEnvelope() throws Exception {
        mockMvc.perform(get("/api/public/campaigns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.content").isArray());
    }
}
