# FICAS API (`apps/api`)

Spring Boot REST API implementing [`docs/api-contract.md`](../../docs/api-contract.md).

- Java 21 language level, compiled/run on JDK 25
- Spring Boot 3.5.16 (Spring MVC, Spring Data JPA, Spring Security 6)
- PostgreSQL 18 + Flyway migrations
- JWT auth in an httpOnly cookie (`ficas_token`) or `Authorization: Bearer`
- Roles: `ADMIN`, `EDITOR`

## Requirements

- JDK 21+ (validated on JDK 25)
- Maven 3.9+
- PostgreSQL on `localhost:5432` (database `ficas`, user `ficas`, password `ficas`)
- Docker (for the integration tests via Testcontainers)

## Configuration

All settings are externalized via environment variables (see the repo-root
`.env.example`). The important ones:

| Variable | Default | Purpose |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `dev` | `dev` or `prod` |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/ficas` | JDBC URL |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | `ficas` / `ficas` | DB credentials |
| `APP_JWT_SECRET` | dev fallback | HS256 signing key (use 32+ bytes in prod) |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated origins, `allowCredentials=true` |
| `APP_SEED_ADMIN_EMAIL/PASSWORD/NAME` | `admin@ficas.org.br` / `admin123` / `Administrador` | Bootstrap admin (idempotent) |
| `APP_MAIL_ENABLED` | `false` | When true, contact leads also send e-mail |
| `APP_MAIL_HOST/PORT/USERNAME/PASSWORD/TO` | — | SMTP settings |
| `APP_STORAGE_LOCAL_DIR` | `./storage` | Media storage root served at `/media/**` |

`prod` requires HTTPS and sets the auth cookie `Secure`; `dev` omits `Secure`.

## Run

```bash
# from the repo root, start PostgreSQL
docker compose up -d db

# from apps/api
mvn spring-boot:run
# or build + run the jar
mvn -DskipTests package && java -jar target/ficas-api-0.0.1-SNAPSHOT.jar
```

API at `http://localhost:8080`. Flyway runs `V1__init.sql` on first boot and the
seeder creates the admin user, site settings, the three base categories and the
initial menu.

> **Note on `docker compose up -d db` (PostgreSQL 18).** The repo-root compose
> mounts the data volume at `/var/lib/postgresql/data`, which the official
> `postgres:18-alpine` image rejects (18+ stores data under a
> major-version-specific path). Until the root compose is updated, start an
> equivalent container manually — same credentials, database and port:
>
> ```bash
> docker run -d --name ficas-db-dev \
>   -e POSTGRES_DB=ficas -e POSTGRES_USER=ficas -e POSTGRES_PASSWORD=ficas \
>   -p 5432:5432 -v ficas_dev_pgdata:/var/lib/postgresql \
>   postgres:18-alpine
> ```

### Quick smoke test

```bash
# login (stores the httpOnly cookie)
curl -c cookies.txt -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ficas.org.br","password":"admin123"}'

# current user
curl -b cookies.txt -s http://localhost:8080/api/auth/me

# create + publish a post
curl -b cookies.txt -s -X POST http://localhost:8080/api/admin/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Olá","slug":"ola","content":"<p>Oi</p>","status":"DRAFT"}'
curl -b cookies.txt -s -X POST http://localhost:8080/api/admin/posts/1/publish

# public reads
curl -s 'http://localhost:8080/api/public/posts?page=0&size=9'
curl -s http://localhost:8080/api/public/pages
curl -s http://localhost:8080/api/public/menu
```

## Test

```bash
mvn test
```

Integration tests boot the full context against a PostgreSQL Testcontainer
(`postgres:18-alpine`) and exercise auth, posts (create/publish/read), public
content and contact leads.

## Docker

The repo-root `docker-compose.yml` has an `api` service (profile `full`) that
builds this Dockerfile:

```bash
docker compose --profile full up --build
```

## Notes / deviations

- **CSRF is disabled** by design: the API is stateless and authenticates with a
  short-lived JWT (cookie `SameSite=Lax` or Bearer header), so there is no
  server-side session to forge. See `SecurityConfig`.
- `spring.jpa.hibernate.ddl-auto=none`: the schema is owned by Flyway.
- Campaign submission endpoints (`POST /api/public/campaigns/{id}/submissions`)
  are phase 3 and intentionally omitted; `GET /api/public/campaigns` returns the
  published page (empty in the MVP).
