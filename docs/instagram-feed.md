# Feed do Instagram — Guia de implementação (2026)

**Contexto FICAS:** site institucional (React Router 7 SSR + Spring Boot/PostgreSQL) que quer
exibir os posts mais recentes de **[@insta_ficas](https://www.instagram.com/insta_ficas/)**.
O backend já expõe `GET /api/public/instagram` e um serviço Java está sendo adicionado para chamar
`https://graph.instagram.com/{igUserId}/media`.

**Escopo deste documento:** comparar as opções de API vigentes em 2026, detalhar o setup da opção
oficial recomendada (Instagram API with Instagram Login), listar requisitos/armadilhas e recomendar
o caminho para este projeto.

**Data de referência:** outubro/2026 · Graph API atual: **v26.0** (lançada em 29/07/2026).
Os exemplos oficiais às vezes ainda mostram `v25.0`; fixe a versão no código.

> ⚠️ **Instagram Basic Display API está morta.** Depreciação anunciada em 04/09/2024 e
> **retirada em 04/12/2024** — todas as requisições retornam erro. Não use em hipótese alguma.
> O substituto oficial é a **Instagram API with Instagram Login**
> (ou a Instagram API with Facebook Login, se houver Página do Facebook).

---

## 1) Comparativo de opções (2026)

| Critério | (A) Instagram Login (oficial) | (B) Facebook Login for Business (oficial) | (C) Embeds/APIs de terceiros | (D) oEmbed |
|---|---|---|---|---|
| Host / produto | `graph.instagram.com` | `graph.facebook.com` | Serviço do fornecedor (usa API oficial por baixo) | `graph.facebook.com/instagram_oembed` |
| Login | Business Login for Instagram | Facebook Login for Business | Nenhum (o fornecedor faz a conexão) | Nenhum (tokenless desde 2026) |
| Página do Facebook | **Não exige** | **Exige** (Página vinculada) | Depende (a conta ainda precisa ser Professional) | Não |
| Permissão base | `instagram_business_basic` | `instagram_basic`, `pages_read_engagement`, etc. | N/A | N/A |
| Feed "últimos posts" | ✅ nativo (`/{ig-user-id}/media`) | ✅ nativo | ✅ nativo (widget/JSON) | ❌ **não** (só 1 post por URL) |
| Business Discovery (ler outros perfis) | ❌ | ✅ | varia | ❌ |
| Hashtag search / product tagging / Partnership Ads | ❌ | ✅ | varia | ❌ |
| App Review p/ conta própria | Não (Standard Access basta) | Não, se for a própria conta | N/A | Não (desde 2026) |
| Custo | Grátis | Grátis | Pago (planos a partir de ~US$ 0 / US$ 6–30/mês) | Grátis |
| ToS | Meta Platform Terms ✅ | Meta Platform Terms ✅ | Terms do fornecedor + Meta | Só para embed de front-end |
| Fragilidade | Baixa (API oficial) | Baixa/Média (mais peças: Página + Business) | Média/Alta (depende do vendor, preço, JS externo) | Alta p/ feed (não existe listagem) |
| Indicado para | **Site institucional, feed do próprio perfil** | Agências/gestão multi-conta, ads, hashtags | Quem não consegue conta Professional/app Meta | Embed avulso de 1 post |

### (A) Instagram API with Instagram Login — recomendada
- **Prós:** oficial e gratuita; **não exige Página do Facebook**; onboarding simplificado
  (2 permissões: `instagram_business_basic` + a específica); leitura de mídia, insights, comentários,
  mensagens e menções; hospedada em `graph.instagram.com`.
- **Contras:** exige conta **Business ou Creator** (conta pessoal não funciona); token expira em
  60 dias e precisa ser renovado; não acessa ads/tagging (limitação declarada); para servir contas
  de terceiros exige **Advanced Access + App Review + Business Verification**.
- **Custo:** US$ 0 (API). Verificação de negócio também é gratuita.
- **ToS:** Meta Platform Terms / Developer Policies.
- **Fragilidade:** baixa, mas sujeita a mudanças da Meta (versões, escopos — ex.: a migração de
  `business_basic` → `instagram_business_basic` em 27/01/2025).

### (B) Instagram API with Facebook Login for Business
- **Prós:** superset — inclui **Business Discovery** (ler métricas/mídia pública de *outros* perfis
  Business/Creator), Hashtag Search, Product Tagging e Partnership Ads; insights agregados.
- **Contras:** exige **Página do Facebook vinculada** e que o usuário tenha papel com tarefas
  equivalentes a admin na Página; fluxo de login mais pesado; App Review/Business Verification em
  cenários multi-conta; Business Discovery só devolve contas Business/Creator (não pessoais e não
  age-gated), e é subject a **Platform Rate Limits** (200 × usuários/hora), não ao BUC do Instagram.
- **Custo:** US$ 0 (API).
- **ToS:** Meta Platform Terms.
- **Fragilidade:** média (mais dependências: Página, permissões de Página, possíveis exigências de
  PPA/2FA).

### (C) Embeds/APIs de terceiros (no-code ou camada gerenciada)
Todos usam a API oficial da Meta por baixo dos panos e **também exigem conta Business/Creator**.

| Fornecedor | Free | Pago inicial | Limites/detalhes | Observações |
|---|---|---|---|---|
| **Behold.so** | 1.200 views/mês, 1 fonte/feed, 6 posts, atualização 1×/dia | Starter **US$ 10/mês** | 15k views, 3 fontes, 50 posts, 1×/hora | Widgets no-code + JSON feeds; Pro US$ 30 (125k views, 100 posts, 5 min); Business US$ 60; Scale US$ 180. GDPR/CCPA, acessível. |
| **Elfsight** | 200 views/mês, 1 widget | Single App **US$ 6/mês** | 5.000 views, 3 widgets; Pro US$ 12 (50k/9); Premium US$ 24 (150k/21) | 90+ widgets; ótimo p/ quem quer widget + outros recursos. |
| **Smash Balloon** | Grátis (versão lite) | Basic **US$ 49** 1º ano (renova ~US$ 98/ano) | Plugin **WordPress** | **Não serve** diretamente num app React+Spring; só se o site fosse WP. Atenção: CVE-2026-12002 (CSRF de overwrite de token oEmbed) em ≤ 6.11.1 (jul/2026) — mantenha atualizado. |
| **Feedframer** | 1 conta, 6 posts, 1×/dia, requests ilimitados | Premium **US$ 6/mês** | 5 contas, 100 posts, 1×/hora, JSON/GraphQL/RSS | Não cobra por view; API simples (camada gerenciada). |

- **Prós:** setup em minutos, sem app Meta nem App Review; bom *fallback* quando o cliente não
  consegue garantir conta Professional/app. JSON feeds (Behold/Feedframer) integram direto no
  backend/SSR.
- **Contras:** custo recorrente; dependência de terceiro (disponibilidade, mudança de preço/limites);
  seus dados passam por um vendor; widgets injetam JS externo; limites por *view* (Behold/Elfsight)
  podem estourar em picos de tráfego e pausar o feed.
- **ToS:** termos do fornecedor **e** Meta Platform Terms (o fornecedor é o "app" perante a Meta).
- **Fragilidade:** média — se o vendor mudar/descontinuar, o feed quebra.

> ❌ **Não use APIs de scraping/privadas ("instagram-private-api", instagrapi etc.)** para produção:
> violam os Meta Platform Terms, quebram a cada mudança da API privada e não têm suporte.

### (D) oEmbed — por que **não** serve como feed
- Desde **15/06/2026** (changelog Meta de 15/05/2026) o endpoint
  `GET https://graph.facebook.com/v26.0/instagram_oembed?url={url}` funciona **sem token e sem
  App Review** para conteúdo público. Retorna o `html` de embed + metadados (`provider_name`,
  `type`, `width`).
- **Limitação decisiva:** oEmbed converte **uma URL de post** em embed. **Não existe** listagem
  ("últimos posts"), paginação ou descoberta de URLs. Para montar um feed você precisaria já saber
  as URLs de cada post — o que só a API (A/B) fornece.
- Também não suporta posts de contas privadas/inativas/age-restricted, Stories, Shadow DOM; e o uso
  de metadados é **restrito a exibição front-end** (proibido usar para analytics/persistência).
- Rate limit: até **1.000 requisições/hora** (o tokenless "pode diferir").
- **Conclusão:** use oEmbed apenas para embutir posts avulsos (ex.: um post específico em uma
  notícia) — nunca como a fonte do feed.

---

## 2) Setup passo a passo — Opção (A), o caminho oficial recomendado

### 2.1 Pré-requisitos para o @insta_ficas

- [ ] Conta **Professional** (Business **ou** Creator). Gratuito e reversível.
  - App Instagram → **Perfil** → **Mais / Settings and activity** → **For professionals** →
    **Account type and tools** → **Switch to professional account** → escolha **Business** ou
    **Creator** → categoria → concluir.
  - Contas **pessoais não têm acesso** a esta API.
- [ ] Conta configurada como **pública** (necessário para webhooks de comentários/menções e
  recomendável para o feed).
- [ ] Conta de **desenvolvedor Meta** (developers.facebook.com) e um **Business Portfolio**.
- [ ] Definir o nível de acesso:
  - **Standard Access** → suficiente porque o app serve **apenas a própria conta** do FICAS
    (não exige App Review nem Business Verification).
  - **Advanced Access** → só se for servir contas de terceiros (aí: App Review + Business
    Verification).
- [ ] Um domínio HTTPS de produção para o redirect (ex.: `https://ficas.org.br/...`); em dev,
  `http://localhost:...` é aceito como OAuth URI de teste.

### 2.2 Criar o app Meta e habilitar o Instagram

1. Acesse **developers.facebook.com/apps** → **Create App**.
2. **Use case:** *Other* (ou *Manage messaging & content on Instagram*).
3. **App type: Business** — obrigatório para adicionar o produto Instagram. Se o app existente não
   for Business, crie um novo.
4. **App name + contact email** → **Create App**.
5. Em **Add products**, localize **Instagram** → **Set up**.
   O **API setup with Instagram login** é adicionado automaticamente.
6. Em **Use cases → Customize → API setup with Instagram login**, anote:
   - **Instagram App ID** (é o `client_id` do OAuth);
   - **Instagram App Secret** (⚠️ **diferente** do Meta App ID/Secret de "App settings → Basic").
7. Em **Generate access tokens**, clique **Add account**, faça login no **@insta_ficas** (a conta
   precisa ser pública). O token gerado pelo painel é **long-lived (60 dias)** — ótimo para o
   primeiro uso. Contas podem ser adicionadas/removidas depois.
8. Em **3. Set up Instagram business login**:
   - adicione a **Redirect URL / OAuth redirect URIs** (HTTPS em produção; correspondência
     **exata**, incluindo barra final);
   - preencha **Deauthorize callback URL** e **Data deletion request URL**;
   - copie a **Embed URL** (usada só se você implementar o login OAuth completo).
9. Confirme que a permissão **`instagram_business_basic`** está entre as solicitadas
   (a `instagram_business_manage_messages` vem por padrão no fluxo de mensagens; remova o que não
   precisar).
10. Para o app receber webhooks, ele precisa estar **Live** — mas isso só é relevante se você usar
    webhooks (ver §2.7).

> **Atalho para o caso FICAS:** como você serve **somente a própria conta**, é permissível pular o
> fluxo de login OAuth e usar o **token de 60 dias gerado no App Dashboard** (passo 7). Você ainda
> precisa **renovar** esse token antes de expirar (§2.6).

### 2.3 Fluxo OAuth completo (se quiser automatizar a conexão)

Implemente apenas se quiser um botão "conectar Instagram" (ex.: admin). O `client_secret` fica
**somente no servidor**.

**a) Autorização (navegador do usuário)**

