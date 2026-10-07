# FICAS — Contrato da API (MVP)

Versão: 1.1 (MVP: auth + posts + pages + categorias + mídia + settings + leads + campanhas)

Base URL: `http://localhost:8080` (dev). Todos os endpoints sob `/api`.

## Convenções

- `Content-Type: application/json; charset=utf-8` (exceto upload multipart).
- Datas em ISO-8601 UTC: `2026-10-05T12:34:56Z`.
- Paginação 0-based: `?page=0&size=9`.
- Envelope de página:

```json
{ "content": [], "page": 0, "size": 9, "totalElements": 0, "totalPages": 0 }
```

- Erros no formato RFC 7807 (Problem Details):

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "detail": "title: must not be blank",
  "instance": "/api/admin/posts",
  "errors": { "title": "must not be blank" }
}
```

## Autenticação

JWT em cookie **httpOnly** `ficas_token` (SameSite=Lax; Secure em prod). O cliente web usa
`credentials: "include"`. Também é aceito `Authorization: Bearer <token>` para tools/testes.

Papéis: `ADMIN` (tudo) e `EDITOR` (conteúdo: posts, pages, categorias, mídia, campanhas).

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` → `UserDto` + seta cookie | público |
| POST | `/api/auth/logout` | limpa cookie | público |
| GET | `/api/auth/me` | usuário atual | autenticado |
| POST | `/api/auth/refresh` | renova cookie | público |

`UserDto`: `{ "id":1, "name":"Administrador", "email":"admin@ficas.org.br", "role":"ADMIN" }`

## Endpoints públicos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/public/settings` | configurações do site |
| GET | `/api/public/menu` | itens de menu (árvore) |
| GET | `/api/public/pages` | lista de páginas publicadas (para nav/footer) |
| GET | `/api/public/pages/{slug}` | página por slug |
| GET | `/api/public/posts?page&size&category&q` | posts publicados |
| GET | `/api/public/posts/{slug}` | post por slug |
| GET | `/api/public/categories` | categorias |
| GET | `/api/public/tags` | tags |
| GET | `/api/public/campaigns?page&size` | editais (fase 3; retorna página vazia no MVP) |
| GET | `/api/public/campaigns/{slug}` | edital (fase 3) |
| POST | `/api/public/campaigns/{id}/submissions` | inscrição multipart (fase 3) |
| POST | `/api/public/contact` | lead de contato |

### DTOs públicos

`SiteSettingsDto`:
```json
{
  "siteName": "FICAS",
  "siteDescription": "Compartilhando conhecimentos, transformando pessoas e organizações",
  "logoUrl": "/media/logo.png",
  "faviconUrl": null,
  "social": {
    "instagram": "https://www.instagram.com/insta_ficas/",
    "facebook": "https://www.facebook.com/ficas.sp",
    "youtube": "",
    "twitter": "https://twitter.com/FICAS_SP",
    "linkedin": "https://br.linkedin.com/company/ficas"
  },
  "contact": { "email": "", "phone": "", "address": "" },
  "pix": { "key": "", "qrImageUrl": null, "suggestedAmounts": [] }
}
```

`MenuItemDto` (recursivo): `{ "id":1, "label":"História", "url":"/historia", "target":"_self", "children":[] }`

`PageSummaryDto`: `{ "id":1, "slug":"historia", "title":"História", "menuOrder":2, "showInMenu":true }`

`PageDto`: `{ ...summary, "content":"<html>", "contentFormat":"HTML", "excerpt":"", "heroImageUrl":null, "seoTitle":null, "seoDescription":null, "updatedAt":"..." }`

`CategoryDto`: `{ "id":1, "slug":"noticias", "name":"Notícias", "description":null }`

`TagDto`: `{ "id":1, "slug":"dow", "name":"Dow" }`

`PostSummaryDto`:
```json
{
  "id": 10, "slug": "titulo", "title": "Título", "excerpt": "resumo",
  "coverImageUrl": null,
  "category": { "id":1, "slug":"noticias", "name":"Notícias" },
  "tags": [{ "id":1, "slug":"dow", "name":"Dow" }],
  "author": { "id":1, "name":"Administrador" },
  "publishedAt": "2026-10-05T12:00:00Z"
}
```

`PostDto`: `{ ...summary, "content":"<html>", "contentFormat":"HTML", "seoTitle":null, "seoDescription":null, "createdAt":"...", "updatedAt":"..." }`

`CampaignDto` (público): `{ "id":1, "slug":"edital-2026", "title":"Edital 2026", "description":"...", "status":"PUBLISHED", "startsAt":"...", "endsAt":"...", "coverImageUrl":null, "formSchema":{} }`

