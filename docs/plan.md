# FICAS — Plano de recriação

Objetivo: recriar o site ficas.org.br em **React + daisyUI** (front) e **Spring Boot + PostgreSQL**
(back), com **admin, posts e campanhas (editais)**. Conteúdo do WordPress será importado.

## Decisões

- Backend: Spring Boot + PostgreSQL.
- Campanhas = **editais com inscrição** (formulário dinâmico + upload de documentos).
- Migração: **importar todo o conteúdo** do WordPress (197 posts + páginas).
- MVP: **home + posts + admin**.
- Um único app React com área `/admin` (code-split, protegida).

## Fases

1. **Fundação** — monorepo, Docker Compose (Postgres), Flyway, skeleton Spring Boot, React Router +
   Tailwind 4 + daisyUI, auth JWT (cookie httpOnly).
2. **MVP** — mídia, posts, categorias/tags, páginas (home + institucional), CRUD admin, site público +
   blog com SSR.
3. **Importação WP** — importer via REST API do WP + limpeza de HTML do Divi + tabela de redirects 301.
4. **Campanhas/editais** — CRUD, `form_schema` dinâmico, submissões + upload, painel de revisão.
5. **Integrações** — contato + SMTP, feed do Instagram, página Pix (CNPJ), menu/logo, SEO/sitemap,
   analytics.
6. **Extras** — EN/ES, busca, newsletter.

## Modelo de domínio

`User(ADMIN/EDITOR)`, `Page`, `Post`, `Category`, `Tag`, `MediaAsset`, `Campaign`, `CampaignSubmission`,
`ContactLead`, `SiteSetting`, `MenuItem`, `Redirect`.

## Rotas públicas

`/` (home), institucional (`/historia`, `/filosofia`, `/metodologia`, `/conselhos`, `/equipe`, `/acoes`,
`/assessorias`, `/programas`, `/atuacao`, `/parceiros`, `/publicacoes`, `/relatorios`,
`/leituras-recomendadas`, `/artigos-e-textos`, `/multimidia`, `/contato`, `/colabore`), blog
(`/noticias`, `/noticias/:slug`, `/categoria/:slug`), editais (`/editais`, `/editais/:slug`).

Páginas institucionais usam rota dinâmica `/:slug` (catch-all pós-rotas fixas), buscando a página na API.

## Rotas admin

`/admin/login`, `/admin`, `/admin/posts(/:id)`, `/admin/pages(/:id)`, `/admin/categories`,
`/admin/media`, `/admin/leads`, `/admin/campaigns(/:id)`, `/admin/settings`, `/admin/users`.

## Notas de integração

- Auth por **cookie httpOnly** (`ficas_token`) → SSR guard e `credentials: "include"` no web.
- E-mail de contato/edital: SMTP configurável (`APP_MAIL_*`), com persistência de `ContactLead`.
- Doação: Pix estático (chave CNPJ) no MVP; gateway depois.
- SEO: SSR + `meta` por rota + redirects 301 desde a importação.
- Contrato versionado em [`api-contract.md`](api-contract.md).