```
GET https://www.instagram.com/oauth/authorize
  ?client_id={INSTAGRAM_APP_ID}
  &redirect_uri={REDIRECT_URI}
  &response_type=code
  &scope=instagram_business_basic
  &state={CSRF_TOKEN}
  &force_reauth=true
```

- Parâmetros opcionais: `enable_fb_login` (default `true`) e `force_reauth=true` (recomendado,
  sobretudo em mobile).
- O usuário autoriza; a Meta redireciona para `{REDIRECT_URI}?code=...`. O **código vale 1 hora** e
  só pode ser usado **uma vez** (descarte o `#_` que a Meta anexa na URL).

**b) Trocar `code` por token de curta duração (`POST`, server-side, form-encoded)**

```bash
curl -X POST https://api.instagram.com/oauth/access_token \
  -F 'client_id={INSTAGRAM_APP_ID}' \
  -F 'client_secret={INSTAGRAM_APP_SECRET}' \
  -F 'grant_type=authorization_code' \
  -F 'redirect_uri={REDIRECT_URI}' \
  -F 'code={CODE}'
```

Resposta:

```json
{
  "data": [{
    "access_token": "EAACEdEose0...",
    "user_id": "1020...",
    "permissions": "instagram_business_basic"
  }]
}
```

Guarde `access_token` (curta duração, **1 hora**) e `user_id` (o **IG User ID** — use em
`/{ig-user-id}/media`). ⚠️ `user_id` retornado aqui é o **Instagram-scoped user ID**; o `/me`
também expõe `user_id`.

