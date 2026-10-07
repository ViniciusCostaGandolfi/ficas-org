# FICAS

Recriação do site institucional [ficas.org.br](https://ficas.org.br) fora do WordPress, com foco em
**admin + posts + campanhas (editais)**.

## Stack

- **Web** (`apps/web`): React Router 7 (Framework Mode, SSR) + Vite + TypeScript + Tailwind CSS 4 + daisyUI 5.
- **API** (`apps/api`): Spring Boot (Java) + Spring Data JPA + Spring Security (JWT) + Flyway + PostgreSQL.
- **Infra**: Docker Compose (PostgreSQL).

## Estrutura

```
apps/
  web/    # site público + /admin (um único app)
  api/    # API REST
docs/
  api-contract.md   # contrato compartilhado entre web e api
  plan.md           # plano/roadmap
docker-compose.yml
```

## Desenvolvimento

### 1. Banco + API

```bash
cp .env.example .env
docker compose up -d db          # sobe PostgreSQL
cd apps/api && mvn spring-boot:run
```

API em `http://localhost:8080`. Usuário seed conforme `.env` (`APP_SEED_ADMIN_EMAIL`).

### 2. Web

```bash
cd apps/web
npm install
npm run dev
```

Web em `http://localhost:5173` (proxy/`VITE_API_BASE_URL` para a API).

### Subir tudo com Docker

```bash
docker compose --profile full up --build
```

## Documentação

- Contrato da API: [`docs/api-contract.md`](docs/api-contract.md)
- Plano/roadmap: [`docs/plan.md`](docs/plan.md)