`ContactRequest`: `{ "name":"", "email":"", "phone":null, "message":"", "consent":true, "source":"home" }` → `201` vazio/`ContactLeadDto`.

## Endpoints admin (requer cookie/Bearer; `EDITOR` ou `ADMIN`)

### Mídia
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/admin/media` | multipart `file` (+ `alt`) → `MediaDto` |
| GET | `/api/admin/media?page&size&q` | lista |
| DELETE | `/api/admin/media/{id}` | remove |

`MediaDto`: `{ "id":1, "url":"/media/2026/10/x.png", "filename":"x.png", "mimeType":"image/png", "sizeBytes":1234, "alt":null }`

### Posts
| Método | Rota |
|---|---|
| GET | `/api/admin/posts?page&size&q&status&category` |
| POST | `/api/admin/posts` |
| GET | `/api/admin/posts/{id}` |
| PUT | `/api/admin/posts/{id}` |
| DELETE | `/api/admin/posts/{id}` |
| POST | `/api/admin/posts/{id}/publish` |
| POST | `/api/admin/posts/{id}/unpublish` |

`PostUpsertRequest`:
```json
{
  "title": "Título", "slug": "titulo", "excerpt": "resumo", "content": "<p>html</p>",
  "contentFormat": "HTML",
  "categoryId": 1, "tagIds": [1,2], "coverMediaId": null,
  "status": "DRAFT", "publishedAt": null, "seoTitle": null, "seoDescription": null
}
```
`status` ∈ `DRAFT | PUBLISHED | ARCHIVED`. `contentFormat` ∈ `HTML | MARKDOWN` (opcional; vazio → `HTML`).

### Páginas
Mesmo padrão: `GET/POST /api/admin/pages`, `GET/PUT/DELETE /api/admin/pages/{id}`.
`PageUpsertRequest`: `{ "title","slug","content","contentFormat","excerpt","heroMediaId","menuOrder","showInMenu","status","seoTitle","seoDescription" }`

#### Formato de conteúdo (`contentFormat`)

`content` é sempre a string crua. `contentFormat` (`HTML` | `MARKDOWN`) diz ao web renderizador como
interpretá-la; o backend apenas o armazena (coluna `content_format` em `posts`/`pages`).

- Detalhe (`PostDto`, `AdminPostDto`, `PageDto`, `AdminPageDto`) e upsert expõem `contentFormat`.
- Em `PostUpsertRequest`/`PageUpsertRequest`: `null`/vazio → `HTML`; valor fora do enum → `400`
  (`BadRequestException` → Problem Details).
- Linhas importadas do WordPress permanecem `HTML` (default da coluna).

### Campanhas / Editais

Builder de editais (requer `EDITOR` ou `ADMIN`). Não há endpoints públicos de submissão (fase 3);
`/api/public/campaigns` continua somente leitura.

| Método | Rota |
|---|---|
| GET | `/api/admin/campaigns?page&size&q&status` |
| POST | `/api/admin/campaigns` |
| GET | `/api/admin/campaigns/{id}` |
| PUT | `/api/admin/campaigns/{id}` |
| DELETE | `/api/admin/campaigns/{id}` |
| POST | `/api/admin/campaigns/{id}/publish` |
| POST | `/api/admin/campaigns/{id}/unpublish` |

`AdminCampaignDto`:
```json
{
  "id": 1, "slug": "edital-2026", "title": "Edital 2026", "description": "Chamada pública",
  "status": "DRAFT", "startsAt": "2026-01-01T00:00:00Z", "endsAt": "2026-03-01T00:00:00Z",
  "coverImageUrl": null, "coverMediaId": null,
  "formSchema": { "fields": [ { "name": "org", "type": "text", "required": true } ] },
  "createdAt": "2026-10-05T12:00:00Z", "updatedAt": "2026-10-05T12:00:00Z"
}
```

`CampaignUpsertRequest`:
```json
{
  "title": "Edital 2026", "slug": "edital-2026", "description": "Chamada pública",
  "status": "DRAFT", "startsAt": "2026-01-01T00:00:00Z", "endsAt": "2026-03-01T00:00:00Z",
  "coverMediaId": null,
  "formSchema": { "fields": [] }
}
```
- `title` e `slug` obrigatórios; `slug` único (duplicado → `409 Conflict`); `status` ∈ `DRAFT | PUBLISHED | ARCHIVED` (vazio → `DRAFT`).
- `formSchema` é um objeto JSON livre (deve ser **objeto**; array/string/número → `400`); `null` → `{}`.
- `coverMediaId` inexistente → `404`; `{id}` inexistente em GET/PUT/DELETE → `404`.

### Categorias / Tags
`GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/{id}`.
`CategoryUpsertRequest`: `{ "name":"", "slug":"", "description":null, "sortOrder":0 }`
Tags: mesmo padrão (`name`, `slug`).

### Leads
| Método | Rota |
|---|---|
| GET | `/api/admin/leads?page&size` |
| DELETE | `/api/admin/leads/{id}` |

### Configurações (ADMIN)

`GET /api/admin/settings` → `SiteSettingsDto`; `PUT /api/admin/settings` (`SiteSettingsDto`, ADMIN-only).

Não há integração por API/token nem campo de embed: a homepage usa o link `social.instagram`.
O campo `instagramEmbed` foi removido (migration `V5`). Shape:

```json
{
  "siteName": "FICAS", "siteDescription": "…", "logoUrl": "…", "faviconUrl": "…",
  "social": {
    "instagram": "https://www.instagram.com/insta_ficas/",
    "facebook": "https://www.facebook.com/ficas.sp",
    "youtube": "",
    "twitter": "https://twitter.com/FICAS_SP",
    "linkedin": "https://br.linkedin.com/company/ficas"
  },
  "contact": {"email":"","phone":"","address":""},
  "pix": {"key":"","qrImageUrl":null,"suggestedAmounts":[]}
}
```

- `social.instagram` é o link do perfil (ex.: `https://www.instagram.com/insta_ficas/`), retornado por
  `GET /api/public/settings`; a homepage iframa esse link.