**c) Trocar por token long-lived (60 dias, server-side)**

```bash
curl "https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret={INSTAGRAM_APP_SECRET}
  &access_token={SHORT_LIVED_TOKEN}"
```

```json
{ "access_token": "EAACEdEose0...", "token_type": "bearer", "expires_in": 5183944 }
```

**d) Renovar (refresh) o token long-lived**

```bash
curl "https://graph.instagram.com/refresh_access_token
  ?grant_type=ig_refresh_token
  &access_token={LONG_LIVED_TOKEN}"
```

Regras do refresh:
- o token atual deve ter **pelo menos 24 horas** de idade, estar **válido** e o usuário ter concedido
  `instagram_business_basic`;
- cada refresh devolve **outros 60 dias**;
- **token não renovado em 60 dias expira e não pode mais ser renovado** (é preciso refazer o OAuth ou
  gerar de novo no painel).

### 2.4 Consultas `/me` e `/{ig-user-id}/media`

**Perfil:**

```bash
curl "https://graph.instagram.com/v26.0/me
  ?fields=user_id,username,account_type,profile_picture_url,followers_count,media_count
  &access_token={LONG_LIVED_TOKEN}"
```

**Mídia mais recente (feed):**

```bash
curl "https://graph.instagram.com/v26.0/{IG_USER_ID}/media
  ?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp
  &limit=12
  &access_token={LONG_LIVED_TOKEN}"
```

