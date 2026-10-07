# FICAS — Web (`apps/web`)

Site público + painel administrativo da FICAS, em **React Router 7 (Framework
Mode / SSR) + Vite + TypeScript + Tailwind CSS 4 + daisyUI 5**.

A API (Spring Boot) é consumida conforme [`docs/api-contract.md`](../../docs/api-contract.md).
O cliente HTTP fica em `app/lib/api.server.ts` e, em SSR, encaminha o cookie
httpOnly `ficas_token` para a API.

## Requisitos

- Node.js 22+ e npm 10+
- API disponível em `http://localhost:8080` (opcional para desenvolver o
  front — sem API o site renderiza com _empty states_).

## Configuração

```bash
cp .env.example .env
```

Variáveis:

| Variável             | Padrão                  | Descrição                                      |
| -------------------- | ----------------------- | ---------------------------------------------- |
| `API_BASE_URL`       | `http://localhost:8080` | Base da API usada pelo servidor (SSR).         |
| `VITE_API_BASE_URL`  | `http://localhost:8080` | Base da API exposta ao bundle/dev.             |

`API_BASE_URL` tem precedência; se ausente, usa-se `VITE_API_BASE_URL`.

## Scripts

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm run build      # typegen + typecheck (tsc) + build de produção
npm start          # serve o build (react-router-serve)
npm run typecheck  # typegen + tsc
```

## Estrutura

```
app/
  root.tsx                  # shell do documento, meta/links, ErrorBoundary global
  routes.ts                 # configuração de rotas (Framework Mode)
  tailwind.css              # Tailwind 4 + daisyUI 5 + tema "ficas"
  lib/
    api.server.ts           # fetch wrapper (base URL, cookies, erros RFC 7807)
    auth.server.ts          # getCurrentUser / requireUser (guard SSR)
    admin.server.ts         # builders de payload, validação, upload, erros
    types.ts                # DTOs espelhando o contrato
    format.ts               # helpers de data/número/slug
  components/
    PublicLayout.tsx        # navbar + drawer mobile + footer
    AdminLayout.tsx         # sidebar/drawer do painel
    PostCard.tsx  Pagination.tsx  EmptyState.tsx  FormField.tsx
    Alert.tsx  Icons.tsx  NotFoundContent.tsx
    admin/PostForm.tsx  admin/PageForm.tsx  admin/MediaField.tsx
  routes/
    public-layout.tsx home.tsx news-list.tsx news-detail.tsx
    category.tsx colabore.tsx institutional-page.tsx not-found.tsx
    admin/ login.tsx logout.ts admin-layout.tsx dashboard.tsx
           posts.tsx post-new.tsx post-edit.tsx pages.tsx page-new.tsx
           page-edit.tsx categories.tsx media.tsx leads.tsx settings.tsx
```

## Rotas

**Públicas**

| Rota               | Descrição                                                        |
| ------------------ | ---------------------------------------------------------------- |
| `/`                | Home (hero, quem somos, como fazemos, últimos posts, Instagram, CTA, contato). |
| `/noticias`        | Lista paginada (`?page`, `?q`, `?category`).                     |
| `/noticias/:slug`  | Post (renderiza o HTML de `content`).                            |
| `/categoria/:slug` | Posts por categoria.                                             |
| `/colabore`        | Página de colaboração com Pix (`settings.pix`).                  |
| `/:slug`           | Página institucional (catch-all após rotas fixas); 404 se não existir. |
| `*`                | Página 404.                                                      |

**Admin** (protegidas por cookie; redirecionam a `/admin/login` em 401)

`/admin/login`, `/admin`, `/admin/posts(/:id)`, `/admin/pages(/:id)`,
`/admin/categories`, `/admin/media`, `/admin/leads`, `/admin/settings`.

## Notas de implementação

- **SSR**: loaders buscam o conteúdo no servidor; `meta()` por rota usa
  `seoTitle`/`seoDescription` quando disponíveis.
- **Auth**: o cookie httpOnly é definido pela API; o action de login encaminha o
  `Set-Cookie` ao navegador, e os loaders encaminham o `Cookie` recebido.
- **API indisponível**: loaders públicos usam `withFallback` e renderizam
  _empty states_ sem quebrar o SSR.
- **Tema**: `@plugin "daisyui/theme" { name: "ficas" ... }` — uma passada de
  design pode refinar a paleta.