### Usuários (ADMIN)
`GET /api/admin/users`; `POST /api/admin/users` `{name,email,password,role}`; `PUT /api/admin/users/{id}`; `DELETE /api/admin/users/{id}`.

### Menu (ADMIN)
`GET /api/admin/menu`; `PUT /api/admin/menu` (lista completa, substitui). Item: `{label,url,target,sortOrder,parentId,children[]}`.

## Banco de dados (Flyway — `V1__init.sql`, `V2__content_format.sql`, `V3__instagram_settings.sql`, `V4__instagram_embed.sql`, `V5__drop_instagram_embed.sql`)

- `users(id, name, email UNIQUE, password_hash, role, created_at, updated_at)`
- `media_assets(id, filename, url UNIQUE, mime_type, size_bytes, alt, created_at)`
- `categories(id, slug UNIQUE, name, description, sort_order)`
- `tags(id, slug UNIQUE, name)`
- `posts(id, slug UNIQUE, title, excerpt, content, content_format DEFAULT 'HTML', cover_media_id→media_assets, category_id→categories, author_id→users, status, published_at, seo_title, seo_description, created_at, updated_at)`
- `post_tags(post_id→posts, tag_id→tags, PK(post_id,tag_id))`
- `pages(id, slug UNIQUE, title, content, content_format DEFAULT 'HTML', excerpt, hero_media_id→media_assets, menu_order, show_in_menu, status, seo_title, seo_description, created_at, updated_at)`
- `menu_items(id, label, url, target, sort_order, parent_id→menu_items NULL)`
- `site_settings(id SMALLINT PK=1, site_name, site_description, logo_url, favicon_url, social JSONB, contact JSONB, pix JSONB, updated_at)`
- `contact_leads(id, name, email, phone, message, source, consent, created_at)`
- `campaigns(id, slug UNIQUE, title, description, status, starts_at, ends_at, cover_media_id, form_schema JSONB, created_at, updated_at)`
- `campaign_submissions(id, campaign_id→campaigns, organization_name, cnpj, contact_name, contact_email, contact_phone, answers JSONB, status, created_at)`
- `submission_attachments(id, submission_id→campaign_submissions, media_id→media_assets)`
- `redirects(id, from_path UNIQUE, to_path, status_code)`

## Seed inicial

- Usuário admin a partir de `APP_SEED_ADMIN_EMAIL` / `APP_SEED_ADMIN_PASSWORD` / `APP_SEED_ADMIN_NAME`.
- `site_settings` linha 1 (site name/description do FICAS) + links sociais publicados (instagram/facebook/twitter/linkedin).
- 3 categorias iniciais: `Notícias`, `Projetos`, `Editais`.
- Menu inicial: `História`, `Filosofia`, `Metodologia`, `Conselhos`, `Equipe`, `Ações`, `Programas`, `Atuação`, `Notícias`, `Editais`, `Contato`, `Colabore`.

## CORS / cookies

- `APP_CORS_ALLOWED_ORIGINS=http://localhost:5173` com `allowCredentials=true`.
- Dev web: `http://localhost:5173`; API: `http://localhost:8080`.
- Em dev, cookie sem `Secure`. Perfil `prod` exige HTTPS.