Campos relevantes:

| Campo | Descrição / cuidado |
|---|---|
| `id` | ID da mídia. |
| `caption` | Legenda. **Atenção:** a referência oficial rotula `caption` como "Available for Instagram API with Facebook Login only"; na prática, apps com Instagram Login vêm retornando `caption` na expansão de campos. **Teste com o token do @insta_ficas** antes de depender dele e trate como opcional (`caption ?? null`). |
| `media_type` | `IMAGE` \| `VIDEO` \| `CAROUSEL_ALBUM`. |
| `media_url` | URL do arquivo. **Pode ser omitida** em vídeo com áudio licenciado/copyright — trate como opcional e caia para `permalink`/`thumbnail_url`. |
| `thumbnail_url` | Só disponível em `VIDEO`. |
| `permalink` | URL permanente do post (bom fallback de link). |
| `timestamp` | Data ISO-8601 UTC. |
| `username` / `owner` | `username` para mídia de terceiros; `owner` só quando você é o dono. |

**Paginação:**
- Cursor-based: a resposta traz `paging.cursors.after` / `before` e `paging.next` (URL completa).
  Para a próxima página, repita a chamada com `&after={cursor}`.
- Time-based: aceita `since` e `until` (Unix timestamp/`strtotime`) na edge `/{ig-user-id}/media`.
- A edge retorna no máximo **10.000 mídias** mais recentes; Stories **não** saem no `/media`
  (use `/{ig-user-id}/stories`).
- Para carrossel (`CAROUSEL_ALBUM`), os itens vêm via `/{ig-media-id}/children` (alguns campos, como
  `permalink`, não se aplicam aos filhos do álbum).

### 2.5 Rate limits

- Endpoints do Instagram (exceto mensageria) usam **Business Use Case (BUC)** limit:
  `Chamadas em 24h = 4800 × Número de Impressões`
  (impressões = quantas vezes conteúdo da conta entrou na tela de alguém nas últimas 24h).
- Erro típico de throttle do Instagram: **código 80002** (`OAuthException`). Use o header
  **`X-Business-Use-Case-Usage`** (`call_count`, `total_cputime`, `total_time`,
  `estimated_time_to_regain_access`) para monitorar.
- Business Discovery e Hashtag Search usam **Platform Rate Limits** (200 × usuários/hora).
- **Boa prática:** cache no backend (15–60 min) e um job agendado — evita throttle, acelera o SSR e
  reduz dependência de rede.

### 2.6 Armazenamento e renovação do token (server-side)

- **Nunca** exponha `Instagram App Secret` nem o token ao frontend, a logs ou ao repositório.
  Guarde em **variável de ambiente/secret manager** (ou coluna criptografada no Postgres).
- Fluxo sugerido no Spring Boot:
  - guardar `access_token` + `expires_at` (e o `ig_user_id`);
  - um `@Scheduled` diário/semanal chama `/refresh_access_token` (só após 24h de idade) e atualiza
    `access_token`/`expires_at`;
  - se o refresh falhar (ou o token já tiver expirado), sinalizar para reautenticar/gerar novo token;
  - `GET /api/public/instagram` lê do **cache** (nunca chama a Meta por request do usuário).
- Exemplo de esqueleto (ilustrativo):

```java
// application.yml (nunca commitar valores reais)
// ficas.instagram:
//   app-id: ${IG_APP_ID}
//   app-secret: ${IG_APP_SECRET}
//   token: ${IG_LONG_LIVED_TOKEN}
//   ig-user-id: ${IG_USER_ID}

@Scheduled(cron = "0 0 3 * * *") // diário, 03:00
public void refreshIfDue() {
    if (tokenStore.expiresInLessThan(Duration.ofDays(30))) {
        String url = "https://graph.instagram.com/refresh_access_token"
            + "?grant_type=ig_refresh_token&access_token=" + tokenStore.token();
        var resp = restClient.get().uri(url).retrieve().body(TokenResponse.class);
        tokenStore.save(resp.accessToken(), resp.expiresIn());
    }
}
```

```java
// Busca do feed (server-side) + cache em memória
public List<IgPostDto> latestMedia(int limit) {
    String fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    return restClient.get()
        .uri("https://graph.instagram.com/v26.0/{id}/media"
             + "?fields={fields}&limit={limit}&access_token={token}",
             igUserId, fields, limit, tokenStore.token())
        .retrieve()
        .body(MediaPage.class)
        .data();
}
```

### 2.7 Webhooks (opcional — e uma ressalva importante)

- Webhooks da Meta para Instagram existem para **`comments`, `live_comments`, `mentions`**,
  `messages` e outros eventos de mensageria/insights.
- Requisitos: app **Live**; **Advanced Access** para `comments`/`live_comments`; **Business
  Verification**; endpoint HTTPS com TLS válido; validar `hub.challenge` na verificação e a
  assinatura `X-Hub-Signature-256` (SHA-256 com o App Secret).
- **Não existe webhook de "nova mídia publicada"**. Ou seja: webhooks **não** mantêm o feed
  atualizado. Para "últimos posts", a estratégia é **polling agendado** (ex.: a cada 15–60 min) no
  backend, servindo o resultado cacheado em `GET /api/public/instagram`.
- Webhooks só valem a pena se o FICAS quiser reagir a **comentários/menções** — não para o feed.

---

## 3) Requisitos e armadilhas (gotchas)

1. **Conta precisa ser Business/Creator.** Contas pessoais **não** têm acesso à API. A migração da
   Basic Display API removeu o suporte oficial a contas pessoais; hoje **não existe** caminho oficial
   de feed para conta pessoal.
2. **Basic Display API morta** (04/12/2024). Qualquer tutorial que a mencione está obsoleto.
3. **Token de 60 dias.** Planeje renovação (≥24h de idade, antes de 60 dias) — token não renovado
   expira de vez. Tokens do fluxo de login duram 1h (troque para long-lived); tokens do App Dashboard
   já nascem long-lived (60 dias).
4. **App Secret só no servidor.** Nunca no bundle do React, nunca em `NEXT_PUBLIC`/`VITE_*`, nunca
   em logs. Use secret manager/env.
5. **Redirect URI:** precisa ser **HTTPS em produção** e casar **exatamente** com o cadastrado
   (a Meta pode adicionar barra final — confira a lista). Em dev, `localhost` é aceito para testes.
6. **Rate limit baseado em impressões** e headers BUC — monitore `X-Business-Use-Case-Usage` e
   cacheie. Evite chamar a API a cada pageview.
7. **`media_url` pode faltar** (áudio com copyright) — sempre trate como opcional.
8. **`caption`:** a doc atual marca como "Facebook Login only"; valide no seu token. Se falhar,
   remova `caption` da query e monte um card só com mídia/permalink.
9. **Se a conta continuar Pessoal:** o feed oficial simplesmente **não funciona** (erro nas
   chamadas); a Basic Display não existe mais; restaria apenas **oEmbed de posts avulsos** (manual,
   post a post) ou um **widget de terceiro** (que também exige conta Professional). Não há solução
   oficial.
10. **Advanced Access / App Review / Business Verification** só são necessários se o app servir
    contas de terceiros (multi-cliente) ou usar webhooks de `comments`/`live_comments`. Para a
    própria conta, **Standard Access basta**.
11. **Versão da API:** fixe `v26.0` nas URLs (sem versão, a Meta usa a versão do app e pode mudar
    comportamento silenciosamente).
12. **Escopos antigos** (`business_basic`, etc.) foram depreciados em **27/01/2025** — use os novos
    `instagram_business_*`.

---

## 4) Recomendação para o FICAS

**Recomendado: (A) Instagram API with Instagram Login**, integrada ao backend Spring Boot.

Motivos: é o caminho oficial/estável, **gratuito**, **não exige Página do Facebook**, encaixa
exatamente no que já existe (`GET /api/public/instagram` + serviço Java chamando
`graph.instagram.com/{igUserId}/media`), mantém o token sob controle do servidor e permite cache/SSR
no React Router 7 sem expor credenciais. Como o FICAS só precisa dos posts da **própria conta**,
**Standard Access é suficiente** (sem App Review).

**Fallback: (C) widget/JSON feed no-code** (ex.: **Behold** free, ou **Feedframer Premium
US$ 6/mês**) — indicado **somente se** o cliente não puder garantir conta Professional e/ou app Meta.
Nesse caso, prefira um plano com **JSON feed** e consuma no backend (`GET /api/public/instagram`
repassa o JSON já normalizado), evitando JS de terceiro no SSR. Se a conta ficar Pessoal, **nenhuma**
opção oficial de feed funciona; o terceiro também exigirá a conversão para Professional.

**Não recomendado:** oEmbed para "últimos posts" (não lista); APIs de scraping (violam ToS).

### Matriz de decisão

| Situação | Escolha | Por quê |
|---|---|---|
| @insta_ficas é Business/Creator e há app Meta | **(A) Instagram Login** | Oficial, grátis, sem Página, controla o token no backend |
| Precisa ler *outros* perfis / hashtags / ads | **(B) Facebook Login for Business** | Só ele tem Business Discovery, hashtag e partnership ads |
| Cliente não consegue app Meta / conta Professional rápida | **(C) Behold / Feedframer (JSON feed)** | No-code, entrega em minutos; ainda exige conta Professional |
| Só quer embutir **um** post específico | **(D) oEmbed tokenless** | Simples e grátis, mas 1 post por URL |
| Conta permanece **Pessoal** | Nenhuma opção de feed | API oficial exige Professional; Basic Display foi extinta |

### Fluxo final proposto para o FICAS

1. Converter @insta_ficas para **Business** (gratuito) e mantê-la pública.
2. Criar o app Meta (Business) + produto Instagram (Instagram Login) sob o Business Portfolio do
   FICAS; coletar **Instagram App ID/Secret**.
3. Gerar o **token long-lived** no App Dashboard (Standard Access, sem App Review).
4. Configurar no Spring: `IG_APP_ID`, `IG_APP_SECRET`, `IG_LONG_LIVED_TOKEN`, `IG_USER_ID` via env.
5. Job `@Scheduled` renova o token; job de feed a cada 15–60 min consulta
   `/{IG_USER_ID}/media?fields=...&limit=12` e grava em cache.
6. `GET /api/public/instagram` devolve o payload normalizado (id, caption, media_type, media_url,
   thumbnail_url, permalink, timestamp) para o SSR React Router 7.
7. Se o cliente travar na conta Professional/app Meta → acionar o plano B (**C**) com Behold
   (free/JSON) ou Feedframer, mantendo o mesmo contrato `GET /api/public/instagram`.

---

## 5) Fontes oficiais (consultadas em outubro/2026)

**Meta / oficial**
- Instagram API with Instagram Login (visão geral e escopos) —
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
- Business Login for Instagram (**Updated: Mar 13, 2026**) — endpoints OAuth, short/long-lived,
  refresh, `enable_fb_login`, `force_reauth`, código válido por 1h:
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login
- Get started with Instagram API with Instagram Login (**Updated: Dec 2, 2024**) — `/me`,
  `/{IG_ID}/media`, campos de usuário:
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
- Instagram Platform Overview — Standard vs Advanced Access, permissões, host URLs, rate limits,
  webhooks, Business Verification:
  https://developers.facebook.com/docs/instagram-platform/overview
- IG Media reference — campos (`caption`, `media_type`, `media_url`, `thumbnail_url`, `permalink`,
  `timestamp`), limitações (copyright, álbuns, 10K):
  https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
- IG User Media (edge `/{ig-user-id}/media`) — paginação por cursor `since`/`until`, exemplo v26.0:
  https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/media
- Create a Meta app for the Instagram API — passos de criação do app/produto:
  https://developers.facebook.com/docs/instagram-platform/create-an-instagram-app
- Business Discovery (Facebook Login) — leitura de outros perfis, limites:
  https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery
- Embed an Instagram Post (oEmbed) — endpoint, limitações, 1.000 req/hora:
  https://developers.facebook.com/docs/instagram-platform/oembed
- Instagram oEmbed reference (v26.0) — parâmetros (`url`, `maxwidth`, `hidecaption`, `omitscript`):
  https://developers.facebook.com/docs/graph-api/reference/instagram-oembed
- Webhooks (campos suportados; exigem app Live/Advanced Access/Business Verification):
  https://developers.facebook.com/docs/instagram-platform/webhooks
- Graph API Rate Limits — BUC do Instagram (`4800 × impressões`, erro 80002) e Platform Limits:
  https://developers.facebook.com/docs/graph-api/overview/rate-limiting
- Changelog da Instagram Platform — escopos novos (17/09/2024), Basic Display retirada
  (**Dec 4, 2024**), oEmbed sem token (**May 15, 2026**), campos agregados (Apr 22, 2026),
  `is_ai_generated` (Jun 22, 2026):
  https://developers.facebook.com/docs/instagram-platform/changelog
- Blog Meta: **Introducing Tokenless Access to Meta oEmbed APIs** — **June 15, 2026**:
  https://developers.facebook.com/blog/post/2026/06/15/tokenless-access-to-meta-oembed-apis
- Blog Meta: **Introducing Graph API v26.0 and Marketing API v26.0** — **July 29, 2026**:
  https://developers.facebook.com/blog/post/2026/07/29/introducing-graph-api-v26-and-marketing-api-v26/
- Blog Meta: **Update on Instagram Basic Display API** (anúncio da depreciação) — 04/09/2024:
  https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/
- Instagram Help Center — **Set up a professional Instagram account** (conversão para
  Business/Creator):
  https://help.instagram.com/502981923235522

**Terceiros (preços/limites — páginas dos fornecedores, acessadas em out/2026)**
- Behold.so — https://behold.so/pricing
- Elfsight (Instagram Feed) — https://elfsight.com/instagram-feed-instashow/pricing e
  https://help.elfsight.com/article/938-pricing
- Smash Balloon (Instagram Feed, plugin WordPress) — https://smashballoon.com/pricing/instagram-feed
- Feedframer — https://feedframer.com/pricing
- Wordfence / CVE-2026-12002 (Smash Balloon ≤ 6.11.1 — CSRF de overwrite de token oEmbed, 08/07/2026):
  https://www.wordfence.com/threat-intel/vulnerabilities/id/abe6366a-3729-474f-8920-b5ed2eeab906

> **Nota de precisão:** os pontos marcados como "verificar" (`caption` no Instagram Login e limite
> de impressões quando próximo de zero) derivam de inconsistências na própria documentação da Meta
> em 2026. Valide-os com o token do @insta_ficas no Graph API Explorer antes de tornar o campo
> obrigatório no DTO.
